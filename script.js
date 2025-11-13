/* Celliverse — main logic
   Designed for GitHub Pages
   Realistic microscopic visuals drawn in canvas with cyberpunk accents.
*/

// ---------- CONFIG + DATA ----------
const ORGS = [
  { id:'nucleus',    name:'Nucleus',    short:'Command Center', adaptation:'Regulates gene expression and evolutionary potential' },
  { id:'mito',       name:'Mitochondria', short:'Energy Reactor', adaptation:'Boosts usable energy for stress survival' },
  { id:'ribosome',   name:'Ribosome',   short:'Protein Forge', adaptation:'Synthesizes proteins critical for new traits' },
  { id:'er',         name:'ER',         short:'Transport Grid', adaptation:'Efficient molecule flow for fast adaptation' },
  { id:'golgi',      name:'Golgi',      short:'Cargo Master', adaptation:'Packages specialized molecules for new functions' },
  { id:'lysosome',   name:'Lysosome',   short:'Waste Eliminator', adaptation:'Detoxifies and recycles material for resilience' },
  { id:'vacuole',    name:'Vacuole',    short:'Storage Vault', adaptation:'Stores resources to survive scarcity' },
  { id:'chlor',      name:'Chloroplast', short:'Solar Harvester', adaptation:'Harvests light energy, enabling plant strategies' },
  { id:'membrane',   name:'Cell Membrane', short:'Adaptive Shield', adaptation:'Regulates exchange and blocks toxins' },
  { id:'cyto',       name:'Cytoskeleton', short:'Structural Framework', adaptation:'Supports mobility and morphological change' },
];

let state = {
  playerName: '',
  adaptationGlobal: 0, // 0 - 100
  completed: {},      // organelleId -> boolean
  organAdapt: {},     // organelleId -> progress 0-100
  environment: 'normal',
};

// ---------- HELPERS ----------
const $ = id => document.getElementById(id);
const clamp = (v, a=0, b=100) => Math.max(a, Math.min(b, v));

// ---------- UI BOOTSTRAP ----------
function initUI(){
  // welcome
  $('start-btn').onclick = () => {
    const name = $('player-name').value.trim() || 'Explorer';
    state.playerName = name;
    $('welcome').classList.add('hidden');
    $('hub').classList.remove('hidden');
    $('greeting').innerText = `Welcome, ${state.playerName}. Neural link active.`;
    renderOrganelleGrid();
    updateAdaptationUI();
  };
  $('demo-btn').onclick = () => {
    // quick demo to show visuals
    $('player-name').value = 'Demo-Unit';
    $('start-btn').click();
    // auto open mitochondria after a tick
    setTimeout(()=>openOrganelle(1), 600);
  };
  $('apply-env').onclick = () => {
    const env = $('environment-select').value;
    state.environment = env;
    flashSystemMessage(`Environment: ${env}`);
    applyEnvironment(env);
  };
  $('open-tracker').onclick = openTracker;
  $('close-tracker').onclick = closeTracker;
  $('reset-btn').onclick = resetProgress;
  $('back-hub').onclick = backToHub;
  $('org-complete').onclick = commitOrganelle;
  $('restart-btn').onclick = () => location.reload();
  $('download-log').onclick = downloadMissionLog;
}

// Render organelle buttons
function renderOrganelleGrid(){
  const grid = $('organelle-grid');
  grid.innerHTML = '';
  ORGS.forEach((o, idx)=>{
    const el = document.createElement('div');
    el.className = 'org-btn';
    el.id = `btn-${o.id}`;
    el.innerHTML = `<h4>${o.name}</h4><p>${o.short}</p>`;
    el.onclick = ()=> openOrganelle(idx);
    if(state.completed[o.id]) {
      el.style.opacity = '0.5';
      el.innerHTML += `<small style="color:#8ff;margin-top:6px">Adapted</small>`;
    }
    grid.appendChild(el);
  });
}

// Update global adaptation meter UI
function updateAdaptationUI(){
  const percent = clamp(state.adaptationGlobal, 0, 100);
  $('adaptation-bar').style.width = `${percent}%`;
  $('adaptation-percent').innerText = `${Math.round(percent)}%`;
  if(percent >= 100) triggerEvolutionBurst();
}

// flash small system message
function flashSystemMessage(msg){
  const el = document.createElement('div');
  el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.bottom='30px'; el.style.background='rgba(0,0,0,0.6)'; el.style.padding='8px 12px';
  el.style.border='1px solid rgba(0,255,213,0.07)'; el.style.borderRadius='8px'; el.style.color='#bff';
  el.innerText = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity='0.0', 1600);
  setTimeout(()=> el.remove(), 2200);
}

