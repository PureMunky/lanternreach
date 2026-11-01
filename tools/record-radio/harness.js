// ---------- offline renderer ----------
// Renders [T, T+len) seconds of a station. Randomness is seeded per bar, so a chunk can start
// PRE seconds early and regenerate exactly the notes still sounding at T from earlier bars.
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(...p){const s=p.join('|');let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return h>>>0;}
// PRE and chunk starts are multiples of 32 s, so every chunk begins on a 128-frame render quantum
// boundary and swept-pitch automation (Deep Orbit's thump) renders identically across chunks.
const PRE=64,SR=44100;
window.renderChunk=async(si,T,len)=>{
  const s=STATIONS[si],start=Math.max(0,T-PRE),total=T+len-start;
  A=new OfflineAudioContext(2,Math.ceil(total*SR),SR);
  Math.random=rng(hash(s.id,'noise'));
  noiseBuf=A.createBuffer(1,SR*3,SR);{const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  master=A.createGain();master.gain.value=1;master.connect(A.destination);
  Math.random=rng(hash(s.id,'bus'));const bus=makeBus(s.fx);bus.bus.gain.value=1;
  for(let k=Math.ceil(start/s.bar-1e-9);k*s.bar<T+len;k++){Math.random=rng(hash(s.id,'bar',k));s.play(bus.mix,k*s.bar-start,s.prog[k%s.prog.length]);}
  const buf=await A.startRendering(),off=Math.round((T-start)*SR),n=Math.round(len*SR);
  const L=buf.getChannelData(0),R=buf.getChannelData(1),out=new Float32Array(n*2);
  for(let i=0;i<n;i++){out[2*i]=L[off+i];out[2*i+1]=R[off+i];}
  const u8=new Uint8Array(out.buffer);let bin='';for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
  return btoa(bin);
};
window.stationIds=()=>STATIONS.map(s=>[s.id,s.name]);
