/* ========= Utility helpers ========= */
const fmt  = d => d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
const dow  = d => d.toLocaleDateString("en-IN",{weekday:"long"});
const pick = a => a[Math.random()*a.length|0];
const shuffle = a => [...a].sort(()=>Math.random()-.5);
const same = (a,b)=>a&&b&&a.getTime()===b.getTime();

/* ========= Fixed staff (for cloning) ========= */
const Departments={
  Reception:["Sagar","Roshan","Karan"],
  OPD:["Anagha","Shraddha Tipale","Shubhangi","Mamta"],
  CallCenter:["Jayshree","Shraddha P","Prasad"],
  AppointmentDesk:["Vanita","Gaurav"]
};

/* ========= Split month into weeks ========= */
function splitWeeks(y,m){
  const len=new Date(y,m+1,0).getDate(),days=[],weeks=[],cur=[];
  for(let d=1;d<=len;d++) days.push(new Date(y,m,d));
  days.forEach(dt=>{cur.push(dt);
    if(dt.getDay()===0||dt.getDate()===len){weeks.push(cur.slice());cur.length=0;}
  });
  return weeks;
}

/* ========= Build one week (dynamic staff arrays) ========= */
// (unchanged buildWeek from your original logic.js)
// ...

/* ========= Build table (dynamic sorted arrays) ========= */
const depLabel=d=>({Reception:"Reception (GF)",OPD:"OPD (1F)",CallCenter:"Call Center (B1)",AppointmentDesk:"Appointment Desk (1F)"}[d]);
function tableHTML(days,weekObj,i){
  const sched=weekObj.data;
  const th1=['<th rowspan="2">Department</th><th rowspan="2">Name of Employee</th>'];
  const th2=[];
  days.forEach(d=>{th1.push(`<th>${dow(d)}</th>`);th2.push(`<th>${fmt(d)}</th>`);});
  const head=`<thead><tr>${th1.join("")}</tr><tr>${th2.join("")}</tr></thead>`;
  const rows=[],block=(d,arr)=>arr.forEach((p,j)=>{
    const cells=[];
    if(j===0)cells.push(`<th class="dept" rowspan="${arr.length}">${depLabel(d)}</th>`);
    cells.push(`<th>${p}</th>`);
    days.forEach(dt=>cells.push(`<td>${sched[d][p][fmt(dt)]||""}</td>`));
    rows.push(`<tr>${cells.join("")}</tr>`);
  });
  block("Reception", weekObj.Reception);
  block("OPD", weekObj.OPD);
  block("CallCenter", weekObj.CallCenter);
  block("AppointmentDesk", weekObj.AppointmentDesk);

  return `<section class="card week" data-w="${i}">
    <div style="margin-bottom:8px"><span class="badge t-7">Week ${i}</span>
      <small class="muted">(${fmt(days[0])} → ${fmt(days.at(-1))})</small>
    </div><table>${head}<tbody>${rows.join("")}</tbody></table></section>`;
}

/* ========= Render month ========= */
function renderMonth(y,m){
  const weeks=splitWeeks(y,m),main=document.getElementById("weeks"),tabs=document.getElementById("tabs");
  main.innerHTML="";tabs.innerHTML="";
  weeks.forEach((days,i)=>{
    const weekObj=buildWeek(days);
    main.insertAdjacentHTML("beforeend",tableHTML(days,weekObj,i+1));
    tabs.insertAdjacentHTML("beforeend",`<button class="tab" data-w="${i+1}">Week ${i+1}</button>`);
  });
  const today=new Date(),idx=(today.getFullYear()===y&&today.getMonth()===m)?
        weeks.findIndex(w=>w.some(dt=>dt.getDate()===today.getDate()))+1:1;
  activate(idx);tabs.onclick=e=>{const w=e.target.dataset.w;w&&activate(+w);};
}
function activate(n){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",+t.dataset.w===n));
  document.querySelectorAll(".week").forEach(w=>w.classList.toggle("hidden",+w.dataset.w!==n));
}

