/* Open-in-Chrome helper.
   On phones, if the page is opened in another browser or in an in-app browser
   (Facebook, Instagram, Telegram, ...), show an "Open in Chrome" bar, and on
   Android try to jump straight into Chrome. Does nothing in Chrome or on desktop. */
(function(){
  try{
    var ua = navigator.userAgent || "";
    var android = /Android/i.test(ua), ios = /iPhone|iPad|iPod/i.test(ua);
    if (!android && !ios) return;
    var isChrome = /(Chrome|CriOS)\//i.test(ua) &&
      !/(EdgA|EdgiOS|Edg\/|OPR|OPiOS|SamsungBrowser|UCBrowser|FxiOS|Firefox|; wv\)|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|LinkedInApp|Telegram|GSA)/i.test(ua);
    if (isChrome) return;
    var loc = window.location;
    var scheme = loc.protocol.replace(":", "");
    var rest = loc.host + loc.pathname + loc.search;
    var chromeUrl;
    if (android){
      chromeUrl = "intent://" + rest + "#Intent;scheme=" + scheme +
        ";package=com.android.chrome;S.browser_fallback_url=" +
        encodeURIComponent(scheme + "://" + rest + "#stay") + ";end";
    } else {
      chromeUrl = (scheme === "http" ? "googlechrome://" : "googlechromes://") + rest;
    }
    window.__ccapsoChromeUrl = chromeUrl;
    document.documentElement.setAttribute("data-openchrome", "1");
    var framed = false;
    try{ framed = window.top !== window.self; }catch(e){ framed = true; }
    if (android && !framed && loc.hash !== "#stay"){ loc.replace(chromeUrl); }
  }catch(e){}
})();

(function(){
  var open = document.getElementById('chromeOpen'), close = document.getElementById('chromeClose');
  if (open) open.addEventListener('click', function(){
    var u = window.__ccapsoChromeUrl; if (!u) return;
    try{ window.top.location.href = u; }catch(e){ window.location.href = u; }
  });
  if (close) close.addEventListener('click', function(){
    document.documentElement.removeAttribute('data-openchrome');
  });
})();

/* ============ DATA ============ */
const DEFAULT_STATE = {
  eventTitle: "2026 National Conference",
  deadline: "26 October 2026",
  dates: "30 October – 1 November 2026",
  venue: "Mzuzu University (MZUNI)",
  fee: 70000,
  regFee: "MK 10,000 (registration)",
  payments: [
    { name: "Airtel Money", detail: "Line: [add number]\nName: [add registered name]" },
    { name: "TNM Mpamba", detail: "Line: [add number]\nName: [add registered name]" },
    { name: "Bank transfer", detail: "Bank: [add bank]\nAcc name: [add account name]\nAcc no: [add account number]" }
  ],
  attendees: [
    { name: "Godwin Tukululu", paid: 50000 },
    { name: "Montfort Geza", paid: 50000 },
    { name: "Miranda Kaumphawi", paid: 50000 }
  ]
};

let state = JSON.parse(JSON.stringify(window.__EMBEDDED_STATE__ || DEFAULT_STATE));
let isAdmin = false;
let currentUser = null;
const EVENT_ID = "2385ac63-99d1-4e53-9b2e-41074cd72b59";
let artifactApi = null;
let localOnlyWarned = false;
function warnLocalOnly(result){
  if (result && result.error === "not_available" && !localOnlyWarned){
    localOnlyWarned = true;
    alert("Saved on this device. Other people will NOT see the change until you tap “Download updated page” and upload that file to your website.");
  }
}
let editingIndex = null; // null = add mode


/* ============ HELPERS ============ */
function fmt(n){
  return "MK " + Number(n||0).toLocaleString("en-US");
}
function balanceFor(paid){
  return Math.max(state.fee - Number(paid||0), 0);
}
function statusFor(paid){
  const bal = balanceFor(paid);
  if (bal <= 0) return {label:"Paid in full", cls:"status-paid"};
  if (Number(paid||0) === 0) return {label:"Not paid", cls:"status-none"};
  return {label:"Partial", cls:"status-partial"};
}

