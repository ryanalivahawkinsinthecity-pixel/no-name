/* The Feeding Gap — prototype gameplay
   - Simple time-based simulation
   - Actions: Serve (free), Buy Meal, Fundraise, Request Donation, Rest
   - Metrics: budget, teacherEnergy, awareness
   - Students queue with varying hunger levels. Feed them to prevent negative outcomes.
*/

const CONFIG = {
  initialBudget: 50,
  initialEnergy: 90,
  initialAwareness: 20,
  mealCost: 10,
  serveEnergyCost: 6,   // teacher spends energy when serving "free"
  buyMealCost: 10,      // cost to buy a meal from budget
  restEnergyGain: 25,
  donationMin: 15,
  fundraiserAwarenessGain: 12,
  awarenessToBudgetMultiplier: 0.5, // each awareness point slightly improves donation outcomes
  studentsPerDay: 8,
  hungerTickMs: 4500, // how often hunger increases (ms)
  maxDays: 7 // for game pacing
};

let state = {
  budget: CONFIG.initialBudget,
  energy: CONFIG.initialEnergy,
  awareness: CONFIG.initialAwareness,
  students: [],
  day: 1,
  log: [],
  running: true
};

const facts = [
  "Many teachers spend their own money to ensure students have food during the school day.",
  "Food insecurity can negatively impact concentration, grades, and behavior.",
  "Small community actions (donations, volunteering) can dramatically improve school food programs.",
  "A meal costs differently across districts — funding is inconsistent and often insufficient.",
  "Awareness is one of the easiest levers — telling others and organizing locally helps."
];

/* DOM */
const budgetBar = document.getElementById('budgetBar');
const energyBar = document.getElementById('energyBar');
const awarenessBar = document.getElementById('awarenessBar');
const budgetText = document.getElementById('budgetText');
const energyText = document.getElementById('energyText');
const awarenessText = document.getElementById('awarenessText');

const studentList = document.getElementById('studentList');
const logList = document.getElementById('logList');

const serveBtn = document.getElementById('serveBtn');
const buyMealBtn = document.getElementById('buyMealBtn');
const fundraiseBtn = document.getElementById('fundraiseBtn');
const donateBtn = document.getElementById('donateBtn');
const restBtn = document.getElementById('restBtn');

const factBox = document.getElementById('factBox');
const factText = document.getElementById('factText');
const nextFact = document.getElementById('nextFact');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayClose = document.getElementById('overlayClose');

function log(message){
  state.log.unshift({t: new Date(), m: message});
  renderLog();
}

function renderLog(){
  logList.innerHTML = '';
  for(let i=0;i<state.log.length;i++){
    const li = document.createElement('li');
    li.textContent = `${state.log[i].m}`;
    logList.appendChild(li);
  }
}

/* STUDENT HELPERS */
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function makeStudent(id){
  return {
    id,
    name: `Student ${id}`,
    hunger: randInt(20,60), // 0 full, 100 starved
    needLevel: randInt(0,2) // 0 = normal, 1 = needy, 2 = at-risk
  };
}

function spawnStudents(){
  state.students = [];
  for(let i=1;i<=CONFIG.studentsPerDay;i++){
    state.students.push(makeStudent(i));
  }
}

/* UI */
function updateMeters(){
  // cap values for UI purposes
  const budgetPercent = Math.min(100, (state.budget / 200) * 100); // 200 = visual cap
  budgetBar.style.width = `${budgetPercent}%`;
  const energyPercent = Math.max(0, Math.min(100, state.energy));
  energyBar.style.width = `${energyPercent}%`;
  const awarenessPercent = Math.min(100, state.awareness);
  awarenessBar.style.width = `${awarenessPercent}%`;

  budgetText.textContent = `\$${state.budget.toFixed(0)}`;
  energyText.textContent = `${Math.max(0, Math.round(state.energy))}%`;
  awarenessText.textContent = `${Math.round(state.awareness)}%`;
}

