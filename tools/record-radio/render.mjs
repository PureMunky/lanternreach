// Renders one Lanternreach Radio station to <work>/<id>.f32: interleaved stereo float32 at
// 44.1 kHz, MINUTES long plus a 16 s tail that encode.py crossfades into the opening.
//
// The station code is copied straight out of lanternreach-radio.html into a harness page with
// harness.js appended, then run in headless Chromium with OfflineAudioContext, which renders
// faster than real time. Usage: node render.mjs <station index 0-5> <work dir>
import {chromium} from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const RADIO=path.join(here,'../../lanternreach-radio.html');
const si=+process.argv[2],work=process.argv[3];
const MINUTES=+(process.env.MINUTES||60),TOTAL=MINUTES*60+16,CHUNK=128;

// harness: the radio's music theory, audio graph, instruments and STATIONS, plus the renderer
const src=fs.readFileSync(RADIO,'utf8');
const code=src.slice(src.indexOf('// ---------- music theory ----------'),src.indexOf('// ---------- scheduler ----------'));
const page=path.join(work,`harness-${si}.html`);
fs.writeFileSync(page,`<!doctype html><meta charset="utf-8"><script>\n${code}${fs.readFileSync(path.join(here,'harness.js'),'utf8')}</script>`);

const b=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+page);
const [id,name]=(await p.evaluate(()=>stationIds()))[si];
const fd=fs.openSync(path.join(work,`${id}.f32`),'w'),t0=Date.now();
for(let T=0;T<TOTAL;T+=CHUNK){
  const len=Math.min(CHUNK,TOTAL-T),b64=await p.evaluate(([si,T,len])=>renderChunk(si,T,len),[si,T,len]);
  if(errs.length)throw new Error(errs.join('; '));
  fs.writeSync(fd,Buffer.from(b64,'base64'));
  console.log(`${name}: ${Math.min(T+len,TOTAL)}/${TOTAL}s (${((Date.now()-t0)/1000).toFixed(0)}s elapsed)`);
}
fs.closeSync(fd);await b.close();console.log(`${name}: done`);
