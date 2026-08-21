/**
 * Comprehensive test suite for MindVault's chat logic (backend).
 * Framework-free: uses Node's built-in `assert`. Run with `node chatLogic.test.js`.
 *
 * Covers the GENERIC, topic-independent reasoning layer:
 *   - intent classification
 *   - question understanding (subject + attribute)
 *   - date / time / day extraction
 *   - specific-fact answer generation
 *   - structured fact layer (single multi-fact memory)
 *   - cross-memory reasoning & conflict detection
 *   - follow-up context resolution
 *   - ambiguity / consistency detection
 *   - no-contamination guarantees
 */
const assert = require('assert');
const cc = require('./controllers/chatController.js');
const { extractFacts, answerFromFacts } = require('./controllers/factExtractor.js');

let pass = 0;
let fail = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    pass++;
    results.push({ name, ok: true });
  } catch (err) {
    fail++;
    results.push({ name, ok: false, message: err && err.message ? err.message : String(err) });
  }
}
const eq = (actual, expected, name) => test(name, () => {
  assert.strictEqual(actual, expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
});
const truthy = (cond, name, actual) => test(name, () => {
  assert.ok(cond, `expected truthy, got: ${JSON.stringify(actual)}`);
});
const contains = (haystack, needle, name) => test(name, () => {
  assert.ok(String(haystack).includes(needle), `expected "${needle}" in: ${JSON.stringify(haystack)}`);
});

// =========================================================
// 1. Intent classification
// =========================================================
test('intent: interview date -> SPECIFIC_FACT', () => {
  assert.strictEqual(cc.classifyIntent('When is my interview?'), 'SPECIFIC_FACT');
});
test('intent: deadline -> SPECIFIC_FACT', () => { assert.strictEqual(cc.classifyIntent('When is the deadline?'), 'SPECIFIC_FACT'); });
test('intent: favorite restaurant -> SPECIFIC_FACT', () => { assert.strictEqual(cc.classifyIntent('What is my favorite restaurant?'), 'SPECIFIC_FACT'); });
test('intent: teammates -> SPECIFIC_FACT (person)', () => {
  assert.strictEqual(cc.classifyIntent('Who are my teammates?'), 'SPECIFIC_FACT');
});
test('intent: meeting location -> SPECIFIC_FACT (location)', () => {
  assert.strictEqual(cc.classifyIntent('Where is my meeting?'), 'SPECIFIC_FACT');
});
test('intent: birthday summary -> BROAD_SUMMARY', () => {
  assert.strictEqual(cc.classifyIntent('Tell me about my birthday'), 'BROAD_SUMMARY');
});
test('intent: "what happened" -> BROAD_SUMMARY', () => {
  assert.strictEqual(cc.classifyIntent('What happened on August 8?'), 'BROAD_SUMMARY');
});
test('intent: explicit memory request', () => {
  assert.strictEqual(cc.classifyIntent('Show me my birthday memory'), 'EXPLICIT_MEMORY_REQUEST');
  assert.strictEqual(cc.classifyIntent('What exactly did I save about my trip?'), 'EXPLICIT_MEMORY_REQUEST');
});

// =========================================================
// 2. Question understanding
// =========================================================
test('understandQuestion: birthday date', () => {
  const r = cc.understandQuestion('When is my birthday?');
  assert.strictEqual(r.type, 'SPECIFIC_FACT');
  assert.strictEqual(r.attribute, 'date');
  assert.ok(/birthday/.test(r.subject), `subject: ${r.subject}`);
});
test('understandQuestion: interview time', () => {
  const r = cc.understandQuestion('What time is my interview?');
  assert.strictEqual(r.type, 'SPECIFIC_FACT');
  assert.strictEqual(r.attribute, 'time');
  assert.strictEqual(r.subject, 'interview');
});
test('understandQuestion: born day -> date attribute', () => {
  assert.strictEqual(cc.understandQuestion('What day was I born?').attribute, 'date');
});
test('understandQuestion: teammates -> person attribute', () => {
  assert.strictEqual(cc.understandQuestion('Who are my project teammates?').attribute, 'person');
});

// =========================================================
// 3. Extraction helpers
// =========================================================
test('extractDates: full date', () => {
  truthy(cc.extractDates('I was born on 24th November 2005 at home.').includes('24th November 2005'),
    'extractDates full', cc.extractDates('I was born on 24th November 2005 at home.'));
});
eq(cc.extractTime('The interview is at 10 AM tomorrow.'), '10 AM', 'extractTime "10 AM"');
eq(cc.extractTime('Your flight is at 7:30 PM.'), '7:30 PM', 'extractTime "7:30 PM"');
eq(cc.extractTime('No time mentioned here.'), null, 'extractTime null when absent');
eq(cc.extractDayOfWeek('I was born on Thursday and celebrated at home.'), 'Thursday', 'extractDayOfWeek Thursday');
eq(cc.extractDayOfWeek('Nothing here'), null, 'extractDayOfWeek null when absent');

// =========================================================
// 4. Structured fact layer — single multi-fact memory
// =========================================================
const tripMem = {
  id: 'mem_trip',
  title: 'Chennai Trip 2025',
  content:
    'On 24th November 2025, I travelled to Chennai with Rahul. We ate biryani at a restaurant near Marina Beach. ' +
    'Biryani is my favourite food. Marina Beach is my favourite place, and Rahul is my favourite person to travel with. ' +
    'I stayed there for two days.',
};
let tripFacts;
test('extractFacts: returns multiple facts from one passage', () => {
  tripFacts = extractFacts([tripMem]);
  assert.ok(tripFacts.length >= 5, `expected >=5 facts, got ${tripFacts.length}`);
});

test('fact layer: "Who is my favourite person?" -> Rahul', () => {
  const ans = answerFromFacts('Who is my favourite person?', tripFacts);
  truthy(ans && /Rahul/.test(ans.answer), 'favourite person', ans);
});
test('fact layer: "What is my favourite food?" -> Biryani', () => {
  const ans = answerFromFacts('What is my favourite food?', tripFacts);
  truthy(ans && /biryani/i.test(ans.answer), 'favourite food', ans);
});
test('fact layer: "What is my favourite place?" -> Marina Beach', () => {
  const ans = answerFromFacts('What is my favourite place?', tripFacts);
  truthy(ans && /Marina Beach/.test(ans.answer), 'favourite place', ans);
});
test('fact layer: "When did I travel to Chennai?" -> 24th November 2025', () => {
  const ans = answerFromFacts('When did I travel to Chennai?', tripFacts);
  truthy(ans && /24th November 2025/.test(ans.answer), 'travel date', ans);
});
test('fact layer: "Who did I travel with?" -> Rahul', () => {
  const ans = answerFromFacts('Who did I travel with?', tripFacts);
  truthy(ans && /Rahul/.test(ans.answer), 'travelled with', ans);
});
test('fact layer: "How long did I stay?" -> two days', () => {
  const ans = answerFromFacts('How long did I stay?', tripFacts);
  truthy(ans && /two days/.test(ans.answer), 'duration', ans);
});
test('fact layer: "What did I eat?" -> biryani', () => {
  const ans = answerFromFacts('What did I eat?', tripFacts);
  truthy(ans && /biryani/i.test(ans.answer), 'ate', ans);
});

// =========================================================
// 5. Cross-memory reasoning (each fact lives in its own memory)
// =========================================================
const crossFacts = extractFacts([
  { id: 'm_birthday', title: 'Birthday', content: 'My birthday is 24th November 2005.' },
  { id: 'm_interview', title: 'Interview', content: 'My interview is at 10 AM on 15th August.' },
  { id: 'm_food', title: 'Food', content: 'My favourite food is biryani.' },
  { id: 'm_place', title: 'Place', content: 'My favourite place is Marina Beach.' },
]);

test('cross-memory: birthday', () => {
  contains(answerFromFacts('When is my birthday?', crossFacts).answer, '24th November 2005', 'birthday cross');
});
test('cross-memory: interview time', () => {
  const ans = answerFromFacts('What time is my interview?', crossFacts);
  truthy(ans && /10 AM/.test(ans.answer) && !/birthday/i.test(ans.answer), 'interview time cross', ans);
});
test('cross-memory: favorite food', () => {
  contains(answerFromFacts('What is my favourite food?', crossFacts).answer, 'biryani', 'food cross');
});
test('cross-memory: favorite place', () => {
  contains(answerFromFacts('What is my favourite place?', crossFacts).answer, 'Marina Beach', 'place cross');
});

// =========================================================
// 6. Conflict detection (never silently pick one)
// =========================================================
test('conflict: two favourite foods -> ask ambiguity', () => {
  const facts = extractFacts([
    { id: 'c1', title: 'F1', content: 'My favourite food is biryani.' },
    { id: 'c2', title: 'F2', content: 'My favourite food is pizza.' },
  ]);
  const ans = answerFromFacts('What is my favourite food?', facts);
  truthy(ans && /(biryani|pizza|both|two|which)/i.test(ans.answer), 'conflict acknowledged', ans && ans.answer);
});

// =========================================================
// 7. Unrelated memory must NOT contaminate the answer
// =========================================================
test('no contamination: interview time never answers birthday', () => {
  const facts = extractFacts([
    { id: 'm_birthday', title: 'Birthday', content: 'My birthday is 24th November 2005.' },
    { id: 'm_interview', title: 'Interview', content: 'My interview is at 10 AM on 15th August.' },
  ]);
  const ans = answerFromFacts('What time is my interview?', facts);
  assert.ok(ans && /10 AM/.test(ans.answer), `got: ${ans && ans.answer}`);
  assert.ok(!/24th November 2005/.test(ans.answer), `birthday leaked: ${ans && ans.answer}`);
});

// =========================================================
// 8. Follow-up context resolution
// =========================================================
const convoCtx = [
  { role: 'user', content: 'When is my interview?' },
  { role: 'assistant', content: 'Your interview is on August 8.' },
];
test('follow-up inherits subject', () => {
  const r = cc.resolveQueryWithContext('What time?', convoCtx);
  assert.ok(r.resolved.includes('interview'), `resolved: ${r.resolved}`);
  assert.strictEqual(r.inheritedSubject, 'interview');
});
test('follow-up: new topic overrides context', () => {
  const r = cc.resolveQueryWithContext('When is my birthday?', convoCtx);
  assert.strictEqual(r.inheritedSubject, '');
  assert.ok(!r.resolved.includes('interview'), `resolved: ${r.resolved}`);
});

// =========================================================
// 9. Ambiguity / consistency (existing helpers)
// =========================================================
const interA = { title: 'Interview at A', content: 'Interview at Company A is on August 8.' };
const interB = { title: 'Interview at B', content: 'Interview at Company B is on September 1.' };
test('ambiguity: two different interviews -> ambiguous', () => {
  assert.strictEqual(cc.isGenuinelyAmbiguous([interA, interB], 'date'), true);
});
test('ambiguity: same birthday date -> NOT ambiguous', () => {
  const a = { title: 'My Birthday', content: '24th November 2005 is my birthday.' };
  const b = { title: 'Birthday reminder', content: 'My birthday is on 24th November.' };
  assert.strictEqual(cc.isGenuinelyAmbiguous([a, b], 'date'), false);
});
test('ambiguity: single memory -> not ambiguous', () => {
  assert.strictEqual(cc.isGenuinelyAmbiguous([interA], 'date'), false);
});

// =========================================================
// 10. Regression: existing targeted answerers still work
// =========================================================
test('generateSpecificFactAnswer: birthday date', () => {
  const a = cc.generateSpecificFactAnswer('When is my birthday?', { title: 'B', content: '24th November 2005 is my birthday. I was born on Thursday.' });
  contains(a, '24th November 2005', 'birthday date ans');
});
test('generateSpecificFactAnswer: born day', () => {
  contains(cc.generateSpecificFactAnswer('What day was I born?', { title: 'B', content: '24th November 2005 is my birthday. I was born on Thursday.' }), 'Thursday', 'born day ans');
});

// =========================================================
// 11. Acceptance Tests (Explicitly matching prompt requirements)
// =========================================================

test('Acceptance Test 1: Specific exam question', () => {
  const mem = { id: '1', title: 'Exam', content: 'I have an exam on 22 March at 10 AM.' };
  const facts = extractFacts([mem]);
  const ans = answerFromFacts('my exam time', facts);
  truthy(ans && /22 March at 10 AM/.test(ans.answer), 'exam time answer', ans);
});

test('Acceptance Test 2: Prevent unrelated memory contamination', () => {
  const mems = [
    { id: '1', title: 'Exam', content: 'I have an exam on 22 March at 10 AM.' },
    { id: '2', title: 'Interview', content: 'I have an interview on August 8.' },
    { id: '3', title: 'Birthday', content: 'My birthday is 24th November.' },
  ];
  const matched = cc.searchMemories('my exam time', mems);
  assert.strictEqual(matched.length, 1, 'Only exam memory should match');
  assert.strictEqual(matched[0].id, '1', 'Exam memory is the sole match');
});

test('Acceptance Test 3 & 4: Birthday specific & broad question', () => {
  const mem = { id: '1', title: 'Birthday', content: '24th November 2005 is my birthday. I was born on Thursday and celebrated my birthday at home.' };
  const facts = extractFacts([mem]);
  const specificAns = answerFromFacts('when is my birthday?', facts);
  truthy(specificAns && /24th November 2005/.test(specificAns.answer), 'birthday date answer', specificAns);

  const synth = require('./controllers/factExtractor.js').synthesizeBroadAnswer('tell me about my birthday', [mem]);
  truthy(synth && /24th November 2005/.test(synth) && /Thursday/.test(synth) && /at home/.test(synth), 'birthday broad answer', synth);
});

test('Acceptance Test 5, 6, 8: Favourite person, food, place & fact extraction', () => {
  const mem = { id: '1', title: 'Trip', content: 'Last weekend I went to Chennai with Rahul. We had biryani at my favourite restaurant. Rahul has always supported me and he is my favourite person. Biryani is my favourite food and Ooty is my favourite place.' };
  const facts = extractFacts([mem]);

  const personAns = answerFromFacts('who is my favourite person?', facts);
  truthy(personAns && /Your favourite person is Rahul/i.test(personAns.answer), 'favourite person answer', personAns);

  const foodAns = answerFromFacts('what is my favourite food?', facts);
  truthy(foodAns && /Your favourite food is biryani/i.test(foodAns.answer), 'favourite food answer', foodAns);

  const placeAns = answerFromFacts('what is my favourite place?', facts);
  truthy(placeAns && /Your favourite place is Ooty/i.test(placeAns.answer), 'favourite place answer', placeAns);
});

test('Acceptance Test 7: Multiple memories about the same interview (Broad)', () => {
  const mems = [
    { id: '1', title: 'Interview date', content: 'My interview is on August 8 at 10 AM.' },
    { id: '2', title: 'Interview role', content: 'The interview is for a Software Engineer position.' },
    { id: '3', title: 'Interview format', content: 'The interview will be online.' },
  ];
  const synth = require('./controllers/factExtractor.js').synthesizeBroadAnswer('tell me about my interview', mems);
  truthy(synth && /August 8 at 10 AM/.test(synth) && /Software Engineer position/.test(synth) && /online/i.test(synth), 'synthesized interview answer', synth);
  assert.ok(!/I found 3 memories/i.test(synth), 'Does not return selection text');
});

test('Acceptance Test 9: Genuine ambiguity (Google vs Microsoft)', () => {
  const mems = [
    { id: '1', title: 'Google Interview', content: 'My Google interview is on August 8 at 10 AM.' },
    { id: '2', title: 'Microsoft Interview', content: 'My Microsoft interview is on August 15 at 2 PM.' },
  ];
  const ambText = cc.detectEntityAmbiguity('tell me about my interview', mems);
  truthy(ambText && /Google/.test(ambText) && /Microsoft/.test(ambText) && /Which interview/.test(ambText), 'ambiguity prompt', ambText);
});

test('Acceptance Test 10: Follow-up question resolution', () => {
  const convo = [
    { role: 'user', content: 'When is my exam?' },
    { role: 'assistant', content: 'Your exam is on 22 March at 10 AM.' },
  ];
  const resolved = cc.resolveQueryWithContext('where is it?', convo);
  truthy(/exam/.test(resolved.resolved), 'follow up inherits exam', resolved);
});

test('Selection stage: vague "birthday" with two birthday memories -> ask', () => {
  const mems = [
    { id: 'b1', title: 'My Birthday 2005', content: '24th November 2005 is my birthday.' },
    { id: 'b2', title: 'My Birthday 2026', content: 'This year my birthday is on Sunday.' },
  ];
  const qa = cc.understandQuestion('birthday');
  const prompt = cc.detectSelectionAmbiguity('birthday', qa.attribute, mems);
  truthy(prompt && /found 2 memories about birthday/i.test(prompt) && /which one/i.test(prompt), 'birthday prompt', prompt);
});

test('Selection stage: "when is my birthday" with two competing birthday dates -> ask', () => {
  const mems = [
    { id: 'b1', title: 'My Birthday 2005', content: '24th November 2005 is my birthday.' },
    { id: 'b2', title: 'My Birthday 2026', content: 'This year my birthday is on Sunday.' },
  ];
  const qa = cc.understandQuestion('when is my birthday?');
  const prompt = cc.detectSelectionAmbiguity('when is my birthday?', qa.attribute, mems);
  truthy(prompt && /which one/i.test(prompt), 'birthday date conflict prompt', prompt);
});

test('Selection stage: single relevant memory -> no ambiguity', () => {
  const mems = [{ id: 'b1', title: 'My Birthday 2005', content: '24th November 2005 is my birthday.' }];
  const qa = cc.understandQuestion('when is my birthday?');
  const prompt = cc.detectSelectionAmbiguity('when is my birthday?', qa.attribute, mems);
  assert.strictEqual(prompt, null);
});

test('RULE 5: "exam time" must NOT retrieve the interview memory (shared word "time")', () => {
  const mems = [
    { id: 'e1', title: 'exam time', content: 'I have an exam on 22 March at 10 AM.' },
    { id: 'i1', title: 'Interview Time', content: 'I have an interview on August 8.' },
  ];
  const results = cc.searchMemories('exam time', mems);
  truthy(results.length === 1 && results[0].id === 'e1', 'only exam memory retrieved', results.map((r) => r.title));
});

test('Selection stage: multiple interviews for broad "tell me about" -> ask (TEST 4)', () => {
  const mems = [
    { id: '1', title: 'Interview date', content: 'My interview is on August 8 at 10 AM.' },
    { id: '2', title: 'Interview role', content: 'The interview is for a Software Engineer position.' },
    { id: '3', title: 'Interview format', content: 'The interview will be online.' },
  ];
  const qa = cc.understandQuestion('tell me about my interview');
  const prompt = cc.detectSelectionAmbiguity('tell me about my interview', qa.attribute, mems);
  truthy(prompt && /which one/i.test(prompt), 'broad multi-memory asks to select', prompt);
});

test('Selection stage: distinct interview entities -> ask', () => {
  const mems = [
    { id: '1', title: 'Google Interview', content: 'My Google interview is on August 8 at 10 AM.' },
    { id: '2', title: 'Microsoft Interview', content: 'My Microsoft interview is on August 15 at 2 PM.' },
  ];
  const qa = cc.understandQuestion('tell me about my interview');
  const prompt = cc.detectSelectionAmbiguity('tell me about my interview', qa.attribute, mems);
  truthy(prompt && /Google/.test(prompt) && /Microsoft/.test(prompt), 'company ambiguity prompt', prompt);
});

test('Acceptance 6: favourite food (specific fact, single memory) answered narrowly', () => {
  const mem = { id: '1', title: 'Favourites', content: 'My favourite food is biryani and my favourite place is Ooty. My favourite person is Rahul.' };
  const facts = extractFacts([mem]);
  const foodAns = answerFromFacts('what is my favourite food?', facts);
  truthy(foodAns && /biryani/i.test(foodAns.answer), 'favourite food answer', foodAns);
  assert.ok(!/Rahul|Ooty/i.test(foodAns.answer), 'does not leak unrelated facts');
});

test('generateResponseFromMemory: selected memory produces a clean recollection + source pill title', () => {
  const mem = { id: 'b1', title: 'My Birthday 2005', content: '24th November 2005 is my birthday.' };
  const r = cc.generateResponseFromMemory(mem);
  truthy(/24th November 2005 is your birthday/.test(r), 'recollection text', r);
  assert.ok(!/This is from the memory/.test(r), 'does not append source trailer');
});

test('answerFromSelectedMemory: specific fact from a single selected exam memory (TEST 1/3/4)', () => {
  const mem = { id: 'e1', title: 'exam time', content: 'I have an exam on 22 March at 10 AM.' };
  const ans = cc.answerFromSelectedMemory('what is my exam time?', mem);
  truthy(/22 March/.test(ans) && /10 AM/.test(ans), 'exam answer', ans);
});

test('answerFromSelectedMemory: broad summary from selected interview memory only (TEST 8)', () => {
  const mem = { id: 'i1', title: 'Interview', content: 'My interview is on August 8 at 10 AM. It is for a Software Engineer role and will be online.' };
  const ans = cc.answerFromSelectedMemory('tell me about my interview', mem);
  truthy(/August 8/.test(ans) && /online/i.test(ans), 'interview broad answer', ans);
});

test('answerFromSelectedMemory: fallback recollection when no query context', () => {
  const mem = { id: 'f1', title: 'Favourite food', content: 'My favourite food is biryani and my favourite place is Ooty.' };
  const ans = cc.answerFromSelectedMemory('', mem);
  truthy(/biryani/i.test(ans), 'recollection fallback', ans);
});

// =========================================================
// Result
// =========================================================
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  results.filter((r) => !r.ok).forEach((r) => console.error(`  FAIL | ${r.name}\n        ${r.message}`));
}
process.exit(fail === 0 ? 0 : 1);



