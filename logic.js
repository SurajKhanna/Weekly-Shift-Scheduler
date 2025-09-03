/* ========= Utility helpers ========= */
// const fmt  = d => d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
const fmt = d => d.toLocaleDateString("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

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
  const len = new Date(y, m+1, 0).getDate();
  const days = [], weeks = [], cur = [];
  for (let d=1; d<=len; d++) days.push(new Date(y,m,d));

  days.forEach(dt=>{
    cur.push(dt);
    if (dt.getDay()===0) {   // Sunday → end of week
      weeks.push(cur.slice());
      cur.length=0;
    }
  });

  // if last week incomplete, extend into next month until Sunday
  if (cur.length) {
    let next = new Date(y,m+1,1);
    while (next.getDay() !== 0) {   // keep adding until Sunday
      cur.push(new Date(next));
      next.setDate(next.getDate()+1);
    }
    cur.push(new Date(next)); // include the Sunday
    weeks.push(cur);
  }
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

//Code working correctly
// function buildWeek(days){
//   const weeklySwap = Math.random() < 0.5;

//   // Clone staff
//   let receptionStaff    = [...Departments.Reception].sort();
//   let opdStaff          = [...Departments.OPD].filter(e => e !== "Shubhangi").sort();
//   let callCenterStaff   = [...Departments.CallCenter].filter(e => e !== "Jayshree").sort();
//   if (weeklySwap) {
//     opdStaff.push("Jayshree");
//     callCenterStaff.push("Shubhangi");
//   } else {
//     opdStaff.push("Shubhangi");
//     callCenterStaff.push("Jayshree");
//   }
//   opdStaff.sort();
//   callCenterStaff.sort();
//   let appointmentDeskStaff = [...Departments.AppointmentDesk].sort();

//   // ============ Logic ================
//   const sched={};
//   [receptionStaff,opdStaff,callCenterStaff,appointmentDeskStaff].forEach((arr,i)=>{
//     const dep = ["Reception","OPD","CallCenter","AppointmentDesk"][i];
//     sched[dep] = {};
//     arr.forEach(p=>sched[dep][p]={});
//   });

//   // === New off rule ===
//   const allDays = [...days];  // Sun–Sat
//   const offs = {};
//   [receptionStaff,opdStaff,callCenterStaff,appointmentDeskStaff].forEach(arr=>{
//     arr.forEach(e=>{
//       offs[e] = pick(allDays);  // exactly one random off-day
//     });
//   });

//   const put=(dep,e,day,val)=>sched[dep][e][fmt(day)]=val;
//   const badge=(c,t)=>`<span class="badge ${c}">${t}</span>`;
//   const OFF='<span class="off">Week&nbsp;Off</span>';

//   days.forEach(d=>{
//     // ---------- Reception ----------
//     receptionStaff.forEach(e=>{
//       if (same(d,offs[e])) {
//         put("Reception",e,d,OFF);
//       } else {
//         if (e==="Karan") put("Reception",e,d,badge("t-N","N"));
//         if (e==="Sagar") put("Reception",e,d,badge("t-7","7"));
//         if (e==="Roshan") put("Reception",e,d,badge("t-2","2"));
//       }
//     });

//     // ---------- OPD ----------
//     opdStaff.forEach(e=>{
//       if (same(d,offs[e])) {
//         put("OPD",e,d,OFF);
//       } else {
//         if (e==="Anagha") put("OPD",e,d,badge("t-9","9:00"));
//         else if (e==="Shubhangi") put("OPD",e,d,badge("t-930","9:30"));
//         else if (e==="Jayshree") put("OPD",e,d,badge("t-930","9:30")); // when swapped
//         else if (e==="Shraddha Tipale") put("OPD",e,d,badge("t-1030","10:30"));
//         else if (e==="Mamta") put("OPD",e,d,badge("t-930","9:30"));
//       }
//     });

//     // ---------- Call Center ----------
//     callCenterStaff.forEach(e=>{
//       if (same(d,offs[e])) {
//         put("CallCenter",e,d,OFF);
//       } else {
//         if (e==="Prasad") put("CallCenter",e,d,badge("t-1130","11:30"));
//         else if (e==="Shraddha P") put("CallCenter",e,d,badge("t-730","7:30"));
//         else if (e==="Jayshree") put("CallCenter",e,d,badge("t-800","8:00"));
//         else if (e==="Shubhangi") put("CallCenter",e,d,badge("t-800","8:00")); // when swapped
//       }
//     });

//     // ---------- Appointment Desk ----------
//     appointmentDeskStaff.forEach(e=>{
//       if (same(d,offs[e])) {
//         put("AppointmentDesk",e,d,OFF);
//       } else {
//         put("AppointmentDesk",e,d,badge("t-930","9:30"));
//       }
//     });
//   });

//   return {
//     Reception: receptionStaff,
//     OPD: opdStaff,
//     CallCenter: callCenterStaff,
//     AppointmentDesk: appointmentDeskStaff,
//     data: sched
//   };
// }

function buildWeek(days){
  const weeklySwap = Math.random() < 0.5;

  // Clone staff
  let receptionStaff    = [...Departments.Reception].sort();
  let opdStaff          = [...Departments.OPD].filter(e => e !== "Shubhangi" && e !== "Anagha").sort();
  let callCenterStaff   = [...Departments.CallCenter].filter(e => e !== "Jayshree").sort();
  if (weeklySwap) {
    opdStaff.push("Jayshree");   // swap into OPD
    callCenterStaff.push("Shubhangi"); // swap into CC
  } else {
    opdStaff.push("Shubhangi");
    callCenterStaff.push("Jayshree");
  }
  opdStaff.sort();
  callCenterStaff.sort();
  let appointmentDeskStaff = [...Departments.AppointmentDesk].sort();

  // ============ Logic ================
  const sched={};
  [receptionStaff, [...opdStaff,"Anagha"],callCenterStaff,appointmentDeskStaff].forEach((arr,i)=>{
    const dep = ["Reception","OPD","CallCenter","AppointmentDesk"][i];
    sched[dep] = {};
    arr.forEach(p=>sched[dep][p]={});
  });

  // === Weekly off assignment ===
  const allDays = [...days];
  const offs = {};
  [receptionStaff,[...opdStaff,"Anagha"],callCenterStaff,appointmentDeskStaff].forEach(arr=>{
    arr.forEach(e=>{
      offs[e] = pick(allDays);  // one random off day
    });
  });

  // === Pre-plan Shraddha P’s week (Call Center) ===
  const shraddhaPSchedule = {};
  let ccDays = days.filter(d => d.getDay() !== 0); // Mon–Sat
  let tenThirtyDay = pick(ccDays); // exactly one day at 10:30
  let count730 = 0, count800 = 0;
  ccDays.forEach(d => {
    if (same(d,tenThirtyDay)) {
      shraddhaPSchedule[fmt(d)] = "10:30";
    } else {
      if (count730 < 3 && count800 < 3) {
        if (Math.random() < 0.5) { shraddhaPSchedule[fmt(d)] = "7:30"; count730++; }
        else { shraddhaPSchedule[fmt(d)] = "8:00"; count800++; }
      } else if (count730 >= 3) {
        shraddhaPSchedule[fmt(d)] = "8:00"; count800++;
      } else {
        shraddhaPSchedule[fmt(d)] = "7:30"; count730++;
      }
    }
  });

  // === Pre-plan Appointment Desk rotation ===
  const adSchedule = { Vanita:{}, Gaurav:{} };
  let adDays = days.filter(d => d.getDay() !== 0);
  let vanitaCount = { "9:30":0, "2":0 };
  adDays.forEach(d=>{
    let slot;
    if (vanitaCount["9:30"] >= 3) slot = "2";
    else if (vanitaCount["2"] >= 3) slot = "9:30";
    else slot = Math.random()<0.5 ? "9:30" : "2";
    adSchedule["Vanita"][fmt(d)] = slot;
    adSchedule["Gaurav"][fmt(d)] = slot==="9:30" ? "2" : "9:30";
    vanitaCount[slot]++;
  });

  // === Helpers ===
  const put=(dep,e,day,val)=>sched[dep][e][fmt(day)]=val;
  const badge=(c,t)=>`<span class="badge ${c}">${t}</span>`;
  const OFF='<span class="off">Week&nbsp;Off</span>';
  const slotClass = {
    "N": "t-N",
    "7": "t-7",
    "2": "t-2",
    "9:00": "t-9",
    "9:30": "t-930",
    "10:30": "t-1030",
    "7:30": "t-730",
    "8:00": "t-800",
    "11:30": "t-1130"
  };

  // === Fill schedule day by day ===
  days.forEach(d=>{
    // ---------- Reception ----------
    const recSlots = shuffle(["7","2"]);
    receptionStaff.forEach(e=>{
      if (same(d,offs[e])) {
        put("Reception",e,d,OFF);
      } else {
        if (e==="Karan") {
          put("Reception",e,d,badge("t-N","N"));
        } else {
          const slot = recSlots.pop();
          put("Reception",e,d,badge(slotClass[slot],slot));
        }
      }
    });

    // ---------- OPD ----------
    let opdSlots = shuffle(["9:30","10:30"]);
    opdStaff.forEach(e=>{
      if (same(d,offs[e])) {
        put("OPD",e,d,OFF);
      } else {
        const slot = opdSlots.pop() || "9:30";
        put("OPD",e,d,badge(slotClass[slot],slot));
      }
    });
    // Anagha fixed at 9:00
    if (same(d,offs["Anagha"])) {
      put("OPD","Anagha",d,OFF);
    } else {
      put("OPD","Anagha",d,badge("t-9","9:00"));
    }

    // ---------- Call Center ----------
    let ccAlt = (weeklySwap ? "Shubhangi" : "Jayshree");
    callCenterStaff.forEach(e=>{
      if (same(d,offs[e])) {
        put("CallCenter",e,d,OFF);
      } else {
        if (e==="Prasad") {
          put("CallCenter",e,d,badge("t-1130","11:30"));
        } else if (e==="Shraddha P") {
          let slot = shraddhaPSchedule[fmt(d)];
          put("CallCenter",e,d,badge(slotClass[slot],slot));
        } else if (e===ccAlt) {
          let shrSlot = shraddhaPSchedule[fmt(d)];
          if (shrSlot==="7:30") put("CallCenter",e,d,badge("t-800","8:00"));
          else if (shrSlot==="8:00") put("CallCenter",e,d,badge("t-730","7:30"));
          else {
            let altSlot = Math.random()<0.5 ? "7:30" : "8:00";
            put("CallCenter",e,d,badge(slotClass[altSlot],altSlot));
          }
        }
      }
    });

    // ---------- Appointment Desk ----------
    appointmentDeskStaff.forEach(e=>{
      if (same(d,offs[e])) {
        put("AppointmentDesk",e,d,OFF);
      } else {
        const slot = adSchedule[e][fmt(d)];
        put("AppointmentDesk",e,d,badge(slotClass[slot],slot));
      }
    });
  });

  return {
    Reception: receptionStaff,
    OPD: [...opdStaff,"Anagha"],
    CallCenter: callCenterStaff,
    AppointmentDesk: appointmentDeskStaff,
    data: sched
  };
}



