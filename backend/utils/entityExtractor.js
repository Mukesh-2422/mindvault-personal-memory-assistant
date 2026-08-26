const { getCollection, updateOne, findById } = require("../db");

/**
 * Clean and normalize text tokens for tag deduplication.
 */
function normalizeTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/^[#\s]+/, "");
}

/**
 * Merge suggested tags into existing tags without duplicates.
 * Preserves existing tag order and original capitalization.
 */
function mergeTags(existingTags = [], suggestedTags = []) {
  const result = [...(Array.isArray(existingTags) ? existingTags : [])];
  const seen = new Set(result.map(normalizeTag));

  if (Array.isArray(suggestedTags)) {
    for (const tag of suggestedTags) {
      if (!tag) continue;
      const clean = String(tag).trim().replace(/^[#\s]+/, "");
      const normalized = normalizeTag(clean);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(clean.toLowerCase());
      }
    }
  }
  return result;
}

/**
 * Heuristic fallback extraction in case Groq is offline or API key is not configured.
 */
function fallbackExtraction({ title = "", content = "", transcript = "" }) {
  const combined = `${title} ${content} ${transcript}`.trim();
  const lower = combined.toLowerCase();

  // Category heuristics
  let category = "Personal";
  if (/\b(work|meeting|project|code|interview|client|office|task|bug|release|deadline|deploy)\b/i.test(lower)) {
    category = "Work";
  } else if (/\b(travel|trip|flight|hotel|vacation|airport|train|visit|journey|tour)\b/i.test(lower)) {
    category = "Travel";
  } else if (/\b(idea|concept|brainstorm|startup|invent|prototype|vision|feature)\b/i.test(lower)) {
    category = "Ideas";
  }

  // Sentiment heuristics
  let sentiment = "Neutral";
  const positiveWords = /\b(great|awesome|love|happy|excited|success|productive|good|fantastic|won|celebrate|achievement|enjoy)\b/i;
  const negativeWords = /\b(bad|sad|angry|hate|failed|terrible|delay|frustrated|error|broken|struggle|problem|worst|worried)\b/i;
  if (positiveWords.test(lower) && !negativeWords.test(lower)) {
    sentiment = "Positive";
  } else if (negativeWords.test(lower) && !positiveWords.test(lower)) {
    sentiment = "Negative";
  }

  // Fallback simple keyword tags
  const suggestedTags = [];
  const keywordMatches = combined.match(/\b([A-Z][a-zA-Z0-9_-]{2,}|[a-z]{4,})\b/g) || [];
  const stopWords = new Set(["the", "this", "that", "with", "from", "have", "been", "were", "what", "when", "where", "will", "your", "they", "some", "about"]);
  for (const word of keywordMatches) {
    const cleanWord = word.toLowerCase();
    if (!stopWords.has(cleanWord) && !suggestedTags.includes(cleanWord) && suggestedTags.length < 5) {
      if (["meeting", "project", "interview", "travel", "flight", "birthday", "ideas", "ai", "roadmap"].includes(cleanWord)) {
        suggestedTags.push(cleanWord);
      }
    }
  }

  return {
    suggestedTags,
    detectedPeople: [],
    category,
    sentiment,
  };
}

/**
 * Call Groq (llama-3.3-70b-versatile) with JSON Mode for structured entity extraction.
 */
async function extractMemoryEntities({ title = "", content = "", transcript = "", checklist = [] }) {
  const groqApiKey = process.env.GROQ_API_KEY;

  const checklistText = Array.isArray(checklist)
    ? checklist.map((item) => (typeof item === "string" ? item : item.text)).filter(Boolean).join(", ")
    : "";

  const memoryText = [
    title ? `Title: ${title}` : "",
    content ? `Content: ${content}` : "",
    transcript ? `Audio Transcript: ${transcript}` : "",
    checklistText ? `Checklist: ${checklistText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!memoryText.trim()) {
    return {
      suggestedTags: [],
      detectedPeople: [],
      category: "Personal",
      sentiment: "Neutral",
      summary: "",
      actionItems: [],
      reminders: [],
    };
  }

  if (!groqApiKey) {
    return fallbackExtraction({ title, content, transcript });
  }

  const systemPrompt = `You are an AI intelligence assistant for MindVault, a personal memory notebook.
Analyze the memory note/transcript and extract structured insights in strictly valid JSON.

JSON Schema Requirement:
{
  "suggestedTags": ["tag1", "tag2"],
  "detectedPeople": ["Name1", "Name2"],
  "category": "Work" | "Personal" | "Ideas" | "Travel" | "Finance" | "Health",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "summary": "1 concise sentence summary of the key takeaway",
  "actionItems": ["To-do task 1", "To-do task 2"],
  "reminders": [
    { "title": "Reminder title", "date": "YYYY-MM-DD" }
  ]
}

Guidelines:
1. suggestedTags: 2 to 4 clean lowercase keyword tags without '#'.
2. detectedPeople: Names of people explicitly mentioned.
3. category: Pick the best fitting category.
4. summary: 1 clean, friendly sentence summarizing the note.
5. actionItems: Extract any actionable to-dos, tasks, or follow-ups mentioned (empty array if none).
6. reminders: If the user mentions any specific dates, deadlines, birthdays, or renewals, extract them with estimated YYYY-MM-DD (empty array if none).
Output strictly valid JSON matching this schema.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: memoryText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 450,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.warn(`[EntityExtractor] Groq API returned status ${response.status}:`, errBody);
      return fallbackExtraction({ title, content, transcript });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return fallbackExtraction({ title, content, transcript });
    }

    const parsed = JSON.parse(rawContent);

    // Validate and sanitize response
    const validCategories = ["Work", "Personal", "Ideas", "Travel", "Finance", "Health"];
    const validSentiments = ["Positive", "Neutral", "Negative"];

    const suggestedTags = Array.isArray(parsed.suggestedTags)
      ? parsed.suggestedTags.map((t) => String(t).trim().toLowerCase().replace(/^[#\s]+/, "")).filter(Boolean)
      : [];

    const detectedPeople = Array.isArray(parsed.detectedPeople)
      ? parsed.detectedPeople.map((p) => String(p).trim()).filter(Boolean)
      : [];

    const matchedCat = validCategories.find(
      (c) => c.toLowerCase() === String(parsed.category || "").trim().toLowerCase()
    );
    const category = matchedCat || "Personal";

    const matchedSent = validSentiments.find(
      (s) => s.toLowerCase() === String(parsed.sentiment || "").trim().toLowerCase()
    );
    const sentiment = matchedSent || "Neutral";

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems.map((a) => String(a).trim()).filter(Boolean) : [];
    const reminders = Array.isArray(parsed.reminders) ? parsed.reminders.filter((r) => r && r.title) : [];

    return {
      suggestedTags,
      detectedPeople,
      category,
      sentiment,
      summary,
      actionItems,
      reminders,
    };
  } catch (err) {
    console.warn("[EntityExtractor] Groq extraction error, falling back to heuristics:", err.message);
    return fallbackExtraction({ title, content, transcript });
  }
}


/**
 * Process auto-tagging, entity extraction, and people linking for a memory in the database.
 * Runs asynchronously and updates the memory and related people records.
 */
async function processMemoryAutoTagging(memoryId, userId, memoryData = null) {
  try {
    const memory = memoryData || (await findById("memories", memoryId));
    if (!memory || memory.userId !== userId) {
      return null;
    }

    // Do not leak encrypted private vault memories to external LLM
    if (memory.isEncrypted || memory.vaultId === "vault") {
      return memory;
    }

    // 1. Extract entities using Groq LLM
    const extraction = await extractMemoryEntities({
      title: memory.title,
      content: memory.content,
      transcript: memory.transcript || (memory.type === "voice" ? memory.content : ""),
      checklist: memory.checklist,
    });

    const { suggestedTags = [], detectedPeople = [], category, sentiment } = extraction;

    // 2. Merge suggestedTags with existing user-defined tags without duplicates
    const mergedTags = mergeTags(memory.tags || [], suggestedTags);

    // 3. Find user's people collection and match detectedPeople by name
    const userPeople = await getCollection("people", { userId });
    const matchedPeopleIds = [];
    const matchedPeopleNames = [];

    if (Array.isArray(detectedPeople) && detectedPeople.length > 0 && Array.isArray(userPeople)) {
      for (const detectedName of detectedPeople) {
        const dNorm = detectedName.toLowerCase().trim();
        const found = userPeople.find((p) => {
          if (!p || !p.name) return false;
          const pNorm = p.name.toLowerCase().trim();
          return pNorm === dNorm || pNorm.startsWith(dNorm) || dNorm.startsWith(pNorm);
        });

        if (found) {
          const personId = found.id || found._id;
          if (personId && !matchedPeopleIds.includes(personId)) {
            matchedPeopleIds.push(personId);
            matchedPeopleNames.push(found.name);

            // Update person's relatedMemoryIds and lastInteraction
            const existingRelIds = Array.isArray(found.relatedMemoryIds) ? found.relatedMemoryIds : [];
            if (!existingRelIds.includes(memory.id)) {
              await updateOne("people", personId, {
                relatedMemoryIds: [...existingRelIds, memory.id],
                lastInteraction: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Existing people already linked on memory
    const existingPeople = Array.isArray(memory.people) ? memory.people : [];
    const combinedPeople = Array.from(new Set([...existingPeople, ...matchedPeopleIds]));

    // 4. Build updates for the memory
    const updates = {
      tags: mergedTags,
      people: combinedPeople,
      sentiment: memory.sentiment || sentiment || "Neutral",
    };

    // Auto-assign category if not specified or default "Personal"
    if (!memory.category || memory.category === "Personal" || memory.category === "General") {
      updates.category = category || memory.category || "Personal";
    }

    // Set relatedPerson for backwards compatibility if a person was matched
    if (!memory.relatedPerson && matchedPeopleNames.length > 0) {
      updates.relatedPerson = matchedPeopleNames[0];
    }

    // Save updates in DB
    const updatedMemory = await updateOne("memories", memory.id, updates);
    return updatedMemory || { ...memory, ...updates };
  } catch (err) {
    console.error(`[EntityExtractor] Error auto-tagging memory ${memoryId}:`, err);
    return null;
  }
}

module.exports = {
  extractMemoryEntities,
  processMemoryAutoTagging,
  mergeTags,
};
