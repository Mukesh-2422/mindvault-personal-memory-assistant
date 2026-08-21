const fs = require('fs');
const L = fs.readFileSync('controllers/chatController.js', 'utf8').split('\n');
function show(s,e){console.log('===== '+s+'-'+e+' =====');for(let i=s-1;i<Math.min(L.length,e);i++)console.log((i+1)+'|'+L[i]);}
show(1344,1429);
show(462,496);

