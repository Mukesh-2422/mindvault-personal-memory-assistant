const fs = require('fs');
const L = fs.readFileSync('chatLogic.test.js', 'utf8').split('\n');
let out = '';
for (let i = 76; i < 275; i++) out += (i+1) + '|' + (L[i]||'') + '\n';
fs.writeFileSync('d:/New folder (2)/_test_mid.txt', out);
console.log('wrote', out.length);

