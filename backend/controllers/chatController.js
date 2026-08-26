const { v4: uuidv4 } = require("uuid");
const { getCollection, insertOne, updateOne, findById, saveCollection } = require("../db");

function generateId() {
  return `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Common stop words to filter out during search keyword extraction
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "in", "on", "at", "to", "for", "from", "with", "by", "about", "against",
  "between", "into", "through", "during", "before", "after", "above", "below",
  "up", "down", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
  "own", "same", "so", "than", "too", "very", "can", "will", "just", "should",
  "now", "my", "your", "his", "her", "their", "our", "me", "i", "you", "it", "this",
  "that", "these", "those", "what", "which", "who", "whom", "tell", "show", "find",
  "recall", "search", "remember", "save", "note", "add"
]);

function extractKeywords(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .split(/[\s,\.!?;:]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if two words are similar (adaptive threshold based on word length)
function isSimilar(word1, word2) {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();
  if (w1 === w2) return true;

  // For short words (<= 4 chars), require exact match to prevent false positives
  if (w1.length <= 4 || w2.length <= 4) return false;

  const threshold = w1.length <= 7 ? 1 : 2;
  if (Math.abs(w1.length - w2.length) > threshold) return false;
  return levenshteinDistance(w1, w2) <= threshold;
}

function conversationalize(text) {
  if (!text || typeof text !== "string") return "";
  let str = text.trim();

  // Direct pattern: "batman is my nickname" -> "Your nickname is Batman."
  const nickMatch = str.match(/^([a-zA-Z0-9_\s-]+)\s+is\s+my\s+nickname$/i);
  if (nickMatch && nickMatch[1]) {
    const val = nickMatch[1].trim();
    const cap = val.charAt(0).toUpperCase() + val.slice(1);
    return `Your nickname is ${cap}.`;
  }

  str = str
    .replace(/\bmy nickname is\b/gi, "your nickname is")
    .replace(/\bis my nickname\b/gi, "is your nickname")
    .replace(/\bmy nickname\b/gi, "your nickname")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bme\b/gi, "you")
    .replace(/\bi am\b/gi, "you are")
    .replace(/\bi'm\b/gi, "you're")
    .replace(/\bi\b/g, "you")
    .replace(/\bI\b/g, "You")
    .replace(/\bmyself\b/gi, "yourself")
    .replace(/\bwe\b/gi, "you")
    .replace(/\bour\b/gi, "your")
    .replace(/\bours\b/gi, "yours");

  return str.charAt(0).toUpperCase() + str.slice(1);
}

function canonicalizePreference(text) {
  const s = String(text || "").toLowerCase();
  // Align preference phrasing ("X the most", "would like the most", US "favorite")
  // with the canonical "favourite" token typically used when memories are saved.
  // This is a no-op for ordinary (non-preference) queries/memories.
  return s
    .replace(/\b(?:would\s+like|would\s+love|like|loved|loves|liked|prefer|preferred|enjoy)\s+(?:the\s+)?most\b/g, "favourite")
    .replace(/\bfavorite\b/g, "favourite");
}

function getMemoryText(mem) {
  const title = mem.title || "";
  const content = mem.content || "";
  const category = mem.category || "";
  const tags = Array.isArray(mem.tags) ? mem.tags.join(" ") : mem.tags || "";
  const relatedPerson = mem.relatedPerson || "";
  let checklistText = "";
  if (Array.isArray(mem.checklist)) {
    checklistText = mem.checklist.map((item) => item.text || "").join(" ");
  }
  const contentPart = `${content} ${category} ${tags} ${relatedPerson} ${checklistText}`;
  return {
    titleKeywords: extractKeywords(canonicalizePreference(title)),
    contentKeywords: extractKeywords(canonicalizePreference(contentPart)),
    fullString: canonicalizePreference(`${title} ${contentPart}`),
  };
}

function getRelevanceScore(userMessage, memory) {
  const rawUserKeywords = (userMessage || "")
    .toLowerCase()
    .split(/[\s,\.!?;:]+/)
    .filter((w) => w.length > 2);
  const searchKeywords = extractKeywords(userMessage);

  const { titleKeywords, contentKeywords, fullString } = getMemoryText(memory);

  let score = 0;

  // Direct substring match for non-stop words (e.g. "interview", "passport", "wifi")
  rawUserKeywords.forEach((kw) => {
    if (STOP_WORDS.has(kw)) return;
    if (fullString.includes(kw)) {
      score += 4;
    }
  });

  // Keyword scoring
  searchKeywords.forEach((kw) => {
    if (titleKeywords.includes(kw)) score += 5;
    if (contentKeywords.includes(kw)) score += 3;

    titleKeywords.forEach((tk) => {
      if (isSimilar(kw, tk)) score += 2;
    });

    contentKeywords.forEach((ck) => {
      if (isSimilar(kw, ck)) score += 1;
    });
  });

  return score;
}

function searchMemories(userMessage, memories) {
  // Canonicalize preference phrasing so "like the most"/"favorite" aligns with
  // memories saved as "favourite". No-op for non-preference queries.
  const query = canonicalizePreference(userMessage);
  const subjectTerms = extractSubjectTerms(query);
  const scores = memories.map((mem) => ({
    memory: mem,
    score: getRelevanceScore(query, mem),
    subjectMatch: subjectTerms.length ? hasSubjectMatch(mem, subjectTerms) : true,
  }));

  return scores
    .filter((item) => {
      if (subjectTerms.length > 0) {
        return item.subjectMatch && item.score > 0;
      }
      return item.score > 0;
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.memory);
}

function searchPeople(userMessage, people) {
  const lowerMsg = (userMessage || "").toLowerCase();
  const keywords = (userMessage || "").toLowerCase().split(/[\s,\.!?;:]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  return people.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const notes = (p.notes || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    const phone = (p.phone || "").toLowerCase();
    const full = `${name} ${notes} ${email} ${phone}`;

    return keywords.some((kw) => full.includes(kw)) || (name && lowerMsg.includes(name));
  });
}

function formatMemoryResponse(memory) {
  if (!memory) return "";
  const title = memory.title || "Untitled";
  const content = memory.content || "";
  const fullText = content ? `${title}: ${content}` : title;

  if (fullText.length > 180) {
    return `${fullText.substring(0, 177)}...`;
  }

  return fullText;
}

/**
 * Classify a memory's relevance to the query.
 * - "primary": exact/high-relevance match (title or content contains the key query term)
 * - "related": moderate relevance (some keyword overlap)
 * - "weak": low relevance (only fuzzy/similar keyword match)
 */
function classifyRelevance(memory, query) {
  const q = (query || "").toLowerCase().trim();
  const title = (memory.title || "").toLowerCase();
  const content = (memory.content || "").toLowerCase();
  const tags = Array.isArray(memory.tags) ? memory.tags.join(" ").toLowerCase() : (memory.tags || "").toLowerCase();
  const full = `${title} ${content} ${tags}`;

  // Extract the core query words (skip stop words)
  const queryWords = q.split(/[\s,\.!?;:]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Primary: the query's key word appears verbatim in title or content
  const primaryMatch = queryWords.some((w) => title.includes(w) || content.includes(w));

  // Related: keyword appears in tags or fuzzy match on title/content
  const relatedMatch = queryWords.some((w) => tags.includes(w)) ||
    queryWords.some((w) => title.split(/\s+/).some((tw) => isSimilar(w, tw))) ||
    queryWords.some((w) => content.split(/\s+/).some((cw) => isSimilar(w, cw)));

  if (primaryMatch) return "primary";
  if (relatedMatch) return "related";
  return "weak";
}

/**
 * Normalize a memory's text for duplicate detection.
 * Strips punctuation, lowercases, collapses whitespace.
 */
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect duplicate memories — memories whose normalized content is essentially the same.
 * Returns a list of groups, each group containing the duplicate memories.
 */
function detectDuplicates(memories) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < memories.length; i++) {
    if (used.has(i)) continue;
    const group = [memories[i]];
    used.add(i);
    const normI = normalizeText(memories[i].content || memories[i].title || "");
    const titleI = normalizeText(memories[i].title || "");

    for (let j = i + 1; j < memories.length; j++) {
      if (used.has(j)) continue;
      const normJ = normalizeText(memories[j].content || memories[j].title || "");
      const titleJ = normalizeText(memories[j].title || "");
      // IMPORTANT: Never collapse two memories that share the same title —
      // they are distinct user-created memories that need disambiguation.
      if (titleI && titleJ && titleI === titleJ) continue;
      // Consider duplicates if normalized content is identical or one contains the other
      if (normI && normJ && (normI === normJ || normI.includes(normJ) || normJ.includes(normI))) {
        group.push(memories[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }

  return groups;
}

/**
 * Detect conflicting memories — memories that contain contradictory information.
 * Looks for date-like patterns (e.g. "November 24" vs "November 25") in content.
 */
function detectConflicts(memories) {
  const conflicts = [];
  const datePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)[.\s]+(\d{1,2})(?:st|nd|rd|th)?/gi;

  const extracted = memories.map((m) => {
    const text = `${m.title || ""} ${m.content || ""}`;
    const matches = [];
    let match;
    while ((match = datePattern.exec(text)) !== null) {
      matches.push(`${match[1].toLowerCase()} ${match[2]}`);
    }
    return { memory: m, dates: [...new Set(matches)] };
  });

  // Compare date values across memories
  for (let i = 0; i < extracted.length; i++) {
    for (let j = i + 1; j < extracted.length; j++) {
      const a = extracted[i];
      const b = extracted[j];
      if (a.dates.length === 0 || b.dates.length === 0) continue;
      // If they have different date values, flag as conflict
      const aSet = new Set(a.dates);
      const bSet = new Set(b.dates);
      const hasConflict = [...aSet].some((d) => !bSet.has(d)) || [...bSet].some((d) => !aSet.has(d));
      if (hasConflict) {
        conflicts.push({ memoryA: a.memory, memoryB: b.memory, datesA: a.dates, datesB: b.dates });
      }
    }
  }

  return conflicts;
}

/**
 * Build a concise preview snippet for a memory.
 */
function buildPreview(memory, maxLen = 100) {
  const content = memory.content || "";
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen - 3) + "...";
}

/**
 * Generate a natural-language response based on a single selected memory.
 * Only uses information present in the memory — never invents facts.
 */
function generateResponseFromMemory(memory) {
  if (!memory) return "Sorry, I couldn't access that memory.";

  const title = memory.title || "Untitled";
  const content = (memory.content || "").trim();

  if (!content) {
    const memType = memory.type === "voice" ? "voice memo" : memory.type === "image" ? "photo memory" : "saved memory";
    return `Here is your ${memType} for "${title}".`;
  }

  if (content.toLowerCase() === title.toLowerCase() || content.split(/\s+/).length <= 2) {
    const memType = memory.type === "voice" ? "voice memo" : memory.type === "image" ? "photo memory" : "saved memory";
    return `Here is your ${memType} for "${title}": ${conversationalize(content)}.`;
  }

  // Present the memory's content as a clean, second-person recollection. The
  // memory itself stays the knowledge source; the source pill shows the title.
  let answer = conversationalize(content);
  answer = answer.charAt(0).toUpperCase() + answer.slice(1);
  if (!/[.!?]$/.test(answer)) answer += ".";

  return answer;
}

/**
 * Extract the topic from a retrieval query.
 * e.g. "Tell me about my birthday" → "your birthday"
 *      "Find my passport" → "your passport"
 *      "Show me my interview" → "your interview"
 */
function extractTopic(query) {
  // Normalize: lowercase and strip trailing punctuation so patterns can match.
  const q = (query || "")
    .toLowerCase()
    .trim()
    .replace(/[!?.,;:]+$/, "")
    .trim();
  // Match patterns like "tell me about X", "find X", "show me X", "what is X"
  const patterns = [
    /^tell me about (.+)$/,
    /^tell me (.+)$/,
    /^find (.+)$/,
    /^show me (.+)$/,
    /^show (.+)$/,
    /^what do you know (?:about )?(.+)$/,
    /^what (?:is|are|was|were) (.+)$/,
    /^when (?:is|was|are|were|did|will) (.+)$/,
    /^where (?:is|was|are|were|did) (.+)$/,
    /^who (?:is|are|was|were|did) (.+)$/,
    /^how (?:many|much|old|long|far) (.+)$/,
    /^do you know (?:about )?(.+)$/,
    /^can you (?:find|show|tell me about|recall) (.+)$/,
    /^could you (?:find|show|tell me about|recall) (.+)$/,
    /^remind me (?:about|of) (.+)$/,
    /^recall (.+)$/,
    /^search for (.+)$/,
  ];

  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match && match[1]) {
      let topic = match[1].trim().replace(/\s+/g, " ");
      // Convert "my X" → "your X" for natural phrasing
      topic = topic.replace(/^my /, "your ").replace(/^the /, "the ");
      return topic;
    }
  }

  // Fallback: use the whole query as the topic
  return q;
}

/**
 * Determine whether the query is a narration/explanation request
 * (e.g. "what happened", "describe", "narrate", "explain what happened").
 * These queries get a natural-language answer; retrieval queries do not.
 */
function isNarrationQuery(query) {
  const q = (query || "").toLowerCase().trim();
  const narrationPatterns = [
    "what happened", "describe", "narrate", "explain", "tell me the story",
    "what is", "what was", "when did", "how did", "why did", "who",
  ];
  return narrationPatterns.some((p) => q.startsWith(p) || q.includes(p));
}

// ================== Intent classification & targeted answer generation ==================

const MONTH_ALIASES =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec";

/**
 * Classify the user's intent so MindVault can answer intelligently instead of
 * always dumping the complete stored memory.
 *
 *   SPECIFIC_FACT            → precise answer from the relevant memory
 *   BROAD_SUMMARY            → concise, natural explanation
 *   EXPLICIT_MEMORY_REQUEST  → show the original full saved memory
 *   (ambiguity / no-match are handled separately using retrieved memories)
 */
function classifyIntent(query) {
  const q = (query || "").toLowerCase().trim();

  // 1) EXPLICIT_MEMORY_REQUEST — user explicitly wants the original/full saved content
  const explicitPatterns = [
    /show(?: me)? (?:my|the|this|that)? ?(?:original|full|saved|exact|complete)? ?.+memory/,
    /what exactly did i save/,
    /what did i (?:save|write|note|record|store) (?:about|for|on)/,
    /what(?: is|'s)? (?:saved|stored) (?:about|for|in)/,
    /(?:original|full|complete|entire|whole) memory/,
    /show me the (?:original|saved|full) (?:memory|version)/,
    /show me my .+ memory$/,
    /display my .+ memory/,
    /read (?:back|me) my .+ memory/,
  ];
  if (explicitPatterns.some((p) => p.test(q))) return "EXPLICIT_MEMORY_REQUEST";

  // 2) SPECIFIC_FACT — a direct, factual question expecting a precise answer
  const specificPatterns = [
    /\bwhen (?:is|was|are|were|did|will|does)\b/,
    /\bwhat (?:is|are|was|were|time|day|date|year|number|name)\b/,
    /\bwhere (?:is|was|are|were|did)\b/,
    /\bwho (?:is|are|was|were|did)\b/,
    /\bhow (?:many|much|old|long|far)\b/,
    /\bwhat day\b/,
    /\bwhat date\b/,
    /\bwhat time\b/,
  ];
  if (specificPatterns.some((p) => p.test(q))) return "SPECIFIC_FACT";

  // 3) Everything else defaults to a broad summary/explanation request
  return "BROAD_SUMMARY";
}

/** Extract readable date strings found in text (e.g. "24th November 2005", "November 24", "24/11/2005"). */
function extractDates(text) {
  const found = [];
  const reDay = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALIASES})\\s*,?\\s*(\\d{4})?\\b`,
    "gi"
  );
  let m;
  while ((m = reDay.exec(text)) !== null) found.push(m[0].replace(/\s+/g, " ").replace(/,$/, "").trim());
  const reMonth = new RegExp(
    `\\b(${MONTH_ALIASES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})?\\b`,
    "gi"
  );
  while ((m = reMonth.exec(text)) !== null) found.push(m[0].replace(/\s+/g, " ").replace(/,$/, "").trim());
  const reNumeric = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  while ((m = reNumeric.exec(text)) !== null) found.push(m[0]);
  return [...new Set(found)];
}