// ---------- ENVIRONMENT EFFECTS ----------
function applyEnvironment(env){
  const body = document.body;
  // subtle background tint to simulate environmental stress
  if(env === 'normal'){
    body.style.background = 'linear-gradient(180deg,#02030a,#05060a)';
  } else if(env === 'heat'){
    body.style.background = 'linear-gradient(180deg,#1a0300,#05060a)';
    particleSystem.setHeat(0.8);
  } else if(env === 'lowlight'){
    body.style.background = 'linear-gradient(180deg,#00110a,#02030a)';
    particleSystem.setLight(0.2);
  } else if(env === 'toxins'){
    body.style.background = 'linear-gradient(180deg,#021a1a,#05060a)';
    particleSystem.setToxin(1.0);
  } else if(env === 'scarcity'){
    body.style.background = 'linear-gradient(180deg,#0a0410,#05060a)';
    particleSystem.setScarcity(1.0);
  }
  // small visual feedback
  setTimeout(()=> {
    particleSystem.resetModifiers();
  }, 3000);
}

// ---------- ORGANELLE PAGE + GAMES ----------
let currentOrgIndex = null;
let gameLoopId = null;

// Open organelle canvas and initialize its game
function openOrganelle(index){
  currentOrgIndex = index;
  const o = ORGS[index];
  $('hub').classList.add('hidden');
  $('organelle').classList.remove('hidden');
  $('org-title').innerText = `${o.name} — ${o.short}`;
  $('org-desc').innerText = o.adaptation;
  // reset org UI
  state.organAdapt[o.id] = state.organAdapt[o.id] || 0;
  $('org-meter').style.width = `${state.organAdapt[o.id]}%`;
  renderOrganelleCanvas(o.id);
}

// Back to hub
function backToHub(){
  stopOrgGame();
  $('organelle').classList.add('hidden');
  $('hub').classList.remove('hidden');
  renderOrganelleGrid();
}

// commit organelle adaptation (applies global points)
function commitOrganelle(){
  const o = ORGS[currentOrgIndex];
  // only allow commit if local progress >= 80
  const local = state.organAdapt[o.id] || 0;
  if(local < 80){
    flashSystemMessage('Adaptation incomplete — reach 80% to commit');
    return;
  }
  state.completed[o.id] = true;
  // award global adaptation points scaled by organ importance
  const bonus = 10 + Math.round(local / 10); // 10-20
  state.adaptationGlobal = clamp(state.adaptationGlobal + bonus, 0, 100);
  updateAdaptationUI();
  // visually mark organelle as adapted in tracker
  lightUpTracker(o.id);
  flashSystemMessage(`${o.name} adaptation committed (+${bonus}%)`);
  backToHub();
}

// ---------- GAME RENDERERS (canvas) ----------
const canvas = $('org-canvas');
const ctx = canvas.getContext('2d');