function renderStudents(){
  studentList.innerHTML = '';
  state.students.forEach(s=>{
    const card = document.createElement('div');
    card.className = 'student';
    card.id = `s${s.id}`;
    const name = document.createElement('div'); name.className='sname'; name.textContent = s.name;
    const meta = document.createElement('div'); meta.className='smeta'; meta.textContent = `Need: ${s.needLevel === 0 ? 'Normal' : s.needLevel === 1 ? 'Needs help' : 'At-risk'}`;
    const hungerWrap = document.createElement('div'); hungerWrap.className='hunger';
    const fill = document.createElement('div'); fill.className='fill';
    fill.style.width = `${Math.min(100, s.hunger)}%`;
    hungerWrap.appendChild(fill);

    const actions = document.createElement('div'); actions.style.marginTop='8px';
    const feedBtn = document.createElement('button'); feedBtn.textContent='Feed'; feedBtn.style.padding='6px'; feedBtn.onclick = ()=>{
      feedStudent(s.id);
    };

    actions.appendChild(feedBtn);
    card.appendChild(name); card.appendChild(meta); card.appendChild(hungerWrap); card.appendChild(actions);
    studentList.appendChild(card);
  });
}

function showOverlay(title,text){
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove('hidden');
}

/* GAME ACTIONS */
function serveMeal(){
  // free serve uses teacher energy
  if(state.energy <= 0){
    log('Teacher is too exhausted to serve a free meal.');
    return;
  }
  // find hungriest student
  const target = state.students.reduce((acc,s)=> s.hunger>acc.hunger ? s : acc, state.students[0]);
  if(!target) return;
  target.hunger = Math.max(0, target.hunger - 45);
  state.energy -= CONFIG.serveEnergyCost;
  log(`Teacher served a meal to ${target.name} (energy -${CONFIG.serveEnergyCost}).`);
  renderStudents();
  updateMeters();
  checkDayState();
}

function buyMeal(){
  if(state.budget < CONFIG.buyMealCost){
    log('Not enough budget to buy a meal.');
    return;
  }
  const target = state.students.reduce((acc,s)=> s.hunger>acc.hunger ? s : acc, state.students[0]);
  if(!target) return;
  state.budget -= CONFIG.buyMealCost;
  target.hunger = Math.max(0, target.hunger - 65);
  log(`Bought a meal for ${target.name} (\$${CONFIG.buyMealCost}).`);
  renderStudents(); updateMeters(); checkDayState();
}

function restTeacher(){
  state.energy = Math.min(100, state.energy + CONFIG.restEnergyGain);
  log(`Teacher rested (+${CONFIG.restEnergyGain}% energy).`);
  updateMeters();
}

function doFundraiser(){
  // increases awareness; small chance of budget boost too
  state.awareness = Math.min(100, state.awareness + CONFIG.fundraiserAwarenessGain);
  const bonus = randInt(0, Math.max(0, Math.round(state.awareness * CONFIG.awarenessToBudgetMultiplier)));
  state.budget += bonus;
  log(`Fundraiser increased awareness (+${CONFIG.fundraiserAwarenessGain}) and raised \$${bonus}.`);
  updateMeters();
}

function requestDonation(){
  // donation amount depends on awareness and luck
  const base = CONFIG.donationMin;
  const bonus = Math.round(state.awareness * CONFIG.awarenessToBudgetMultiplier);
  const donation = base + randInt(0, bonus);
  state.budget += donation;
  state.awareness = Math.max(0, state.awareness - 6); // small drop (attention spent)
  log(`Community donated \$${donation}. Awareness -6.`);
  updateMeters();
}

/* Feeding a specific student (via UI feed button) */
function feedStudent(id){
  const s = state.students.find(x=>x.id === id);
  if(!s) return;
  // teacher can always intervene but loses energy
  if(state.energy <= 0){
    log('Teacher too exhausted to personally feed students.');
    return;
  }
  s.hunger = Math.max(0, s.hunger - 60);
  state.energy -= CONFIG.serveEnergyCost;
  log(`Teacher personally fed ${s.name} (-${CONFIG.serveEnergyCost}% energy).`);
  renderStudents(); updateMeters(); checkDayState();
}

