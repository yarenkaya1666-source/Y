// Build timing.js: per-line timings, speech bounds, and per-frame mouth envelope
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FPS = 30;
const lines = [
 ["Two plots of land. Same five acres. One is worth sixty-two thousand dollars. The other? Eleven.",0,8.280816],
 ["Same dirt. Same trees. So why is one worth almost six times more?",8.280816,6.112653],
 ["It's one boring little detail. And most buyers completely miss it.",14.393469,5.146122],
 ["Look at the red lot. The road runs along its entire front.",19.539592,4.284082],
 ["Driveway? Put it anywhere you like. Power and water? Right there at the road. Easy to build on. Easy to sell.",23.823673,7.967347],
 ["Now the green one. It's a flag lot. The only way in is this skinny little strip.",31.79102,5.877551],
 ["Before you build anything, you're clearing trees and paying for a long gravel driveway, just to reach your own land.",37.668571,7.88898],
 ["And every dollar of that comes straight off what the land is worth.",45.557551,4.04898],
 ["Here's the proof. A five-acre lot with road frontage, right down the street, sold for sixty-two thousand.",49.606531,7.314286],
 ["That backs up the red lot. But you can't slap the same price on the green one. Same acres. Not the same value.",56.920816,7.627755],
 ["So before you fall in love with cheap land, check the access first. Or that bargain turns into a money pit.",64.548571,8.202449],
 ["I'm Bill. And this has been Financial Nonsense.",72.75102,3.63102],
];
const buf = fs.readFileSync(path.join(root,'assets/voice.pcm'));
const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length/2);
const SR = 16000, total = pcm.length/SR;
const nF = Math.ceil((total+1.0)*FPS);
let env = [];
for (let f=0; f<nF; f++){
  const a = Math.floor(f/FPS*SR), b = Math.min(pcm.length, Math.floor((f+1)/FPS*SR));
  let s=0; for (let i=a;i<b;i++) s+=pcm[i]*pcm[i];
  env.push(b>a? Math.sqrt(s/(b-a))/32768 : 0);
}
const mx = Math.max(...env); env = env.map(v=>Math.min(1, v/(mx*0.6)));
// smooth a little
env = env.map((v,i)=> (v*2 + (env[i-1]||0) + (env[i+1]||0))/4);
const out = lines.map(([text,start,dur])=>{
  const f0=Math.floor(start*FPS), f1=Math.floor((start+dur)*FPS);
  let s=f0, e=f1;
  while (s<f1 && env[s]<0.08) s++;
  while (e>s && env[e]<0.08) e--;
  return {text, start, end:start+dur, s:s/FPS, e:(e+1)/FPS};
});
fs.writeFileSync(path.join(root,'src/timing.js'),
 'window.TIMING='+JSON.stringify({fps:FPS,total:+(total+0.8).toFixed(3),lines:out,env:env.map(v=>+v.toFixed(3))})+';');
console.log(out.map(l=>`${l.start.toFixed(2)} speech ${l.s.toFixed(2)}-${l.e.toFixed(2)}`).join('\n'), '\ntotal', total);
