// ------------------ Utility functions ------------------
function uid(prefix='id'){return prefix+'-'+Math.random().toString(36).slice(2,11)}
function parseISO(dateStr){ if(!dateStr) return null; const [y,m,d]=dateStr.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function isoDate(dt){ if(!dt) return null; if(typeof dt==='string') return dt; const y=dt.getUTCFullYear(); const m=String(dt.getUTCMonth()+1).padStart(2,'0'); const d=String(dt.getUTCDate()).padStart(2,'0'); return `${y}-${m}-${d}` }

// Provide a safe fallback translation function `t` if none is defined.
// This avoids "ReferenceError: t is not defined" when the app runs without the i18n layer.
if(typeof window.t !== 'function'){
  window.t = function(key, params){
    const map = {
      // S3 / import/export
      's3Label': 'S3 storage',
      's3PutPlaceholder': 'PUT URL',
      's3GetPlaceholder': 'GET URL',
      's3PutMissing': 'Enter S3 PUT URL',
      's3SaveOk': 'Saved to S3',
      's3SaveError': 'S3 save error: ',
      's3GetError': 'Enter S3 GET URL',
      's3LoadError': 'S3 load error: ',
      // Alerts / buttons / headings used in this file
      'alerts.importDone': 'Import done',
      'alerts.importBadFormat': 'Bad format',
      'alerts.calcDone': 'Calculation done',
      'alerts.sampleLoaded': 'Sample loaded',
      'alerts.enterName': 'Enter name',
      'alerts.deletePersonConfirm': 'Delete person?',
      'alerts.clearConfirm': 'Clear local data?',
      'alerts.choosePerson': 'Choose a person',
      'alerts.enterExitDate': 'Enter exit date',
      'alerts.returnBeforeExit': 'Return date is before exit',
      'mergeTripsDone': 'Merge completed',
      'noIntersections': 'No intersections to merge',
      'personHeaderChoose': 'Choose person',
      'btns.select': 'Select',
      'btns.edit': 'Edit',
      'btns.delete': 'Delete',
      'btns.editShort': 'Edit',
      'btns.delShort': 'Del',
      'btns.show': 'Show',
      // table headers placeholders (if used)
      'tableHeaders': ['Name','Days','Details'],
      // details tables
      'details.totalDays': 'Total days',
      'details.mergedIntervalsTitle': 'Merged intervals',
      'details.columnsMerged.0': 'Start',
      'details.columnsMerged.1': 'End',
      'details.columnsMerged.2': 'Days',
      'details.perTripTitle': 'Per trip contribution',
      'details.columnsPerTrip.0': 'Exit',
      'details.columnsPerTrip.1': 'Return',
      'details.columnsPerTrip.2': 'Range',
      'details.columnsPerTrip.3': 'Days',
      'details.columnsPerTrip.4': 'Note',
      'peopleHeading': 'People',
      'thReturn': 'Return'
    };
    if(typeof key !== 'string') return '';
    if(map.hasOwnProperty(key)) return map[key];
    // if key looks like an array (e.g. 'tableHeaders') stored as array -> return it
    // but for unknown keys, return last segment or the key itself
    const parts = key.split('.');
    return parts[parts.length-1] || key;
  };
}

// ------------------ Data handling ------------------
const STORAGE_KEY = 'absenceData';
let state = { people: [] };
let selectedPersonId = null;

function saveState(){ 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); 
  console.log('saveState: saved state', state);
  renderPeopleList(); 
}
function loadState(){ 
  const raw = localStorage.getItem(STORAGE_KEY); 
  console.log('loadState: raw from localStorage', raw);
  if(raw){ try{ state = JSON.parse(raw); console.log('loadState: parsed state', state); }catch(e){ console.error('parse err',e); state={people:[]}; } } else { state={people:[]}; console.log('loadState: no state found, using default'); } 
}