/* ============ RENDER ============ */
function render(){
  // hero facts
  const heroFacts = document.getElementById('heroFacts');
  heroFacts.innerHTML = `
    <div class="fact-pill">📅 <strong>${state.dates}</strong></div>
    <div class="fact-pill">📍 <strong>${state.venue}</strong></div>
    <div class="fact-pill">⏳ Balances due by <strong>${state.deadline}</strong></div>
  `;

  // stat row
  const totalPaid = state.attendees.reduce((s,a)=>s+Number(a.paid||0),0);
  const totalDue = state.attendees.length * state.fee;
  const totalBalance = state.attendees.reduce((s,a)=>s+balanceFor(a.paid),0);
  const fullyPaidCount = state.attendees.filter(a=>balanceFor(a.paid)<=0).length;

  document.getElementById('statRow').innerHTML = `
    <div class="stat-card">
      <div class="label sans">Attendees</div>
      <div class="value">${state.attendees.length}</div>
      <div class="sub">${fullyPaidCount} fully paid</div>
    </div>
    <div class="stat-card">
      <div class="label sans">Collected</div>
      <div class="value green">${fmt(totalPaid)}</div>
      <div class="sub">of ${fmt(totalDue)} expected</div>
    </div>
    <div class="stat-card">
      <div class="label sans">Outstanding balance</div>
      <div class="value gold">${fmt(totalBalance)}</div>
      <div class="sub">across all attendees</div>
    </div>
    <div class="stat-card">
      <div class="label sans">Fee per person</div>
      <div class="value">${fmt(state.fee)}</div>
      <div class="sub">transport contribution</div>
    </div>
  `;

  // info grid
  document.getElementById('infoGrid').innerHTML = `
    <div class="info-card">
      <div class="k sans">Payment deadline</div>
      <div class="v">${state.deadline}</div>
      <div class="v2 sans">Balances must be settled by this date</div>
    </div>
    <div class="info-card">
      <div class="k sans">Conference dates</div>
      <div class="v">${state.dates}</div>
    </div>
    <div class="info-card">
      <div class="k sans">Venue</div>
      <div class="v">${state.venue}</div>
    </div>
    <div class="info-card">
      <div class="k sans">Fees</div>
      <div class="v">${fmt(state.fee)}</div>
      <div class="v2 sans">Transport · ${state.regFee || ""}</div>
    </div>
  `;

  // payments
  document.getElementById('payGrid').innerHTML = state.payments.map(p => `
    <div class="pay-card">
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="detail">${escapeHtml(p.detail)}</div>
    </div>
  `).join("");

  // attendee table
  document.getElementById('attendeeCount').textContent = `${state.attendees.length} registered`;
  document.getElementById('actionsHead').style.display = isAdmin ? '' : 'none';
  document.getElementById('attendeeBody').innerHTML = state.attendees.map((a, i) => {
    const bal = balanceFor(a.paid);
    const st = statusFor(a.paid);
    return `
      <tr>
        <td class="name-cell">${escapeHtml(a.name)}</td>
        <td>${fmt(a.paid)}</td>
        <td class="amt-balance">${fmt(bal)}</td>
        <td><span class="status-chip ${st.cls}">${st.label}</span></td>
        ${isAdmin ? `<td><div class="row-actions">
          <button class="icon-btn" onclick="openAttendeeModal(${i})" title="Edit" aria-label="Edit ${escapeHtml(a.name)}">✎</button>
        </div></td>` : ''}
      </tr>
    `;
  }).join("");

  // admin bar buttons
  document.getElementById('btnAddAttendee').style.display = isAdmin ? '' : 'none';
  document.getElementById('btnBulkAdd').style.display = isAdmin ? '' : 'none';
  document.getElementById('btnEditSettings').style.display = isAdmin ? '' : 'none';
  document.getElementById('btnDownload').style.display = 'none';
  document.getElementById('adminStatusText').textContent = isAdmin
    ? `Committee mode — signed in${currentUser?.email ? ` as ${currentUser.email}` : ''}`
    : "Viewing mode";
  document.getElementById('btnAdminToggle').textContent = isAdmin ? "Sign out" : "Committee login";
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============ SUPABASE DATA ============ */
async function loadSharedState(){
  const [{data: event, error: eventError}, {data: attendees, error: attendeeError}, {data: methods, error: methodError}] = await Promise.all([
    db.from('events').select('*').eq('id', EVENT_ID).single(),
    db.from('attendees').select('*').eq('event_id', EVENT_ID).order('name'),
    db.from('payment_methods').select('*').eq('event_id', EVENT_ID).order('created_at')
  ]);
  if (eventError) throw eventError;
  if (attendeeError) throw attendeeError;
  if (methodError) throw methodError;
  state = {
    eventTitle: event.title,
    deadline: event.deadline || '',
    dates: event.conference_dates || '',
    venue: event.venue || '',
    fee: Number(event.fee || 0),
    regFee: event.registration_fee || '',
    payments: (methods || []).map(m => ({id:m.id, name:m.name, detail:m.details || ''})),
    attendees: (attendees || []).map(a => ({id:a.id, name:a.name, paid:Number(a.amount_paid || 0)}))
  };
  try { localStorage.setItem('ccapso_dashboard_state', JSON.stringify(state)); } catch(e) {}
}

async function requireCommittee(){
  const {data: {user}} = await db.auth.getUser();
  if (!user) throw new Error('Please sign in first.');
  const {data: member, error} = await db.from('committee_members').select('user_id,role').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!member) throw new Error('This account is not listed as a committee member.');
  return user;
}

