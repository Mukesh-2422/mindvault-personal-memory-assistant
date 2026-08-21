// Comprehensive final verification of intent-first answering (backend).
const path = require('path');
const backendDir = 'd:/New folder (2)/backend';
let memStore = {};
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === '../db') return {
    getCollection: async (n, f = {}) => { let a = memStore[n] || []; if (f.userId !== undefined) a = a.filter(m => m.userId === f.userId); if (f.conversationId !== undefined) a = a.filter(m => m.conversationId === f.conversationId); return JSON.parse(JSON.stringify(a)); },
    insertOne: async (n, d) => { (memStore[n] = memStore[n] || []).push(d); return d; },
    updateOne: async () => true,
    findById: async (n, id) => (memStore[n] || []).find(m => String(m.id) === String(id)) || null,
    saveCollection: async (n, a) => { memStore[n] = a; },
  };
  return origRequire.apply(this, arguments);
};
const cc = require(path.join(backendDir, 'controllers/chatController.js'));
const assert = require('assert');
const UID = 'user1';
function setM(mems) { memStore = { memories: mems.map((m,i) => ({id:'id'+i, userId:UID, deleted:false, ...m})), people: [], chatHistory: [] }; }
let pass = 0, fail = 0;
function ok(name, cond, extra) { try { assert.ok(cond, extra); pass++; console.log('PASS | ' + name); } catch (e) { fail++; console.log('FAIL | ' + name + ' :: ' + (e.message || e) + (extra ? ' || ' + extra : '')); } }
async function ask(mems, q, ctx = null) { setM(mems); return await cc.processChatLogic(q, UID, null, ctx); }

(async () => {
  let r;
  r = await ask([{ content: 'My birthday is 24th November 2005.', title: 'My Birthday' }], 'When is my birthday?');
  ok('A: birthday date', /24th November 2005/.test(r.response) && !/I found/.test(r.response), r.response);
  r = await ask([{ content: 'I have an exam on 22 March at 10 AM.', title: 'Exam' }], 'What is my exam time?');
  ok('C: exam time', /22 March at 10 AM/.test(r.response), r.response);
  r = await ask([{ content: 'I have an interview on 8 August.', title: 'Interview Time' }], 'What is my exam time?');
  ok('D: no exam', !/8 August/.test(r.response) && /exam|don't|no|couldn't/.test(r.response), r.response);
  r = await ask([{ content: 'My exam is on 22 March at 10 AM.', title: 'Exam Time' }, { content: 'My interview is on 8 August.', title: 'Interview Time' }], 'What is my exam time?');
  ok('E: exam both', /22 March/.test(r.response) && !/8 August/.test(r.response), r.response);
  r = await ask([{ content: 'My exam is on 22 March at 10 AM.', title: 'Exam Time' }, { content: 'My interview is on 8 August.', title: 'Interview Time' }], 'When is my interview?');
  ok('K: interview both', /8 August/.test(r.response) && !/22 March/.test(r.response), r.response);
  r = await ask([{ content: 'I have an exam on 22 March at 10 AM.', title: 'exam time' }, { content: 'I have an interview on 8 August.', title: 'Interview Time' }], 'exam time');
  ok('Literal exam time', /22 March/.test(r.response) && !/8 August/.test(r.response), r.response);
  r = await ask([{ content: 'My interview is on 8 August.', title: 'Interview date' }, { content: 'The interview is for a Software Engineer position.', title: 'Interview role' }, { content: 'The interview will be online.', title: 'Interview format' }], 'Tell me about my interview.');
  ok('F: interview 3 mems', /8 August/.test(r.response) && /Software Engineer/.test(r.response) && /online/i.test(r.response), r.response);
  r = await ask([{ content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.', title: 'Favourites' }], 'What is my favourite food?');
  ok('G: food only', /biryani/i.test(r.response) && !/Ooty/.test(r.response) && !/Arun/.test(r.response), r.response);
  r = await ask([{ content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.', title: 'Favourites' }], 'Who is my favourite person?');
  ok('H: person', /Arun/.test(r.response), r.response);
  r = await ask([{ content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.', title: 'Favourites' }], 'What is my favourite place?');
  ok('I: place only', /Ooty/.test(r.response) && !/Biryani/.test(r.response) && !/Arun/.test(r.response), r.response);
  r = await ask([{ content: 'My birthday is 24th November 2005. I was born on Thursday and celebrated at home.', title: 'B' }], 'Tell me about my birthday.');
  ok('B: broad', /24th November 2005/.test(r.response) && /Thursday/.test(r.response) && /home/.test(r.response), r.response);
  r = await ask([{ content: 'My favourite place is Ooty.', title: 'Place' }], 'Which place do I like the most?');
  ok('Req10: which place do i like the most -> Ooty', /Ooty/.test(r.response), r.response);
  r = await ask([{ content: 'My project presentation is on Friday at 3 PM.', title: 'Pres' }], 'When is my presentation?');
  ok('Req10: when is my presentation -> Friday at 3 PM', /Friday/.test(r.response) && /3 PM/.test(r.response), r.response);
  r = await ask([{ content: 'I met Rahul at college and he helped me with my project.', title: 'Rahul' }], 'Who helped me with my project?');
  ok('Req10: who helped me with my project -> Rahul', /Rahul/.test(r.response), r.response);
  setM([{ content: 'My exam is on 22 March at 10 AM.', title: 'Exam' }]);
  const ctx = { conversation: [{ role: 'user', content: 'When is my exam?' }, { role: 'assistant', content: 'Your exam is on 22 March at 10 AM.' }] };
  r = await cc.processChatLogic('What time?', UID, null, ctx);
  ok('12: follow-up What time? -> exam time', /22 March at 10 AM/.test(r.response) && !/interview/i.test(r.response), r.response);
  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
