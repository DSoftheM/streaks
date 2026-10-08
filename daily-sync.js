/* Browser-only Supabase sync. The publishable key is safe in a client app; never use a secret key here. */
(() => {
const CONFIG_KEY = 'daily-streaks-supabase-config';
const DATA_KEYS = ['daily-streaks-v1', 'daily-streaks-tasks-v1'];
let client, timer;
const $ = s => document.querySelector(s);
const config = () => { try { return JSON.parse(localStorage.getItem(CONFIG_KEY)); } catch { return null; } };
const setStatus = text => { const el=$('#sync-status'); if(el) el.textContent=text; };
function getClient() {
  const c=config();
  if (!c?.url || !c?.key || !window.supabase) return null;
  if (!client) client=window.supabase.createClient(c.url, c.key);
  return client;
}
function payload() { return Object.fromEntries(DATA_KEYS.map(key => [key, localStorage.getItem(key)])); }
function restore(data) {
  for (const key of DATA_KEYS) if (typeof data?.[key] === 'string') localStorage.setItem(key, data[key]);
  window.dispatchEvent(new Event('daily-sync-pulled'));
}
async function pull() {
  const db=getClient(); if(!db) return false;
  const { data: { user } }=await db.auth.getUser(); if(!user) return false;
  const { data, error }=await db.from('daily_streaks_data').select('payload').eq('user_id', user.id).maybeSingle();
  if(error) { setStatus(`Sync error: ${error.message}`); return false; }
  if(data?.payload) { restore(data.payload); setStatus('Synced just now'); return true; }
  return false;
}
async function syncNow() {
  const db=getClient(); if(!db) { setStatus('Add your Supabase details first.'); return; }
  const { data: { user } }=await db.auth.getUser(); if(!user) { setStatus('Sign in to sync.'); return; }
  setStatus('Saving…');
  const { error }=await db.from('daily_streaks_data').upsert({user_id:user.id,payload:payload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
  setStatus(error ? `Sync error: ${error.message}` : 'Synced just now');
}
function queue() { clearTimeout(timer); timer=setTimeout(syncNow,900); }
function inject() {
  document.body.insertAdjacentHTML('beforeend', `<dialog id="sync-dialog"><form id="sync-form" method="dialog"><div class="dialog-title"><div><p class="eyebrow">CROSS-DEVICE SYNC</p><h2>Connect Supabase</h2></div><button class="icon-button" type="button" data-sync-close>×</button></div><p class="sync-copy">Your browser remains the offline copy. When signed in, changes also sync privately to your Supabase account.</p><label>Project URL<input required name="url" type="url" placeholder="https://your-project.supabase.co" /></label><label>Publishable / anon key<input required name="key" type="password" placeholder="sb_publishable_… or eyJ…" /></label><hr/><label>Email<input required name="email" type="email" autocomplete="email" /></label><label>Password<input required name="password" type="password" minlength="6" autocomplete="current-password" /></label><p id="sync-status" class="sync-status">Add your project details, then sign in.</p><div class="sync-actions"><button class="secondary" type="button" id="sign-up">Create account</button><button class="primary" type="button" id="sign-in">Sign in</button></div><button class="text-button sync-now" type="button" id="sync-now">Sync now</button><details><summary>One-time database setup</summary><p>Run the contents of <code>supabase.sql</code> in your project’s SQL Editor. Use the project URL and Publishable key from Supabase’s Connect dialog—never a secret key.</p></details></form></dialog>`);
  const dialog=$('#sync-dialog'), form=$('#sync-form'), c=config(); if(c){form.url.value=c.url;form.key.value=c.key;}
  $('[data-sync-close]').onclick=()=>dialog.close();
  const connect=()=>{ const url=form.url.value.trim(),key=form.key.value.trim(); if(!url||!key) throw new Error('Enter the Project URL and publishable key.'); localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key})); client=null; return getClient(); };
  $('#sign-up').onclick=async()=>{try{const db=connect();setStatus('Creating account…');const {error}=await db.auth.signUp({email:form.email.value.trim(),password:form.password.value,options:{emailRedirectTo:location.href}});if(error)throw error;setStatus('Check your email to confirm the account, then sign in.')}catch(e){setStatus(e.message)}};
  $('#sign-in').onclick=async()=>{try{const db=connect();setStatus('Signing in…');const {error}=await db.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});if(error)throw error;const remote=await pull();if(!remote)await syncNow();updateButton();}catch(e){setStatus(e.message)}};
  $('#sync-now').onclick=syncNow;
}
async function updateButton(){const button=$('#cloud-sync');if(!button)return;const db=getClient();if(!db){button.textContent='Cloud sync';return}const {data:{session}}=await db.auth.getSession();button.textContent=session?'Synced':'Cloud sync';}
async function init(){inject();$('#cloud-sync')?.addEventListener('click',()=>$('#sync-dialog').showModal());const db=getClient();if(db){const remote=await pull();if(!remote)await syncNow();}updateButton();}
window.DailySync={queue,syncNow};
window.addEventListener('DOMContentLoaded',init);
})();
