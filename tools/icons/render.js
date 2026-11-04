// Renders the PNG app icons from the SVG sources with the headless browser.
// Run from the repository root: node tools/icons/render.js
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const jobs=[
  ['icon.svg','icons/apple-touch-icon.png',180],
  ['icon.svg','icons/icon-192.png',192],
  ['icon.svg','icons/icon-512.png',512],
  ['icons/maskable.svg','icons/icon-maskable-512.png',512],
  ['icons/favicon.svg','icons/favicon-32.png',32],
];
(async()=>{
  const b=await chromium.launch();
  for(const[src,out,n]of jobs){
    const p=await (await b.newContext({viewport:{width:n,height:n},deviceScaleFactor:1})).newPage();
    const svg=fs.readFileSync(path.join(root,src),'utf8');
    const clear=out.includes('favicon');
    await p.setContent(`<style>html,body{margin:0;background:${clear?'transparent':'#060911'}}img{display:block;width:${n}px;height:${n}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`);
    await p.waitForFunction(()=>document.images[0].complete);
    await p.screenshot({path:path.join(root,out),clip:{x:0,y:0,width:n,height:n},omitBackground:clear});
    console.log(out);
  }
  await b.close();
})();