// particle helper system for background micro-environment
const particleSystem = (function(){
  let particles = [];
  let heat = 0, light=1, toxin=0, scarcity=0;
  const MAX = 120;
  function resetModifiers(){ heat=0; toxin=0; scarcity=0; light=1; }
  function setHeat(v){ heat = v; }
  function setLight(v){ light = v; }
  function setToxin(v){ toxin = v; }
  function setScarcity(v){ scarcity = v; }
  function spawn(){
    while(particles.length < MAX){
      particles.push({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r: 0.5+Math.random()*2.2,
        v: -0.2 + Math.random()*0.6,
        hue: 180 + Math.random()*80
      });
    }
  }
  function updateAndDraw(ctx){
    spawn();
    for(let p of particles){
      p.y += p.v * (1 + heat*3 - scarcity*2);
      if(p.y < -10) p.y = canvas.height + 10;
      // color shift for toxins
      const hue = p.hue + toxin*100;
      ctx.fillStyle = `hsla(${hue}, 70%, ${45 - (light*20)}%, ${0.08 + p.r*0.02})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r*2, p.r*2, 0,0,Math.PI*2);
      ctx.fill();
    }
  }
  return { updateAndDraw, setHeat, setLight, setToxin, setScarcity, resetModifiers };
})();

// CORE per-organelle game logic implementations
const games = {
  nucleus: nucleusGame,
  mito: mitochondriaGame,
  ribosome: ribosomeGame,
  er: erGame,
  golgi: golgiGame,
  lysosome: lysosomeGame,
  vacuole: vacuoleGame,
  chlor: chloroplastGame,
  membrane: membraneGame,
  cyto: cytoskeletonGame
};

// Generic call to render organelle canvas
function renderOrganelleCanvas(orgId){
  stopOrgGame();
  // initialize local progress if missing
  state.organAdapt[orgId] = state.organAdapt[orgId] || 0;
  // show instructions
  const inst = $('game-instructions');
  inst.innerText = 'Loading organelle simulation...';
  // start the appropriate game
  const fn = games[orgId] || (()=>{ inst.innerText = 'No game implemented.'; });
  fn(canvas, ctx, (progress)=> {
    // progress callback updates org-meter width
    state.organAdapt[orgId] = clamp(progress, 0, 100);
    $('org-meter').style.width = `${state.organAdapt[orgId]}%`;
  }, state.environment, state);
}

// stop current game loop / event handlers
function stopOrgGame(){
  // clear events
  canvas.onmousedown = null;
  canvas.onmousemove = null;
  canvas.onmouseup = null;
  canvas.onclick = null;
  // cancel animation
  if(gameLoopId) { cancelAnimationFrame(gameLoopId); gameLoopId = null; }
}

// ---------- ORGANELLE GAME DEFINITIONS (realistic + detailed animations) ----------

// 1) Nucleus: DNA Sequence Matching — realistic rotating DNA strand; click to "activate" matching bases
function nucleusGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['nucleus'] || 0;
  const center = { x: canvas.width/2, y: canvas.height/2 };
  let angle = 0;
  // base sites that need activation
  const sites = Array.from({length:10}, (_,i)=>({theta: i*(Math.PI*2/10), active:false}));
  canvas.onclick = (e) => {
    // identify clicked site
    const rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for(let s of sites){
      const sx = center.x + Math.cos(s.theta+angle)*80, sy = center.y + Math.sin(s.theta+angle)*80;
      const d = Math.hypot(mx-sx, my-sy);
      if(d < 18 && !s.active){
        s.active = true;
        progress = Math.min(100, progress + 12);
        onProgress(progress);
        animatePulse(sx, sy);
      }
    }
  };
  function animatePulse(x,y){
    let t=0;
    const pulse = ()=> {
      t+=0.08;
      ctx.beginPath(); ctx.arc(x,y,8 + Math.sin(t)*6,0,Math.PI*2);
      ctx.fillStyle = 'rgba(0,255,213,0.08)'; ctx.fill();
      if(t<1.8) requestAnimationFrame(pulse);
    }; pulse();
  }
  // draw loop
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // environment particles
    particleSystem.updateAndDraw(ctx);
    // draw nucleus halo
    const g = ctx.createRadialGradient(center.x,center.y,10,center.x,center.y,160);
    g.addColorStop(0,'rgba(0,255,213,0.06)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(center.x,center.y,160,110,0,0,Math.PI*2); ctx.fill();
    // rotating double-helix (stylized realistic)
    angle += 0.015;
    for(let i=0;i<160;i+=6){
      const t = i/160 * Math.PI*6 + angle*2;
      const x = center.x + Math.cos(t)*40;
      const y = center.y + (i-80)*0.9;
      ctx.fillStyle = `rgba(${30 + i}, ${200 - i/1.2}, ${230 - i/1.5}, ${0.7 - i/320})`;
      ctx.beginPath(); ctx.ellipse(x,y,6,3,Math.sin(t)*0.6,0,Math.PI*2); ctx.fill();
    }
    // draw binding sites
    for(let s of sites){
      const sx = center.x + Math.cos(s.theta+angle)*80;
      const sy = center.y + Math.sin(s.theta+angle)*80;
      ctx.beginPath(); ctx.arc(sx,sy,10,0,Math.PI*2);
      ctx.fillStyle = s.active ? 'rgba(0,255,213,0.95)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,255,213,0.12)'; ctx.stroke();
    }
    // status text
    ctx.fillStyle = '#bff'; ctx.font = '14px sans-serif';
    ctx.fillText('Activate DNA sites by clicking — this unlocks regulatory programs.',20,18);
    ctx.fillText(`Progress: ${Math.round(progress)}%`,20,36);
    // if env is heat, slow progress naturally (simulates stress)
    if(env === 'heat'){ progress = Math.max(0, progress - 0.01); onProgress(progress); }
    // autos finish condition for players who already advanced
    if(progress >= 100) {
      ctx.fillStyle = 'rgba(0,255,213,0.06)'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#0ff'; ctx.fillText('Nucleus adapted — gene programs online.', 20,60);
    }
  }
  loop();
}

// 2) Mitochondria: energy core pulses; rapid clicking increases core intensity and an energy waveform rises
function mitochondriaGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['mito'] || 0;
  let energy = progress; // scales 0-100
  let corePulse = 0;
  canvas.onclick = ()=> { energy += 6; energy = Math.min(100, energy); progress = energy; onProgress(progress); pulseFlash(); };
  function pulseFlash(){ corePulse = 1.6; }
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    energy = Math.max(0, energy - 0.02 - (env==='heat'?0.03:0)); // drain under stress
    corePulse *= 0.92;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw mitochondrion shape (realistic bean with cristae)
    const cx = canvas.width/2, cy = canvas.height/2;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(Math.sin(Date.now()/800)/12);
    // outer membrane
    const grd = ctx.createLinearGradient(-120,-60,120,60);
    grd.addColorStop(0,'rgba(30,60,80,0.9)'); grd.addColorStop(1,'rgba(20,30,45,0.95)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(0,0,180,95,0,0,Math.PI*2); ctx.fill();
    // inner folds (cristae) drawn as arcs
    for(let i=-3;i<=3;i++){
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,200,80,${0.05 + (energy/200)})`;
      ctx.lineWidth = 4;
      ctx.ellipse(i*18,0,120 - Math.abs(i)*10,50 + Math.sin(Date.now()/300 + i)*6, 0, Math.PI*1.1, Math.PI*1.95);
      ctx.stroke();
    }
    // energy core
    const coreR = 18 + (energy/3) + corePulse*8;
    ctx.beginPath(); ctx.fillStyle = `rgba(${50 + energy*1.6}, ${180 + energy*0.2}, 210, 0.95)`;
    ctx.arc(50,-10, coreR, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // waveform at bottom
    ctx.strokeStyle = 'rgba(0,255,213,0.9)'; ctx.lineWidth=2; ctx.beginPath();
    const baseY = canvas.height - 40;
    for(let x=0;x<canvas.width;x+=6){
      const y = baseY + Math.sin((x/20) + (Date.now()/1500)) * (12 + energy/6);
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    } ctx.stroke();
    // HUD text
    ctx.fillStyle = '#bff'; ctx.font = '13px sans-serif';
    ctx.fillText('Click rapidly to charge ATP output. Energy sustains adaptation under stress.', 14, 20);
    ctx.fillText(`Energy: ${Math.round(energy)}%`, 14, 38);
    onProgress(progress);
  }
  loop();
}

// 3) Ribosome: drag amino acids (realistic spheres) into a chain slot; binding snaps and glows
function ribosomeGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['ribosome'] || 0;
  // amino acids array
  const aas = Array.from({length:6}, (_,i)=>({x:60 + i*80, y:300, r:18, color:`hsl(${60+i*30},80%,50%)`, picked:false}));
  let chainX = 500, chainY = 160;
  let dragging = null, offset = {x:0,y:0};
  canvas.onmousedown = (e)=>{
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    for(let a of aas){
      const d = Math.hypot(mx-a.x, my-a.y);
      if(d < a.r){ dragging = a; offset.x = mx - a.x; offset.y = my - a.y; break; }
    }
  };
  canvas.onmousemove = (e)=>{
    if(!dragging) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    dragging.x = mx - offset.x; dragging.y = my - offset.y;
  };
  canvas.onmouseup = (e)=>{
    if(!dragging) return;
    const d = Math.hypot(dragging.x - chainX, dragging.y - chainY);
    if(d < 40 && !dragging.picked){
      dragging.picked = true;
      progress = clamp(progress + 18,0,100);
      onProgress(progress);
      // snap to chain position + small offset
      dragging.x = chainX + (Math.random()*30 -15);
      dragging.y = chainY + (Math.random()*16 -8);
      animateSnap(dragging.x, dragging.y);
    } else {
      // return to starting row
      const idx = aas.indexOf(dragging);
      dragging.x = 60 + idx*80; dragging.y = 300;
    }
    dragging = null;
  };
  function animateSnap(x,y){
    let t=0;
    const anim = ()=>{
      t+=0.12;
      ctx.beginPath(); ctx.arc(x,y, 28 + Math.sin(t)*6, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,255,213,0.06)'; ctx.fill();
      if(t<2.4) requestAnimationFrame(anim);
    }; anim();
  }
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw ribosome large platform (realistic grainy texture)
    ctx.fillStyle = 'rgba(40,60,70,0.95)'; ctx.beginPath(); ctx.ellipse(360,220,200,90,0,0,Math.PI*2); ctx.fill();
    // chain slot
    ctx.fillStyle = 'rgba(12,20,25,0.9)'; ctx.fillRect(chainX-60, chainY-22, 160, 44);
    ctx.strokeStyle = 'rgba(0,255,213,0.06)'; ctx.strokeRect(chainX-60, chainY-22, 160, 44);
    // draw amino acids
    for(let a of aas){
      ctx.beginPath(); ctx.fillStyle = a.color; ctx.ellipse(a.x,a.y,a.r,a.r,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
      if(a.picked){
        ctx.fillStyle = 'rgba(0,255,213,0.06)';
        ctx.fillRect(a.x-20, a.y-8, 40, 16);
      }
    }
    ctx.fillStyle = '#bff'; ctx.font='13px sans-serif';
    ctx.fillText('Drag amino acids into the protein chain slot. Build a functional protein to adapt.', 14, 20);
    ctx.fillText(`Protein Assembly: ${Math.round(progress)}%`, 14, 40);
    onProgress(progress);
  }
  loop();
}

// 4) ER: conveyor belt simulation — route glowing vesicles to targets
function erGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['er'] || 0;
  const belt = {x:50,y:220,w:620,h:48,offset:0};
  const ves = Array.from({length:6}, (_,i)=>({x:60 + i*90, y:240, dest: Math.random()>0.5? 'A':'B', color:`hsla(${120+i*20},80%,50%,1)`, delivered:false}));
  // click to dispatch: click a vesicle to send along belt (it will move and if matched to correct dock -> progress)
  canvas.onclick = (e)=>{
    const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
    for(let v of ves){
      if(v.delivered) continue;
      const d = Math.hypot(mx-v.x, my-v.y);
      if(d < 22){ v.moving=true; break; }
    }
  };
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    belt.offset += 1.6;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw belt
    ctx.fillStyle = 'rgba(10,20,30,0.9)'; ctx.fillRect(belt.x, belt.y, belt.w, belt.h);
    // dock targets
    ctx.fillStyle = 'rgba(0,255,213,0.06)'; ctx.fillRect(100,140,120,60); ctx.fillRect(470,140,120,60);
    ctx.fillStyle = '#bff'; ctx.fillText('Target A', 120, 165); ctx.fillText('Target B', 490, 165);
    // update vesicles
    ves.forEach(v=>{
      if(v.moving){
        v.x += 3.5;
        if(v.x > 600){
          // check landing dock based on v.dest
          const landedAt = v.x > 480 ? 'B' : 'A';
          if(landedAt === v.dest){ v.delivered = true; progress = clamp(progress + 12,0,100); onProgress(progress); flashDock(landedAt); }
          else { progress = clamp(progress - 6,0,100); onProgress(progress); }
          v.moving = false;
        }
      }
      // draw vesicle
      ctx.beginPath(); ctx.fillStyle = v.color; ctx.ellipse(v.x, v.y + Math.sin(Date.now()/400 + v.x/120)*4, 16, 14,0,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle='#bff'; ctx.fillText('Click a vesicle to launch it down the ER conveyor. Match destination for correct processing.', 14, 20);
    ctx.fillText(`Transport Efficiency: ${Math.round(progress)}%`, 14, 40);
  }
  function flashDock(which){
    // quick flash effect
    let t=0;
    const anim = ()=>{
      t+=0.08;
      ctx.fillStyle = `rgba(0,255,213,${0.18 - t*0.06})`;
      if(which==='A') ctx.fillRect(100,140,120,60); else ctx.fillRect(470,140,120,60);
      if(t<3) requestAnimationFrame(anim);
    }; anim();
  }
  loop();
}

// 5) Golgi: sorting puzzle — drag small packets into labeled stacks
function golgiGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['golgi'] || 0;
  const packets = Array.from({length:7}, (_,i)=>({x:60 + i*90, y:300, type: (i%3), picked:false}));
  const stacks = [{x:160,y:110,type:0},{x:320,y:110,type:1},{x:480,y:110,type:2}];
  let drag = null, offs={x:0,y:0};
  canvas.onmousedown = (e)=>{
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    for(let p of packets){
      if(Math.hypot(mx-p.x, my-p.y) < 14){ drag = p; offs.x = mx-p.x; offs.y = my-p.y; break; }
    }
  };
  canvas.onmousemove = (e)=>{ if(!drag) return; const r = canvas.getBoundingClientRect(); drag.x = e.clientX - r.left - offs.x; drag.y = e.clientY - r.top - offs.y; };
  canvas.onmouseup = (e)=>{
    if(!drag) return;
    // check stacks
    for(let s of stacks){
      if(Math.hypot(drag.x - s.x, drag.y - s.y) < 40){
        if(drag.type === s.type){ drag.placed = true; progress = clamp(progress + 12,0,100); onProgress(progress); }
        else progress = clamp(progress - 6,0,100);
        onProgress(progress);
      }
    }
    drag = null;
  };
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw Golgi stacks
    for(let s of stacks){
      ctx.fillStyle = 'rgba(40,60,80,0.9)'; ctx.fillRect(s.x-40,s.y-24,80,40); ctx.fillStyle='#bff'; ctx.fillText(`Type ${s.type}`, s.x-26, s.y+4);
    }
    // draw packets
    for(let p of packets){
      if(p.placed) continue;
      ctx.beginPath(); ctx.fillStyle = `hsl(${120 + p.type*70},70%,55%)`; ctx.rect(p.x-12,p.y-8,24,16); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.stroke();
    }
    ctx.fillStyle='#bff'; ctx.fillText('Drag packets into correct Golgi stacks to process cargo.', 14, 20);
    ctx.fillText(`Processing: ${Math.round(progress)}%`, 14, 40);
  }
  loop();
}