/* Game loop: hunger increases over time; check fail conditions */
let hungerTimer = null;
function hungerTick(){
  // each tick, hunger of each student increases
  state.students.forEach(s=>{
    // needLevel affects hunger acceleration
    const accel = s.needLevel === 2 ? 10 : s.needLevel === 1 ? 6 : 3;
    s.hunger = Math.min(100, s.hunger + accel);
  });
  renderStudents();
  checkDayState();
  updateMeters();
}

/* Check for lose/win conditions */
function checkDayState(){
  // If any student reaches hunger >= 100, that's a failing event
  const starved = state.students.filter(s=>s.hunger >= 100);
  if(starved.length > 0){
    // teacher may have let too many students go hungry
    const names = starved.map(s=>s.name).join(', ');
    showOverlay('Game Over — Students Went Hungry', `The following students became critically hungry: ${names}. This shows the real consequences of underfunding and teacher strain.`);
    state.running = false;
    clearInterval(hungerTimer);
    log(`Critical: ${names} reached severe hunger.`);
    return;
  }

  // If teacher energy is zero repeatedly, risk closure
  if(state.energy <= 0){
    // teacher needs to rest or recruiting will be harder
    log('Teacher energy depleted — urgent rest required or risk of staff burnout.');
  }

  // Win: if it's last day and all students' hunger < 40 and teacher energy > 20
  const allOkay = state.students.every(s=> s.hunger < 40);
  if(state.day >= CONFIG.maxDays && allOkay && state.energy > 20){
    showOverlay('Victory — The Gap Narrowed', 'You managed the cafeteria for a week, kept students fed, and protected teacher well-being. Awareness and community action made a difference.');
    state.running = false;
    clearInterval(hungerTimer);
    log('Victory: sustained success across days.');
  }
}

/* Day progression */
function nextDay(){
  if(!state.running) return;
  state.day++;
  // small decay of awareness to simulate attention fatigue
  state.awareness = Math.max(0, state.awareness - 4);
  // reset student hunger baseline but carry over some
  state.students.forEach(s=>{
    s.hunger = Math.min(100, Math.max(10, s.hunger - randInt(10,30)));
  });
  log(`Day ${state.day} begins. Awareness -4.`);
  updateMeters(); renderStudents();
  if(state.day > CONFIG.maxDays + 1){
    // safety end
    showOverlay('Time Up', 'The prototype timed out — extend the game for a longer simulation.');
    state.running = false;
    clearInterval(hungerTimer);
  }
}

/* Facts cycling */
let factIndex = 0;
function showNextFact(){
  factText.textContent = facts[factIndex % facts.length];
  factIndex++;
}

/* Bind events */
serveBtn.onclick = serveMeal;
buyMealBtn.onclick = buyMeal;
fundraiseBtn.onclick = doFundraiser;
donateBtn.onclick = requestDonation;
restBtn.onclick = restTeacher;

nextFact.onclick = showNextFact;
overlayClose.onclick = ()=>{
  overlay.classList.add('hidden');
  if(!state.running){
    // reset game on close for prototype
    resetGame();
  }
};

/* Reset / Start */
function resetGame(){
  state.budget = CONFIG.initialBudget;
  state.energy = CONFIG.initialEnergy;
  state.awareness = CONFIG.initialAwareness;
  state.day = 1;
  state.log = [];
  state.running = true;
  spawnStudents();
  updateMeters(); renderStudents(); renderLog();
  showNextFact();

  if(hungerTimer) clearInterval(hungerTimer);
  hungerTimer = setInterval(()=> {
    if(state.running) hungerTick();
  }, CONFIG.hungerTickMs);
  // also progress day every 30s to simulate week progression (prototype)
  if(window.dayTimer) clearInterval(window.dayTimer);
  window.dayTimer = setInterval(()=> {
    if(state.running) nextDay();
  }, 30000);
}

/* Init */
spawnStudents();
resetGame();
renderStudents();
updateMeters();
renderLog();
showNextFact();
