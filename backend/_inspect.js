// End-to-end harness: mock db, then exercise processChatLogic with prompt cases.
// Stub the db module before requiring chatController
const Module = require('module');
const origRequire = Module.prototype.require;
let memStore = {};
Module.prototype.require = function (id) {
  if (id === '../db' || id === './db' || (this.filename.includes('chatController') && id === '../db')) {
    return {
      getCollection: async (name, filter = {}) => {
        let arr = memStore[name] || [];
        if (filter.userId !== undefined) arr = arr.filter((m) => m.userId === filter.userId);
        if (filter.conversationId !== undefined) arr = arr.filter((m) => m.conversationId === filter.conversationId);
        return JSON.parse(JSON.stringify(arr));
      },
      insertOne: async (name, doc) => { (memStore[name] = memStore[name] || []).push(doc); return doc; },
      updateOne: async () => true,
      findById: async (name, id) => { return (memStore[name] || []).find((m) => String(m.id) === String(id)) || null; },
      saveCollection: async (name, arr) => { memStore[name] = arr; },
    };
  }
  return origRequire.apply(this, arguments);
};

const chatController = require('./controllers/chatController.js');

async function run() {
  const UID = 'user1';

  function setMemories(mems) {
    memStore = {
      memories: mems.map((m) => ({ id: m.id || Math.random().toString(36).slice(2), userId: UID, deleted: false, ...m })),
      people: [],
      chatHistory: [],
    };
  }

  const cases = [
    // Case A
    { name: 'A birthday date',
      mem: [{ title: 'My Birthday', content: 'My birthday is 24th November 2005.' }],
      q: 'When is my birthday?', expect: /24th November 2005/ },
    // Case B
    { name: 'B birthday broad',
      mem: [{ title: 'My Birthday', content: 'My birthday is 24th November 2005. I was born on Thursday and celebrated my birthday at home.' }],
      q: 'Tell me about my birthday.', expect: /24th November 2005/ },
    // Case C
    { name: 'C exam time',
      mem: [{ title: 'Exam', content: 'I have an exam on 22 March at 10 AM.' }],
      q: 'What is my exam time?', expect: /22 March at 10 AM/ },
    // Case D (no exam memory)
    { name: 'D exam time no memory',
      mem: [{ title: 'Interview Time', content: 'I have an interview on 8 August.' }],
      q: 'What is my exam time?', expect: /have.*exam|don't|no.*info|saving/i, reject: /interview on 8 August/ },
    // Case E
    { name: 'E exam time two mems',
      mem: [
        { title: 'Exam Time', content: 'My exam is on 22 March at 10 AM.' },
        { title: 'Interview Time', content: 'My interview is on 8 August.' },
      ],
      q: 'What is my exam time?', expect: /22 March/, reject: /8 August/ },
    // Case F
    { name: 'F interview broad three',
      mem: [
        { title: 'Interview date', content: 'My interview is on 8 August.' },
        { title: 'Interview role', content: 'The interview is for a Software Engineer position.' },
        { title: 'Interview format', content: 'The interview will be online.' },
      ],
      q: 'Tell me about my interview.', expect: /August 8/, },
    // Case G
    { name: 'G favourite food not others',
      mem: [{ title: 'Favourites', content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.' }],
      q: 'What is my favourite food?', expect: /biryani/i, reject: /Ooty|Arun/ },
    // Case H
    { name: 'H favourite person',
      mem: [{ title: 'Favourites', content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.' }],
      q: 'Who is my favourite person?', expect: /Arun/i },
    // Case I
    { name: 'I favourite place',
      mem: [{ title: 'Favourites', content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.' }],
      q: 'What is my favourite place?', expect: /Ooty/i },
    // Case J
    { name: 'J tell me about favourite place',
      mem: [{ title: 'Favourites', content: 'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.' }],
      q: 'Tell me about my favourite place.', expect: /Ooty/i },
    // Case K
    { name: 'K interview time two mems',
      mem: [
        { title: 'Exam Time', content: 'My exam is on 22 March at 10 AM.' },
        { title: 'Interview Time', content: 'My interview is on 8 August.' },
      ],
      q: 'When is my interview?', expect: /8 August/, reject: /22 March/ },
  ];

  let failures = 0;
  for (const c of cases) {
    setMemories(c.mem);
    const res = await chatController.processChatLogic(c.q, UID, null, null);
    const ans = res.response || '';
    const okPos = !c.expect || c.expect.test(ans);
    const okNeg = !c.reject || !c.reject.test(ans);
    const status = (okPos && okNeg) ? 'PASS' : 'FAIL';
    if (status === 'FAIL') failures++;
    console.log(`[${status}] ${c.name}`);
    console.log('   Q: ' + c.q);
    console.log('   A: ' + ans.replace(/\n/g, ' | ').substring(0, 200));
    console.log('   sources: ' + (res.relatedMemories || []).map((m) => m.title).join(', '));
  }
  console.log('\n' + (failures === 0 ? 'ALL PASS' : (failures + ' FAILED')));
  process.exit(failures === 0 ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });





