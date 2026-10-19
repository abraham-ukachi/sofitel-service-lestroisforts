// Les Trois Forts — Scan: identify a dish, dessert, wine or champagne from the camera, on-device.
// Image match: MobileNet v2 (float16, ~7 MB) embeddings vs reference photos (scan/emb.json) + the waiter's own photos.
// Label match: Tesseract OCR (French) fuzzy-matched against the app's own item names.
// Everything lives under scan/ and is cached by the service worker in a persistent cache (works offline after first use).
(function(){
const B = 'scan/';
const ASSETS = ['tf.min.js','mobilenet.min.js','model/model.json','model/group1-shard1of1.bin','emb.json','tesseract.min.js','worker.min.js','core/tesseract-core-simd-lstm.wasm.js','core/tesseract-core-lstm.wasm.js','lang/fra.traineddata.gz'];
const EN = () => document.documentElement.lang === 'en';
const T = (fr, en) => EN() ? en : fr;
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const strip = h => String(h||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const CHN = {jour:['Service du jour','Today'],hiver:["Carte d'hiver",'Winter menu'],dej:['Déjeuner','Lunch'],diner:['Dîner','Dinner'],dess:['Desserts','Desserts'],cock:['Cocktails','Cocktails'],cafe:['Cafés & thés','Coffee & tea'],vins:['Vins','Wines'],champ:['Champagnes','Champagnes'],dig:['Digestifs','Digestifs'],from:['Fromages','Cheeses'],acc:['Accords','Pairings']};
const LOW = new Set('blanc blancs rouge rose brut et or de la le cru grand reserve'.split(' '));
const STOP = new Set('les des une pour avec sans sur aux par the and from with cuvee vin vins domaine chateau maison verre bouteille cl aop igp dejeuner diner dinner glass bottle half demi provence formule semaine entree plat dessert menu'.split(' '));

// ---------- loading ----------
let model=null, ocr=null, refs=null, loading=null;
function script(src){ return new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>ko(Error('load '+src)); document.head.appendChild(s); }); }
async function precache(prog){
  let n=0; const c = window.caches ? await caches.open('ltf-scan-v1') : null;
  for(const a of ASSETS){ const u=B+a; try{ if(c && !(await c.match(u))){ const r=await fetch(u); if(r.ok) await c.put(u, r.clone()); } }catch(e){} n++; prog && prog(n/ASSETS.length); }
}
function b64i8(s){ const b=atob(s); const a=new Float32Array(b.length); let n=0; for(let i=0;i<b.length;i++){ let v=b.charCodeAt(i); if(v>127) v-=256; a[i]=v; n+=v*v; } n=Math.sqrt(n)||1; for(let i=0;i<a.length;i++) a[i]/=n; return a; }
async function load(prog){
  if(loading) return loading;
  loading = (async()=>{
    await precache(p=>prog&&prog(p*0.6));
    const ej = await (await fetch(B+'emb.json')).json();
    refs = ej.map(r=>({k:r.k, img:r.i, v:b64i8(r.e)}));
    if(!window.tf) await script(B+'tf.min.js');
    if(!window.mobilenet) await script(B+'mobilenet.min.js');
    try{ await tf.setBackend('webgl'); }catch(e){ await tf.setBackend('cpu'); }
    model = await mobilenet.load({version:2, alpha:1, modelUrl: new URL(B+'model/model.json', location.href).href});
    prog&&prog(0.85);
    if(!window.Tesseract) await script(B+'tesseract.min.js');
    try{ ocr = await Tesseract.createWorker('fra', 1, {workerPath:new URL(B+'worker.min.js',location.href).href, corePath:new URL(B+'core',location.href).href, langPath:new URL(B+'lang',location.href).href, gzip:true, workerBlobURL:false}); }catch(e){ ocr=null; }
    prog&&prog(1);
  })();
  loading.catch(()=>{ loading=null; });
  return loading;
}

// ---------- catalogue ----------
function catalog(){
  const its = (window.LTFitems ? LTFitems() : []).filter(i=>!i.fact && i.info && i.ch!=='plan' && i.ch!=='jour');
  const by = {}; its.forEach(i=>{ const k=i.ikey||i.id; (by[k]=by[k]||[]).push(i); });
  const groups = Object.entries(by).map(([k,list])=>{ const i=list[0]; const kn = /^[a-z]:/.test(k) ? k.slice(2).split('|')[0].split('@')[0] : ''; const fr=strip(i.front); const name = kn && norm(kn)!==norm(fr) && !norm(fr).includes(norm(kn)) ? kn : fr; const sub0 = name===fr ? strip(i.back) : fr; const nw=norm(name).split(' ').filter(w=>w.length>=2 && !STOP.has(w) && !/^\d{1,3}$/.test(w)); const words=nw.concat(norm(sub0+' '+strip(i.back)).split(' ').filter(w=>w.length>=3 && !STOP.has(w) && !/^\d{1,3}$/.test(w)));
    return {k, item:i, list, name, sub:sub0.slice(0,90), words:[...new Set(words)], nameW:new Set(norm(name).split(' '))}; });
  const df = {}; groups.forEach(g=>g.words.forEach(w=>df[w]=(df[w]||0)+1));
  groups.forEach(g=> g.idf = Object.fromEntries(g.words.map(w=>[w, Math.log(1+groups.length/df[w]) * (g.nameW.has(w)?1.5:1) * (LOW.has(w)?0.4:1)])));
  return groups;
}
function lev(a,b){ if(Math.abs(a.length-b.length)>2) return 9; const d=[]; for(let i=0;i<=a.length;i++){ d[i]=[i]; } for(let j=1;j<=b.length;j++) d[0][j]=j; for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; }
function textScores(groups, text){
  const toks = [...new Set(norm(text).split(' ').filter(w=>w.length>=2))]; if(!toks.length) return {};
  const has = w => toks.includes(w) || (w.length>=5 && toks.some(t=>t.length>=4 && lev(t,w)<=(w.length>=8?2:1)));
  const sc = {}; groups.forEach(g=>{ let s=0, n=0; g.words.forEach(w=>{ if(has(w)){ s+=g.idf[w]; n++; } }); if(n) sc[g.k]= s * (n>=2?1.3:1); });
  return sc;
}

// ---------- user photos & learned scans ----------
const LEARN='ltf_scan_learn';
function learned(){ try{ return JSON.parse(localStorage.getItem(LEARN)||'{}'); }catch(e){ return {}; } }
function i8b64(v){ let s=''; for(const x of v){ let q=Math.round(Math.max(-1,Math.min(1,x*4))*127); if(q<0) q+=256; s+=String.fromCharCode(q); } return btoa(s); }
function remember(k, v){ const L=learned(); const a=(L[k]=L[k]||[]); a.unshift(i8b64(v)); L[k]=a.slice(0,3); try{ localStorage.setItem(LEARN, JSON.stringify(L)); }catch(e){} }
const userEmb = {};
function idbPhotos(){ return new Promise(res=>{ try{ const r=indexedDB.open('ltf_photos',1); r.onupgradeneeded=()=>r.result.createObjectStore('p'); r.onsuccess=()=>{ const out={}; try{ const st=r.result.transaction('p').objectStore('p'); const c=st.openCursor(); c.onsuccess=()=>{ const x=c.result; if(x){ out[x.key]=x.value; x.continue(); } else res(out); }; c.onerror=()=>res(out); }catch(e){ res(out); } }; r.onerror=()=>res({}); }catch(e){ res({}); } }); }
function imgEl(src){ return new Promise((ok,ko)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=ko; i.src=src; }); }
async function embed(src){ const e = tf.tidy(()=>{ const x=model.infer(src, true); return x.div(x.norm()); }); const v=await e.data(); e.dispose(); return Float32Array.from(v); }
async function userRefs(){ const ph = await idbPhotos(); const out=[];
  for(const [k,url] of Object.entries(ph)){ if(!url) continue; const sig=k+':'+url.length; if(!userEmb[sig]){ try{ userEmb[sig]=await embed(await imgEl(url)); }catch(e){ continue; } } out.push({k, v:userEmb[sig], own:true}); }
  Object.entries(learned()).forEach(([k,a])=>a.forEach(s=>out.push({k, v:b64i8(s), own:true})));
  return out; }