// 6) Lysosome: click debris to dissolve them — dissolution spawns particles and cleans cell
function lysosomeGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['lysosome'] || 0;
  let debris = Array.from({length:12}, ()=>({x:60 + Math.random()*600, y:60 + Math.random()*260, r:8 + Math.random()*18, alive:true}));
  canvas.onclick = (e)=>{
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    for(let d of debris){
      if(!d.alive) continue;
      if(Math.hypot(mx-d.x,my-d.y) < d.r + 6){
        d.alive=false; progress = clamp(progress + 8,0,100); onProgress(progress);
        spawnDissolve(d.x, d.y);
      }
    }
  };
  function spawnDissolve(x,y){
    for(let i=0;i<14;i++){
      const px = {x, y, vx: (Math.random()-0.5)*6, vy:(Math.random()-0.6)*4, life: 30 + Math.random()*40, hue: 20 + Math.random()*40};
      dissolveParticles.push(px);
    }
  }
  const dissolveParticles = [];
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw debris
    for(let d of debris){
      if(d.alive){
        ctx.beginPath(); ctx.fillStyle = 'rgba(120,120,140,0.9)'; ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
      }
    }
    // update dissolve particles
    for(let p of dissolveParticles){
      p.x += p.vx; p.y += p.vy; p.life -= 1;
      ctx.beginPath(); ctx.fillStyle = `hsla(${p.hue},70%,55%,${p.life/80})`; ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
    }
    // cull
    for(let i=dissolveParticles.length-1;i>=0;i--) if(dissolveParticles[i].life<=0) dissolveParticles.splice(i,1);
    ctx.fillStyle='#bff'; ctx.fillText('Click debris to activate lysosomes and recycle material.', 14, 20);
    ctx.fillText(`Cleanup: ${Math.round(progress)}%`, 14, 40);
    onProgress(progress);
  }
  loop();
}

