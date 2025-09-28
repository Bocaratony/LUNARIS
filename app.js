/* app.js
   13-month calendar logic + moon phases + simple data layers
*/

const DEFAULT_MONTHS = ["January","February","March","April","May","June","September","October","November","December","Solis","Aureus","Undecima"];
const DAYS_PER_MONTH = 28;
const DAYS_PER_YEAR = DAYS_PER_MONTH * 13;

let months = loadLocal('months', DEFAULT_MONTHS);
let anchor = loadLocal('anchor', {
  custom: "1997-Aureus-17",
  gregorian: "1997-11-21"
});
let eclipses = loadLocal('eclipses', []); // user-importable
let rituals = loadLocal('rituals', sampleRituals());
let year = parseInt(document.getElementById('yearInput').value,10) || new Date().getFullYear();
const calWrap = document.getElementById('calendarWrap');
const toggleGregorian = document.getElementById('toggleGregorian');
const toggleMoonLabels = document.getElementById('toggleMoonLabels');

init();

function init(){
  // fill settings textarea
  document.getElementById('monthsEdit').value = months.join(',');
  setupEvents();
  renderCalendar(year);
  renderEclipseTextArea();
}

function setupEvents(){
  document.getElementById('prevYear').onclick = ()=>{
    year--; document.getElementById('yearInput').value = year; renderCalendar(year);
  };
  document.getElementById('nextYear').onclick = ()=>{
    year++; document.getElementById('yearInput').value = year; renderCalendar(year);
  };
  document.getElementById('yearInput').onchange = (e)=>{
    year = parseInt(e.target.value,10); renderCalendar(year);
  };
  document.getElementById('settingsBtn').onclick = ()=>openSettings();
  document.getElementById('closeSettings').onclick = ()=>closeSettings();
  document.getElementById('saveSettings').onclick = saveSettings;
  document.getElementById('importEclipses').onclick = importEclipses;
  document.getElementById('toggleGregorian').onchange = ()=>renderCalendar(year);
  document.getElementById('toggleMoonLabels').onchange = ()=>renderCalendar(year);
}