const dot = (a,b) => { let s=0; for(let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; };

// ---------- analysis ----------
async function analyse(canvas, status){
  const groups = catalog(); const gk = Object.fromEntries(groups.map(g=>[g.k,g]));
  status(T('Analyse de la photo…','Analysing the photo…'));
  const v = await embed(canvas);
  const all = refs.concat(await userRefs());
  const img = {}; all.forEach(r=>{ if(!gk[r.k]) return; const s=dot(v,r.v); if(!(img[r.k]>=s)) img[r.k]=s; });
  let text = '';
  if(ocr){ status(T('Lecture de l\'étiquette…','Reading the label…')); try{ const r = await ocr.recognize(canvas); text = (r.data && r.data.text) || ''; }catch(e){} }
  const ts = textScores(groups, text); const tmax = Math.max(0, ...Object.values(ts));
  const imgVals = Object.values(img).sort((a,b)=>b-a); const imax = imgVals[0]||0;
  const res = groups.map(g=>{ const i=img[g.k]||0, t=ts[g.k]||0; const tn = tmax? t/tmax : 0; const strongT = t>=4 && tn===1; return {g, i, t, score: i + 0.35*tn*Math.min(1,t/3) + (strongT?0.3:0)}; }).sort((a,b)=>b.score-a.score);
  const top = res[0]; const conf = top ? Math.max(0, Math.min(1, (top.score-0.25)/0.5)) : 0;
  return {v, text, res: res.slice(0,4), conf, imax};
}

// ---------- UI ----------
let stream=null, ov=null, lastV=null;
function stop(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } }
function close(){ stop(); if(ov){ ov.remove(); ov=null; } }
function grab(src, w, h){ const m=Math.max(w,h), k=Math.min(1, 1024/m); const c=document.createElement('canvas'); c.width=Math.round(w*k); c.height=Math.round(h*k); c.getContext('2d').drawImage(src,0,0,c.width,c.height); return c; }
function body(html){ if(ov) ov.querySelector('.scb').innerHTML = html; }
async function open(){
  close();
  ov = document.createElement('div'); ov.className='ov scanov'; ov.id='scanOv';
  ov.innerHTML = `<div class="sch"><b>📷 ${T('Scanner','Scan')}</b><button class="btn txt" id="scX">✕ ${T('Fermer','Close')}</button></div><div class="scb"></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#scX').onclick = close;
  new MutationObserver((m,o)=>{ if(!document.body.contains(ov||document.createElement('i'))){ stop(); o.disconnect(); } }).observe(document.body,{childList:true});
  camera();
  load(p=>{ const b=$('#scPrep'); if(b) b.style.width=Math.round(p*100)+'%'; const t=$('#scPrepT'); if(t) t.textContent = p<1 ? T('Préparation hors-ligne… ','Getting ready for offline… ')+Math.round(p*100)+'%' : T('Prêt, fonctionne hors-ligne ✓','Ready, works offline ✓'); }).catch(()=>{ const t=$('#scPrepT'); if(t) t.textContent=T('Connexion nécessaire pour la première utilisation.','A connection is needed the first time.'); });
}
async function camera(){
  body(`<div class="scv"><video id="scVid" playsinline muted autoplay></video><div class="scframe"></div></div>
  <div class="scprep"><div class="scbar"><div id="scPrep"></div></div><div class="muted sm" id="scPrepT">${loading?'':T('Préparation…','Preparing…')}</div></div>
  <div class="scbtns"><label class="btn sec" for="scFile">🖼 ${T('Galerie','Gallery')}</label><input id="scFile" type="file" accept="image/*" hidden><button class="scshot" id="scShot" aria-label="scan"></button><span style="width:90px"></span></div>
  <p class="muted sm" style="text-align:center">${T('Cadrez l\'assiette, l\'étiquette ou la bouteille.','Frame the plate, the label or the bottle.')}</p>`);
  if(model){ const t=$('#scPrepT'); if(t) t.textContent=T('Prêt, fonctionne hors-ligne ✓','Ready, works offline ✓'); const b=$('#scPrep'); if(b) b.style.width='100%'; }
  const vid = $('#scVid');
  try{ stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:1280}}, audio:false}); vid.srcObject = stream; }
  catch(e){ const v=ov&&ov.querySelector('.scv'); if(v) v.innerHTML=`<div class="scnocam">${T('Caméra indisponible : utilisez la galerie ou l\'appareil photo.','Camera unavailable: use the gallery or the camera app.')}</div>`; const f=$('#scFile'); if(f) f.setAttribute('capture','environment'); }
  $('#scShot').onclick = () => { if(!stream || !vid.videoWidth){ $('#scFile').click(); return; } const c=grab(vid, vid.videoWidth, vid.videoHeight); stop(); run(c); };
  $('#scFile').onchange = async e => { const f=e.target.files[0]; if(!f) return; const u=URL.createObjectURL(f); try{ const i=await imgEl(u); stop(); run(grab(i, i.naturalWidth, i.naturalHeight)); } finally{ setTimeout(()=>URL.revokeObjectURL(u), 4000); } };
}
async function run(c){
  const shot = c.toDataURL('image/jpeg', .7);
  body(`<img class="scshotimg" src="${shot}" alt=""><div class="card sm"><div class="b" id="scSt">${T('Préparation…','Preparing…')}</div><div class="scbar"><div id="scPrep" style="width:5%"></div></div></div>`);
  const st = m => { const e=$('#scSt'); if(e) e.textContent=m; };
  try{ await load(p=>{ const b=$('#scPrep'); if(b) b.style.width=Math.round(p*100)+'%'; st(T('Préparation hors-ligne… ','Getting ready for offline… ')+Math.round(p*100)+'%'); }); }
  catch(e){ body(`<img class="scshotimg" src="${shot}" alt=""><div class="card sm">${T('Le scanner doit être téléchargé une première fois avec une connexion.','The scanner needs a connection once to download.')}</div><div class="scbtns"><button class="btn grow" id="scAgain">${T('Réessayer','Try again')}</button></div>`); $('#scAgain').onclick=camera; return; }
  const r = await analyse(c, st); lastV = r.v; show(shot, r);
}
function show(shot, r){
  const top = r.res[0]; const sure = r.conf >= 0.55;
  const card = (x, big) => { const g=x.g, it=g.item, ph=(refs.find(q=>q.k===g.k)||{}).img; const fm = g.list.length>1 ? ' · '+g.list.length+' '+T('formats','formats') : '';
    return `<div class="card sm row scres${big?' big':''}" data-k="${esc(g.k)}" data-id="${esc(it.id)}">${ph?`<img class="thumb" src="${esc(ph)}" alt="">`:`<div class="av">🍽</div>`}<div class="tx"><div class="n">${esc(g.name)}</div><div class="muted sm">${esc((CHN[it.ch]||[it.ch,it.ch])[EN()?1:0])}${fm}${g.sub?' · '+esc(g.sub.slice(0,60)):''}</div></div><div class="rt gold">›</div></div>`; };
  const online = navigator.onLine;
  const q = (r.text && norm(r.text).split(' ').filter(w=>w.length>=4).slice(0,8).join(' ')) || (top?top.g.name:'');
  body(`<img class="scshotimg" src="${shot}" alt="">
  <div class="sh">${sure?T('C\'est sûrement','Most likely'):T('Peut-être','Maybe')}</div>${top?card(top,true):''}
  ${r.res.length>1?`<div class="sh">${T('Autres possibilités','Other matches')}</div>`+r.res.slice(1).map(x=>card(x)).join(''):''}
  ${r.text&&r.text.trim()?`<details class="muted sm scocr"><summary>${T('Texte lu','Text read')}</summary>${esc(r.text.trim().slice(0,300))}</details>`:''}
  <div class="scbtns"><button class="btn sec" id="scAgain">↺ ${T('Rescanner','Scan again')}</button>${online?`<a class="btn sec" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(q)}">🌐 ${T('Chercher en ligne','Search online')}</a>`:''}</div>
  <p class="muted sm" style="text-align:center">${T('Touchez le bon résultat : le scanner s\'en souviendra.','Tap the right match: the scanner will remember it.')}</p>`);
  $('#scAgain').onclick = camera;
  ov.querySelectorAll('.scres').forEach(el=> el.onclick = () => { if(lastV) remember(el.dataset.k, lastV); const id=el.dataset.id; close(); if(window.LTFinfo) LTFinfo(id); });
}

// ---------- floating button (home only) ----------
function fab(){
  let b = document.getElementById('scanFab');
  if(!b){ b=document.createElement('button'); b.id='scanFab'; b.className='scanfab'; b.setAttribute('aria-label','Scanner'); b.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.5"/></svg>'; b.onclick=open; document.body.appendChild(b); }
  const app = document.getElementById('app'); const home = !!(app && app.querySelector('.hero')); b.style.display = home && !ov ? 'flex' : 'none';
  const inst = document.getElementById('inst'); b.classList.toggle('up', !!(inst && inst.style.display==='block'));
}
new MutationObserver(fab).observe(document.documentElement, {childList:true, subtree:true});
window.LTFscan = open; window.LTFscanT = {catalog, textScores};
})();
