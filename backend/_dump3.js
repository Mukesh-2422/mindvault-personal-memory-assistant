const fs = require('fs');

// ---- Patch chatController.js ----
const CC_PATH = 'controllers/chatController.js';
let cc = fs.readFileSync(CC_PATH, 'utf8');
const sepCc = cc.includes('\r\n') ? '\r\n' : '\n';
const joinCc = (arr) => arr.join(sepCc);

const oldGetMemoryText = joinCc([
  'function getMemoryText(mem) {',
  '  const title = mem.title || "";',
  '  const content = mem.content || "";',
  '  const category = mem.category || "";',
  '  const tags = Array.isArray(mem.tags) ? mem.tags.join(" ") : mem.tags || "";',
  '  const relatedPerson = mem.relatedPerson || "";',
  '  let checklistText = "";',
  '  if (Array.isArray(mem.checklist)) {',
  '    checklistText = mem.checklist.map((item) => item.text || "").join(" ");',
  '  }',
  '  return {',
  '    titleKeywords: extractKeywords(title),',
  '    contentKeywords: extractKeywords(`${content} ${category} ${tags} ${relatedPerson} ${checklistText}`),',
  '    fullString: `${title} ${content} ${category} ${tags} ${relatedPerson} ${checklistText}`.toLowerCase(),',
  '  };',
  '}',
]);

const newGetMemoryText = joinCc([
  'function canonicalizePreference(text) {',
  '  const s = String(text || "").toLowerCase();',
  '  // Align preference phrasing ("X the most", "would like the most", US "favorite")',
  '  // with the canonical "favourite" token typically used when memories are saved.',
  '  // This is a no-op for ordinary (non-preference) queries/memories.',
  '  return s',
  '    .replace(/\\b(?:would\\s+like|would\\s+love|like|loved|loves|liked|prefer|preferred|enjoy)\\s+(?:the\\s+)?most\\b/g, "favourite")',
  '    .replace(/\\bfavorite\\b/g, "favourite");',
  '}',
  '',
  'function getMemoryText(mem) {',
  '  const title = mem.title || "";',
  '  const content = mem.content || "";',
  '  const category = mem.category || "";',
  '  const tags = Array.isArray(mem.tags) ? mem.tags.join(" ") : mem.tags || "";',
  '  const relatedPerson = mem.relatedPerson || "";',
  '  let checklistText = "";',
  '  if (Array.isArray(mem.checklist)) {',
  '    checklistText = mem.checklist.map((item) => item.text || "").join(" ");',
  '  }',
  '  const contentPart = `${content} ${category} ${tags} ${relatedPerson} ${checklistText}`;',
  '  return {',
  '    titleKeywords: extractKeywords(canonicalizePreference(title)),',
  '    contentKeywords: extractKeywords(canonicalizePreference(contentPart)),',
  '    fullString: canonicalizePreference(`${title} ${contentPart}`),',
  '  };',
  '}',
]);

const oldSearchHead = joinCc([
  'function searchMemories(userMessage, memories) {',
  '  const subjectTerms = extractSubjectTerms(userMessage);',
  '  const scores = memories.map((mem) => ({',
  '    memory: mem,',
  '    score: getRelevanceScore(userMessage, mem),',
  '    subjectMatch: subjectTerms.length ? hasSubjectMatch(mem, subjectTerms) : true,',
  '  }));',
]);

const newSearchHead = joinCc([
  'function searchMemories(userMessage, memories) {',
  '  // Canonicalize preference phrasing so "like the most"/"favorite" aligns with',
  '  // memories saved as "favourite". No-op for non-preference queries.',
  '  const query = canonicalizePreference(userMessage);',
  '  const subjectTerms = extractSubjectTerms(query);',
  '  const scores = memories.map((mem) => ({',
  '    memory: mem,',
  '    score: getRelevanceScore(query, mem),',
  '    subjectMatch: subjectTerms.length ? hasSubjectMatch(mem, subjectTerms) : true,',
  '  }));',
]);

function replaceOnce(label, text, oldStr, newStr) {
  const count = text.split(oldStr).length - 1;
  if (count !== 1) { console.error('FAIL ' + label + ': found ' + count + ' matches (expected 1)'); process.exitCode = 1; return text; }
  console.log('OK   ' + label + ': replaced 1 match');
  return text.replace(oldStr, newStr);
}

cc = replaceOnce('chatController getMemoryText', cc, oldGetMemoryText, newGetMemoryText);
cc = replaceOnce('chatController searchMemories head', cc, oldSearchHead, newSearchHead);
fs.writeFileSync(CC_PATH, cc);

// ---- Patch factExtractor.js ----
const FE_PATH = 'controllers/factExtractor.js';
let fe = fs.readFileSync(FE_PATH, 'utf8');
const sepFe = fe.includes('\r\n') ? '\r\n' : '\n';
const joinFe = (arr) => arr.join(sepFe);

const oldBlock = joinFe([
  '  if (f.sourceSentence) {',
  '    const dates = cc.extractDates(f.sourceSentence);',
  '    const times = cc.extractTime(f.sourceSentence);',
  '    if (dates.length && times) {',
  '      return `Your ${subj} is on ${dates[0]} at ${times}.`;',
  '    }',
  '  }',
]);

const newBlock = joinFe([
  '  if (f.sourceSentence) {',
  '    const dates = cc.extractDates(f.sourceSentence);',
  '    const times = cc.extractTime(f.sourceSentence);',
  '    const dow = cc.extractDayOfWeek(f.sourceSentence);',
  '    if (dates.length && times) {',
  '      return `Your ${subj} is on ${dates[0]} at ${times}.`;',
  '    }',
  '    // Day-of-week without a full calendar date (e.g. "on Friday at 3 PM").',
  '    if (!dates.length && dow) {',
  '      if (times) return `Your ${subj} is on ${dow} at ${times}.`;',
  '      return `Your ${subj} is on ${dow}.`;',
  '    }',
  '  }',
]);

fe = replaceOnce('factExtractor renderValue', fe, oldBlock, newBlock);
fs.writeFileSync(FE_PATH, fe);

console.log('done');

