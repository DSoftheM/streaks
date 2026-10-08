const KEY = 'daily-streaks-v1';
const $ = s => document.querySelector(s);
const dateKey = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
const addDays = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return dateKey(d); };
let state = load(); let editingId = null; let extendingId = null; let clock;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch {}
  // A useful starting point based on the goals described for this tracker.
  const today = dateKey();
  return { goals: [
    { id: crypto.randomUUID(), title: 'Learn Go', target: '30 minutes', hasTimer: true, duration: 30, startDate: today, endDate: addDays(today, 99), completed: {} },
    { id: crypto.randomUUID(), title: 'Walk 5,000 steps', target: '5,000 steps', hasTimer: false, duration: 30, startDate: today, endDate: addDays(today, 119), completed: {} }
  ] };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function daysBetween(a,b) { return Math.max(0, Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000)); }
function goalDays(g) { return daysBetween(g.startDate, g.endDate) + 1; }
function isActive(g, day = dateKey()) { return day >= g.startDate && day <= g.endDate; }
function streak(g) { let n=0, d=dateKey(); if(!g.completed[d]) d=addDays(d,-1); while(g.completed[d]) { n++; d=addDays(d,-1); } return n; }
function datePretty(d) { return new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
function timerRemaining(g) { if(!g.timerEnd) return g.duration * 60; return Math.max(0, Math.ceil((new Date(g.timerEnd) - Date.now()) / 1000)); }
function timeString(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
function escapeHtml(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }

function render() {
  const today=dateKey(), goals=state.goals, done=goals.filter(g=>g.completed[today]).length;
  $('#today-label').textContent=new Date().toLocaleDateString(undefined,{weekday:'long'}).toUpperCase();
  $('#today-date').textContent=new Date().toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  $('#done-count').textContent=done; $('#goal-count').textContent=goals.length;
  $('#day-progress').style.width=goals.length ? `${done/goals.length*100}%` : '0%';
  $('#empty-state').hidden=goals.length>0;
  $('#goals').innerHTML=goals.map(card).join('');
  clearInterval(clock); clock=setInterval(updateTimers,1000); updateTimers();
}
function card(g) {
 const today=dateKey(), done=!!g.completed[today], active=isActive(g), s=streak(g), total=goalDays(g), elapsed=Math.min(total,daysBetween(g.startDate,today)+1), rem=timerRemaining(g);
 let cells=''; for(let i=0;i<total;i++){const d=addDays(g.startDate,i);const cl=[g.completed[d]?'done':'',d===today?'today':'',d>today?'future':''].filter(Boolean).join(' ');cells+=`<i class="${cl}" title="${datePretty(d)}${g.completed[d]?' — complete':''}"></i>`}
 return `<article class="goal-card" data-id="${g.id}"><div class="goal-top"><button class="complete-button ${done?'is-done':''}" data-action="complete" title="${done?'Mark incomplete':'Mark complete'}" ${!active?'disabled':''}></button><div><div class="goal-title">${escapeHtml(g.title)}</div><div class="goal-target">${escapeHtml(g.target)} · day ${elapsed} of ${total}${!active?' · completed':''}</div></div><div class="goal-actions">${g.hasTimer?`<button class="action" data-action="timer">${g.timerEnd&&rem?'Timer':'Focus'}</button>`:''}<button class="action" data-action="extend">+ Extend</button><button class="action" data-action="edit">Edit</button><button class="action delete" data-action="delete">Delete</button></div></div>${g.hasTimer?`<div class="timer-area ${g.timerEnd&&rem?'visible':''}"><span class="timer-display" data-timer>${timeString(rem)}</span><span class="timer-note">${g.timerEnd&&rem?'Stay with it — completion is yours.':'Focus session'}</span><button class="timer-button" data-action="timer">${g.timerEnd&&rem?'Cancel':'Start timer'}</button></div>`:''}<div class="goal-bottom"><div class="stats"><div class="stat"><strong>${s}</strong><small>day streak</small></div><div class="stat"><strong>${Object.keys(g.completed).length}</strong><small>total days</small></div></div><div class="activity-wrap" data-action="stats" role="button" tabindex="0" title="Open daily history"><div class="activity">${cells}</div><div class="activity-label">Every day · view history</div></div></div></article>`;
}
function openStats(g) {
  const today = dateKey(), total = goalDays(g), complete = Object.keys(g.completed).filter(d => d >= g.startDate && d <= g.endDate).length;
  $('#stats-title').textContent = g.title;
  $('#stats-summary').textContent = `${complete} of ${total} days complete · ${streak(g)} day current streak`;
  let cubes='', rows='';
  for(let i=0;i<total;i++) {
    const d=addDays(g.startDate,i), future=d>today, done=!!g.completed[d];
    const classes=[done?'done':'',d===today?'today':'',future?'future':''].filter(Boolean).join(' ');
    cubes += `<i class="${classes}" title="${datePretty(d)} — ${future?'upcoming':done?'complete':'missed'}"></i>`;
    rows = `<div class="day-row"><span>${new Date(`${d}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span><span class="${future?'future-text':done?'complete':''}">${future?'Upcoming':done?'Complete':'Missed'}</span></div>` + rows;
  }
  $('#full-calendar').innerHTML=cubes; $('#day-list').innerHTML=rows; $('#stats-dialog').showModal();
}
function updateTimers(){state.goals.forEach(g=>{if(g.timerEnd&&timerRemaining(g)===0){delete g.timerEnd;save();render();}});document.querySelectorAll('.goal-card').forEach(el=>{const g=state.goals.find(x=>x.id===el.dataset.id);const out=el.querySelector('[data-timer]');if(g&&out)out.textContent=timeString(timerRemaining(g));});}
function openGoal(goal) { editingId=goal?.id||null; const f=$('#goal-form'); f.reset(); $('#form-kicker').textContent=goal?'EDIT DAILY GOAL':'NEW DAILY GOAL';$('#form-title').textContent=goal?'Refine your goal':'Start a streak';$('#save-goal').textContent=goal?'Save changes':'Create goal'; if(goal){f.title.value=goal.title;f.target.value=goal.target;f.days.value=goalDays(goal);f.hasTimer.checked=goal.hasTimer;f.duration.value=goal.duration||30;}$('#duration-field').hidden=!f.hasTimer.checked;$('#goal-dialog').showModal();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}

$('#add-goal-top').onclick=()=>openGoal(); $('#add-goal-empty').onclick=()=>openGoal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDialogs);
$('#goal-form').hasTimer.onchange=e=>$('#duration-field').hidden=!e.target.checked;
$('#goal-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget, days=Number(f.days.value), today=dateKey(); const data={title:f.title.value.trim(),target:f.target.value.trim(),hasTimer:f.hasTimer.checked,duration:Number(f.duration.value)||30}; if(editingId){const g=state.goals.find(x=>x.id===editingId);Object.assign(g,data);if(goalDays(g)!==days)g.endDate=addDays(g.startDate,days-1);}else state.goals.unshift({id:crypto.randomUUID(),...data,startDate:today,endDate:addDays(today,days-1),completed:{}});save();closeDialogs();render();};
$('#goals').onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;const g=state.goals.find(x=>x.id===b.closest('.goal-card').dataset.id);const a=b.dataset.action;if(a==='complete'){const t=dateKey();g.completed[t]?delete g.completed[t]:g.completed[t]=true;save();render();}if(a==='timer'){if(g.timerEnd&&timerRemaining(g))delete g.timerEnd;else g.timerEnd=new Date(Date.now()+g.duration*60000).toISOString();save();render();}if(a==='extend'){extendingId=g.id;$('#extend-name').textContent=g.title;$('#extend-dialog').showModal();}if(a==='edit')openGoal(g);if(a==='stats')openStats(g);if(a==='delete'&&confirm(`Delete “${g.title}”? This cannot be undone.`)){state.goals=state.goals.filter(x=>x.id!==g.id);save();render();}};
$('#extend-form').onsubmit=e=>{e.preventDefault();const g=state.goals.find(x=>x.id===extendingId);g.endDate=addDays(g.endDate,Number(e.currentTarget.extendDays.value));save();closeDialogs();render();};
$('#reset-data').onclick=()=>{if(confirm('Remove all goals and completion history from this browser?')){state={goals:[]};save();render();}};
render();