// 7) Vacuole: catch falling nutrients (move a scoop) — realistic droplet physics
function vacuoleGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['vacuole'] || 0;
  let scoopX = canvas.width/2 - 40;
  canvas.onmousemove = (e)=> {
    const r = canvas.getBoundingClientRect();
    scoopX = e.clientX - r.left - 40;
  };
  const drops = [];
  function spawnDrop(){ drops.push({x:20 + Math.random()*680, y:-10, vy:1 + Math.random()*2, r:6 + Math.random()*8}); }
  let tick=0;
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    tick++;
    if(tick % 45 === 0) spawnDrop();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw scoop
    ctx.fillStyle = 'rgba(60,80,100,0.95)'; ctx.fillRect(scoopX, 300, 120, 16);
    for(let i=drops.length-1;i>=0;i--){
      const d = drops[i];
      d.y += d.vy;
      // collision
      if(d.y > 300 && d.x > scoopX && d.x < scoopX + 120){
        progress = clamp(progress + 6,0,100); onProgress(progress);
        // pop particle
        for(let k=0;k<7;k++) spawnTiny(d.x, d.y);
        drops.splice(i,1);
      } else if(d.y > canvas.height + 30) drops.splice(i,1);
      else {
        ctx.beginPath(); ctx.fillStyle = 'rgba(60,200,255,0.9)'; ctx.arc(d.x, d.y, d.r,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.fillStyle='#bff'; ctx.fillText('Move the vacuole scoop to catch falling nutrients and fill storage.', 14, 20);
    ctx.fillText(`Storage: ${Math.round(progress)}%`, 14, 40);
  }
  const tiny = [];
  function spawnTiny(x,y){
    for(let i=0;i<5;i++) tiny.push({x,y,vx:(Math.random()-0.5)*2,vy:-1-Math.random()*2,life:20});
  }
  function drawTiny(){
    for(let i=tiny.length-1;i>=0;i--){
      const p = tiny[i]; p.x += p.vx; p.y += p.vy; p.life--;
      ctx.beginPath(); ctx.fillStyle = `rgba(0,200,255,${p.life/20})`; ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill();
      if(p.life<=0) tiny.splice(i,1);
    }
  }
  // wrapper loop to include tiny
  function masterLoop(){
    gameLoopId = requestAnimationFrame(masterLoop);
    loop();
    drawTiny();
  }
  masterLoop();
}

// 8) Chloroplast: sunlight beam capture — move chlorophyll receptors to intercept beams
function chloroplastGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['chlor'] || 0;
  // receptor positions
  const receptors = [{x:220,y:220, r:22, active:false},{x:380,y:160,r:22,active:false}];
  let beams = [];
  canvas.onmousemove = (e)=>{ /* no-op for now */ };
  canvas.onclick = (e)=>{
    // create beam targeted at click
    const r = canvas.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top;
    beams.push({x: mx, y: my, vy: -3, hue: 60 + Math.random()*80});
  };
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw chloroplast body (stacked thylakoid discs)
    const cx = 320, cy = 180;
    ctx.save(); ctx.translate(cx,cy);
    for(let i=0;i<10;i++){
      ctx.fillStyle = `rgba(40,120,40,${0.65 - i*0.04})`;
      ctx.beginPath(); ctx.ellipse(0, -i*6, 110,16,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // update beams
    for(let i=beams.length-1;i>=0;i--){
      const b = beams[i]; b.y += b.vy;
      ctx.beginPath(); ctx.fillStyle = `hsla(${b.hue},80%,60%,0.9)`; ctx.ellipse(b.x,b.y,6,6,0,0,Math.PI*2); ctx.fill();
      // check collision with receptors
      for(let r of receptors){
        if(!r.active && Math.hypot(b.x - r.x, b.y - r.y) < r.r + 6){
          r.active = true; progress = clamp(progress + 16,0,100); onProgress(progress);
          beams.splice(i,1); break;
        }
      }
      if(b.y < -10) beams.splice(i,1);
    }
    // draw receptors
    for(let r of receptors){
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
      ctx.fillStyle = r.active ? 'rgba(120,255,120,0.95)' : 'rgba(255,255,255,0.03)';
      ctx.fill(); ctx.strokeStyle = 'rgba(0,255,213,0.06)'; ctx.stroke();
    }
    ctx.fillStyle='#bff'; ctx.fillText('Click to send sunlight beams into chloroplasts. Intercept with receptors.', 14, 20);
    ctx.fillText(`Photosynthesis Capture: ${Math.round(progress)}%`, 14, 40);
  }
  loop();
}

// 9) Membrane: defend against toxins — move shield to intercept incoming toxin particles
function membraneGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['membrane'] || 0;
  let shieldX = canvas.width/2 - 100, shieldW = 200;
  const toxins = [];
  let tick=0;
  canvas.onmousemove = (e)=> { const r = canvas.getBoundingClientRect(); shieldX = e.clientX - r.left - shieldW/2; };
  function spawnToxin(){ toxins.push({x: Math.random()*canvas.width, y:-6, vy:2 + Math.random()*2, r:6 + Math.random()*8}) }
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    tick++; if(tick%30===0) spawnToxin();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // draw membrane ring
    ctx.beginPath(); ctx.strokeStyle='rgba(0,255,213,0.06)'; ctx.lineWidth=6; ctx.ellipse(canvas.width/2, canvas.height/2, 260,160,0,0,Math.PI*2); ctx.stroke();
    // shield
    ctx.fillStyle='rgba(0,255,213,0.06)'; ctx.fillRect(shieldX, canvas.height-64, shieldW, 24);
    // toxins
    for(let i=toxins.length-1;i>=0;i--){
      const t = toxins[i]; t.y += t.vy; ctx.beginPath(); ctx.fillStyle='rgba(180,40,40,0.9)'; ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.fill();
      // collision with shield
      if(t.y > canvas.height-64 && t.x > shieldX && t.x < shieldX + shieldW){
        // blocked
        progress = clamp(progress + 3,0,100); onProgress(progress);
        spawnShieldFlash(t.x, t.y);
        toxins.splice(i,1);
      } else if(t.y > canvas.height + 30){
        // toxin breached -> penalty
        progress = clamp(progress - 2,0,100); onProgress(progress);
        toxins.splice(i,1);
      }
    }
    ctx.fillStyle='#bff'; ctx.fillText('Move the adaptive shield to block toxin influx. Each block strengthens membrane integrity.', 14, 20);
    ctx.fillText(`Membrane Integrity: ${Math.round(progress)}%`, 14, 40);
  }
  function spawnShieldFlash(x,y){
    let t=0;
    const anim = ()=>{
      t += 0.12; ctx.beginPath(); ctx.arc(x,y, 18 + Math.sin(t)*8,0,Math.PI*2); ctx.fillStyle = `rgba(0,255,213,${0.18 - t*0.06})`; ctx.fill();
      if(t<3) requestAnimationFrame(anim);
    }; anim();
  }
  loop();
}