function exportJson(){ const dataStr = JSON.stringify(state,null,2); const blob = new Blob([dataStr],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='absence-data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function importJson(file){ const reader=new FileReader(); reader.onload = (e)=>{ try{ const parsed = JSON.parse(e.target.result); if(parsed && parsed.people) { state = parsed; saveState(); renderAll(); alert('Импорт завершён'); } else alert('Неправильный формат JSON'); }catch(err){ alert('Ошибка чтения JSON: '+err.message) } };
 reader.readAsText(file);
}

// ------------------ UI rendering ------------------
function formatPersonShort(p){ return p.name + ' (' + (p.trips? p.trips.length:0) + ')' }

function renderPeopleList(){ const container = document.getElementById('peopleList'); container.innerHTML='';
  state.people.forEach(p=>{
    const div=document.createElement('div'); div.className='person-item';
    const left=document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const name=document.createElement('div'); name.textContent=p.name; name.style.fontWeight='600';
    const meta=document.createElement('div'); meta.className='muted small'; meta.textContent=(p.trips?p.trips.length:0)+' поездок';
    left.appendChild(name); left.appendChild(meta);
    const right=document.createElement('div'); right.style.display='flex'; right.style.gap='8px';

    const selectBtn=document.createElement('button'); selectBtn.className='ghost'; selectBtn.textContent=t('btns.select'); selectBtn.onclick=()=>{ selectedPersonId=p.id; renderTripsForSelected(); }
    const editBtn=document.createElement('button'); editBtn.className='ghost'; editBtn.textContent=t('btns.edit'); editBtn.onclick=()=>{ const newName=prompt(t('alerts.enterName'), p.name); if(newName){ p.name=newName; saveState(); }}
    const delBtn=document.createElement('button'); delBtn.className='ghost'; delBtn.textContent=t('btns.delete'); delBtn.onclick=()=>{ if(confirm(t('alerts.deletePersonConfirm',{name:p.name}))){ state.people = state.people.filter(x=>x.id!==p.id); if(selectedPersonId===p.id) selectedPersonId=null; saveState(); renderAll(); } }

    right.appendChild(selectBtn); right.appendChild(editBtn); right.appendChild(delBtn);

    div.appendChild(left); div.appendChild(right);
    container.appendChild(div);
  });
}

function renderTripsForSelected(){ const header=document.getElementById('personHeader'); const tripsArea=document.getElementById('tripsArea'); const tableBody=document.querySelector('#tripsTable tbody');
  const person = state.people.find(x=>x.id===selectedPersonId);
  if(!person){ tripsArea.style.display='none'; header.textContent=t('personHeaderChoose'); return; }
  header.textContent = person.name + ' — ' + t('personHeaderChoose'); tripsArea.style.display='block'; tableBody.innerHTML='';
  (person.trips || []).forEach(t=>{
    const tr=document.createElement('tr');
    const tdExit=document.createElement('td'); tdExit.textContent = t.exit || '-';
    const tdReturn=document.createElement('td'); tdReturn.textContent = t.return || '-';
    const tdNote=document.createElement('td'); tdNote.textContent = t.note || '';
    const tdAct=document.createElement('td'); tdAct.className='trip-actions';
    const editBtn=document.createElement('button'); editBtn.className='ghost small'; editBtn.textContent=t('btns.editShort'); editBtn.onclick=()=>{ const newExit=prompt(t('alerts.enterExitDate'), t.exit||''); const newReturn=prompt(t('thReturn')+' (YYYY-MM-DD or empty)', t.return||''); if(newExit){ t.exit=newExit; t.return=newReturn||null; saveState(); renderTripsForSelected(); } }
    const delBtn=document.createElement('button'); delBtn.className='ghost small'; delBtn.textContent=t('btns.delShort'); delBtn.onclick=()=>{ if(confirm(t('alerts.deleteTripConfirm'))){ person.trips = person.trips.filter(x=>x.id!==t.id); saveState(); renderTripsForSelected(); } }
    tdAct.appendChild(editBtn); tdAct.appendChild(delBtn);
    tr.appendChild(tdExit); tr.appendChild(tdReturn); tr.appendChild(tdNote); tr.appendChild(tdAct);
    tableBody.appendChild(tr);
  });
}

// renderResults uses translated headers
function renderResults(){
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';
  const period = getPeriod();
  // header summary of rules
  const ruleDiv = document.createElement('div');
  ruleDiv.className = 'muted small';
  ruleDiv.style.marginBottom = '8px';
  ruleDiv.textContent = `Period: ${isoDate(period.start)} — ${isoDate(period.end)}. Return day ${period.includeReturn ? 'is included' : 'is not included'} in absence.`;
  resultsEl.appendChild(ruleDiv);

  if(!state.people || state.people.length === 0){
    resultsEl.appendChild(Object.assign(document.createElement('div'), { textContent: 'No people — add one.' }));
    return;
  }

  const table = document.createElement('table');
  table.className = 'result-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  t('tableHeaders').forEach(h=>{
    const th = document.createElement('th'); th.textContent = h; headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  state.people.forEach(p=>{
    const row = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = p.name;
    const compute = computeAbsentForPerson(p, period);
    const tdDays = document.createElement('td'); tdDays.textContent = compute.totalDays;
    const tdDetails = document.createElement('td');
    const detailsBtn = document.createElement('button'); detailsBtn.className='ghost small'; detailsBtn.textContent=t('btns.show');
    detailsBtn.onclick = ()=> showDetails(p.id, compute);
    tdDetails.appendChild(detailsBtn);

    row.appendChild(tdName); row.appendChild(tdDays); row.appendChild(tdDetails);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  resultsEl.appendChild(table);
}

// showDetails uses translations for headings/columns
function showDetails(personId, computeData){
  const detailsEl = document.getElementById('details');
  detailsEl.innerHTML = '';
  const person = state.people.find(p=>p.id === personId);
  if(!person){ detailsEl.textContent = t('peopleHeading') + ' not found'; return; }

  const title = document.createElement('h4'); title.textContent = person.name + ' — ' + t('details.totalDays') ;
  detailsEl.appendChild(title);

  const total = document.createElement('div'); total.textContent = t('details.totalDays') + ' ' + computeData.totalDays; total.className='muted';
  detailsEl.appendChild(total);

  const mergedTitle = document.createElement('div'); mergedTitle.textContent = t('details.mergedIntervalsTitle');
  mergedTitle.style.marginTop = '8px';
  detailsEl.appendChild(mergedTitle);
  const mtable = document.createElement('table'); mtable.className='result-table';
  const mh = document.createElement('thead'); mh.innerHTML = `<tr><th>${t('details.columnsMerged.0')}</th><th>${t('details.columnsMerged.1')}</th><th>${t('details.columnsMerged.2')}</th></tr>`; mtable.appendChild(mh);
  const mb = document.createElement('tbody');
  computeData.intervals.forEach(([s,e])=>{
    const tr = document.createElement('tr');
    const tdS = document.createElement('td'); tdS.textContent = isoDate(s);
    const endInclusive = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()) - 86400000);
    const tdE = document.createElement('td'); tdE.textContent = isoDate(endInclusive);
    const tdDays = document.createElement('td'); tdDays.textContent = daysBetweenUTC(s,e);
    tr.appendChild(tdS); tr.appendChild(tdE); tr.appendChild(tdDays);
    mb.appendChild(tr);
  });
  mtable.appendChild(mb);
  detailsEl.appendChild(mtable);

  const contribTitle = document.createElement('div'); contribTitle.textContent = t('details.perTripTitle');
  contribTitle.style.marginTop = '8px';
  detailsEl.appendChild(contribTitle);
  const ctable = document.createElement('table'); ctable.className='result-table';
  const ch = document.createElement('thead'); ch.innerHTML = `<tr><th>${t('details.columnsPerTrip.0')}</th><th>${t('details.columnsPerTrip.1')}</th><th>${t('details.columnsPerTrip.2')}</th><th>${t('details.columnsPerTrip.3')}</th><th>${t('details.columnsPerTrip.4')}</th></tr>`; ctable.appendChild(ch);
  const cb = document.createElement('tbody');
  computeData.details.forEach(d=>{
    const tr = document.createElement('tr');
    const tdExit = document.createElement('td'); tdExit.textContent = isoDate(d.usedStart);
    const usedEndInc = new Date(Date.UTC(d.usedEndExclusive.getUTCFullYear(), d.usedEndExclusive.getUTCMonth(), d.usedEndExclusive.getUTCDate()) - 86400000);
    const tdRet = document.createElement('td'); tdRet.textContent = isoDate(usedEndInc);
    const tdRange = document.createElement('td'); tdRange.textContent = `${isoDate(d.usedStart)} — ${isoDate(usedEndInc)}`;
    const tdDays = document.createElement('td'); tdDays.textContent = d.days;
    const tdNote = document.createElement('td'); tdNote.textContent = d.note || '';
    tr.appendChild(tdExit); tr.appendChild(tdRet); tr.appendChild(tdRange); tr.appendChild(tdDays); tr.appendChild(tdNote);
    cb.appendChild(tr);
  });
  ctable.appendChild(cb);
  detailsEl.appendChild(ctable);
}

// ------------------ UI actions ------------------
// wire translated alerts/labels
document.getElementById('calcAll').onclick = ()=>{ renderResults(); alert(t('alerts.calcDone')); };
document.getElementById('loadSample').onclick = ()=>{ loadSampleData(); saveState(); renderAll(); alert(t('alerts.sampleLoaded')); };
document.getElementById('clearLocal').onclick = ()=>{ if(confirm(t('alerts.clearConfirm'))){ localStorage.removeItem(STORAGE_KEY); state={people:[]}; selectedPersonId=null; renderAll(); } };
document.getElementById('exportJson').onclick = ()=>{ exportJson(); };
document.getElementById('importJsonBtn').onclick = ()=>{ document.getElementById('importJsonFile').click(); };
document.getElementById('importJsonFile').onchange = (ev)=>{ const f = ev.target.files[0]; if(f) importJson(f); ev.target.value = ''; };

// add person
document.getElementById('addPerson').onclick = ()=>{
  const name = document.getElementById('newPersonName').value.trim();
  if(!name){ alert(t('alerts.enterName')); return; }
  const p = { id: uid('p'), name, trips: [] };
  state.people.push(p);
  saveState();
  selectedPersonId = p.id;
  document.getElementById('newPersonName').value = '';
  renderAll();
};

// add trip for selected person
document.getElementById('addTrip').onclick = ()=>{
  const person = state.people.find(x=>x.id===selectedPersonId);
  if(!person){ alert(t('alerts.choosePerson')); return; }
  const exit = document.getElementById('tripExit').value;
  const ret = document.getElementById('tripReturn').value;
  const note = document.getElementById('tripNote').value.trim();
  if(!exit){ alert(t('alerts.enterExitDate')); return; }
  if(ret && parseISO(ret) && parseISO(ret) < parseISO(exit)){ alert(t('alerts.returnBeforeExit')); return; }
  const trip = { id: uid('t'), exit: exit, return: ret || null, note: note || '' };
  person.trips = person.trips || [];
  person.trips.push(trip);
  saveState();
  renderTripsForSelected();
  document.getElementById('tripExit').value=''; document.getElementById('tripReturn').value=''; document.getElementById('tripNote').value='';
};

// merge trips for selected person (merge overlapping/adjacent)
document.getElementById('mergeTrips').onclick = ()=>{
  const person = state.people.find(x=>x.id===selectedPersonId);
  if(!person){ alert(t('alerts.choosePerson')); return; }
  if(!person.trips || person.trips.length<=1){ alert(t('noIntersections')); return; }

  // build intervals with exclusive end (endExclusive) representation
  const msPerDay = 86400000;
  const intervals = person.trips.map(t=>{
    const s = parseISO(t.exit);
    let e = t.return ? parseISO(t.return) : null; // null means open-ended
    // convert to exclusive: if e != null -> exclusive is e (since stored return means day of return is NOT counted), so exclusive = e
    // if e == null -> keep null to represent open-ended
    const endExclusive = e ? new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate())) : null;
    return { s, eExclusive: endExclusive };
  });

  // sort by start
  intervals.sort((a,b)=>Date.UTC(a.s.getUTCFullYear(),a.s.getUTCMonth(),a.s.getUTCDate()) - Date.UTC(b.s.getUTCFullYear(),b.s.getUTCMonth(),b.s.getUTCDate()));

  const merged = [];
  let curS = intervals[0].s;
  let curE = intervals[0].eExclusive; // may be null meaning open
  for(let i=1;i<intervals.length;i++){
    const item = intervals[i];
    const s = item.s;
    const e = item.eExclusive;
    if(curE === null){
      // current is open-ended -> it swallows everything
      continue;
    }
    // if next start <= curE (adjacent or overlap) or next start equals curE -> merge
    if(Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate()) <= Date.UTC(curE.getUTCFullYear(),curE.getUTCMonth(),curE.getUTCDate())){
      // extend curE if e is later
      if(e === null){
        curE = null;
      } else {
        if(Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()) > Date.UTC(curE.getUTCFullYear(),curE.getUTCMonth(),curE.getUTCDate())){
          curE = e;
        }
      }
    } else {
      merged.push([curS, curE]);
      curS = s;
      curE = e;
    }
  }
  merged.push([curS, curE]);

  // convert merged intervals back to trips: endExclusive -> stored return date = endExclusive - 1 day; if endExclusive == null => return: null
  const newTrips = merged.map(([s,eExclusive])=>{
    const exitStr = isoDate(s);
    const returnStr = eExclusive ? isoDate(new Date(Date.UTC(eExclusive.getUTCFullYear(), eExclusive.getUTCMonth(), eExclusive.getUTCDate()) - msPerDay)) : null;
    return { id: uid('t'), exit: exitStr, return: returnStr, note: 'merged' };
  });

  person.trips = newTrips;
  saveState();
  renderTripsForSelected();
  alert(t('mergeTripsDone'));
};