async function saveAttendeeToSupabase(attendee){
  const user = await requireCommittee();
  const row = {event_id: EVENT_ID, name: attendee.name.trim(), amount_paid:Number(attendee.paid || 0), updated_by:user.id};
  if (attendee.id) {
    const {data, error} = await db.from('attendees').update(row).eq('id', attendee.id).select().single();
    if (error) throw error;
    return data;
  }
  const {data, error} = await db.from('attendees').insert(row).select().single();
  if (error) throw error;
  return data;
}

async function deleteAttendeeFromSupabase(id){
  await requireCommittee();
  const {error} = await db.from('attendees').delete().eq('id', id);
  if (error) throw error;
}

async function saveEventToSupabase(){
  await requireCommittee();
  const {error: eventError} = await db.from('events').update({
    title: state.eventTitle,
    deadline: state.deadline,
    conference_dates: state.dates,
    venue: state.venue,
    fee: Number(state.fee),
    registration_fee: state.regFee || ''
  }).eq('id', EVENT_ID);
  if (eventError) throw eventError;
  const {error: deleteError} = await db.from('payment_methods').delete().eq('event_id', EVENT_ID);
  if (deleteError) throw deleteError;
  if (state.payments.length) {
    const {error: insertError} = await db.from('payment_methods').insert(state.payments.map(p => ({event_id:EVENT_ID, name:p.name, details:p.detail})));
    if (insertError) throw insertError;
  }
}

async function syncAfterSave(){
  await loadSharedState();
  render();
}

/* ============ PERSISTENCE ============ */
async function initArtifact(){
  try{
    if (window.claude && window.claude.use){
      artifactApi = await window.claude.use("artifact");
    }
  }catch(e){ artifactApi = null; }
}

function buildFullHtml(){
  // Serialize current document with updated embedded state, using
  // exact literal markers (not a regex) so the swap can never bleed
  // into surrounding code.
  const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
  let html = document.documentElement.outerHTML;
  html = html.replace(/]*"/, ""); // never bake the Chrome-bar state into a saved copy
  const startMarker = "/*STATE_" + "START*/";   // split so this text can never match itself
  const endMarker = "/*STATE_" + "END*/";
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx){
    throw new Error("state markers not found");
  }
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  html = before + stateJson + after;
  return "<!DOCTYPE html>\n" + html;
}

async function persist(){
  // Stamp the save time so, on reload, the newest copy (this device vs. the uploaded file) wins
  state._savedAt = Date.now();
  // Always keep a local fallback copy
  try{ localStorage.setItem('ccapso_dashboard_state', JSON.stringify(state)); }catch(e){}

  if (artifactApi && artifactApi.publish){
    // Snapshot the page in its logged-out, view-only appearance so the
    // published version never bakes in this admin's open panels/buttons.
    const wasAdmin = isAdmin;
    isAdmin = false;
    [pinModal, attendeeModal, settingsModal, bulkModal].forEach(m => m.classList.remove('open'));
    render();
    let result;
    try{
      const html = buildFullHtml();
      await artifactApi.publish(html);
      result = {ok:true};
    }catch(e){
      result = {ok:false, error: (e && e.message) ? e.message : String(e)};
    }
    isAdmin = wasAdmin;
    render();
    return result;
  }
  return {ok:false, error:"not_available"};
}

/* ============ ADMIN / MODALS ============ */
const pinModal = document.getElementById('pinModal');
const attendeeModal = document.getElementById('attendeeModal');
const settingsModal = document.getElementById('settingsModal');

document.getElementById('btnAdminToggle').addEventListener('click', async () => {
  if (isAdmin){
    await db.auth.signOut();
    return;
  }
  document.getElementById('loginEmail').value = "";
  document.getElementById('loginPassword').value = "";
  document.getElementById('pinError').textContent = "";
  pinModal.classList.add('open');
  setTimeout(()=>document.getElementById('loginEmail').focus(), 50);
});
document.getElementById('pinCancel').addEventListener('click', () => pinModal.classList.remove('open'));
document.getElementById('pinSubmit').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('pinSubmit');
  if (!email || !password){ document.getElementById('pinError').textContent = "Enter your email and password."; return; }
  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const {error} = await db.auth.signInWithPassword({email, password});
    if (error) throw error;
    await requireCommittee();
    pinModal.classList.remove('open');
  } catch(e) {
    await db.auth.signOut();
    document.getElementById('pinError').textContent = e.message || "Sign-in failed.";
  } finally { btn.disabled = false; btn.textContent = "Sign in"; }
});
['loginEmail','loginPassword'].forEach(id => document.getElementById(id).addEventListener('keydown', (e)=>{ if(e.key==='Enter') document.getElementById('pinSubmit').click(); }));