// 10) Cytoskeleton: connect moving nodes into stable lattice (click nodes to tether)
function cytoskeletonGame(canvas, ctx, onProgress, env, stateRef){
  let progress = stateRef.organAdapt['cyto'] || 0;
  const nodes = Array.from({length:8}, (_,i)=>({x:100+Math.random()*520,y:70+Math.random()*280,r:8,locked:false,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2}));
  canvas.onclick = (e)=>{
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    for(let n of nodes){
      if(Math.hypot(mx-n.x,my-n.y) < 12 && !n.locked){ n.locked=true; progress = clamp(progress + 12,0,100); onProgress(progress); break; }
    }
  };
  function loop(){
    gameLoopId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particleSystem.updateAndDraw(ctx);
    // move nodes
    for(let n of nodes){
      if(!n.locked){
        n.x += n.vx; n.y += n.vy;
        if(n.x<30||n.x>canvas.width-30) n.vx *= -1;
        if(n.y<30||n.y>canvas.height-30) n.vy *= -1;
      }
    }
    // draw connections
    ctx.strokeStyle='rgba(0,255,213,0.06)'; ctx.lineWidth=1.6;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x-b.x,a.y-b.y);
        if(d < 170){
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    // draw nodes
    for(let n of nodes){
      ctx.beginPath(); ctx.fillStyle = n.locked ? 'rgba(0,255,213,0.95)' : 'rgba(255,255,255,0.04)'; ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.stroke();
    }
    ctx.fillStyle='#bff'; ctx.fillText('Click nodes to lock them; form a stable cytoskeletal network for mobility and shape.', 14, 20);
    ctx.fillText(`Cytoskeleton Stability: ${Math.round(progress)}%`, 14, 40);
    onProgress(progress);
  }
  loop();
}

