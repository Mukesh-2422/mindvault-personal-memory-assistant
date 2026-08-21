const fs = require('fs');
const FE_PATH = 'controllers/factExtractor.js';
let fe = fs.readFileSync(FE_PATH, 'utf8');
const sep = fe.includes('\r\n') ? '\r\n' : '\n';
const join = (arr) => arr.join(sep);

const oldBlock = join([
  '  memories.forEach((m) => {',
  "    const text = (m.content || m.title || '').trim();",
  '    if (!text) return;',
  '',
  "    const sentences = text.split(/(?<=[.!?])\\s+/).map((s) => s.trim()).filter(Boolean);",
  '    sentences.forEach((s) => {',
  '      let conv = cc.conversationalize(s);',
  '      conv = conv.charAt(0).toUpperCase() + conv.slice(1);',
  '      if (!keySentences.some((k) => k.toLowerCase() === conv.toLowerCase())) {',
  '        keySentences.push(conv);',
  '      }',
  '    });',
  '  });',
]);

const newBlock = join([
  '  // Scope broad questions ("tell me about my favourite place") to facts about the',
  '  // requested entity when the question is a preference question naming a single',
  '  // category noun (place/person/food/...). This stops a multi-fact memory from',
  '  // leaking unrelated facts (e.g. favourite food/person when only place was asked).',
  '  // Conservative: only triggers for explicit preference questions with one clear',
  '  // focus noun, and always falls back to the full passage if it would drop every sentence.',
  '  const _ql = (query || "").toLowerCase();',
  '  const _hasFavourite = /\\b(favourite|favorite)\\b/.test(_ql) ||',
  '    /\\b(?:like|love|prefer|preferred|enjoy)\\b/.test(_ql);',
  '  let focusNoun = "";',
  '  if (_hasFavourite) {',
  '    const _nouns = _ql.replace(/[^a-z0-9\\s\']/g, " ").split(/\\s+/)',
  '      .filter((w) => w.length > 2 && !FUNCTION_WORDS.has(w) && !INTENT_AUX.has(w)',
  '        && w !== "favourite" && w !== "favorite");',
  '    if (_nouns.length === 1) focusNoun = _nouns[0];',
  '  }',
  '',
  '  memories.forEach((m) => {',
  "    const text = (m.content || m.title || '').trim();",
  '    if (!text) return;',
  '',
  "    const sentences = text.split(/(?<=[.!?])\\s+/).map((s) => s.trim()).filter(Boolean);",
  '    const pool = focusNoun',
  '      ? sentences.filter((s) => s.toLowerCase().includes(focusNoun))',
  '      : sentences;',
  '    const chosen = pool.length ? pool : sentences;',
  '    chosen.forEach((s) => {',
  '      let conv = cc.conversationalize(s);',
  '      conv = conv.charAt(0).toUpperCase() + conv.slice(1);',
  '      if (!keySentences.some((k) => k.toLowerCase() === conv.toLowerCase())) {',
  '        keySentences.push(conv);',
  '      }',
  '    });',
  '  });',
]);

const count = fe.split(oldBlock).length - 1;
if (count !== 1) { console.error('FAIL synthesizeBroadAnswer forEach: found ' + count + ' matches'); process.exitCode = 1; process.exit(process.exitCode); }
fe = fe.replace(oldBlock, newBlock);
fs.writeFileSync(FE_PATH, fe);
console.log('OK synthesizeBroadAnswer forEach: replaced 1 match');