/* ========= Excel export (improved) ========= */
function download() {
  const tbl = document.querySelector(".week:not(.hidden) table");
  if (!tbl) return;

  let weekName =
    document.querySelector(".tab.active")?.textContent.trim() ||
    document.querySelector(".week:not(.hidden) .badge.t-7")?.textContent.trim() ||
    "Week";

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())} ${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`;
  let hr = now.getHours(), min = pad(now.getMinutes());
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr % 12; if (hr === 0) hr = 12;
  const timeStr = `${pad(hr)}.${min} ${ampm}`;
  const filename = `${weekName} - ${dateStr} - ${timeStr}.xls`;

  const excelStyle = `
    <style>
      body { background:#1e263d; margin:0; }
      table { margin: 36px auto; background: #262f49; border-radius: 18px; border-collapse: separate !important; border-spacing: 0; box-shadow: 0 6px 40px #0006; font-family: 'Poppins',Segoe UI,Arial,sans-serif; }
      thead th { background: linear-gradient(90deg,#33408e,#5b7cfa 60%,#30c9e8); font-size: 1.08rem; color: #f3f7ff; border-right: 1.5px solid #253a65; border-bottom: 2.5px solid #3c6ee0; padding:14px 12px; letter-spacing: 0.9px; font-weight: bold; text-align:center; }
      thead tr:nth-child(2) th { background: #21305b; color: #dbeafe; font-weight: 600; border-bottom:1.5px solid #4f5bbd; }
      tbody th { background:#212a3d; color:#ffe2f1; font-weight: bold; text-align:left; padding:12px; border-right:1px solid #313970; border-bottom:1px solid #2c335a; }
      tbody td { padding:11px 6px; color:#f3f7ff; text-align:center; font-size:1.03rem; border-right:1px solid #313970; border-bottom:1px solid #242b4f; background: rgba(35, 45, 63, 0.91); }
      tbody tr:nth-child(even) td { background:#293354; }
      .badge, .off { border-radius:8px; padding:5px 9px; font-weight:600; display:inline-block; font-size:1.06rem; text-align:center; }
      .badge { background: #4750b4; color: #fff; }
      .off   { color:#ec6174; background:rgba(240,51,80,.12); border:1px dashed #e67397; }
      section { display:flex; flex-direction:column; align-items:center; }
    </style>
  `;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8">${excelStyle}</head>
      <body>
        <section>
          <div style="margin-bottom:17px; font-size:1.18rem; color:#95b8ff; font-weight:600; letter-spacing:0.7px;">
            ${weekName} | Exported on ${dateStr} ${timeStr}
          </div>
          ${tbl.outerHTML}
        </section>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ========= Animated button helpers ========= */
function setButtonLoading(btn, loadingText, emoji="🔄", style="spin") {
  if (btn.dataset.loading === "true") return;
  btn.dataset.loading = "true";
  btn.classList.add("loading");

  const originalText = btn.dataset.originalText || btn.textContent;
  btn.dataset.originalText = originalText;

  let dotCount = 0;
  btn.innerHTML = `<span class="spinner-${style}">${emoji}</span> ${loadingText}`;

  const interval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    btn.innerHTML = `<span class="spinner-${style}">${emoji}</span> ${loadingText}${".".repeat(dotCount)}`;
  }, 500);

  return (successText = "✅ Done!") => {
    clearInterval(interval);
    btn.textContent = successText;
    btn.classList.remove("loading");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.dataset.loading = "false";
    }, 1500);
  };
}

/* ========= Buttons & bootstrap ========= */
document.getElementById("regen").onclick = () => {
  const btn = document.getElementById("regen");
  const finish = setButtonLoading(btn, "Regenerating", "🔄", "spin");
  setTimeout(() => {
    renderMonth(cur.getFullYear(), cur.getMonth());
    finish("✅ Roster Ready!");
  }, 1200);
};

document.getElementById("dl").onclick = () => {
  const btn = document.getElementById("dl");
  const finish = setButtonLoading(btn, "Downloading", "⬇️", "bounce");
  setTimeout(() => {
    download();
    finish("✅ Downloaded!");
  }, 1200);
};

const cur=new Date();renderMonth(cur.getFullYear(),cur.getMonth());

function buildWeek(days){
  // === Weekly random swap: Jayshree <-> Shubhangi ===
  const weeklySwap = Math.random() < 0.5;

  // Clone and swap for the week, then sort alphabetically
  let receptionStaff    = [...Departments.Reception].sort();
  let opdStaff          = [...Departments.OPD].filter(e => e !== "Shubhangi").sort();
  let callCenterStaff   = [...Departments.CallCenter].filter(e => e !== "Jayshree").sort();
  if (weeklySwap) {
    opdStaff.push("Jayshree");
    callCenterStaff.push("Shubhangi");
  } else {
    opdStaff.push("Shubhangi");
    callCenterStaff.push("Jayshree");
  }
  opdStaff.sort();
  callCenterStaff.sort();
  let appointmentDeskStaff = [...Departments.AppointmentDesk].sort();

  // ============ Logic ================
  const sched={};
  [receptionStaff,opdStaff,callCenterStaff,appointmentDeskStaff].forEach((arr,i)=>{
    const dep = ["Reception","OPD","CallCenter","AppointmentDesk"][i];
    sched[dep] = {};
    arr.forEach(p=>sched[dep][p]={});
  });

  const wk=days.filter(d=>d.getDay()!==0); // Mon-Sat
  // Offs assigned from the *full canonical* list so it works for either swap
  const offR={Karan:pick(wk)};
  offR.Sagar  =pick(wk.filter(d=>!same(d,offR.Karan)));
  offR.Roshan =pick(wk.filter(d=>!same(d,offR.Karan)&&!same(d,offR.Sagar)));
  // OPD offs assigned for full OPD (including the possible swap)
  const allOPD = [...Departments.OPD,"Jayshree"];
  const offO ={
    "Shubhangi":pick(wk),
    "Jayshree":pick(wk),
    "Shraddha Tipale":pick(wk),
    "Mamta":pick(wk)};
  const offC ={
    "Shraddha P":pick(wk),
    "Prasad":pick(wk),
    "Jayshree":pick(wk),
    "Shubhangi":pick(wk)};
  const offA ={Vanita:pick(wk),Gaurav:pick(wk)};

  const put=(dep,e,day,val)=>sched[dep][e][fmt(day)]=val;
  const badge=(c,t)=>`<span class="badge ${c}">${t}</span>`;
  const OFF='<span class="off">Week&nbsp;Off</span>';

  days.forEach(d=>{
    const sun=d.getDay()===0;
    // --------- Reception ---------
    if(sun){
      put("Reception","Karan",d,badge("t-N","N"));
      put("Reception","Sagar",d,OFF);
      put("Reception","Roshan",d,OFF);
    } else {
      put("Reception","Karan",d,same(d,offR.Karan)?OFF:badge("t-N","N"));
      const pair=Math.random()<.5?[["Sagar","7"],["Roshan","2"]]:[["Sagar","2"],["Roshan","7"]];
      pair.forEach(([p,t])=>put("Reception",p,d,same(d,offR[p])?OFF:badge(t==="7"?"t-7":"t-2",t)));
    }

    // ---- SUNDAY: exactly 4 people (swap-aware) ----
    if(sun){
      // 1. OPD – one random person (of this week) at 9:00, others off
      const opdPerson = pick(opdStaff);
      opdStaff.forEach(e =>
        put("OPD", e, d, e === opdPerson ? badge("t-9","9:00") : OFF));

      // 2. CC – one random person (this week) at 7 or 8:30, others off
      const ccPerson = pick(callCenterStaff), ccShift=Math.random()<.5?"7":"8:30";
      callCenterStaff.forEach(e =>
        put("CallCenter",e,d,e===ccPerson?badge(ccShift==="7"?"t-7":"t-730",ccShift):OFF));
      // 3. Appointment Desk
      const appt = Math.random()<.5?"Vanita":"Gaurav";
      appointmentDeskStaff.forEach(e =>
        put("AppointmentDesk",e,d,e===appt?badge("t-2","2"):OFF));
    }

    // --------- Weekdays: OPD/CC SWAP aware ---------
    if(!sun){
      // Anagha always in OPD 9 AM
      put("OPD","Anagha",d,badge("t-9","9:00"));
      // For the swap:
      if (weeklySwap) {
        // Jayshree is OPD, Shubhangi is CallCenter this week
        put("OPD","Jayshree",d,same(d,offO["Jayshree"])?OFF:badge("t-930","9:30"));
        put("CallCenter","Shubhangi",d,same(d,offC["Shubhangi"])?OFF:badge("t-800","8:00"));
      } else {
        put("OPD","Shubhangi",d,same(d,offO["Shubhangi"])?OFF:badge("t-930","9:30"));
        put("CallCenter","Jayshree",d,same(d,offC["Jayshree"])?OFF:badge("t-800","8:00"));
      }
      // The rest (alphabetic order, excluding the swapped-out person)
      ["Shraddha Tipale","Mamta"].forEach(e =>
        put("OPD",e,d,same(d,offO[e])?OFF:badge(e==="Mamta"?"t-930":"t-1030",e==="Mamta"?"9:30":"10:30")));
      // CC weekday: Prasad 11:30 (always), Shraddha P rotates with slot/offs
      put("CallCenter","Prasad",d,badge("t-1130","11:30"));
      const ccSecondary = (weeklySwap ? "Shubhangi" : "Jayshree");
      if (callCenterStaff.includes("Shraddha P")) {
        // pick slots for Shraddha P and secondary
        const slots = shuffle(["7:30","8:00"]);
        put("CallCenter","Shraddha P",d,same(d,offC["Shraddha P"])?OFF:badge(slots[0]==="7:30"?"t-730":"t-800",slots[0]));
        put("CallCenter",ccSecondary,d,same(d,offC[ccSecondary])?OFF:badge(slots[1]==="7:30"?"t-730":"t-800",slots[1]));
      }
    }
    // ---- Appointment Desk weekdays ----
    if(!sun){
      appointmentDeskStaff.forEach(e =>
        put("AppointmentDesk",e,d,same(d,offA[e])?OFF:badge("t-930","9:30")));
    }
  });
  return {
    Reception: receptionStaff,
    OPD: opdStaff,
    CallCenter: callCenterStaff,
    AppointmentDesk: appointmentDeskStaff,
    data: sched
  };
}