// ---------- TRACKER CANVAS ----------
const trackerCanvas = $('tracker-canvas'), tctx = trackerCanvas.getContext('2d');
function openTracker(){
  $('hub').classList.add('hidden');
  $('tracker').classList.remove('hidden');
  renderTracker();
}
function closeTracker(){ $('tracker').classList.add('hidden'); $('hub').classList.remove('hidden'); }
function renderTracker(){
  // draw cell central circle and organelle icons positioned around
  tctx.clearRect(0,0,trackerCanvas.width,trackerCanvas.height);
  const cx = trackerCanvas.width/2, cy = trackerCanvas.height/2;
  // cell base
  tctx.fillStyle = 'rgba(0,0,0,0.4)'; tctx.beginPath(); tctx.ellipse(cx,cy,200,200,0,0,Math.PI*2); tctx.fill();
  // organelle positions
  const R = 140, labels = [];
  ORGS.forEach((o,i)=>{
    const ang = i*(Math.PI*2/ORGS.length) - Math.PI/2;
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
    // if adapted, glow
    const adapted = !!state.completed[o.id];
    tctx.beginPath(); tctx.fillStyle = adapted ? 'rgba(0,255,213,0.9)' : 'rgba(255,255,255,0.06)';
    tctx.arc(x,y,22,0,Math.PI*2); tctx.fill();
    tctx.fillStyle = adapted ? '#001' : '#bff'; tctx.font='12px sans-serif';
    tctx.fillText(o.name, x-28, y+36);
    labels.push({id:o.id,x,y});
  });
  // build tracker list
  const list = $('tracker-list'); list.innerHTML = '';
  ORGS.forEach(o=>{
    const li = document.createElement('div'); li.className='tracker-item';
    li.innerHTML = `<b>${o.name}</b><div style="font-size:13px;margin-top:6px;color:#9df">${o.adaptation || o.short}</div>
      <div style="margin-top:8px">Status: ${state.completed[o.id] ? '<span style="color:#6f6">Adapted</span>' : '<span style="color:#8cf">Pending</span>'}</div>`;
    list.appendChild(li);
  });
}