// S3 buttons use translated messages inside addS3Panel
(function addS3Panel(){
  console.log('addS3Panel: initializing S3 panel (if controls exist)');
  const controls = document.querySelector('.controls');
  if(!controls) return;
  const panel = document.createElement('div');
  panel.style.marginTop = '8px';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '6px';
  panel.innerHTML = `
    <label style="font-size:13px;color:#6b7280;margin:0">${t('s3Label')}</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input id="s3PutUrl" type="text" placeholder="${t('s3PutPlaceholder')}" style="flex:1" />
      <button id="s3Save" class="ghost">S3 PUT</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <input id="s3GetUrl" type="text" placeholder="${t('s3GetPlaceholder')}" style="flex:1" />
      <button id="s3Load" class="ghost">S3 GET</button>
    </div>
    <div class="muted small">${t('s3Label')}</div>
  `;
  controls.appendChild(panel);

  document.getElementById('s3Save').onclick = async ()=>{
    const url = document.getElementById('s3PutUrl').value.trim();
    if(!url) return alert(t('s3PutMissing'));
    try{
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state, null, 2)
      });
      if(!res.ok) throw new Error('HTTP '+res.status);
      alert(t('s3SaveOk'));
    }catch(err){ alert(t('s3SaveError') + err.message); }
  };
  document.getElementById('s3Load').onclick = async ()=>{
    const url = document.getElementById('s3GetUrl').value.trim();
    if(!url) return alert(t('s3GetError'));
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const parsed = await res.json();
      if(parsed && parsed.people){ state = parsed; saveState(); renderAll(); alert(t('alerts.importDone')); }
      else alert(t('alerts.importBadFormat'));
    }catch(err){ alert(t('s3LoadError') + err.message); }
  };
})();
  
// ------------------ initial load ------------------
(function init(){
  console.log('init: start');
  // set default dates if empty
  const today = new Date();
  const isoToday = isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));
  if(!document.getElementById('date1').value) document.getElementById('date1').value = isoToday;
  const fiveYearsAgo = new Date(Date.UTC(today.getUTCFullYear()-5, today.getUTCMonth(), today.getUTCDate()));
  if(!document.getElementById('date2').value) document.getElementById('date2').value = isoDate(fiveYearsAgo);
  // ensure includeReturn checkbox has a default (kept false by sample loader)
  if(!document.getElementById('includeReturn')) {
    // nothing to do if element missing, otherwise leave as is
  }
  // load saved data and render UI
  loadState();
  console.log('init: state loaded, rendering UI');
  renderAll();
})();
console.log('app.js: script loaded');