/** Extract a day of the week (Monday..Sunday) if present. */
function extractDayOfWeek(text) {
  const m = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(text || "");
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : null;
}

/** Convert first-person memory phrasing into second-person, conversational phrasing. */
function conversationalize(text) {
  return (text || "")
    .replace(/\bI'm\b/gi, "you are")
    .replace(/\bI was\b/gi, "you were")
    .replace(/\bI've\b/gi, "you have")
    .replace(/\bI'll\b/gi, "you will")
    .replace(/\bI am\b/gi, "you are")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bI\b/gi, "you")
    .replace(/\bme\b/gi, "you")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the most relevant sentence from memory content for the given query. */
function extractAnswerSentence(query, content) {
  if (!content) return null;
  const keywords = extractKeywords(query).filter((k) => k.length > 3);
  const sentences = String(content)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let best = null;
  let bestScore = -1;
  sentences.forEach((s) => {
    let score = 0;
    keywords.forEach((k) => {
      if (s.toLowerCase().includes(k)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  });
  if (best && bestScore >= 1) {
    let c = conversationalize(best);
    c = c.charAt(0).toUpperCase() + c.slice(1);
    return c;
  }
  return null;
}

// ================== Generic question understanding & attribute extraction ==================
// These are entirely generic: they infer what the user is asking (date, time,
// location, person, amount, reason, overview, value) and the concrete subject
// of the question. NO topic-specific logic (birthday, interview, etc.) exists.

const FUNCTION_WORDS = new Set([
  "when","what","where","who","whom","whose","why","how","which",
  "is","are","am","was","were","do","does","did","will","would","can","could","should","shall",
  "my","your","our","their","his","her","its","the","a","an","this","that","these","those",
  "me","i","you","we","they","he","she","it","please","about","of","for","on","in","at",
  "to","from","by","with","and","or","but","if","then","so","as","be","been","being",
  "have","has","had","tell","show","find","recall","remind","search","remember","get",
  "give","know","say","does","did","want","need","there"
]);

// Action verbs that signal the requested attribute but are dropped from the
// subject phrase (e.g. "expire" in "when does my car insurance expire").
const ATTRIBUTE_VERBS = new Set([
  "expire","expires","expiry","expiration","renew","renews","renewal","due","start","starts",
  "begin","begins","end","ends","finish","finishes","scheduled","schedule","happens","happen",
  "held","occurs","occur","takes","take","runs","run"
]);

// Words that mostly just signal the requested attribute (kept OUT of subject).
const PURE_ATTRIBUTE_WORDS = new Set([
  "time","date","day","year","month","location","address","place","when","where","who","how",
  "many","much","why","reason","what","price","cost","amount","fee"
]);

/**
 * Build a generic subject phrase from a question by removing function words,
 * pure-attribute words, and action/attribute verbs.
 *   "what time is my interview"        -> "interview"
 *   "when does my car insurance expire" -> "car insurance"
 *   "what is my project deadline"       -> "project deadline"
 *   "tell me about my birthday"         -> "birthday"
 */
function extractSubjectPhrase(q) {
  return (q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .filter(
      (w) => w.length > 1 &&
        !FUNCTION_WORDS.has(w) &&
        !ATTRIBUTE_VERBS.has(w) &&
        !PURE_ATTRIBUTE_WORDS.has(w)
    )
    .join(" ");
}

/** Subject terms used for relevance matching (min length 3 to avoid noise). */
function extractSubjectTerms(q) {
  return extractSubjectPhrase(q)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Understand what the user is actually asking (generic).
 * Returns { type, attribute, subject, questionLower }.
 */
function understandQuestion(query) {
  const q = (query || "").toLowerCase().trim();

  let type = "BROAD_SUMMARY";
  if (
    /show( me)? (?:my|the|this|that)? ?(?:original|full|saved|exact|complete)? ?.+memory/.test(q) ||
    /what exactly did i save/.test(q) ||
    /\b(?:original|full|complete|entire|whole) memory\b/.test(q) ||
    /show the (?:original|saved|full) (?:memory|version)/.test(q) ||
    /show me my .+ memory$/.test(q)
  ) {
    type = "EXPLICIT_MEMORY_REQUEST";
  } else if (
    /\b(when|what|where|who|whom|whose|why|how)\b/.test(q) ||
    /^\s*(what time|what day|what date|is my|are my)\b/.test(q)
  ) {
    type = "SPECIFIC_FACT";
  }

  let attribute = "value";
  if (/\bwhat time\b|\bat what time\b|\btime (is|of|for)\b/.test(q)) attribute = "time";
  else if (/\bwhere\b|\blocation\b|\baddress\b|\bplace\b/.test(q)) attribute = "location";
  else if (/\bwho\b|\bteammates?\b|\bcolleagues?\b/.test(q)) attribute = "person";
  else if (/\bhow (?:many|much)\b|\bprice\b|\bcost\b|\bamount\b|\bfee\b|\bcost\b/.test(q)) attribute = "amount";
  else if (/\bwhy\b|\breason\b/.test(q)) attribute = "reason";
  else if (
    /\bwhen\b|\bwhat (?:date|day|year)\b|\bdeadline\b|\bdue\b|\bexpire\w*\b|\brenew\w*\b|\bdate\b/.test(q)
  ) attribute = "date";
  else if (/\btell me about\b|\bwhat do you know\b|\bdescribe\b|\boverview\b|\bsummarize\b|\brecap\b/.test(q)) attribute = "overview";

  return { type, attribute, subject: extractSubjectPhrase(q), questionLower: q };
}


/** Extract a 12-hour time (e.g. "10 AM", "7:30 PM") if present. */
function extractTime(text) {
  const t = text || "";
  let m = /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b/i.exec(t);
  if (m) {
    const suffix = (m[3] || "").replace(/\./g, "").toUpperCase();
    return `${m[1]}:${m[2]} ${suffix}`.trim();
  }
  m = /\b(\d{1,2})\s*(am|pm)\b/i.exec(t);
  if (m) return `${m[1]} ${m[2].toUpperCase()}`;
  return null;
}

/** Extract a human location phrase (e.g. "at home", "in Delhi"). */
function extractPlace(text) {
  const m = /\b(?:at|in|to|near|from)\s+[A-Za-z][A-Za-z' -]{1,40}/.exec(text || "");
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

/** Extract capitalized proper-name sequences from the memory text. */
function extractNames(text, subject) {
  const sentences = String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const subjLeaf = String(subject || "").split(" ").pop().toLowerCase();
  const names = [];
  for (const s of sentences) {
    const low = s.toLowerCase();
    if (subjLeaf && low.includes(subjLeaf) || /teammate|colleague|team|with|partner/i.test(low) || !subjLeaf) {
      const found = s.match(/\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g) || [];
      found.forEach((n) => {
        if (/^(My|The|A|An|This|That|I|We|You|He|She|It)$/.test(n)) return;
        if (!names.includes(n)) names.push(n);
      });
    }
  }
  return names.slice(0, 5);
}

/** Clean an extracted value fragment. */
function cleanValue(v) {
  if (!v) return "";
  return String(v)
    .replace(/\s+/g, " ")
    .replace(/[.!,;]+$/, "")
    .trim();
}

/** Extract a simple value (after "is/are/:") from the sentence mentioning the subject. */
function extractSimpleValue(text, subject) {
  const sentences = String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const subjWords = String(subject || "").split(" ").filter((w) => w.length > 2);
  let cand = sentences.find((s) => subjWords.some((w) => s.toLowerCase().includes(w))) || sentences[0];
  if (!cand) return null;
  cand = cand.replace(/^(my|the|this|that|i|we)\s+/i, "");
  const m = cand.match(/(?:is|are|:|=|will be)\s+(.+)$/i);
  if (m) return cleanValue(m[1]);
  return cleanValue(cand.replace(/^[^:]+:\s*/, ""));
}

/** Does a memory share the core subject terms with the query? */
function hasSubjectMatch(memory, subjectTerms) {
  if (!subjectTerms || subjectTerms.length === 0) return true;
  const { fullString, titleKeywords, contentKeywords } = getMemoryText(memory);
  const headTerm = subjectTerms[subjectTerms.length - 1];
  const headMatches = fullString.includes(headTerm) ||
    titleKeywords.some((tk) => isSimilar(headTerm, tk)) ||
    contentKeywords.some((ck) => isSimilar(headTerm, ck));

  if (!headMatches) return false;

  return subjectTerms.some((term) =>
    fullString.includes(term) ||
    titleKeywords.some((tk) => isSimilar(term, tk)) ||
    contentKeywords.some((ck) => isSimilar(term, ck))
  );
}

/**
 * Detect genuine ambiguity: multiple memories representing distinct entities/companies
 * (e.g. Google interview on Aug 8 vs Microsoft interview on Aug 15) when the user
 * did not specify which one in their question.
 */
function detectEntityAmbiguity(userQuery, memories) {
  if (!memories || memories.length < 2) return null;

  const qa = understandQuestion(userQuery);
  const qLower = (userQuery || "").toLowerCase();

  const entities = memories.map((m) => {
    const text = `${m.title || ""} ${m.content || ""}`;
    const companyMatch = text.match(/\b(Google|Microsoft|Apple|Amazon|Meta|Netflix|Uber|Tesla|Twitter|LinkedIn|Stripe|Infosys|TCS|Wipro|Cognizant)\b/i);
    const dateMatch = extractDates(text);
    const timeMatch = extractTime(text);
    return {
      memory: m,
      company: companyMatch ? companyMatch[1] : null,
      date: dateMatch.length ? dateMatch[0] : null,
      time: timeMatch || null,
      title: m.title || "Untitled",
    };
  });

  const hasCompanies = entities.every((e) => e.company) && new Set(entities.map((e) => e.company.toLowerCase())).size > 1;

  if (hasCompanies) {
    const specified = entities.find((e) => e.company && qLower.includes(e.company.toLowerCase()));
    if (!specified) {
      const details = entities.map((e) => {
        let desc = `${e.company}`;
        if (e.date) desc += ` on ${e.date}`;
        if (e.time) desc += ` at ${e.time}`;
        return desc;
      });
      return `I have information about ${entities.length} interviews: ${details.join(" and ")}. Which interview would you like me to tell you about?`;
    }
  }

  return null;
}

/**
 * Resolve a short follow-up (e.g. "what time?") by inheriting the subject from
 * the previous user question. An explicit new topic (one that names its own
 * subject) overrides prior context.
 */
function resolveQueryWithContext(userMessage, context) {
  const currentSubject = extractSubjectPhrase(userMessage);
  const qa = understandQuestion(userMessage);
  const isBareFollowUp = (!currentSubject || currentSubject === "it") && qa.type === "SPECIFIC_FACT" && Array.isArray(context) && context.length > 0;
  if (isBareFollowUp) {
    const prevUser = [...context].reverse().find((m) => m.role === "user");
    if (prevUser && prevUser.content) {
      const prevQa = understandQuestion(prevUser.content);
      return { resolved: `${userMessage} ${prevUser.content}`, inheritedSubject: prevQa.subject };
    }
  }
  return { resolved: userMessage, inheritedSubject: "" };
}

/** Canonical day+month key so "24th November 2005" and "24th November" match. */
function dateKey(d) {
  let m = String(d).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)/i);
  if (m) return `${m[1].toLowerCase()}-${m[2].toLowerCase()}`;
  m = String(d).match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (m) return `${m[2].toLowerCase()}-${m[1].toLowerCase()}`;
  return String(d).toLowerCase();
}

/**
 * Are multiple distinct memories effectively the same logical fact?
 * Used to avoid asking the user to choose when every memory agrees.
 */
function areConsistent(memories, attribute) {
  if (!memories || memories.length < 2) return true;
  const texts = memories.map((m) => normalizeText(`${m.title || ""} ${m.content || ""}`));
  const allIdentical = texts.every((t) => texts[0] === t || texts[0].includes(t) || t.includes(texts[0]));
  if (allIdentical) return true;
  if (attribute === "date" || attribute === "time") {
    const sigs = memories.map((m) => {
      const t = `${m.title || ""} ${m.content || ""}`;
      if (attribute === "time") return JSON.stringify([extractTime(t)].map((x) => (x || "").toLowerCase()));
      return JSON.stringify(extractDates(t).map(dateKey));
    });
    return new Set(sigs).size === 1;
  }
  return false;
}

/** True when we genuinely have to ask the user which memory they mean. */
function isGenuinelyAmbiguous(memories, attribute, query = "") {
  if (!memories || memories.length < 2) return false;
  if (query && detectEntityAmbiguity(query, memories)) return true;
  if (attribute === "date" || attribute === "time") {
    return !areConsistent(memories, attribute);
  }
  return false;
}

/** A "vague topic" is a bare keyword/phrase rather than an actual question. */
function isVagueTopicQuery(query) {
  return !isQuestion(query);
}

/** Build a compact clarification prompt listing the candidate memories. */
function buildSelectionPrompt(query, memories) {
  const topic = extractTopic(query) || "that";
  const n = memories.length;
  const noun = n === 1 ? "memory" : "memories";
  // Check if all memories share the same title (same-name disambiguation)
  const titles = memories.map((m) => (m.title || "Untitled").toLowerCase());
  const allSameTitle = titles.length > 1 && new Set(titles).size === 1;
  if (allSameTitle) {
    return `I found ${n} memories both named "${memories[0].title || "Untitled"}". Which one would you like to revisit?`;
  }
  return `I found ${n} ${noun} about ${topic}. Which one would you like to know about?`;
}

/**
 * True when multiple candidate memories hold competing values (different dates,
 * times, or years) that the query does not resolve into a single fact. Only
 * memories that actually carry a value count, so complementary facets that
 * merely describe the same entity from different angles are NOT a conflict.
 */
function hasConflictingValues(memories) {
  if (!memories || memories.length < 2) return false;

  const dated = memories.map((m) => {
    const t = `${m.title || ""} ${m.content || ""}`;
    return extractDates(t).map(dateKey);
  }).filter((arr) => arr.length > 0);
  if (dated.length >= 2 && new Set(dated.map((a) => JSON.stringify(a))).size > 1) return true;

  const timed = memories.map((m) => {
    const tm = extractTime(`${m.title || ""} ${m.content || ""}`);
    return tm ? tm.toLowerCase() : null;
  }).filter(Boolean);
  if (timed.length >= 2 && new Set(timed).size > 1) return true;

  return false;
}

/**
 * True when the candidate memories carry distinct year markers (e.g. a memory
 * about 2005 vs one about 2026). A generic signal that the memories concern
 * different instances of the same subject and must be disambiguated.
 */
function hasDistinctYears(memories) {
  if (!memories || memories.length < 2) return false;
  const years = memories.map((m) => {
    const m2 = `${m.title || ""} ${m.content || ""}`.match(/\b(?:19|20)\d{2}\b/);
    return m2 ? m2[0] : null;
  });
  const present = years.filter(Boolean);
  return present.length >= 2 && new Set(present).size > 1;
}

/**
 * Core generic "ambiguity / selection stage" for the personal-assistant chat.
 *
 * Returns a clarification prompt whenever the user must choose between multiple
 * relevant memories BEFORE any answer is generated, otherwise returns null so
 * normal single-memory answer generation proceeds. This is deliberately generic
 * (no topic-specific hardcoding): it handles distinct entities, conflicting
 * values, distinct year markers, and bare topic keywords.
 */
function detectSelectionAmbiguity(query, attribute, memories) {
  if (!memories || memories.length < 2) return null;

  // 1) Multiple distinct entities the query does not pin down (companies, etc.)
  const entityText = detectEntityAmbiguity(query, memories);
  if (entityText) return entityText;

  // 2) Memories competing for the same fact (different dates/times/years).
  if (hasConflictingValues(memories) || hasDistinctYears(memories)) {
    return buildSelectionPrompt(query, memories);
  }

  // 3) Attribute-specific conflict (e.g. two different dates for "when is my X").
  if ((attribute === "date" || attribute === "time") && !areConsistent(memories, attribute)) {
    return buildSelectionPrompt(query, memories);
  }

  // 4) A broad / summary request (e.g. "tell me about my interview", "what do
  //    you know about...") that spans multiple genuinely relevant memories ->
  //    let the user pick the specific memory rather than merging them.
  if (attribute === "overview") {
    return buildSelectionPrompt(query, memories);
  }

  // 5) A vague topic keyword (e.g. just "birthday") with multiple memories.
  if (isVagueTopicQuery(query)) {
    return buildSelectionPrompt(query, memories);
  }

  return null;
}


/**
 * SPECIFIC_FACT — return the smallest complete answer that satisfies the question.
 * Only ever uses facts present in the memory; never invents data.
 */
function generateSpecificFactAnswer(query, memory) {
  const qa = understandQuestion(query);
  const text = `${memory.title || ""} ${memory.content || ""}`;
  const subject = qa.subject || "";
  const attribute = qa.attribute;

  // Generic day-of-week nuance (e.g. "What day was I born?").
  if (attribute === "date" && /\bwhat day\b|\bday of the week\b/.test(qa.questionLower)) {
    const dow = extractDayOfWeek(text);
    if (dow) {
      return /\bborn\b/.test(qa.questionLower)
        ? `You were born on ${dow}.`
        : `Your ${subject || "memory"} is on ${dow}.`;
    }
  }

  switch (attribute) {
    case "time": {
      const time = extractTime(text);
      if (time) {
        const dates = extractDates(text);
        if (dates.length) return `Your ${subject} is at ${time} on ${dates[0]}.`;
        return `Your ${subject} is at ${time}.`;
      }
      return `I couldn't find the time for your ${subject || "memory"} in your saved memories.`;
    }
    case "location": {
      const loc = extractPlace(text);
      if (loc) return `Your ${subject} is ${loc}.`;
      return `I couldn't find the location for your ${subject || "memory"} in your saved memories.`;
    }
    case "person": {
      const names = extractNames(text, subject);
      if (names.length) return `Your ${subject} are: ${names.join(", ")}.`;
      break;
    }
    case "amount": {
      const m = /\$\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\s*(?:rupees?|rs\.?|dollars?|euros?|pounds?))?\b/.exec(text);
      if (m) return `The amount for your ${subject || "memory"} is ${m[0].trim()}.`;
      break;
    }
    case "date": {
      const dates = extractDates(text);
      if (dates.length) {
        const d = dates[0];
        const low = qa.questionLower;
        if (/\brenew\w*\b/.test(low)) return `You need to renew your ${subject || "memory"} in ${d}.`;
        if (/\bexpire\w*|\bexpiry\b/.test(low)) return `Your ${subject || "memory"} expires on ${d}.`;
        if (/\bdeadline\b|\bdue\b/.test(low)) return `Your ${subject || "memory"} is ${d}.`;
        if (/\b(?:start|begin)s?\b/.test(low)) return `Your ${subject || "memory"} starts on ${d}.`;
        if (/\b(?:end|finish)(?:es|s)?\b/.test(low)) return `Your ${subject || "memory"} ends on ${d}.`;
        return `Your ${subject || "memory"} is on ${d}.`;
      }
      return `I couldn't find the date for your ${subject || "memory"} in your saved memories.`;
    }
    default: {
      const v = extractSimpleValue(text, subject);
      if (v) return `Your ${subject || "memory"}: ${v}.`;
      break;
    }
  }

  // Generic fallback: surface the single most relevant sentence.
  const sentence = extractAnswerSentence(query, memory.content || "");
  if (sentence) return sentence;

  const content = (memory.content || "").trim();
  if (content) {
    let c = conversationalize(content);
    c = c.charAt(0).toUpperCase() + c.slice(1);
    return c;
  }
  return `From your memory "${memory.title || "Untitled"}": I couldn't find the specific detail you asked about.`;
}

/** Extract a location phrase (e.g. "at home with relatives"). */
function extractLocation(text) {
  const m = /\b(?:at|in|to|near)\s+[A-Za-z][A-Za-z' -]{1,40}/.exec(text || "");
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

/**
 * BROAD_SUMMARY — summarize the relevant memory naturally & conversationally.
 */
function generateBroadSummaryAnswer(query, memory) {
  const content = (memory.content || "").trim();
  const title = memory.title || "Untitled";
  if (!content) {
    return `I have a memory saved as "${title}". What would you like to know about it?`;
  }
  let summary = conversationalize(content);
  summary = summary.charAt(0).toUpperCase() + summary.slice(1);
  return summary;
}

/**
 * EXPLICIT_MEMORY_REQUEST — show the complete original saved memory verbatim.
 * The stored memory is never modified; this is purely a presentation layer.
 */
function generateFullMemoryResponse(memories) {
  if (!memories || memories.length === 0) return "I couldn't find any saved memory.";
  return memories
    .slice(0, 5)
    .map((m) => {
      const title = m.title || "Untitled";
      const content = (m.content || "").trim();
      if (!content) return `Memory — ${title}:\n(no written content)`;
      return `Memory — ${title}:\n${content}`;
    })
    .join("\n\n");
}

/**
 * AMBIGUOUS_MULTI_MEMORY — multiple distinct/conflicting memories: ask the user
 * which one they mean. The memories are also attached as selectable sources.
 */
function generateAmbiguousResponse(topic, memories) {
  const list = memories
    .slice(0, 5)
    .map((m, i) => `${i + 1}. ${m.title || "Untitled"}`)
    .join("\n");
  const n = memories.length;
  const noun = n === 1 ? "memory" : "memories";
  return `I found ${n} ${noun} related to ${topic}. Which one would you like to know about?\n\n${list}\n\nYou can select a memory above to view it.`;
}

/**
 * Synthesize a natural answer from the retrieved memories.
 *
 * Two modes:
 * 1. Retrieval mode (default): only states that memories were found and their count.
 *    Memory contents are NOT duplicated in the response — they appear in SOURCES.
 * 2. Narration mode: for "what happened/describe/explain" queries, generates a
 *    short natural-language explanation from the top memory's content.
 *
 * Only uses information present in the memories — never invents facts.
 */
function synthesizeAnswer(query, rankedMemories, conflicts) {
  const topic = extractTopic(query);

  if (rankedMemories.length === 0) {
    return `I couldn't find any memories related to ${topic}.`;
  }

  // If there are conflicts, report them instead of guessing
  if (conflicts.length > 0) {
    const c = conflicts[0];
    const aTitle = c.memoryA.title || "one memory";
    const bTitle = c.memoryB.title || "another memory";
    const aDates = c.datesA.join(", ");
    const bDates = c.datesB.join(", ");
    return `I found conflicting memories about ${topic}.\n\nOne memory (${aTitle}) says ${aDates}, while another (${bTitle}) says ${bDates}.\n\nPlease review the memories below to determine the correct information.`;
  }

  // Retrieval mode: state the count only, do not duplicate content
  if (!isNarrationQuery(query)) {
    const count = rankedMemories.length;
    if (count === 1) {
      return `I found a memory related to ${topic}.`;
    }
    return `I found ${count} memories related to ${topic}.`;
  }

  // Narration mode: generate a short explanation from the top memory
  const primary = rankedMemories[0];
  const primaryContent = (primary.content || "").trim();
  const primaryTitle = primary.title || "Untitled";

  let answer = "";
  if (primaryContent) {
    const cleaned = primaryContent
      .replace(/^(my|the|this|that)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    answer = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else {
    answer = primaryTitle;
  }

  // Add related memories as brief supplementary context (narration only)
  const related = rankedMemories.slice(1);
  if (related.length > 0) {
    const relatedFacts = related
      .map((m) => (m.content || "").trim())
      .filter((c) => c.length > 0)
      .slice(0, 2);

    if (relatedFacts.length > 0) {
      const relatedText = relatedFacts
        .map((f) => f.replace(/^(my|the|this|that)\s+/i, "").replace(/\s+/g, " ").trim())
        .join("; ");
      answer += `\n\nI also found a related memory: ${relatedText}`;
    }
  }

  return answer;
}

function isSaveIntent(text) {
  const lower = text.toLowerCase().trim();
  const savePrefixes = [
    "remember that", "remember", "save note", "save memory", "add memory",
    "note down", "note that", "keep note", "store this", "my "
  ];

  if (savePrefixes.some(prefix => lower.startsWith(prefix))) {
    if (!lower.endsWith("?") && !lower.startsWith("what is my") && !lower.startsWith("when is my") && !lower.startsWith("where is my")) {
      return true;
    }
  }

  if ((lower.includes(" is ") || lower.includes(" are ")) && !lower.endsWith("?") && !isQuestion(text)) {
    return true;
  }

  return false;
}

function isQuestion(text) {
  const questionStarts = [
    "when", "what", "where", "who", "why", "how", "remind", "tell me",
    "show", "find", "recall", "do you", "can you", "could you", "is there",
    "is", "are", "was", "were", "which", "search"
  ];
  const lower = text.toLowerCase().trim();
  if (lower.endsWith("?")) return true;
  return questionStarts.some((kw) => lower.startsWith(kw) || lower.includes(` ${kw} `));
}

function isUpdateIntent(text) {
  const updateKeywords = ["change", "update", "modify", "edit", "replace", "forget", "remove"];
  return updateKeywords.some((kw) => text.toLowerCase().includes(kw));
}

function isGreeting(text) {
  const greetings = ["hi", "hello", "hey", "greetings", "good morning", "good evening", "good afternoon", "help"];
  const lower = text.toLowerCase().trim();
  return greetings.some(g => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"));
}

function matchImageMemory(attachment, userMessage, imageMemories) {
  if (!imageMemories || imageMemories.length === 0) return null;

  const lowerMsg = (userMessage || "").toLowerCase();
  const attachName = (attachment?.name || "").toLowerCase();
  const attachData = (attachment?.previewUrl || "").trim();

  // 1. Check exact or partial data match (base64 or URL)
  if (attachData) {
    const dataMatch = imageMemories.find((m) => {
      const mData = (m.mediaData || m.mediaUrl || m.imageUrl || "").trim();
      if (!mData) return false;
      if (mData === attachData) return true;
      if (mData.length > 80 && attachData.length > 80) {
        return mData.slice(0, 80) === attachData.slice(0, 80) || mData.slice(-80) === attachData.slice(-80);
      }
      return false;
    });
    if (dataMatch) return dataMatch;
  }

  // 2. Check filename / title match
  if (attachName) {
    const cleanAttachName = attachName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " ").trim();
    const nameMatch = imageMemories.find((m) => {
      const mName = (m.mediaName || "").toLowerCase();
      const mTitle = (m.title || "").toLowerCase();
      if (mName && (mName === attachName || mName.includes(cleanAttachName) || cleanAttachName.includes(mName))) return true;
      if (mTitle && (mTitle === cleanAttachName || cleanAttachName.includes(mTitle) || mTitle.includes(cleanAttachName))) return true;
      return false;
    });
    if (nameMatch) return nameMatch;
  }

  // 3. Keyword matching across image memories
  const keywords = lowerMsg.split(/[\s,\.!?;:]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !["image", "photo", "picture", "file", "attached", "tell", "know", "about", "this", "what"].includes(w));
  if (keywords.length > 0) {
    let bestMem = null;
    let maxScore = 0;
    imageMemories.forEach((m) => {
      const title = (m.title || "").toLowerCase();
      const content = (m.content || "").toLowerCase();
      const tags = (Array.isArray(m.tags) ? m.tags.join(" ") : m.tags || "").toLowerCase();
      let score = 0;
      keywords.forEach((kw) => {
        if (title.includes(kw)) score += 5;
        if (content.includes(kw)) score += 3;
        if (tags.includes(kw)) score += 4;
      });
      if (score > maxScore) {
        maxScore = score;
        bestMem = m;
      }
    });
    if (bestMem && maxScore > 0) return bestMem;
  }

  // 4. If image attachment is present or user asks about "this image / this photo"
  if (attachment || /\b(this image|this photo|this picture|what is this|tell (?:me )?(?:what you know|about this))\b/i.test(lowerMsg)) {
    return imageMemories[0];
  }

  return null;
}

function generateImageMemoryAnswer(memory, userMessage) {
  const title = memory.title || "Image";
  const content = (memory.content || "").trim();
  const dateFormatted = memory.date ? new Date(memory.date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "";

  if (content) {
    return `Based on your saved memory **${title}**${dateFormatted ? ` (saved on ${dateFormatted})` : ""}, you noted that *"${content}"*.`;
  }
  return `This matches your saved memory **${title}**${dateFormatted ? ` (${dateFormatted})` : ""}.`;
}

async function processChatLogic(userMessage, userId, selectedMemoryId = null, context = null) {
  // If a specific memory is selected, use it as the primary context
  if (selectedMemoryId) {
    const memory = await findById("memories", selectedMemoryId);
    if (!memory || memory.userId !== userId) {
      return {
        response: "Sorry, I couldn't access that memory.",
        relatedMemories: [],
      };
    }

    const response = generateResponseFromMemory(memory);
    return {
      response,
      selectedMemoryInfo: {
        id: memory.id,
        title: memory.title || "Untitled",
      },
      relatedMemories: [{
        ...memory,
        _relevance: "primary",
      }],
    };
  }

  const allMemories = await getCollection("memories", { userId });
  const memories = allMemories.filter((m) => !m.deleted);
  const allPeople = await getCollection("people", { userId });

  let response = "";
  let relatedMemories = [];
  let selectedMemoryInfo = null;
  let requiresSelection = false;

  const lowerMsg = userMessage.toLowerCase().trim();
  const attachment = context?.attachment || null;
  const imageMemories = memories.filter((m) => m.type === "image" || m.imageUrl || m.mediaUrl || m.mediaData);

  // ── MULTIMODAL IMAGE RETRIEVAL ──────────────────────────────────────────
  if (attachment || /\b(this image|this photo|this picture|attached (?:file|image|photo)|tell (?:me )?(?:what you know|about this image|about this photo))\b/i.test(userMessage)) {
    const matchedImage = matchImageMemory(attachment, userMessage, imageMemories);
    if (matchedImage) {
      const responseText = generateImageMemoryAnswer(matchedImage, userMessage);
      return {
        response: responseText,
        selectedMemoryInfo: {
          id: matchedImage.id,
          title: matchedImage.title || "Image Memory",
        },
        relatedMemories: [{
          ...matchedImage,
          _relevance: "primary",
        }],
        requiresSelection: false,
      };
    }
  }

  if (isGreeting(userMessage)) {
    response = "Hello! I'm MindVault, your second brain. You can ask me questions about your saved memories or contacts!";
  } else if (isQuestion(userMessage) || searchMemories(userMessage, memories).length > 0) {
    // Resolve short follow-ups against recent conversation context (generic).
    const resolved = resolveQueryWithContext(userMessage, (context && context.conversation) || []);
    const usedQuery = resolved.resolved;
    const memoryMatches = searchMemories(usedQuery, memories);
    const peopleMatches = searchPeople(usedQuery, allPeople);

    if (peopleMatches.length > 0) {
      const person = peopleMatches[0];
      response = `Here is what I have for ${person.name}:\n`;
      if (person.notes) response += `• Notes: ${person.notes}\n`;
      if (person.phone) response += `• Phone: ${person.phone}\n`;
      if (person.email) response += `• Email: ${person.email}\n`;
      if (person.birthday) response += `• Birthday: ${person.birthday}\n`;

      if (memoryMatches.length > 0) {
        relatedMemories = memoryMatches.slice(0, 3);
      }
    } else if (memoryMatches.length > 0) {
      // Classify user intent to guide the answer strategy.
      const qa = understandQuestion(usedQuery);
      const intent = qa.type;
      const attribute = qa.attribute;
      const factExtractor = require("./factExtractor.js");

      // Rank by relevance (primary → related → weak); drop weak unless nothing better.
      const ranked = memoryMatches
        .map((m) => ({ memory: m, relevance: classifyRelevance(m, usedQuery) }))
        .sort((a, b) => {
          const order = { primary: 0, related: 1, weak: 2 };
          return order[a.relevance] - order[b.relevance];
        });
      const strongMatches = ranked.filter((r) => r.relevance !== "weak");
      const finalRanked = strongMatches.length > 0 ? strongMatches : ranked;

      // Deduplicate truly identical memories (same content); same-title memories
      // with different content are intentionally preserved as distinct.
      const rankedMems = finalRanked.map((r) => r.memory);
      const duplicateGroups = detectDuplicates(rankedMems);
      const deduped = duplicateGroups.map((group) => group[0]);

      // ── DECISION TREE ────────────────────────────────────────────────────────
      // 0 matches → unreachable here (handled in outer else)
      // 1 match   → always answer directly.
      // N matches →
      //   (a) same title on any pair        → ask to choose (different saved entries)
      //   (b) conflicting date/time values  → ask to choose
      //   (c) distinct year markers         → ask to choose
      //   (d) distinct named entities (e.g. Google vs Microsoft) → ask to choose
      //   (e) vague bare-keyword query      → ask to choose
      //   (f) complementary facets (same event, different aspects) → synthesize

      // ── DECISION: confirmation + clickable memory option(s) ────────────────
      // The actual answer is ONLY produced after the user picks a memory
      // (see selectMemoryFromChat). We never merge or dump multiple memories.
      relatedMemories = deduped.map((m) => {
        const rel = finalRanked.find((r) => r.memory.id === m.id);
        return { ...m, _relevance: rel ? rel.relevance : "related" };
      });

      // ── SINGLE-STEP DIRECT AI ANSWER VIA GROQ LLM OR DIRECT SYNTHESIS ──
      // Pass all candidate memories directly to Groq LLM for synthesis
      const conversationHistory = context?.conversation || [];
      const responseStyle = context?.responseStyle || "concise";
      const groqAnswer = await synthesizeWithGroqLLM(usedQuery, deduped, conversationHistory, responseStyle);


      if (groqAnswer) {
        response = groqAnswer;
        selectedMemoryInfo = { id: deduped[0].id, title: deduped[0].title || "Untitled" };
        requiresSelection = false;
      } else if (intent === "EXPLICIT_MEMORY_REQUEST") {
        response = generateFullMemoryResponse(deduped);
        selectedMemoryInfo = { id: deduped[0].id, title: deduped[0].title || "Untitled" };
        requiresSelection = false;
      } else {
        // Deterministic direct synthesis from top matched memory
        const matched = deduped[0];
        response = answerFromSelectedMemory(usedQuery, matched);
        selectedMemoryInfo = { id: matched.id, title: matched.title || "Untitled" };
        requiresSelection = false;
      }
    } else {
      response = "I couldn't find a memory related to that.";
    }
  } else if (isUpdateIntent(userMessage)) {
    const matches = searchMemories(userMessage, memories);

    if (matches.length > 0) {
      response = `I found a memory to update: "${matches[0].title}"\n\nPlease use the edit option on the memory page to update it.`;
      relatedMemories = [matches[0]];
    } else {
      response = "I couldn't find a memory to update. Can you tell me which memory title or keyword you mean?";
    }
  } else {
    response = "I'm here to help you search and recall your memories. Try asking a question about your saved memories or contacts!";
  }

  return { response, relatedMemories, selectedMemoryInfo, requiresSelection: false };
}

async function synthesizeWithGroqLLM(userQuery, candidateMemories, conversationHistory = [], responseStyle = "concise") {
  const groqApiKey = process.env.GROQ_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!groqApiKey && !openaiApiKey) {
    return null;
  }

  const memoryContext = candidateMemories.map((m, idx) => {
    return `[Memory ${idx + 1}] Title: ${m.title || "Untitled"}\nContent: ${m.content || "No text content"}\nType: ${m.type || "text"}\nDate: ${m.createdAt || m.date || "Unknown"}\nTags: ${(m.tags || []).join(", ") || "None"}`;
  }).join("\n\n");

  let formatInstruction = "Be concise, direct, natural, and helpful.";
  if (responseStyle === "bullet") {
    formatInstruction = "Format your answer with clear, structured bullet points (- or •) highlighting key facts, dates, and people.";
  } else if (responseStyle === "detailed") {
    formatInstruction = "Provide a comprehensive, detailed answer with full context, background, and explanations from the memories.";
  }

  const systemPrompt = `You are MindVault's intelligent second-brain assistant.
The user is asking a question to recall information from their personal memory vault.
Below are the relevant memories retrieved from their vault:

${memoryContext}

INSTRUCTIONS:
1. Directly and clearly answer the user's question using the provided memory context.
2. ${formatInstruction}
3. If the user asks for a specific fact (e.g., birthday, date, password, code, place, list), state that fact immediately and accurately.
4. Only rely on facts present in the provided memories.`;


  const messages = [
    { role: "system", content: systemPrompt },
    ...(conversationHistory || []).slice(-4).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: userQuery },
  ];

  if (groqApiKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const errText = await groqRes.text().catch(() => "");
        console.warn(`[Groq LLM] Chat completion returned ${groqRes.status}:`, errText);
      }
    } catch (groqErr) {
      console.warn("[Groq LLM] Chat synthesis notice:", groqErr.message);
    }
  }

  if (openaiApiKey) {
    try {
      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
    } catch (openaiErr) {
      console.warn("[OpenAI LLM] Chat synthesis notice:", openaiErr.message);
    }
  }

  return null;
}

async function sendChatMessage(req, res) {
  try {
    const { content, selectedMemoryId, conversation, attachment, responseStyle } = req.body;
    if (!content) return res.status(400).json({ error: "Message content required" });

    const userId = req.user.id;
    const priorMessages = Array.isArray(conversation) ? conversation : [];

    const { response, relatedMemories, selectedMemoryInfo, requiresSelection } = await processChatLogic(
      content,
      userId,
      selectedMemoryId,
      { conversation: priorMessages, attachment, responseStyle }
    );


    const userMsg = {
      id: generateId(),
      userId,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const formattedReferenced = (relatedMemories || []).map((m) => ({
      id: m.id,
      title: m.title || "Untitled",
      content: m.content || "",
      preview: (m.content || m.title || "").substring(0, 100),
      type: m.type || "text",
      mediaUrl: m.mediaUrl || m.imageUrl || m.audioUrl,
      relevance: m._relevance || "related",
    }));

    const botMsg = {
      id: generateId(),
      userId,
      role: "assistant",
      content: response,
      answer: response,
      requiresSelection: false,
      selectedMemory: selectedMemoryInfo ? {
        id: selectedMemoryInfo.id,
        title: selectedMemoryInfo.title || "Untitled",
      } : undefined,
      referencedMemories: formattedReferenced,
      relatedMemories: formattedReferenced,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({
      answer: response,
      referencedMemories: formattedReferenced,
      user: userMsg,
      assistant: botMsg,
    });
  } catch (err) {
    console.error("Error processing chat:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
}


/**
 * Answer a user's query using a SINGLE selected memory only (never other
 * memories). Specific-fact questions get a precise fact extracted from that
 * memory; broad questions get a summary of that one memory; otherwise the
 * memory's recollection is shown. Always grounded in the selected memory.
 */
function answerFromSelectedMemory(query, memory) {
  if (!memory) return "I couldn't find a memory related to that.";
  const q = (query || "").toLowerCase().trim();
  const title = (memory.title || "").trim();
  const content = (memory.content || "").trim();

  // 1. Direct nickname resolution
  if (/\bnickname\b/i.test(q) || /\bnickname\b/i.test(content) || /\bnickname\b/i.test(title)) {
    const nickMatch = content.match(/([a-zA-Z0-9_\s-]+)\s+is\s+my\s+nickname/i) ||
                      content.match(/my\s+nickname\s+is\s+([a-zA-Z0-9_\s-]+)/i);
    if (nickMatch && nickMatch[1]) {
      const val = nickMatch[1].trim();
      const cap = val.charAt(0).toUpperCase() + val.slice(1);
      return `Your nickname is ${cap}.`;
    }
    if (title) {
      return `Your nickname is ${title}.`;
    }
  }

  // 2. Try structured fact extraction
  const qa = understandQuestion(query || "");
  const fe = require("./factExtractor.js");

  try {
    if (qa.type === "SPECIFIC_FACT") {
      const facts = fe.extractFacts([memory]);
      const factAns = fe.answerFromFacts(query, facts);
      if (factAns && factAns.answer) return factAns.answer;
      const specificAns = generateSpecificFactAnswer(query, memory);
      if (specificAns) return specificAns;
    }
    if (qa.type === "BROAD_SUMMARY") {
      const synth = fe.synthesizeBroadAnswer(query, [memory]);
      if (synth) return synth;
    }
  } catch (err) {
    console.error("Error in factExtractor answer synthesis:", err);
  }

  // 3. Conversational direct answer from memory content
  if (content) {
    if (content.toLowerCase() === title.toLowerCase() || content.split(/\s+/).length <= 2) {
      const memType = memory.type === "voice" ? "voice memo" : memory.type === "image" ? "photo memory" : "saved memory";
      return `Here is your ${memType} for "${title}": ${conversationalize(content)}.`;
    }
    let ans = conversationalize(content);
    if (!/[.!?]$/.test(ans)) ans += ".";
    return ans;
  }

  if (title) {
    const memType = memory.type === "voice" ? "voice memo" : memory.type === "image" ? "photo memory" : "saved memory";
    return `Here is your ${memType} for "${title}".`;
  }

  return generateResponseFromMemory(memory);
}

/**
 * Handle a user clicking a source/memory card in the chat.
 * Retrieves the memory with ownership verification and generates a
 * response based solely on that memory.
 */
async function selectMemoryFromChat(req, res) {
  try {
    const { memoryId, userQuery } = req.body;
    if (!memoryId) {
      return res.status(400).json({ error: "Memory ID required" });
    }

    const memory = await findById("memories", memoryId);
    if (!memory || memory.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }

    const response = answerFromSelectedMemory(userQuery || "", memory);

    const botMsg = {
      id: generateId(),
      userId: req.user.id,
      role: "assistant",
      content: response,
      selectedMemory: {
        id: memory.id,
        title: memory.title || "Untitled",
      },
      relatedMemories: [{
        id: memory.id,
        title: memory.title || "Untitled",
        preview: (memory.content || memory.title || "").substring(0, 100),
        relevance: "primary",
      }],
      timestamp: new Date().toISOString(),
    };

    res.status(200).json({ assistant: botMsg });
  } catch (err) {
    console.error("Error selecting memory from chat:", err);
    res.status(500).json({ error: "Failed to process memory selection" });
  }
}

async function updateMemoryFromChat(req, res) {
  const { memoryId } = req.params;
  const { content, title } = req.body;

  if (!content && !title) {
    return res.status(400).json({ error: "Content or title required" });
  }

  try {
    const existing = await findById("memories", memoryId);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Memory not found" });
    }

    const updates = {};
    if (title) updates.title = title;
    if (content) updates.content = content;

    const updated = await updateOne("memories", memoryId, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update memory: " + err.message });
  }
}

module.exports = {
  sendChatMessage,
  updateMemoryFromChat,
  processChatLogic,
  selectMemoryFromChat,
};


// Exported pure helpers (used for unit verification of intent/answer logic)
module.exports.classifyIntent = classifyIntent;
module.exports.generateSpecificFactAnswer = generateSpecificFactAnswer;
module.exports.generateBroadSummaryAnswer = generateBroadSummaryAnswer;
module.exports.generateFullMemoryResponse = generateFullMemoryResponse;
module.exports.generateAmbiguousResponse = generateAmbiguousResponse;
module.exports.extractTopic = extractTopic;
module.exports.extractDates = extractDates;
module.exports.extractDayOfWeek = extractDayOfWeek;
module.exports.understandQuestion = understandQuestion;
module.exports.extractSubjectPhrase = extractSubjectPhrase;
module.exports.extractSubjectTerms = extractSubjectTerms;
module.exports.resolveQueryWithContext = resolveQueryWithContext;
module.exports.isGenuinelyAmbiguous = isGenuinelyAmbiguous;
module.exports.detectEntityAmbiguity = detectEntityAmbiguity;
module.exports.detectSelectionAmbiguity = detectSelectionAmbiguity;
module.exports.isVagueTopicQuery = isVagueTopicQuery;
module.exports.buildSelectionPrompt = buildSelectionPrompt;
module.exports.hasConflictingValues = hasConflictingValues;
module.exports.hasDistinctYears = hasDistinctYears;
module.exports.searchMemories = searchMemories;
module.exports.generateResponseFromMemory = generateResponseFromMemory;
module.exports.answerFromSelectedMemory = answerFromSelectedMemory;
module.exports.conversationalize = conversationalize;
module.exports.areConsistent = areConsistent;
module.exports.extractTime = extractTime;

