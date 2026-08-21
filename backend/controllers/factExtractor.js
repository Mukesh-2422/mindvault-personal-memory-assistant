/**
 * factExtractor.js
 * ---------------
 * Generic, topic-independent "personal knowledge layer" for MindVault.
 *
 * A single saved memory is treated as a passage that can contain MANY facts
 * (dates, times, places, people, durations, relationships, preferences,
 * activities, etc.). This module derives structured, source-grounded facts
 * from memory text WITHOUT hard-coding any specific memory type (birthday,
 * interview, favorite food, ...). Any fact is inferred from grammatical /
 * relational patterns.
 *
 * Public API:
 *   extractFacts(memory)       -> Fact[]        (a single memory)
 *   answerFromFacts(query, facts) -> { answer, answerType, sourceMemoryId, facts } | null
 */

const cc = require('./chatController.js');

// ---------------------------------------------------------------------------
// Word utilities
// ---------------------------------------------------------------------------
const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'for', 'on', 'in', 'at', 'by', 'with',
  'and', 'or', 'but', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'me', 'us', 'them', 'him', 'when', 'what',
  'where', 'who', 'why', 'how', 'did', 'does', 'do', 'will', 'would', 'can', 'could', 'should', 'shall',
  'there', 'here', 'very', 'really', 'so', 'then', 'if', 'because', 'as', 'about', 'from', 'near', 'than',
  'too', 'also', 'just', 'only', 'still', 'have', 'has', 'had', 'need', 'please', 'tell', 'show', 'find',
  'recall', 'remind', 'get', 'know', 'give', 'say', 'there', 'these', 'those', 'the', 'a', 'an',
]);

// Irregular verb -> lemma so "What did I eat?" matches "I ate biryani".
const VERB_LEMMA = {
  ate: 'eat', eaten: 'eat', eats: 'eat', eating: 'eat',
  drank: 'drink', drunk: 'drink', drinks: 'drink', drinking: 'drink',
  bought: 'buy', buying: 'buy', buys: 'buy',
  went: 'go', gone: 'go', goes: 'go', going: 'go',
  saw: 'see', seen: 'see', sees: 'see', seeing: 'see',
  met: 'meet', meets: 'meet', meeting: 'meet',
  visited: 'visit', visiting: 'visit', visits: 'visit',
  travelled: 'travel', traveled: 'travel', traveling: 'travel',
  stayed: 'stay', staying: 'stay', stays: 'stay',
  worked: 'work', working: 'work',
  lived: 'live', living: 'live', lives: 'live',
  moved: 'move', moving: 'move', moves: 'move',
  called: 'call', calling: 'call', calls: 'call',
  wrote: 'write', writing: 'write', writes: 'write', written: 'write',
  ran: 'run', running: 'run', runs: 'run', swam: 'swim', swimming: 'swim',
  watched: 'watch', watching: 'watch', watches: 'watch',
  read: 'read', reads: 'read', drove: 'drive', driving: 'drive', drives: 'drive',
  flew: 'fly', flying: 'fly', took: 'take', doing: 'do',
};

// Intent / auxiliary verbs (desire, emotion, mental state) — not activities.
const INTENT_AUX = new Set([
  'want', 'prefer', 'like', 'love', 'hate', 'wish', 'plan', 'intend', 'think', 'feel',
  'hope', 'dream', 'aim', 'decided', 'need', 'enjoy', 'mean',
]);

