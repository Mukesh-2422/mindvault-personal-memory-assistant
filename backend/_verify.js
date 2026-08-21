// Comprehensive final verification of intent-first answering.

const assert = require('assert');
const cc = require('./controllers/chatController');
const UID = 'user1';
let memStore = { memories: [], people: [], chatHistory: [] };
function setM(mems) { memStore = { memories: mems.map((m,i) => ({id:'id'+i, userId:UID, deleted:false, ...m})), people:[], chatHistory:[] }; }
let pass=0, fail=0;
function ok(name,cond,msg){ try{ assert.ok(cond,msg||('got: '+(cond===false?'FAIL':cond))); pass++; console.log('PASS | '+name);}catch(e){fail++;console.log('FAIL | '+name+' :: '+(e.message||e));} }
async function ask(mems,q,ctx=null){ setM(mems); return await cc.processChatLogic(q,UID,null,null,ctx); }

(async()=>{
  let r;
  r = await ask([{content:'My birthday is 24th November 2005.',title:'My Birthday'}],'When is my birthday?');
  ok('A birthday date', /24th November 2005/.test(r.response) && !/I found/.test(r.response), r.response);
  r = await ask([{content:'I have an exam on 22 March at 10 AM.',title:'Exam'}],'What is my exam time?');
  ok('C exam time', /22 March at 10 AM/.test(r.response), r.response);
  r = await ask([{content:'I have an interview on 8 August.',title:'Interview Time'}],'What is my exam time?');
  ok('D no exam', !/8 August/.test(r.response) && /exam|don't|no|couldn't/.test(r.response), r.response);
  r = await ask([{content:'My exam is on 22 March at 10 AM.',title:'Exam Time'},{content:'My interview is on 8 August.',title:'Interview Time'}],'What is my exam time?');
  ok('E exam both', /22 March/.test(r.response) && !/8 August/.test(r.response), r.response);
  r = await ask([{content:'My exam is on 22 March at 10 AM.',title:'Exam Time'},{content:'My interview is on 8 August.',title:'Interview Time'}],'When is my interview?');
  ok('K interview both', /8 August/.test(r.response) && !/22 March/.test(r.response), r.response);
  r = await ask([{content:'I have an exam on 22 March at 10 AM.',title:'exam time'},{content:'I have an interview on 8 August.',title:'Interview Time'}],'exam time');
  ok('Literal exam time', /22 March/.test(r.response) && !/8 August/.test(r.response), r.response);
  r = await ask([{content:'My interview is on 8 August.',title:'Interview date'},{content:'The interview is for a Software Engineer position.',title:'Interview role'},{content:'The interview will be online.',title:'Interview format'}],'Tell me about my interview.');
  ok('F interview 3 mems', /8 August/.test(r.response) && /Software Engineer/.test(r.response) && /online/i.test(r.response), r.response);
  r = await ask([{content:'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.',title:'Favourites'}],'What is my favourite food?');
  ok('G food only', /biryani/i.test(r.response) && !/Ooty/.test(r.response) && !/Arun/.test(r.response), r.response);
  r = await ask([{content:'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.',title:'Favourites'}],'Who is my favourite person?');
  ok('H person', /Arun/.test(r.response), r.response);
  r = await ask([{content:'Biryani is my favourite food. Ooty is my favourite place. Arun is my favourite person.',title:'Favourites'}],'What is my favourite place?');
  ok('I place only', /Ooty/.test(r.response) && !/Biryani/.test(r.response) && !/Arun/.test(r.response), r.response);
  r = await ask([{content:'My birthday is 24th November 2005. I was born on Thursday and celebrated at home.',title:'B'}],'Tell me about my birthday.');
  ok('B broad', /24th November 2005/.test(r.response) && /Thursday/.test(r.response) && /home/.test(r.response), r.response);
  r = await ask([{content:'My favourite place is Ooty.',title:'Place'}],'Which place do I like the most?');
  ok('Generalize place', /Ooty/.test(r.response), r.response);
  // follow-up
  setM([{content:'My exam is on 22 March at 10 AM.',title:'Exam'}]);
  const ctx = {conversation:[{role:'user',content:'When is my exam?'},{role:'assistant',content:'Your exam is on 22 March at 10 AM.'}]};
  r = await cc.processChatLogic('What time?',UID,null,null,ctx);
  ok('12 follow-up time', /22 March at 10 AM/.test(r.response) && !/interview/i.test(r.response), r.response);
  // genuine conflict
  r = await ask([{content:'My exam is on 22 March at 10 AM.',title:'Exam1'},{content:'My exam was changed to 25 March at 2 PM.',title:'Exam2'}],'When is my exam?');
  ok('Conflict clarification', /22 March.*25 March|25 March.*22 March|conflicting|which/.test(r.response), r.response);
  console.log('\n=== '+pass+' passed, '+fail+' failed ===');
  process.exit(fail===0?0:1);
})().catch(e=>{console.error(e);process.exit(1);});