function openAttendeeModal(index){
  editingIndex = index;
  document.getElementById('attendeeError').textContent = "";
  if (index === null){
    document.getElementById('attendeeModalTitle').textContent = "Add attendee";
    document.getElementById('attName').value = "";
    document.getElementById('attPaid').value = "";
    document.getElementById('attendeeDelete').style.display = 'none';
  } else {
    const a = state.attendees[index];
    document.getElementById('attendeeModalTitle').textContent = "Edit attendee";
    document.getElementById('attName').value = a.name;
    document.getElementById('attPaid').value = a.paid;
    document.getElementById('attendeeDelete').style.display = '';
  }
  attendeeModal.classList.add('open');
}
document.getElementById('btnAddAttendee').addEventListener('click', () => openAttendeeModal(null));

/* ---- Bulk add ---- */
const bulkModal = document.getElementById('bulkModal');
document.getElementById('btnBulkAdd').addEventListener('click', () => {
  document.getElementById('bulkText').value = "";
  document.getElementById('bulkError').textContent = "";
  bulkModal.classList.add('open');
  setTimeout(()=>document.getElementById('bulkText').focus(), 50);
});
document.getElementById('bulkCancel').addEventListener('click', () => bulkModal.classList.remove('open'));

document.getElementById('bulkSave').addEventListener('click', async () => {
  const raw = document.getElementById('bulkText').value;
  const skipDupes = document.getElementById('bulkSkipDupes').checked;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0){
    document.getElementById('bulkError').textContent = "Paste at least one name.";
    return;
  }
  const existingNames = new Set(state.attendees.map(a => a.name.trim().toLowerCase()));
  let added = 0, skipped = 0;
  const pending = [];
  lines.forEach(line => {
    const parts = line.split(',');
    const name = parts[0].trim();
    if (!name) return;
    let paid = 0;
    if (parts.length > 1){
      const n = Number(parts.slice(1).join(',').replace(/[^\d.]/g, ''));
      if (!isNaN(n)) paid = n;
    }
    const key = name.toLowerCase();
    if (skipDupes && existingNames.has(key)){
      skipped++;
      return;
    }
    pending.push({name, paid});
    existingNames.add(key);
    added++;
  });

  const btn = document.getElementById('bulkSave');
  btn.disabled = true; btn.textContent = "Saving…";
  bulkModal.classList.remove('open');
  let saveError = null;
  try {
    for (const attendee of pending) {
      const saved = await saveAttendeeToSupabase(attendee);
      state.attendees.push({id:saved.id, name:saved.name, paid:Number(saved.amount_paid)});
    }
    await syncAfterSave();
  } catch(e) { saveError = e; }
  btn.disabled = false; btn.textContent = "Add all";
  let msg = `Added ${added} attendee${added===1?'':'s'}.`;
  if (skipped) msg += ` Skipped ${skipped} duplicate${skipped===1?'':'s'}.`;
  if (saveError) alert(msg + " But some records could not be saved: " + saveError.message);
  else alert(msg);
});
document.getElementById('attendeeCancel').addEventListener('click', () => attendeeModal.classList.remove('open'));

document.getElementById('attendeeSave').addEventListener('click', async () => {
  const name = document.getElementById('attName').value.trim();
  const paidRaw = document.getElementById('attPaid').value;
  const paid = Number(paidRaw);
  if (!name){
    document.getElementById('attendeeError').textContent = "Please enter a name.";
    return;
  }
  if (paidRaw === "" || isNaN(paid) || paid < 0){
    document.getElementById('attendeeError').textContent = "Enter a valid amount paid.";
    return;
  }
  const btn = document.getElementById('attendeeSave');
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    const saved = await saveAttendeeToSupabase({
      id: editingIndex === null ? null : state.attendees[editingIndex].id,
      name, paid
    });
    if (editingIndex === null) state.attendees.push({id:saved.id, name:saved.name, paid:Number(saved.amount_paid)});
    else state.attendees[editingIndex] = {id:saved.id, name:saved.name, paid:Number(saved.amount_paid)};
    attendeeModal.classList.remove('open');
    await syncAfterSave();
  } catch(e) { alert(e.message || 'Could not save attendee.'); }
  btn.disabled = false; btn.textContent = "Save";
});