// visually light up organelle in tracker when adapted
function lightUpTracker(orgId){
  // small flash effect on tracker canvas by redrawing with glow (simple impl)
  // save completed state already set
  renderTracker();
}

// ---------- EVOLUTION BURST (when global adaptation >= 100) ----------
let evolved = false;
function triggerEvolutionBurst(){
  if(evolved) return;
  evolved = true;
  flashSystemMessage('Global adaptation threshold reached — Initiating evolution sequence.');
  // show mission log and end
  setTimeout(()=> {
    showMissionComplete();
  }, 1600);
}

// mission complete log
function showMissionComplete(){
  $('hub').classList.add('hidden');
  $('organelle').classList.add('hidden');
  $('tracker').classList.add('hidden');
  $('mission').classList.remove('hidden');
  const summary = buildMissionLog();
  $('mission-log').innerText = summary;
  // prepare download link content
  $('download-log').onclick = (e)=>{
    const blob = new Blob([summary], {type: 'text/plain'});
    $('download-log').href = URL.createObjectURL(blob);
  };
}

// compile mission log text
function buildMissionLog(){
  const lines = [];
  lines.push(`Celliverse Mission Log — Explorer ${state.playerName}`);
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(`Global Adaptation Achieved: ${Math.round(state.adaptationGlobal)}%`);
  lines.push('Organelle status:');
  ORGS.forEach(o=>{
    const local = Math.round(state.organAdapt[o.id] || 0);
    const done = state.completed[o.id] ? 'ADAPTED' : 'PENDING';
    lines.push(` - ${o.name}: ${done} (${local}%) — ${o.adaptation}`);
  });
  lines.push('');
  lines.push('Notes: The cell underwent cyberpunk biotech transformations. Adaptations were visually applied and evolution sequence executed.');
  return lines.join('\n');
}

// ---------- RESET ----------
function resetProgress(){
  if(!confirm('Reset all adaptation progress?')) return;
  state.completed = {}; state.organAdapt = {}; state.adaptationGlobal = 0; evolved=false;
  updateAdaptationUI(); renderOrganelleGrid(); flashSystemMessage('Progress reset.');
}

// ---------- DOWNLOAD MISSION LOG -----------
function downloadMissionLog(){
  // placeholder: function assigned in showMissionComplete
}

// ---------- BOOT ----------
window.addEventListener('DOMContentLoaded', ()=>{
  // init state
  ORGS.forEach(o => { state.completed[o.id] = state.completed[o.id] || false; state.organAdapt[o.id] = state.organAdapt[o.id] || 0; });
  initUI();
  // gentle particle animate in background of canvas draws
  // seed environment normal
  applyEnvironment('normal');
});