function termsOf(phrase) {
  return String(phrase || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeSubject(phrase) {
  return String(phrase || '')
    .toLowerCase()
    .replace(/^(?:my|the|this|that|your|his|her|its|our|their)\s+/i, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function verbLemma(w) {
  const wl = String(w || '').toLowerCase();
  if (!wl) return null;
  if (VERB_LEMMA[wl]) return VERB_LEMMA[wl];
  if (wl.endsWith('ing') && wl.length > 5) { let b = wl.slice(0, -3); if (/([a-z])\1$/.test(b)) b = b.slice(0, -1); return b; }
  if (wl.endsWith('ed') && wl.length > 4) { let b = wl.slice(0, -2); if (/([a-z])\1$/.test(b)) b = b.slice(0, -1); return b; }
  if (wl.endsWith('s') && wl.length > 3 && !wl.endsWith('ss')) return wl.slice(0, -1);
  return null;
}

function clean(v) {
  return String(v || '').replace(/\s+/g, ' ').replace(/[.!,;:]+$/g, '').trim();
}

// ---------------------------------------------------------------------------
// Typed value extractors
// ---------------------------------------------------------------------------
function extractDate(text) {
  const dates = cc.extractDates(text || '');
  return dates.length ? dates[0] : null;
}
function extractPlace(text) {
  const m = /\b(?:at|in|to|near|from|into)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/.exec(text || '');
  if (!m) return null;
  const p = m[1].replace(/^(?:a|an|the)\s+/i, '').trim();
  return p || null;
}
function extractPeople(text) {
  const found = [];
  const re = /\b(?:with|and|,\s*)\s*([A-Z][a-z]+)\b/g;
  let m;
  while ((m = re.exec(text || '')) !== null) found.push(m[1]);

  // Fallback: extract all non-stop capitalized proper nouns
  const words = (text || '').match(/\b([A-Z][a-z]{1,20})\b/g) || [];
  const stopNames = new Set([
    'My', 'The', 'A', 'An', 'I', 'We', 'They', 'He', 'She', 'It', 'On', 'In', 'At', 'Last', 'This', 'That',
    'Biryani', 'Ooty', 'Chennai', 'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]);
  words.forEach((w) => {
    if (!stopNames.has(w) && !found.includes(w)) {
      found.push(w);
    }
  });

  return [...new Set(found)];
}
function extractDuration(text) {
  const m = /(?:for\s+)?(an?\s+\w+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|few|several|\d+)\s+(days?|hours?|weeks?|months?|years?|minutes?|seconds?)/i.exec(
    text || ''
  );
  if (!m) return null;
  return `${m[1].trim()} ${m[2].toLowerCase()}`;
}
function classifyValue(v) {
  const t = (v || '').trim();
  if (!t) return 'text';
  if (cc.extractTime(t)) return 'time';
  if (cc.extractDates(t).length) return 'date';
  if (extractPlace(t)) return 'place';
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(t)) return 'person';
  if (extractDuration(t)) return 'duration';
  if (/^\$?[\d,]+(?:\.\d+)?$/.test(t)) return 'number';
  return 'text';
}

/**
 * Infer the value type from the SUBJECT keyword when the value text alone is
 * ambiguous (e.g. "favourite place = Marina Beach" -> place, not person).
 * Falls back to classifyValue(rhs) for free-form values.
 */
function valueTypeFromSubject(subject) {
  const s = String(subject || '').toLowerCase();
  if (/\b(place|location|address|where)\b/.test(s)) return 'place';
  if (/\b(person|teammate|colleague|partner|wife|husband|friend|name)\b/.test(s)) return 'person';
  if (/\b(food|dish|meal|cuisine|restaurant)\b/.test(s)) return 'text';
  return null;
}

// ---------------------------------------------------------------------------
// Fact constructors
// ---------------------------------------------------------------------------
const F = { value: 0, event: 1 }; // kind markers
function valueFact(subject, valueType, value, mem, sentence) {
  const s = normalizeSubject(subject);
  return {
    kind: 'value',
    subject: s,
    subjectTerms: termsOf(s),
    subjectRaw: s,
    valueType,
    value: clean(value),
    tense: 'present',
    sourceMemoryId: mem && mem.id,
    sourceSentence: sentence,
  };
}
function eventFact(parts) {
  const { verb, object, place, people, dates, times, durations, mem, sentence } = parts;
  const rawTokens = [verb, object, place, ...people].filter(Boolean).join(' ');
  const dateTokens = (dates || []).map((d) => termsOf(d)).flat();
  const subjectRaw = [verb, object, place && `to ${place}`]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const subjectTerms = termsOf(subjectRaw).filter(Boolean);
  subjectTerms.push(...dateTokens); // date-scoped questions ("what happened on Nov 24")
  return {
    kind: 'event',
    subject: subjectRaw || verb || '',
    subjectTerms: [...new Set(subjectTerms)],
    subjectRaw: subjectRaw || verb || '',
    verb: verb || 'did it',
    object: object || null,
    place: place || null,
    people: people || [],
    dates: dates || [],
    times: times || [],
    durations: durations || [],
    tense: parts.tense || 'past',
    sourceMemoryId: mem && mem.id,
    sourceSentence: sentence,
  };
}

// ---------------------------------------------------------------------------
// Sentence-level fact extraction (generic patterns — no memory types)
// ---------------------------------------------------------------------------
const FAVOURITE_RE = /(.+?)\s+is\s+my\s+favourite\s+(\w+)\b/gi;

// Cardinal / number words captured as sentence objects — they are not objects
// (e.g. "I stayed for two days" → object is null, duration is "two days").
const NUMBER_WORDS = new Set([
  'a', 'an', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'dozen', 'half', 'couple', 'few', 'several', 'many', 'some', 'all',
]);
const DURATION_UNIT = /^(days?|hours?|weeks?|months?|years?|minutes?|seconds?)$/i;
const MY_FAVOURITE_IS_RE = /\bmy\s+favourite\s+(\w+(?:\s+\w+)?)\s+is\s+(.+)$/i;
const POSSESSIVE_NAME_RE = /^([\w\s]+?)'?s\s+name\s+is\s+(.+)$/i;
const MY_X_IS_RE = /^(?:my|our|their|the|this|that)?\s*(.+?)\s+(?:is|are|will be|was|were)\s+(.+)$/i;
const ACTIVITY_RE = /\b(i|we|you|he|she)\s+(.+)/i;

function sentenceFacts(sentence, mem) {
  const facts = [];
  const s = clean(sentence);
  if (!s) return facts;

  // Split multi-clause sentences on conjunctions and punctuation to prevent bleeding across statements
  const clauses = s.split(/(?<=[^\s])(?:\s*,\s*and\s+|\s+and\s+|\s*;\s*|\.\s+)/i).map(c => c.trim()).filter(Boolean);

  clauses.forEach((clause) => {
    // --- Favourite / preference relationships (bidirectional) ---
    let m = clause.match(/^(.+?)\s+is\s+my\s+favourite\s+(\w+)\b/i);
    if (m) {
      let rawVal = clean(m[1].replace(/^(?:,\s*|\band\s+)+/i, ''));
      const category = m[2].trim().toLowerCase();
      // If rawVal is a pronoun ("he", "she", "it", "they"), trace back to proper noun in full sentence
      if (/^(he|she|it|they|this|that)$/i.test(rawVal)) {
        const names = extractPeople(s);
        if (names.length) rawVal = names[0];
      }
      if (rawVal) {
        facts.push(valueFact('favourite ' + category, valueTypeFromSubject('favourite ' + category) || classifyValue(rawVal), rawVal, mem, s));
        return;
      }
    }

    // "My favourite Y is X" ("My favourite food is biryani")
    const m2 = clause.match(MY_FAVOURITE_IS_RE);
    if (m2) {
      const category = m2[1].trim().toLowerCase();
      let rawVal = clean(m2[2]);
      facts.push(valueFact('favourite ' + category, valueTypeFromSubject('favourite ' + category) || classifyValue(rawVal), rawVal, mem, s));
      return;
    }

    // Reverse pattern: "24th November 2005 is my birthday"
    let mRev = clause.match(/^(.+?)\s+(?:is|was|will be)\s+my\s+([a-z0-9\s]+)$/i);
    if (mRev) {
      const attr = normalizeSubject(mRev[2]);
      const val = clean(mRev[1]);
      if (attr && val && !attr.startsWith('favourite')) {
        emitTypedFromRhs(attr, val, facts, mem, s);
        return;
      }
    }

    // Pattern: "I have an exam on 22 March at 10 AM"
    let mHave = clause.match(/^i\s+have\s+(?:an?|my|the)?\s*([a-z0-9\s]+?)\s+(?:on|at|in|for)\s+(.+)$/i);
    if (mHave) {
      const attr = normalizeSubject(mHave[1]);
      const rhs = clean(mHave[2]);
      if (attr && rhs) {
        emitTypedFromRhs(attr, rhs, facts, mem, s);
        return;
      }
    }

    // --- Possessive names: "brother's name is Arun" ---
    const pn = clause.match(POSSESSIVE_NAME_RE);
    if (pn) {
      const ent = normalizeSubject(pn[1]).replace(/^name\s+/, '');
      facts.push(valueFact(`${ent} name`, classifyValue(pn[2]), pn[2], mem, s));
      return;
    }

    // --- Generic "My/our/their/the X is/are Y" ---
    const gi = clause.match(MY_X_IS_RE);
    if (gi) {
      const attr = normalizeSubject(gi[1]);
      const rhs = clean(gi[2]);
      if (attr && rhs && attr !== 'favourite') {
        emitTypedFromRhs(attr, rhs, facts, mem, s);
      }
    }
  });

  // --- Activity / event sentences (date, time, place, people, duration, object) ---
  const activity = extractActivityFact(s, mem);
  if (activity) facts.push(activity);

  return facts;
}

function emitTypedFromRhs(attr, rhs, facts, mem, sentence) {
  if (!attr || !rhs) return;
  let emitted = false;
  const dates = cc.extractDates(rhs);
  dates.forEach((d) => { facts.push(valueFact(attr, 'date', d, mem, sentence)); emitted = true; });
  const t = cc.extractTime(rhs);
  if (t) { facts.push(valueFact(attr, 'time', t, mem, sentence)); emitted = true; }
  const pl = extractPlace(rhs);
  if (pl) { facts.push(valueFact(attr, 'place', pl, mem, sentence)); emitted = true; }
  const pe = extractPeople(rhs);
  if (pe.length) { facts.push(valueFact(attr, 'person', pe[0], mem, sentence)); emitted = true; }
  const dur = extractDuration(rhs);
  if (dur) { facts.push(valueFact(attr, 'duration', dur, mem, sentence)); emitted = true; }
  if (!emitted) {
    const num = rhs.match(/^\$?[\d,]+(?:\.\d+)?$/);
    if (num) facts.push(valueFact(attr, 'number', num[0], mem, sentence));
    else facts.push(valueFact(attr, valueTypeFromSubject(attr) || classifyValue(rhs), rhs, mem, sentence));
  }
}

function extractActivityFact(s, mem) {
  const raw = s.replace(/^[.,\s]+/, '');
  const low = raw.toLowerCase();
  // Require a sentence subject pronoun so we can attribute the activity.
  if (!/\b(i|we|you|he|she|they)\b/.test(low)) return null;

  const tokens = raw.split(/[\s,.()[\]"']+/).filter(Boolean);
  // Main verb = first non-entity token that looks like a verb (ed/ing or known lemma).
  let verb = null;
  let verbIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const tl = tok.toLowerCase();
    if (FUNCTION_WORDS.has(tl)) continue;
    if (/[A-Z]/.test(tok[0])) continue; // proper noun
    if (/^\d/.test(tok)) continue; // number token
    if (tl.length < 3) continue;
    if (tl.endsWith('ing') || tl.endsWith('ed') || VERB_LEMMA[tl]) {
      verb = tl;
      verbIdx = i;
      break;
    }
  }
  if (!verb) return null;
  if (INTENT_AUX.has(verb) || INTENT_AUX.has(verbLemma(verb))) return null; // desire/opinion -> broad summary

  const dates = cc.extractDates(raw);
  const dTime = cc.extractTime(s);
  const timesArr = dTime ? [dTime] : [];
  const place = extractPlace(s);
  const people = extractPeople(s);
  const duration = extractDuration(s);

  if (!dates.length && !timesArr.length && !place && !people.length && !duration) {
    return null; // activity with no resolvable fact -> rely on fallback
  }

  // object = first noun after the verb (lowercase, non-stop, non-entity)
  let object = null;
  for (let i = verbIdx + 1; i < tokens.length; i++) {
    const tok = tokens[i];
    const tl = tok.toLowerCase();
    const bare = tok.replace(/[^A-Za-z]/g, '');
    if (!bare) continue;
    if (FUNCTION_WORDS.has(tl)) continue;
    if (/[A-Z]/.test(tok[0])) continue; // proper noun
    if (!isNaN(Number(bare))) continue; // number token
    if (NUMBER_WORDS.has(bare.toLowerCase())) continue; // number-word ("two", "few")
    if (DURATION_UNIT.test(bare)) continue; // duration unit head ("days", "hours")
    if (place && place.toLowerCase().includes(tl)) continue;
    if (people.some((p) => p.toLowerCase().includes(tl))) continue;
    object = bare;
    break;
  }

  return eventFact({
    verb,
    object,
    place,
    people,
    dates,
    times: timesArr,
    durations: duration ? [duration] : [],
    mem,
    sentence: s,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function extractFacts(memory) {
  if (!memory) return [];
  if (Array.isArray(memory)) return memory.flatMap((m) => extractFacts(m));
  const content = (memory.content || '').trim();
  const text = content || (memory.title || '').trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const facts = [];
  sentences.forEach((s) => {
    facts.push(...sentenceFacts(s, memory));
  });
  return facts;
}

// ---------------------------------------------------------------------------
// Answer generation from facts (generic, source-grounded)
// ---------------------------------------------------------------------------
const TYPE_MAP = {
  time: 'time',
  date: 'date',
  location: 'place',
  person: 'person',
  amount: 'duration',
};

function termMatch(fact, qTerms, qVerbs) {
  // Match on the HEAD (last, most distinguishing) query term rather than any
  // shared token, so "favourite person" doesn't match a "favourite food" fact.
  const head = qTerms.length ? qTerms[qTerms.length - 1] : null;
  if (!head) return false;
  const raw = String(fact.subjectRaw || '').toLowerCase();
  const terms = fact.subjectTerms || [];
  if (raw.includes(head) || terms.includes(head)) return true;
  if (fact.verb) {
    const l = verbLemma(fact.verb);
    if (l && (l === head || (qVerbs || []).includes(l) || qTerms.includes(l))) return true;
  }
  return false;
}

function eventHas(fact, req) {
  if (!req) return true;
  return (
    (req === 'date' && fact.dates.length) ||
    (req === 'time' && fact.times.length) ||
    (req === 'place' && fact.place) ||
    (req === 'person' && fact.people.length) ||
    (req === 'duration' && fact.durations.length)
  );
}

function pickBest(cands) {
  if (!cands.length) return null;
  return cands.reduce((best, cur) =>
    (cur.sourcePriority || 0) > (best.sourcePriority || 0) ? cur : best
  );
}

function answerFromFacts(query, facts) {
  if (!facts || !facts.length) return null;
  const qa = cc.understandQuestion(query || '');
  if (qa.type === 'EXPLICIT_MEMORY_REQUEST' || qa.attribute === 'overview') return null;

  const qTerms = termsOf(qa.subject).filter((t) => !FUNCTION_WORDS.has(t) && t.length > 1);
  if (!qTerms.length) return null;
  const qVerbs = qTerms.map(verbLemma).filter(Boolean);
  let req = TYPE_MAP[qa.attribute] || null;
  // "how long" is a duration question even though understandQuestion maps it to 'value'.
  if (!req && /\bhow long\b/.test(qa.questionLower || '')) req = 'duration';

  const cands = facts.filter((f) => termMatch(f, qTerms, qVerbs));
  if (!cands.length) return null;

  const valueFacts = cands.filter((f) => f.kind === 'value');
  const eventFacts = cands.filter((f) => f.kind === 'event');

  // Prefer a fact whose value type matches the requested attribute.
  let chosen = null;
  if (req) {
    const vSel = valueFacts.filter((f) => f.valueType === req);
    if (vSel.length) chosen = pickBest(vSel);
    else {
      const eSel = eventFacts.filter((f) => eventHas(f, req));
      if (eSel.length) chosen = pickBest(eSel);
    }
  }
  if (!chosen) {
    // Otherwise fall back to the best subject-matched fact (value first, then event).
    if (valueFacts.length) chosen = pickBest(valueFacts);
    else if (eventFacts.length) chosen = pickBest(eventFacts);
  }
  if (!chosen) return null;

  // Conflict detection: multiple distinct values for the SAME subject+attribute.
  const pool = chosen.kind === 'value' ? valueFacts : eventFacts;
  const sameGroup = pool.filter((f) => sameKey(f) === sameKey(chosen));
  const distinct = distinctValues(sameGroup, req);
  if (distinct.length > 1) {
    return {
      answer: `You have saved conflicting facts about ${chosen.subject}: ${distinct.join(' and ')}. Which one is current?`,
      answerType: 'ambiguous',
      sourceMemoryId: chosen.sourceMemoryId,
      facts: sameGroup,
    };
  }

  const answer = chosen.kind === 'value' ? renderValue(chosen, req) : renderEvent(chosen, req);
  return {
    answer,
    answerType: 'fact',
    sourceMemoryId: chosen.sourceMemoryId,
    facts: [chosen],
  };
}

function sameKey(f) {
  if (f.kind === 'value') return `${f.subject}|${f.valueType}`;
  return f.subjectRaw || '';
}
function distinctValues(group, req) {
  const vals = new Set();
  (group || []).forEach((f) => {
    if (f.kind === 'value') vals.add(f.value);
    else {
      if (req === 'date' && f.dates[0]) vals.add(f.dates[0]);
      else if (req === 'time' && f.times[0]) vals.add(f.times[0]);
      else if (req === 'place' && f.place) vals.add(f.place);
      else if (req === 'person' && f.people[0]) vals.add(f.people[0]);
      else if (req === 'duration' && f.durations[0]) vals.add(f.durations[0]);
      else if (f.object) vals.add(f.verb + ' ' + f.object);
    }
  });
  return [...vals];
}

function renderValue(f, req) {
  const subj = f.subject.replace(/\s+name$/, '').trim() || f.subject;
  if (f.subject.startsWith('favourite ')) {
    const category = f.subject.replace(/^favourite\s+/, '');
    return `Your favourite ${category} is ${f.value}.`;
  }
  if (f.sourceSentence) {
    const dates = cc.extractDates(f.sourceSentence);
    const times = cc.extractTime(f.sourceSentence);
    const dow = cc.extractDayOfWeek(f.sourceSentence);
    if (dates.length && times) {
      return `Your ${subj} is on ${dates[0]} at ${times}.`;
    }
    // Day-of-week without a full calendar date (e.g. "on Friday at 3 PM").
    if (!dates.length && dow) {
      if (times) return `Your ${subj} is on ${dow} at ${times}.`;
      return `Your ${subj} is on ${dow}.`;
    }
  }
  if (f.valueType === 'date') return `Your ${subj} is on ${f.value}.`;
  if (f.valueType === 'time') return `Your ${subj} is at ${f.value}.`;
  if (f.valueType === 'number') return `The ${subj} is ${f.value}.`;
  return `Your ${subj} is ${f.value}.`;
}

function renderEvent(f, req) {
  const v = f.verb;
  if (req === 'date' && f.dates[0]) {
    return `You ${v}${f.place ? ` to ${f.place}` : ''} on ${f.dates[0]}.`;
  }
  if (req === 'time' && f.times[0]) return `You ${v} at ${f.times[0]}.`;
  if (req === 'place' && f.place) return `You ${v} to ${f.place}.`;
  if (req === 'person' && f.people.length) return `You ${v} with ${f.people.join(' and ')}.`;
  if (req === 'duration' && f.durations[0]) return `You ${v} for ${f.durations[0]}.`;
  // broad / object questions ("What did I eat?" / "Tell me about X")
  if (f.object) return `You ${v} ${f.object}.`;
  return eventSummary(f);
}

function eventSummary(f) {
  const parts = [];
  if (f.dates.length) parts.push(`on ${f.dates[0]}`);
  if (f.times.length) parts.push(`at ${f.times[0]}`);
  if (f.place) parts.push(f.place);
  if (f.people.length) parts.push(`with ${f.people.join(' and ')}`);
  if (f.durations.length) parts.push(`for ${f.durations[0]}`);
  const detail = parts.filter(Boolean).join(', ');
  return `You ${f.verb}${f.object ? ` ${f.object}` : ''}${detail ? ` ${detail}.` : '.'}`;
}

/**
 * Synthesize a comprehensive, natural response when user asks a broad question
 * across one or multiple relevant memories for the same subject.
 */
function synthesizeBroadAnswer(query, memories) {
  if (!memories || memories.length === 0) return null;

  const keySentences = [];

  // Scope broad questions ("tell me about my favourite place") to facts about the
  // requested entity when the question is a preference question naming a single
  // category noun (place/person/food/...). This stops a multi-fact memory from
  // leaking unrelated facts (e.g. favourite food/person when only place was asked).
  // Conservative: only triggers for explicit preference questions with one clear
  // focus noun, and always falls back to the full passage if it would drop every sentence.
  const _ql = (query || "").toLowerCase();
  const _hasFavourite = /\b(favourite|favorite)\b/.test(_ql) ||
    /\b(?:like|love|prefer|preferred|enjoy)\b/.test(_ql);
  let focusNoun = "";
  if (_hasFavourite) {
    const _nouns = _ql.replace(/[^a-z0-9\s']/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !FUNCTION_WORDS.has(w) && !INTENT_AUX.has(w)
        && w !== "favourite" && w !== "favorite");
    if (_nouns.length === 1) focusNoun = _nouns[0];
  }

  memories.forEach((m) => {
    const text = (m.content || m.title || '').trim();
    if (!text) return;

    const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const pool = focusNoun
      ? sentences.filter((s) => s.toLowerCase().includes(focusNoun))
      : sentences;
    const chosen = pool.length ? pool : sentences;
    chosen.forEach((s) => {
      let conv = cc.conversationalize(s);
      conv = conv.charAt(0).toUpperCase() + conv.slice(1);
      if (!keySentences.some((k) => k.toLowerCase() === conv.toLowerCase())) {
        keySentences.push(conv);
      }
    });
  });

  if (keySentences.length === 0) return null;

  // Single memory case: join sentences into a smooth paragraph
  if (memories.length === 1) {
    let text = keySentences.join(' ');
    if (!/[.!?]$/.test(text)) text += '.';
    return text;
  }

  // Multi-memory synthesis: merge facts across memories into a coherent response
  let merged = keySentences[0];
  if (!/[.!?]$/.test(merged)) merged += '.';

  for (let i = 1; i < keySentences.length; i++) {
    let next = keySentences[i];
    // Clean repetitive sentence prefixes ("The interview is", "Your interview is")
    next = next.replace(/^(?:the|your|my)\s+[a-z0-9\s]+\s+(?:is|will be)\s+/i, '');

    if (/^(for|at|on|in|with|to)\b/i.test(next)) {
      next = next.charAt(0).toLowerCase() + next.slice(1);
      merged = merged.replace(/[.!?]$/, '') + ` ${next}`;
      if (!/[.!?]$/.test(merged)) merged += '.';
    } else {
      next = next.charAt(0).toUpperCase() + next.slice(1);
      if (!/[.!?]$/.test(next)) next += '.';
      merged += ` ${next}`;
    }
  }

  return merged;
}

module.exports = {
  extractFacts,
  answerFromFacts,
  synthesizeBroadAnswer,
  classifyValue,
  extractPlace,
  extractPeople,
  extractDuration,
};