function renderCalendar(displayYear){
  calWrap.innerHTML = '';
  // We will treat a custom year number as a label; mapping to Gregorian uses anchor mapping.
  months.forEach((mname, mi)=>{
    const monthCard = document.createElement('div');
    monthCard.className = 'monthCard';
    monthCard.innerHTML = `<div class="monthHeader"><strong>${mname} — ${displayYear}</strong><div>${(mi+1)}/13</div></div>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for(let d=1; d<=DAYS_PER_MONTH; d++){
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      const customDate = {year: displayYear, monthIndex: mi, day: d};
      const greg = customToGregorian(customDate);
      dayDiv.dataset.custom = `${displayYear}-${mname}-${d}`;
      dayDiv.dataset.gregorian = greg.toISOString().slice(0,10);
      dayDiv.innerHTML = `<div class="num">${d}</div>`;
      if(toggleGregorian.checked){
        const gstr = greg.toISOString().slice(0,10);
        const gspan = document.createElement('div'); gspan.className='g'; gspan.textContent = gstr;
        dayDiv.appendChild(gspan);
      }

      // moon phase
      const phase = moonPhase(greg); // 0..1, full ~0.5
      if(toggleMoonLabels.checked){
        const dots = document.createElement('div'); dots.className='dots';
        if(Math.abs(phase - 0.5) < 0.03){ // mark full
          const dot = document.createElement('span'); dot.className='dot full';
          dots.appendChild(dot); dayDiv.classList.add('fullMoon');
        }
        // optional small marker for new moon etc could be added
        dayDiv.appendChild(dots);
      }

      // mark eclipses if any (by greg date)
      const gstr = greg.toISOString().slice(0,10);
      const e = eclipses.find(x=>x.date===gstr);
      if(e){
        dayDiv.classList.add('eclipse');
        const edot = document.createElement('span'); edot.className='dot eclipse'; dayDiv.querySelector('.dots')?.appendChild(edot);
      }

      // rituals/notes
      const rkey = `${displayYear}-${mname}-${d}`;
      if(rituals[rkey]){
        dayDiv.classList.add('ritual');
        const rdot = document.createElement('span'); rdot.className='dot ritual';
        dayDiv.querySelector('.dots')?.appendChild(rdot);
      }

      dayDiv.onclick = ()=>selectDay(dayDiv, customDate, greg);
      grid.appendChild(dayDiv);
    }
    monthCard.appendChild(grid);
    calWrap.appendChild(monthCard);
  });
}

function selectDay(el, customDate, greg){
  const details = document.getElementById('dayDetails');
  const key = `${customDate.year}-${months[customDate.monthIndex]}-${customDate.day}`;
  const gstr = greg.toISOString().slice(0,10);
  let html = `<strong>${months[customDate.monthIndex]} ${customDate.day}, ${customDate.year}</strong><br>`;
  html += `<small>Gregorian: ${gstr}</small><hr/>`;

  const phase = moonPhase(greg);
  const phaseName = moonPhaseName(phase);
  html += `<div><strong>Moon phase:</strong> ${phaseName} (${(phase*100).toFixed(1)}%)</div>`;

  const e = eclipses.find(x=>x.date===gstr);
  if(e) html += `<div><strong>Eclipse:</strong> ${e.type} — ${e.notes || ''}</div>`;

  if(rituals[key]) html += `<div><strong>Rituals / Notes:</strong><br>${rituals[key]}</div>`;
  html += `<hr/><div><em>Quick edits</em></div>`;
  html += `<textarea id="quickNote" rows="3" placeholder="Add ritual/note">${rituals[key] || ''}</textarea><br>`;
  html += `<button id="saveNoteBtn">Save note</button>`;
  details.innerHTML = html;
  document.getElementById('saveNoteBtn').onclick = ()=>{
    const v = document.getElementById('quickNote').value.trim();
    if(v) rituals[key] = v; else delete rituals[key];
    saveLocal('rituals', rituals);
    renderCalendar(year);
    selectDay(el, customDate, greg); // refresh details
  };
}

function openSettings(){
  document.getElementById('settingsModal').style.display='flex';
}
function closeSettings(){
  document.getElementById('settingsModal').style.display='none';
}
function saveSettings(){
  const mtxt = document.getElementById('monthsEdit').value.trim();
  const arr = mtxt.split(',').map(s=>s.trim()).filter(Boolean);
  if(arr.length !== 13){
    alert('Please provide exactly 13 month names in order (comma-separated).');
    return;
  }
  months = arr;
  saveLocal('months', months);
  // save anchor
  const aCust = document.getElementById('anchorCustom').value.trim();
  const aG = document.getElementById('anchorGregorian').value.trim();
  if(aCust && aG){
    anchor = {custom:aCust, gregorian:aG};
    saveLocal('anchor', anchor);
  }
  closeSettings();
  renderCalendar(year);
}

function renderEclipseTextArea(){
  document.getElementById('eclipseJSON').value = JSON.stringify(eclipses, null, 2);
}

function importEclipses(){
  const txt = document.getElementById('eclipseJSON').value;
  try{
    const arr = JSON.parse(txt);
    if(!Array.isArray(arr)) throw 'not array';
    // basic validation: each has date in YYYY-MM-DD
    for(const e of arr){
      if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(e.date)) throw 'invalid date format';
    }
    eclipses = arr;
    saveLocal('eclipses', eclipses);
    alert('Eclipses imported — saved locally.');
    renderCalendar(year);
  }catch(err){
    alert('Invalid JSON: ' + err);
  }
}

function saveLocal(k,v){ localStorage.setItem('customcal_'+k, JSON.stringify(v)); }
function loadLocal(k, def){ const s = localStorage.getItem('customcal_'+k); return s ? JSON.parse(s) : def; }

// ---------- Conversion logic ----------
/*
Anchor approach:
- Anchor is a mapping between one custom date and one Gregorian date.
- We'll compute day index from start of custom year: dayIndex = (monthIndex * 28) + (day-1)
- Then compare to anchor: find difference between anchor custom and anchor gregorian in days, then convert arbitrary custom date by offsetting from anchor's greg date.
*/

function parseAnchorCustom(s){
  // expects "YYYY-MonthName-DD" (e.g. 1997-Aureus-17)
  const parts = s.split('-');
  if(parts.length<3) return null;
  const y = parseInt(parts[0],10);
  const monthName = parts[1];
  const d = parseInt(parts[2],10);
  const mi = months.indexOf(monthName);
  if(isNaN(y) || mi<0 || isNaN(d) ) return null;
  return {year:y, monthIndex:mi, day:d};
}

function customToDayIndex(c){
  // days from custom year 0 reference (we make a composite index: year*DAYS_PER_YEAR + ...)
  const idx = c.year * DAYS_PER_YEAR + (c.monthIndex * DAYS_PER_MONTH) + (c.day - 1);
  return idx;
}

function gregorianToJDate(gDate){
  // returns JS Date for midnight UTC of that day
  return new Date(Date.UTC(gDate.getUTCFullYear(), gDate.getUTCMonth(), gDate.getUTCDate()));
}

function customToGregorian(c){
  // compute using anchor
  const aCust = parseAnchorCustom(anchor.custom);
  const aGreg = new Date(anchor.gregorian + 'T00:00:00Z');
  if(!aCust) {
    // fallback: assume custom year starts on Jan 1 of same year
    const approx = new Date(Date.UTC(c.year,0,1));
    return approx;
  }
  const anchorIdx = customToDayIndex(aCust);
  const targetIdx = customToDayIndex(c);
  const deltaDays = targetIdx - anchorIdx;
  const result = new Date(aGreg.getTime() + deltaDays * 24*60*60*1000);
  return result;
}

// ---------- Moon phase (simple algorithm) ----------
/* Return moon phase fraction 0..1 where:
   0 = New Moon, 0.5 = Full Moon, etc.
   Based on a standard ephemeris approximation (John Conway/Trigonometric),
   accurate to ~hours which is fine for marking full moons visually.
*/
function moonPhase(date){
  // date is JS Date
  const d = new Date(date.getTime());
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate() + (d.getUTCHours() + d.getUTCMinutes()/60)/24;

  let yy = year - Math.floor((12 - month) / 10);
  let mm = month + 9;
  if(mm >= 12) mm -= 12;
  const k1 = Math.floor(365.25 * (yy + 4712));
  const k2 = Math.floor(30.6 * mm + 0.5);
  const jd = k1 + k2 + day - 1524.5;
  // Known new moon reference
  const T = (jd - 2451545.0) / 36525;
  // mean phase (in cycles)
  const D = (jd - 2451550.1) / 29.530588853;
  const phase = D - Math.floor(D);
  // normalise
  return (phase + 1) % 1;
}

function moonPhaseName(p){
  // p 0..1 (0 new, 0.25 first quarter, 0.5 full, 0.75 last)
  if(Math.abs(p-0) < 0.03) return 'New Moon';
  if(Math.abs(p-0.25) < 0.03) return 'First Quarter';
  if(Math.abs(p-0.5) < 0.03) return 'Full Moon';
  if(Math.abs(p-0.75) < 0.03) return 'Last Quarter';
  if(p>0 && p<0.25) return 'Waxing';
  if(p>0.25 && p<0.5) return 'Waxing Gibbous';
  if(p>0.5 && p<0.75) return 'Waning Gibbous';
  return 'Waning';
}

// sample rituals to demonstrate layers
function sampleRituals(){
  const k = {};
  k["2025-Aureus-17"] = "Birthday ritual: anoint hair with cedar+black pepper oil; sigil activation at dusk.";
  k["2025-Solis-1"] = "Solis new-month grounding: 13 breaths + salt ring.";
  return k;
}