document.getElementById('attendeeDelete').addEventListener('click', async () => {
  if (editingIndex === null) return;
  if (!confirm("Remove this attendee?")) return;
  try {
    await deleteAttendeeFromSupabase(state.attendees[editingIndex].id);
    state.attendees.splice(editingIndex, 1);
    render();
    attendeeModal.classList.remove('open');
  } catch(e) { alert(e.message || 'Could not remove attendee.'); }
});

document.getElementById('btnEditSettings').addEventListener('click', () => {
  document.getElementById('setDeadline').value = state.deadline;
  document.getElementById('setDates').value = state.dates;
  document.getElementById('setVenue').value = state.venue;
  document.getElementById('setFee').value = state.fee;
  document.getElementById('setRegFee').value = state.regFee || "";
  const p = state.payments;
  document.getElementById('setPay1Name').value = p[0] ? p[0].name : "";
  document.getElementById('setPay1Detail').value = p[0] ? p[0].detail : "";
  document.getElementById('setPay2Name').value = p[1] ? p[1].name : "";
  document.getElementById('setPay2Detail').value = p[1] ? p[1].detail : "";
  document.getElementById('setPay3Name').value = p[2] ? p[2].name : "";
  document.getElementById('setPay3Detail').value = p[2] ? p[2].detail : "";
  document.getElementById('settingsError').textContent = "";
  settingsModal.classList.add('open');
});
document.getElementById('settingsCancel').addEventListener('click', () => settingsModal.classList.remove('open'));
document.getElementById('settingsSave').addEventListener('click', async () => {
  const fee = Number(document.getElementById('setFee').value);
  if (isNaN(fee) || fee < 0){
    document.getElementById('settingsError').textContent = "Enter a valid fee amount.";
    return;
  }
  const btn = document.getElementById('settingsSave');
  btn.disabled = true; btn.textContent = "Saving…";

  state.deadline = document.getElementById('setDeadline').value.trim() || state.deadline;
  state.dates = document.getElementById('setDates').value.trim() || state.dates;
  state.venue = document.getElementById('setVenue').value.trim() || state.venue;
  state.fee = fee;
  state.regFee = document.getElementById('setRegFee').value.trim();
  const newPayments = [];
  const n1 = document.getElementById('setPay1Name').value.trim();
  const n2 = document.getElementById('setPay2Name').value.trim();
  const n3 = document.getElementById('setPay3Name').value.trim();
  if (n1) newPayments.push({name:n1, detail: document.getElementById('setPay1Detail').value.trim()});
  if (n2) newPayments.push({name:n2, detail: document.getElementById('setPay2Detail').value.trim()});
  if (n3) newPayments.push({name:n3, detail: document.getElementById('setPay3Detail').value.trim()});
  state.payments = newPayments.length ? newPayments : state.payments;

  try {
    await saveEventToSupabase();
    settingsModal.classList.remove('open');
    await syncAfterSave();
  } catch(e) { alert(e.message || 'Could not save event details.'); }
  btn.disabled = false; btn.textContent = "Save";
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const wasAdmin = isAdmin;
  isAdmin = false;
  [pinModal, attendeeModal, settingsModal, bulkModal].forEach(m => m.classList.remove('open'));
  render();
  let html = null;
  try{ state._savedAt = Date.now(); html = buildFullHtml(); }catch(e){ alert("Could not build the file: " + e.message); }
  isAdmin = wasAdmin;
  render();
  if (!html) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], {type:'text/html'}));
  a.download = 'index.html';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

/* close modals on backdrop click */
[pinModal, attendeeModal, settingsModal, bulkModal].forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
});

/* ============ INIT ============ */

(async function init(){
  try {
    const {data: {session}} = await db.auth.getSession();
    currentUser = session?.user || null;
    if (currentUser) {
      try { await requireCommittee(); isAdmin = true; }
      catch(e) { await db.auth.signOut(); currentUser = null; }
    }
    await loadSharedState();
  } catch(e) {
    console.error('Supabase load failed:', e);
    document.getElementById('adminStatusText').textContent = 'Could not load shared data';
  }
  render();
  db.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    isAdmin = Boolean(currentUser);
    if (isAdmin) {
      try { await requireCommittee(); await loadSharedState(); }
      catch(e) { isAdmin = false; await db.auth.signOut(); alert(e.message); }
    }
    render();
  });
})();
