const path = require('path');
const backendDir = 'd:/New folder (2)/backend';
let memStore = {};
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === '../db') return { getCollection: async () => [], insertOne: async () => ({}), updateOne: async () => true, findById: async () => null, saveCollection: async () => {} };
  return origRequire.apply(this, arguments);
};
const cc = require(path.join(backendDir, 'controllers/chatController.js'));
const fe = require(path.join(backendDir, 'controllers/factExtractor.js'));

console.log('--- extractSubjectPhrase / extractSubjectTerms (chatController) ---');
console.log('which place do i like the most -> subject:', JSON.stringify(cc.extractSubjectPhrase('which place do i like the most')));
console.log('which place do i like the most -> terms:', JSON.stringify(cc.extractSubjectTerms('which place do i like the most')));

console.log('\n--- understandQuestion ---');
console.log('when is my presentation:', JSON.stringify(cc.understandQuestion('When is my presentation?')));

console.log('\n--- extractFacts on presentation memory ---');
const mem = { id: 'm1', title: 'Pres', content: 'My project presentation is on Friday at 3 PM.' };
const facts = fe.extractFacts(mem);
console.log(JSON.stringify(facts, null, 2));

console.log('\n--- answerFromFacts ---');
console.log('when is my presentation? :', JSON.stringify(fe.answerFromFacts('when is my presentation?', facts)));
console.log('what time is my presentation? :', JSON.stringify(fe.answerFromFacts('what time is my presentation?', facts)));

console.log('\n--- chatController extractDates / extractTime on memory ---');
const txt = 'My project presentation is on Friday at 3 PM.';
console.log('extractDates:', JSON.stringify(cc.extractDates(txt)));
console.log('extractDayOfWeek:', cc.extractDayOfWeek(txt));
console.log('extractTime:', cc.extractTime(txt));

console.log('\n--- generateSpecificFactAnswer (fallback) ---');
console.log(cc.generateSpecificFactAnswer('When is my presentation?', mem));
