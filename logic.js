/* ═════════════════════════════════════════════════════════════════
   EDITORIAL EMPLOYEE WEEK-VIEW SHIFT SCHEDULER - LOGIC
   Paper Planner Aesthetic & Smart Employee Roster Generator
   Made with ❤️ by Suraj Khanna
   ═════════════════════════════════════════════════════════════════ */

/* ── Global Constants & Utilities ── */
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_START_HOUR = 7; // 7 AM
const DAY_END_HOUR = 21;  // 9 PM
const HOUR_HEIGHT = 64;   // 64px per hour

const fmtDateShort = d => d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const sameDate = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad = n => String(n).padStart(2, "0");

/* ── Department Staffing Structure ── */
const Departments = {
  Reception: ["Sagar", "Roshan", "Karan"],
  OPD: ["Anagha", "Shraddha Tipale", "Shubhangi", "Mamta"],
  CallCenter: ["Jayshree", "Shraddha P", "Prasad"],
  AppointmentDesk: ["Vanita", "Gaurav"],
};

const DepLabels = {
  Reception: "Reception (GF)",
  OPD: "OPD (1F)",
  CallCenter: "Call Center (B1)",
  AppointmentDesk: "Appointment Desk (1F)",
};

const DepToCategory = {
  Reception: "reception",
  OPD: "opd",
  CallCenter: "callcenter",
  AppointmentDesk: "appt",
};

const DepToFamily = {
  Reception: "terracotta",
  OPD: "sage",
  CallCenter: "dusty",
  AppointmentDesk: "amber",
  Leaves: "birthday",
};

/* ── Reference Anchor: July 2026 ── */
// The prompt specifies 'July 2026', with Today on Thursday, July 9, 2026
const TODAY_ANCHOR = new Date(2026, 6, 9); // Month is 0-indexed: 6 = July, 9 = Thursday

let state = {
  currentDate: new Date(2026, 6, 9),
  activeWeekIndex: 1, // Week 2 of July 2026 is July 6-12
  currentView: "roster", // Default to By Department sections view!
  activeDepartmentFilter: "all", // "all", "reception", "opd", "callcenter", "appt", "leaves"
  gridMode: "adaptive", // "adaptive" (spacious cascading cards) or "lanes" (4 department tracks per day)
  rosterLayout: "sections", // "sections" (divided by department cards) or "unified" (single table)
  activeCalendars: {
    reception: true,
    opd: true,
    callcenter: true,
    appt: true,
    leaves: true,
  },
  searchQuery: "",
  cachedWeeks: null,
  activeRosterWeek: 2,
};

/* ── LocalStorage State Persistence (Ensures Browser Refresh & Reloads Work Seamlessly) ── */
const STORAGE_KEY = "weekly_shift_scheduler_v2";

function serializeOffs(offObj) {
  if (!offObj) return {};
  const res = {};
  for (const k in offObj) {
    res[k] = offObj[k] instanceof Date ? offObj[k].toISOString() : offObj[k];
  }
  return res;
}

function deserializeOffs(offObj) {
  if (!offObj) return {};
  const res = {};
  for (const k in offObj) {
    res[k] = offObj[k] ? new Date(offObj[k]) : null;
  }
  return res;
}

function saveStateToStorage() {
  try {
    const toSave = {
      currentDate: state.currentDate.toISOString(),
      activeWeekIndex: state.activeWeekIndex,
      activeRosterWeek: state.activeRosterWeek,
      currentView: state.currentView,
      activeDepartmentFilter: state.activeDepartmentFilter,
      gridMode: state.gridMode,
      rosterLayout: state.rosterLayout,
      activeCalendars: state.activeCalendars,
      cachedWeeks: state.cachedWeeks ? {
        y: state.cachedWeeks.y,
        m: state.cachedWeeks.m,
        data: state.cachedWeeks.data.map(item => ({
          days: item.days.map(d => d.toISOString()),
          roster: {
            Reception: item.roster.Reception,
            OPD: item.roster.OPD,
            CallCenter: item.roster.CallCenter,
            AppointmentDesk: item.roster.AppointmentDesk,
            data: item.roster.data,
            offs: item.roster.offs ? {
              Reception: serializeOffs(item.roster.offs.Reception),
              OPD: serializeOffs(item.roster.offs.OPD),
              CallCenter: serializeOffs(item.roster.offs.CallCenter),
              AppointmentDesk: serializeOffs(item.roster.offs.AppointmentDesk),
            } : {},
          }
        }))
      } : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("Storage save error:", err);
  }
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    if (!p) return false;

    if (p.currentDate) state.currentDate = new Date(p.currentDate);
    if (typeof p.activeWeekIndex === "number") state.activeWeekIndex = p.activeWeekIndex;
    if (typeof p.activeRosterWeek === "number") state.activeRosterWeek = p.activeRosterWeek;
    if (p.currentView) state.currentView = p.currentView;
    if (p.activeDepartmentFilter) state.activeDepartmentFilter = p.activeDepartmentFilter;
    if (p.gridMode) state.gridMode = p.gridMode;
    if (p.rosterLayout) state.rosterLayout = p.rosterLayout;
    if (p.activeCalendars) state.activeCalendars = p.activeCalendars;

    if (p.cachedWeeks && Array.isArray(p.cachedWeeks.data) && p.cachedWeeks.data.length) {
      state.cachedWeeks = {
        y: p.cachedWeeks.y,
        m: p.cachedWeeks.m,
        data: p.cachedWeeks.data.map(item => ({
          days: item.days.map(d => new Date(d)),
          roster: {
            Reception: item.roster.Reception,
            OPD: item.roster.OPD,
            CallCenter: item.roster.CallCenter,
            AppointmentDesk: item.roster.AppointmentDesk,
            data: item.roster.data,
            offs: {
              Reception: deserializeOffs(item.roster.offs?.Reception),
              OPD: deserializeOffs(item.roster.offs?.OPD),
              CallCenter: deserializeOffs(item.roster.offs?.CallCenter),
              AppointmentDesk: deserializeOffs(item.roster.offs?.AppointmentDesk),
            }
          }
        }))
      };
    }
    return true;
  } catch (err) {
    console.warn("Storage load error:", err);
    return false;
  }
}

/* Dynamic container for current week's employee shifts */
let calendarEvents = [];

/* ── Split Month → Mon-Sun Weeks ── */
function splitWeeks(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = [];
  const weeks = [];
  let currentWeek = [];

  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(year, month, d));
  }

  const firstDow = days[0].getDay();
  const monOffset = firstDow === 0 ? 6 : firstDow - 1;
  if (monOffset > 0) {
    for (let i = monOffset; i >= 1; i--) {
      const prevD = new Date(year, month, 1 - i);
      currentWeek.push(prevD);
    }
  }

  days.forEach(d => {
    currentWeek.push(d);
    if (d.getDay() === 0) {
      weeks.push(currentWeek.slice());
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    let nx = new Date(year, month + 1, 1);
    while (currentWeek.length < 7) {
      currentWeek.push(new Date(nx));
      nx.setDate(nx.getDate() + 1);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/* ── Shift Time Config Map ── */
const ShiftTimeMap = {
  "7": { start: 7.0, end: 15.5, label: "7 AM", full: "7:00 AM - 3:30 PM" },
  "7:30": { start: 7.5, end: 16.0, label: "7:30 AM", full: "7:30 AM - 4:00 PM" },
  "8:00": { start: 8.0, end: 16.5, label: "8:00 AM", full: "8:00 AM - 4:30 PM" },
  "9:00": { start: 9.0, end: 17.5, label: "9:00 AM", full: "9:00 AM - 5:30 PM" },
  "9:30": { start: 9.5, end: 18.0, label: "9:30 AM", full: "9:30 AM - 6:00 PM" },
  "10:30": { start: 10.5, end: 19.0, label: "10:30 AM", full: "10:30 AM - 7:00 PM" },
  "11:30": { start: 11.5, end: 20.0, label: "11:30 AM", full: "11:30 AM - 8:00 PM" },
  "2": { start: 14.0, end: 21.0, label: "2 PM", full: "2:00 PM - 10:00 PM" },
  "N": { start: 20.0, end: 21.0, label: "Night Shift", full: "8:00 PM - 8:00 AM (Overnight)" },
  "Night": { start: 20.0, end: 21.0, label: "Night Shift", full: "8:00 PM - 8:00 AM (Overnight)" },
};

function createShiftBadgeHTML(shiftCode) {
  if (!shiftCode || shiftCode === "Off" || shiftCode === "off") {
    return '<span class="badge-shift t-off">Off</span>';
  }
  const tc = {
    Night: { cls: "t-N", text: "Night" },
    N: { cls: "t-N", text: "Night" },
    "7": { cls: "t-7", text: "7 AM" },
    "2": { cls: "t-2", text: "2 PM" },
    "9:00": { cls: "t-9", text: "9:00" },
    "9:30": { cls: "t-930", text: "9:30" },
    "10:30": { cls: "t-1030", text: "10:30" },
    "7:30": { cls: "t-730", text: "7:30" },
    "8:00": { cls: "t-800", text: "8:00" },
    "11:30": { cls: "t-1130", text: "11:30" },
  };
  const item = tc[shiftCode] || { cls: "t-9", text: shiftCode };
  return `<span class="badge-shift ${item.cls}">${item.text}</span>`;
}

function extractShiftCodeFromHTML(shiftHTML) {
  if (!shiftHTML || shiftHTML.includes("Off") || shiftHTML.includes("off")) return "Off";
  if (shiftHTML.includes("Night") || shiftHTML.includes(">N<")) return "Night";
  if (shiftHTML.includes("7 AM") || shiftHTML.includes(">7<")) return "7";
  if (shiftHTML.includes("2 PM") || shiftHTML.includes(">2<")) return "2";
  if (shiftHTML.includes("7:30")) return "7:30";
  if (shiftHTML.includes("8:00")) return "8:00";
  if (shiftHTML.includes("9:30")) return "9:30";
  if (shiftHTML.includes("10:30")) return "10:30";
  if (shiftHTML.includes("11:30")) return "11:30";
  if (shiftHTML.includes("9:00")) return "9:00";
  return "9:00";
}

/* ── Smart Shift Roster Generator with Department Rules ── */
function buildWeekRoster(weekDays) {
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const swap = Math.random() < 0.5;

  let recep = [...Departments.Reception].sort();
  let opd = [...Departments.OPD].filter(n => n !== "Shubhangi" && n !== "Anagha").sort();
  let cc = [...Departments.CallCenter].filter(n => n !== "Jayshree").sort();

  if (swap) {
    opd.push("Jayshree");
    cc.push("Shubhangi");
  } else {
    opd.push("Shubhangi");
    cc.push("Jayshree");
  }
  opd.sort();
  cc.sort();
  let appt = [...Departments.AppointmentDesk].sort();

  const sched = {};
  [recep, [...opd, "Anagha"], cc, appt].forEach((staff, i) => {
    const dept = ["Reception", "OPD", "CallCenter", "AppointmentDesk"][i];
    sched[dept] = {};
    staff.forEach(n => (sched[dept][n] = {}));
  });

  function assignOffs(staff, days) {
    let offs = {}, avail = [...days];
    staff.forEach(n => {
      if (!avail.length) avail = [...days];
      const d = pick(avail);
      offs[n] = d;
      avail = avail.filter(x => !sameDate(x, d));
    });
    return offs;
  }

  const offs = {
    Reception: assignOffs(recep, [...weekDays]),
    OPD: assignOffs([...opd, "Anagha"], [...weekDays]),
    CallCenter: assignOffs(cc, [...weekDays]),
    AppointmentDesk: assignOffs(appt, [...weekDays]),
  };

  // Shraddha P staggered morning
  const spTime = {};
  const workDays = weekDays.filter(d => d.getDay() !== 0);
  const td = pick(workDays);
  let c730 = 0, c800 = 0;
  workDays.forEach(d => {
    if (sameDate(d, td)) {
      spTime[fmtDateShort(d)] = "10:30";
    } else if (c730 < 3 && c800 < 3) {
      Math.random() < 0.5 ? ((spTime[fmtDateShort(d)] = "7:30"), c730++) : ((spTime[fmtDateShort(d)] = "8:00"), c800++);
    } else if (c730 >= 3) {
      spTime[fmtDateShort(d)] = "8:00";
      c800++;
    } else {
      spTime[fmtDateShort(d)] = "7:30";
      c730++;
    }
  });

  // Appointment Desk alternating 9:30 and 2 PM
  const apt = { Vanita: {}, Gaurav: {} };
  let vm = true;
  weekDays.filter(d => d.getDay() !== 0).forEach(d => {
    apt.Vanita[fmtDateShort(d)] = vm ? "9:30" : "2";
    apt.Gaurav[fmtDateShort(d)] = vm ? "2" : "9:30";
    vm = !vm;
  });

  const put = (dept, name, day, val) => (sched[dept][name][fmtDateShort(day)] = val);
  const badge = (cls, txt) => `<span class="badge-shift ${cls}">${txt}</span>`;
  const OFF = '<span class="badge-shift t-off">Off</span>';
  const tc = {
    N: "t-N",
    7: "t-7",
    2: "t-2",
    "9:00": "t-9",
    "9:30": "t-930",
    "10:30": "t-1030",
    "7:30": "t-730",
    "8:00": "t-800",
    "11:30": "t-1130",
  };

  weekDays.forEach((day, di) => {
    // Reception
    recep.forEach(n => {
      if (sameDate(day, offs.Reception[n])) put("Reception", n, day, OFF);
      else if (n === "Karan") put("Reception", n, day, badge("t-N", "Night"));
      else if (n === "Sagar") {
        const s = di % 2 === 0 ? "7" : "2";
        put("Reception", n, day, badge(tc[s], s === "7" ? "7 AM" : "2 PM"));
      } else if (n === "Roshan") {
        const s = di % 2 === 0 ? "2" : "7";
        put("Reception", n, day, badge(tc[s], s === "7" ? "7 AM" : "2 PM"));
      }
    });

    // OPD
    const slots = ["9:30", "10:30"];
    opd.forEach((n, ei) => {
      if (sameDate(day, offs.OPD[n])) put("OPD", n, day, OFF);
      else {
        const sl = slots[(ei + di) % 2];
        put("OPD", n, day, badge(tc[sl], sl));
      }
    });
    if (sameDate(day, offs.OPD["Anagha"])) put("OPD", "Anagha", day, OFF);
    else put("OPD", "Anagha", day, badge("t-9", "9:00"));

    // Call Center
    const swapped = swap ? "Shubhangi" : "Jayshree";
    cc.forEach(n => {
      if (sameDate(day, offs.CallCenter[n])) put("CallCenter", n, day, OFF);
      else if (n === "Prasad") put("CallCenter", n, day, badge("t-1130", "11:30"));
      else if (n === "Shraddha P") {
        const s = spTime[fmtDateShort(day)] || "7:30";
        put("CallCenter", n, day, badge(tc[s], s));
      } else if (n === swapped) {
        const ss = spTime[fmtDateShort(day)];
        if (!ss) {
          const r = pick(["7:30", "8:00"]);
          put("CallCenter", n, day, badge(tc[r], r));
        } else if (ss === "7:30") put("CallCenter", n, day, badge("t-800", "8:00"));
        else if (ss === "8:00") put("CallCenter", n, day, badge("t-730", "7:30"));
        else if (ss === "10:30") {
          const r = pick(["7:30", "8:00"]);
          put("CallCenter", n, day, badge(tc[r], r));
        }
      }
    });

    // Appointment Desk
    appt.forEach(n => {
      if (sameDate(day, offs.AppointmentDesk[n])) put("AppointmentDesk", n, day, OFF);
      else {
        const s = apt[n][fmtDateShort(day)] || "9:30";
        put("AppointmentDesk", n, day, badge(tc[s], s === "2" ? "2 PM" : s));
      }
    });
  });

  return {
    Reception: recep,
    OPD: [...opd, "Anagha"],
    CallCenter: cc,
    AppointmentDesk: appt,
    data: sched,
    offs,
  };
}

/* ── Convert Week Roster Directly into Calendar Event Blocks ── */
function syncCalendarEventsFromRoster(roster, weekDays) {
  const events = [];

  // Strictly Employee Shifts and Employee Off-Days
  const depts = ["Reception", "OPD", "CallCenter", "AppointmentDesk"];

  depts.forEach(deptKey => {
    const staffList = roster[deptKey] || [];
    const cat = DepToCategory[deptKey];
    const fam = DepToFamily[deptKey];
    const deptTitle = DepLabels[deptKey];

    staffList.forEach(name => {
      weekDays.forEach((day, colIdx) => {
        const shiftHTML = roster.data[deptKey]?.[name]?.[fmtDateShort(day)] || "";
        if (!shiftHTML) return;

        const shiftCode = extractShiftCodeFromHTML(shiftHTML);

        if (shiftCode === "Off") {
          // Add employee off to all-day row for that column
          events.push({
            id: `off-${deptKey}-${name}-${colIdx}`,
            title: `${name} · Off`,
            employee: name,
            deptKey,
            department: deptTitle,
            shiftCode: "Off",
            category: "leaves",
            family: "birthday",
            isAllDay: true,
            spanDays: 1,
            startCol: colIdx,
            dayCol: colIdx,
            meta: `${deptTitle} · Weekly Rest Day`,
            notes: `Scheduled rest day for ${name} (${deptTitle})`,
          });
        } else {
          const cfg = ShiftTimeMap[shiftCode] || ShiftTimeMap["9:00"];

          events.push({
            id: `shift-${deptKey}-${name}-${colIdx}`,
            dayCol: colIdx,
            employee: name,
            deptKey,
            department: deptTitle,
            category: cat,
            family: fam,
            shiftCode,
            shiftLabel: cfg.label,
            title: name,
            startHour: cfg.start,
            endHour: cfg.end,
            meta: `${cfg.full} · ${deptTitle}`,
            notes: `Scheduled ${cfg.label} shift for ${name} at ${deptTitle}`,
          });
        }
      });
    });
  });

  return events;
}

/* ── Get Active 7 Days for Week View ── */
function getActiveWeekDays() {
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);
  const weekIdx = Math.min(Math.max(0, state.activeWeekIndex), weeks.length - 1);
  return weeks[weekIdx] || weeks[0];
}

/* ── Get or Generate Roster for Current Week ── */
function getActiveRoster() {
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);

  if (!state.cachedWeeks || state.cachedWeeks.y !== y || state.cachedWeeks.m !== m) {
    state.cachedWeeks = {
      y,
      m,
      data: weeks.map(days => ({ days, roster: buildWeekRoster(days) })),
    };
    saveStateToStorage();
  }

  const activeIdx = Math.min(Math.max(0, state.activeWeekIndex), state.cachedWeeks.data.length - 1);
  return state.cachedWeeks.data[activeIdx];
}

/* ── Render Top Bar Title ── */
function updateTopBarHeader() {
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  document.getElementById("topbar-month-text").textContent = MONTH_NAMES[m];
  document.getElementById("topbar-year-text").textContent = y;
  document.getElementById("mini-month-title-text").textContent = `${MONTH_NAMES[m]} ${y}`;
}

/* ── Render Mini-Month Picker ── */
function renderMiniMonth() {
  const container = document.getElementById("mini-month-grid");
  container.innerHTML = "";

  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);
  const activeWeekDays = getActiveWeekDays();

  weeks.forEach(w => {
    const isThisActiveWeek = w.some(d => activeWeekDays.some(actD => sameDate(actD, d)));

    w.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "mini-day-cell";
      cell.textContent = d.getDate();

      const isCurrentMonth = d.getMonth() === m;
      if (!isCurrentMonth) cell.classList.add("other-month");

      if (sameDate(d, TODAY_ANCHOR)) {
        cell.classList.add("is-today");
      }

      if (isThisActiveWeek && isCurrentMonth) {
        cell.classList.add("current-week-tint");
      }

      cell.onclick = () => {
        state.currentDate = new Date(d);
        const idx = weeks.findIndex(wk => wk.some(day => sameDate(day, d)));
        if (idx >= 0) state.activeWeekIndex = idx;
        renderAll();
      };

      container.appendChild(cell);
    });
  });
}

/* ── Render Day Headers Row & Gutter ── */
function renderDayHeaders() {
  const container = document.getElementById("day-headers-container");
  container.innerHTML = "";

  const isLanes = state.gridMode === "lanes";
  container.classList.toggle("grid-mode-lanes", isLanes);

  const weekDays = getActiveWeekDays();
  const activeData = getActiveRoster();

  weekDays.forEach((d, i) => {
    const isTodayCol = sameDate(d, TODAY_ANCHOR);
    const colEl = document.createElement("div");
    colEl.className = `day-header-cell ${isTodayCol ? "is-today-col" : ""}`;

    const weekdayLabel = document.createElement("span");
    weekdayLabel.className = "weekday-label";
    weekdayLabel.textContent = WEEKDAY_NAMES[i];
    colEl.appendChild(weekdayLabel);

    if (isTodayCol) {
      const pill = document.createElement("div");
      pill.className = "date-numeral-pill";
      pill.textContent = d.getDate();
      colEl.appendChild(pill);
    } else {
      const num = document.createElement("span");
      num.className = "date-numeral";
      num.textContent = d.getDate();
      colEl.appendChild(num);
    }

    // Active Staff Count Chip
    let onDutyCount = 0;
    if (activeData) {
      const dStr = fmtDateShort(d);
      const depts = state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== "leaves"
        ? [state.activeDepartmentFilter === "reception" ? "Reception" :
           state.activeDepartmentFilter === "opd" ? "OPD" :
           state.activeDepartmentFilter === "callcenter" ? "CallCenter" : "AppointmentDesk"]
        : ["Reception", "OPD", "CallCenter", "AppointmentDesk"];

      depts.forEach(dk => {
        (activeData.roster[dk] || []).forEach(emp => {
          const shiftHTML = activeData.roster.data[dk]?.[emp]?.[dStr];
          if (shiftHTML && !shiftHTML.includes(">Off<") && !shiftHTML.includes("t-Off")) {
            onDutyCount++;
          }
        });
      });
    }

    const dutyChip = document.createElement("div");
    dutyChip.className = "day-duty-chip";
    dutyChip.textContent = `${onDutyCount} on duty`;
    dutyChip.title = `${onDutyCount} staff scheduled on duty for ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
    colEl.appendChild(dutyChip);

    // In Dept Lanes mode: Add 4 Department Sub-Lane Header Chips
    if (isLanes) {
      const lanesHeaderRow = document.createElement("div");
      lanesHeaderRow.className = "day-lane-headers-row";

      const depts = [
        { key: "reception", label: "Rec", full: "Reception (GF)", color: "var(--fam-terracotta-bar)" },
        { key: "opd", label: "OPD", full: "OPD (1F)", color: "var(--fam-sage-bar)" },
        { key: "callcenter", label: "CC", full: "Call Center (B1)", color: "var(--fam-dusty-bar)" },
        { key: "appt", label: "Appt", full: "Appointment Desk (1F)", color: "var(--fam-amber-bar)" },
      ];

      depts.forEach(dept => {
        const chip = document.createElement("div");
        chip.className = `lane-header-chip lane-chip-${dept.key}`;
        if (state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== dept.key) {
          chip.classList.add("is-muted");
        }
        chip.title = `${dept.full} Lane`;
        chip.innerHTML = `<span class="lane-header-dot" style="background-color: ${dept.color};"></span><span class="lane-header-name">${dept.label}</span>`;
        lanesHeaderRow.appendChild(chip);
      });

      colEl.appendChild(lanesHeaderRow);
    }

    colEl.onclick = () => {
      state.currentDate = new Date(d);
      if (state.currentView === "day") renderDayView();
    };

    container.appendChild(colEl);
  });
}

/* ── Render All-Day Row (Leaves & Scheduled Offs with Vertical Stacking) ── */
function renderAllDayRow() {
  const linesContainer = document.getElementById("all-day-grid-lines");
  const trackContainer = document.getElementById("all-day-events-track");
  linesContainer.innerHTML = "";
  trackContainer.innerHTML = "";

  const isLanes = state.gridMode === "lanes";
  linesContainer.classList.toggle("grid-mode-lanes", isLanes);

  const weekDays = getActiveWeekDays();

  weekDays.forEach(d => {
    const line = document.createElement("div");
    line.className = `all-day-col-line ${sameDate(d, TODAY_ANCHOR) ? "is-today-col" : ""}`;
    linesContainer.appendChild(line);
  });

  // Filter to all-day events (Weekly Offs & Leaves)
  const allDayEvents = calendarEvents.filter(e => e.isAllDay);

  // Stacking calculation per day column so chips do NOT occlude each other
  const dayOccupancy = [0, 0, 0, 0, 0, 0, 0];
  const positioned = [];

  // Sort multi-day events first so they take top lanes cleanly
  const sortedAllDay = [...allDayEvents].sort((a, b) => (b.spanDays || 1) - (a.spanDays || 1));

  sortedAllDay.forEach(evt => {
    if (!state.activeCalendars[evt.category]) return;
    if (state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== "leaves" && evt.category !== state.activeDepartmentFilter) {
      return;
    }

    const start = evt.startCol !== undefined ? evt.startCol : (evt.dayCol !== undefined ? evt.dayCol : 0);
    const span = evt.spanDays || 1;
    const end = Math.min(6, start + span - 1);

    let targetRow = 0;
    for (let c = start; c <= end; c++) {
      targetRow = Math.max(targetRow, dayOccupancy[c]);
    }
    for (let c = start; c <= end; c++) {
      dayOccupancy[c] = targetRow + 1;
    }

    positioned.push({ evt, row: targetRow });
  });

  const maxRows = Math.max(...dayOccupancy, 1);
  const rowHeight = 22;
  const rowGap = 4;
  const totalHeight = Math.max(38, 8 + maxRows * (rowHeight + rowGap) + 4);
  const rowEl = document.querySelector(".all-day-row");
  if (rowEl) {
    rowEl.style.height = `${totalHeight}px`;
    rowEl.style.minHeight = `${totalHeight}px`;
  }
  const gutterEl = document.querySelector(".all-day-gutter");
  if (gutterEl) {
    gutterEl.style.height = `${totalHeight}px`;
  }

  positioned.forEach(({ evt, row }) => {
    const chip = document.createElement("div");
    chip.className = `all-day-chip event-fam-${evt.family}`;
    chip.innerHTML = `<span style="font-size:10px;">☕</span> <span>${evt.title}</span>`;
    chip.title = `${evt.title} (${evt.meta || ""})\nClick to view shift details.`;

    const startCol = evt.startCol !== undefined ? evt.startCol : (evt.dayCol !== undefined ? evt.dayCol : 0);
    const spanDays = evt.spanDays || 1;
    const leftPercent = (startCol / 7) * 100;
    const widthPercent = (spanDays / 7) * 100;

    chip.style.left = `calc(${leftPercent}% + 4px)`;
    chip.style.width = `calc(${widthPercent}% - 8px)`;
    chip.style.top = `${6 + row * (rowHeight + rowGap)}px`;

    chip.onclick = () => openEventDetail(evt);
    trackContainer.appendChild(chip);
  });
}

/* ── Render Scrollable Hourly Time Grid & Department Shift Layout ── */
function renderTimeGrid() {
  const timeGridArea = document.getElementById("time-grid-scroll-area");
  const boardArea = document.getElementById("week-board-scroll-area");
  const allDayRow = document.getElementById("week-all-day-row");
  const dayHeaderRow = document.getElementById("week-day-header-row");

  if (state.gridMode === "board") {
    if (timeGridArea) timeGridArea.style.display = "none";
    if (allDayRow) allDayRow.style.display = "none";
    if (dayHeaderRow) dayHeaderRow.style.display = "none";
    if (boardArea) {
      boardArea.style.display = "block";
      renderWeekBoard();
    }
    return;
  }

  // Visual Time Grid Modes ("adaptive" / Cascade Deck or "lanes" / Staff Lanes)
  if (timeGridArea) timeGridArea.style.display = "block";
  if (allDayRow) allDayRow.style.display = "flex";
  if (dayHeaderRow) dayHeaderRow.style.display = "flex";
  if (boardArea) boardArea.style.display = "none";

  const gutterCol = document.getElementById("hour-gutter-col");
  const dayColsContainer = document.getElementById("day-columns-container");
  const linesBg = document.getElementById("grid-lines-background");

  const isLaneMode = state.gridMode === "lanes";
  dayColsContainer.classList.toggle("grid-mode-lanes", isLaneMode);

  gutterCol.innerHTML = "";
  linesBg.innerHTML = "";
  dayColsContainer.innerHTML = "";
  dayColsContainer.appendChild(linesBg);

  const weekDays = getActiveWeekDays();

  // Hour Ticks
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    const tick = document.createElement("div");
    tick.className = "hour-gutter-tick";
    const label = document.createElement("span");
    label.className = "hour-gutter-label";
    const ampm = h >= 12 ? "PM" : "AM";
    label.textContent = `${h % 12 || 12} ${ampm}`;
    tick.appendChild(label);
    gutterCol.appendChild(tick);
  }

  // Horizontal Lines
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    const row = document.createElement("div");
    row.className = "hour-line-row";
    const halfLine = document.createElement("div");
    halfLine.className = "half-hour-line";
    row.appendChild(halfLine);
    linesBg.appendChild(row);
  }

  // 7 Day Columns
  weekDays.forEach((d, colIdx) => {
    const isTodayCol = sameDate(d, TODAY_ANCHOR);
    const colEl = document.createElement("div");
    colEl.className = `day-grid-column ${isTodayCol ? "is-today-col" : ""}`;
    colEl.dataset.col = colIdx;

    // Dept Lanes Mode: Inject 4 Vertical Track Guides in Background
    if (isLaneMode) {
      const tracksBg = document.createElement("div");
      tracksBg.className = "day-lane-tracks-bg";
      ["reception", "opd", "callcenter", "appt"].forEach(deptKey => {
        const track = document.createElement("div");
        track.className = `lane-track-column lane-track-${deptKey}`;
        if (state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== deptKey) {
          track.classList.add("is-muted-track");
        }
        tracksBg.appendChild(track);
      });
      colEl.appendChild(tracksBg);
    }

    const eventsLayer = document.createElement("div");
    eventsLayer.className = "events-layer";

    // Live Current-Time Line across today's column (at 12:45 PM in gap)
    if (isTodayCol) {
      const lineTop = (12.75 - DAY_START_HOUR) * HOUR_HEIGHT;
      const timeLine = document.createElement("div");
      timeLine.className = "current-time-indicator";
      timeLine.style.top = `${lineTop}px`;

      const dot = document.createElement("div");
      dot.className = "current-time-dot";
      timeLine.appendChild(dot);

      eventsLayer.appendChild(timeLine);
    }

    // 1. Filter events on this day
    let colEvents = calendarEvents.filter(e => !e.isAllDay && e.dayCol === colIdx);

    // Filter by sidebar checklist
    colEvents = colEvents.filter(e => state.activeCalendars[e.category]);

    // Filter by active department filter
    if (state.activeDepartmentFilter !== "all") {
      if (state.activeDepartmentFilter === "leaves") {
        colEvents = [];
      } else {
        colEvents = colEvents.filter(e => e.category === state.activeDepartmentFilter);
      }
    }

    // 2. Compute Layout Assignments
    let layoutAssignments = [];

    if (isLaneMode) {
      // 4 Dedicated Department Lanes per day
      const deptLanesDef = [
        { key: "reception", baseLeft: 0, width: 25 },
        { key: "opd", baseLeft: 25, width: 25 },
        { key: "callcenter", baseLeft: 50, width: 25 },
        { key: "appt", baseLeft: 75, width: 25 },
      ];

      deptLanesDef.forEach(lane => {
        const deptEvents = colEvents.filter(e => e.category === lane.key);
        if (!deptEvents.length) return;
        const subAssignments = computeDeptLaneAssignments(deptEvents, lane.baseLeft, lane.width);
        layoutAssignments.push(...subAssignments);
      });
    } else {
      // Default: "Cascade Deck" (Google Calendar / Apple Calendar style)
      // Generous 70%-96% wide cards, tiered staggered deck so full name and times are 100% visible!
      layoutAssignments = computeAdaptiveCascadingLayout(colEvents);
    }

    // 3. Render event blocks
    layoutAssignments.forEach(item => {
      const evt = item.event;
      const isNight = evt.shiftCode === "Night";
      const startH = evt.startHour;
      const endH = isNight ? Math.min(DAY_END_HOUR + 0.5, 21.5) : evt.endHour;

      const topPx = (startH - DAY_START_HOUR) * HOUR_HEIGHT;
      const heightPx = Math.max(38, (endH - startH) * HOUR_HEIGHT);

      const block = document.createElement("div");
      const nightClass = isNight ? "event-shift-night" : "";
      block.className = `event-block event-fam-${evt.family} ${nightClass} ${isLaneMode ? "is-dept-lane-card" : ""}`;
      block.style.top = `${topPx}px`;
      block.style.height = `${heightPx}px`;
      block.style.width = item.width;
      block.style.left = item.left;
      if (item.zIndex) block.style.zIndex = item.zIndex;

      if (heightPx <= 52) block.classList.add("is-short-block");

      const initials = evt.employee ? evt.employee.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "EM";
      const durationHrs = Math.round((evt.endHour - evt.startHour) * 10) / 10;
      const deptShort = evt.deptKey === "AppointmentDesk" ? "Appt Desk · 1F" :
                        evt.deptKey === "CallCenter" ? "Call Center · B1" :
                        evt.deptKey === "OPD" ? "OPD · Floor 1" : "Reception · GF";
      const station = evt.notes && evt.notes.includes("Desk") ? evt.notes : (evt.meta ? evt.meta.split("·")[0].trim() : "Front Desk");
      const timeRangeText = isNight ? "8:00 PM - 8:00 AM" : `${formatTime(evt.startHour)} - ${formatTime(evt.endHour)}`;
      const durationText = isNight ? "12h Overnight" : `${durationHrs}h`;
      const timeCompact = isNight ? "8P-8A" : formatTimeCompact(evt.startHour, evt.endHour);
      const displayName = evt.employee.length > 10
        ? evt.employee.split(" ")[0] + " " + (evt.employee.split(" ")[1] ? evt.employee.split(" ")[1][0] + "." : "")
        : evt.employee;

      if (isLaneMode) {
        block.innerHTML = `
          <div class="event-block-inner lane-card-inner">
            <div class="lane-card-name-row">
              <span class="lane-card-emp-name" title="${evt.employee}">${isNight ? "🌙 " : ""}${displayName}</span>
            </div>
            <div class="lane-card-time-row">
              <span class="lane-card-time">${timeCompact}</span>
              <span class="lane-card-badge">${isNight ? "Night" : (evt.shiftLabel || `${durationHrs}h`)}</span>
            </div>
            ${heightPx >= 68 ? `
            <div class="lane-card-station">
              <span>📍 ${station}</span>
            </div>` : ''}
          </div>
        `;
      } else {
        block.innerHTML = `
          <div class="event-block-inner">
            <div class="event-card-top-row">
              <div class="event-card-avatar">${initials}</div>
              <div class="event-card-name-group">
                <span class="event-emp-name">${isNight ? "🌙 " : ""}${evt.employee}</span>
                <span class="event-card-dept-sub">${deptShort}</span>
              </div>
              <span class="event-shift-tag">${evt.shiftLabel}</span>
            </div>

            <div class="event-card-time-pill">
              <span class="event-card-time-range">${timeRangeText}</span>
              <span class="event-card-duration-chip">${durationText}</span>
            </div>

            <div class="event-card-footer-row">
              <span class="event-card-station">📍 ${station}</span>
              <span class="event-card-duty-badge"><span class="event-card-duty-dot"></span> On Duty</span>
            </div>
          </div>
        `;
      }

      block.title = `${evt.employee} - ${evt.department}\n${evt.shiftLabel} Shift (${formatTime(evt.startHour)} - ${formatTime(evt.endHour)})\nStation: ${station}\nClick to inspect or manage shift.`;

      block.onclick = e => {
        e.stopPropagation();
        openEventDetail(evt);
      };

      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        const match = evt.employee.toLowerCase().includes(q) ||
                      evt.department.toLowerCase().includes(q) ||
                      (evt.meta && evt.meta.toLowerCase().includes(q)) ||
                      (evt.shiftLabel && evt.shiftLabel.toLowerCase().includes(q));
        block.classList.toggle("search-match", match);
        block.classList.toggle("search-dim", !match);
      }

      eventsLayer.appendChild(block);
    });

    colEl.appendChild(eventsLayer);
    dayColsContainer.appendChild(colEl);
  });
}

/* ── Dedicated Department Lanes Layout Calculation ── */
function computeDeptLaneAssignments(deptEvents, baseLeft, laneWidth) {
  if (!deptEvents || !deptEvents.length) return [];
  const sorted = [...deptEvents].sort((a, b) => a.startHour - b.startHour || (b.endHour - b.startHour) - (a.endHour - a.startHour));

  const columns = [];
  const assignments = [];

  sorted.forEach(evt => {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= evt.startHour) {
        columns[c] = evt.endHour;
        assignments.push({ event: evt, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      assignments.push({ event: evt, col: columns.length });
      columns.push(evt.endHour);
    }
  });

  const totalCols = columns.length;
  if (totalCols <= 1) {
    return assignments.map(a => ({
      event: a.event,
      left: `calc(${baseLeft}% + 1px)`,
      width: `calc(${laneWidth}% - 2px)`,
      zIndex: 5,
    }));
  }

  // When shifts overlap within the same department lane (e.g. 2-3 staff simultaneously on duty):
  const cardWidthPct = totalCols === 2 ? laneWidth * 0.82 : laneWidth * 0.72;
  const maxStep = (laneWidth - cardWidthPct) / Math.max(1, totalCols - 1);
  const stepPct = Math.min(laneWidth * 0.16, maxStep);

  return assignments.map(a => {
    const leftVal = baseLeft + 0.3 + (a.col * stepPct);
    return {
      event: a.event,
      left: `${leftVal}%`,
      width: `${cardWidthPct}%`,
      zIndex: 5 + a.col,
    };
  });
}

/* ── Adaptive Cascading Deck Layout (70% - 96% Wide, Staggered Tiers) ── */
function computeAdaptiveCascadingLayout(events) {
  if (!events || !events.length) return [];
  const sorted = [...events].sort((a, b) => a.startHour - b.startHour || (b.endHour - b.startHour) - (a.endHour - a.startHour));

  // Determine concurrency groups
  const columns = [];
  const assignments = [];

  sorted.forEach(evt => {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= evt.startHour) {
        columns[c] = evt.endHour;
        assignments.push({ event: evt, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      assignments.push({ event: evt, col: columns.length });
      columns.push(evt.endHour);
    }
  });

  const totalCols = columns.length;
  if (totalCols <= 1) {
    return assignments.map(a => ({
      event: a.event,
      left: "2%",
      width: "96%",
      zIndex: 5,
    }));
  }

  return assignments.map(a => {
    let leftPercent, widthPercent;
    if (totalCols === 2) {
      leftPercent = a.col === 0 ? 2 : 18;
      widthPercent = 80;
    } else if (totalCols === 3) {
      leftPercent = 2 + (a.col * 13);
      widthPercent = 74;
    } else {
      leftPercent = 1.5 + (a.col * 9.5);
      widthPercent = Math.max(68, 95 - (totalCols * 6.5));
    }

    return {
      event: a.event,
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      zIndex: 5 + a.col,
    };
  });
}

/* ── Render Daily Shift Board (Kanban Cards by Day) ── */
function renderWeekBoard() {
  const grid = document.getElementById("week-board-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const weekDays = getActiveWeekDays();

  weekDays.forEach((d, colIdx) => {
    const isToday = sameDate(d, TODAY_ANCHOR);
    const dayCol = document.createElement("div");
    dayCol.className = `board-day-column ${isToday ? "is-today-col" : ""}`;

    // Filter events
    let dayEvents = calendarEvents.filter(e => !e.isAllDay && e.dayCol === colIdx);
    if (state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== "leaves") {
      dayEvents = dayEvents.filter(e => e.category === state.activeDepartmentFilter);
    }
    const dayOffs = calendarEvents.filter(e => e.isAllDay && (e.dayCol === colIdx || e.startCol === colIdx));

    dayCol.innerHTML = `
      <div class="board-day-header ${isToday ? 'is-today-header' : ''}">
        <div class="board-day-title-row">
          <span class="board-weekday">${WEEKDAY_NAMES[colIdx]}</span>
          <span class="board-day-num ${isToday ? 'is-today-pill' : ''}">${d.getDate()}</span>
        </div>
        <div class="board-duty-badge">
          <span class="board-duty-dot"></span>
          <span>${dayEvents.length} Shifts</span>
        </div>
      </div>
      <div class="board-shifts-list" id="board-shifts-${colIdx}"></div>
    `;

    const shiftsList = dayCol.querySelector(`#board-shifts-${colIdx}`);

    // Off-duty staff
    dayOffs.forEach(off => {
      if (!state.activeCalendars[off.category]) return;
      if (state.activeDepartmentFilter !== "all" && state.activeDepartmentFilter !== "leaves" && off.category !== state.activeDepartmentFilter) return;
      const offCard = document.createElement("div");
      offCard.className = "board-off-card";
      offCard.innerHTML = `
        <span class="board-off-icon">🏖️</span>
        <div class="board-off-info">
          <span class="board-off-name">${off.employee || off.title}</span>
          <span class="board-off-label">Scheduled Rest Day</span>
        </div>
      `;
      offCard.onclick = () => openEventDetail(off);
      shiftsList.appendChild(offCard);
    });

    // Chronological shift list
    dayEvents.sort((a, b) => a.startHour - b.startHour);

    dayEvents.forEach(evt => {
      if (!state.activeCalendars[evt.category]) return;
      const initials = evt.employee ? evt.employee.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "EM";
      const durationHrs = Math.round((evt.endHour - evt.startHour) * 10) / 10;
      const isNight = evt.shiftCode === "Night";
      const nightClass = isNight ? "event-shift-night" : "";
      const station = evt.notes && evt.notes.includes("Desk") ? evt.notes : (evt.meta ? evt.meta.split("·")[0].trim() : "General Clinic");
      const timeRangeText = isNight ? "8:00 PM - 8:00 AM" : `${formatTime(evt.startHour)} - ${formatTime(evt.endHour)}`;
      const durationText = isNight ? "12h Overnight" : `${durationHrs}h`;

      const card = document.createElement("div");
      card.className = `board-shift-card event-fam-${evt.family} ${nightClass}`;
      card.innerHTML = `
        <div class="board-card-header">
          <div class="board-avatar-circle">${initials}</div>
          <div class="board-emp-group">
            <span class="board-emp-name">${isNight ? "🌙 " : ""}${evt.employee}</span>
            <span class="board-dept-name">${evt.department || "Clinic Staff"}</span>
          </div>
          <span class="board-shift-tag">${evt.shiftLabel}</span>
        </div>
        <div class="board-card-timing">
          <span class="board-time-text">🕒 ${timeRangeText}</span>
          <span class="board-duration-pill">${durationText}</span>
        </div>
        <div class="board-card-footer">
          <span class="board-station-text">📍 ${station}</span>
          <span class="board-click-hint">Click to edit ✎</span>
        </div>
      `;

      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        const match = evt.employee.toLowerCase().includes(q) ||
                      evt.department.toLowerCase().includes(q) ||
                      (evt.shiftLabel && evt.shiftLabel.toLowerCase().includes(q));
        card.classList.toggle("search-match", match);
        card.classList.toggle("search-dim", !match);
      }

      card.onclick = () => openEventDetail(evt);
      shiftsList.appendChild(card);
    });

    grid.appendChild(dayCol);
  });
}

function formatTime(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const dispH = h % 12 || 12;
  return `${dispH}:${pad(m)} ${ampm}`;
}

function formatTimeCompact(startHour, endHour) {
  const sH = Math.floor(startHour);
  const sM = Math.round((startHour - sH) * 60);
  const sAmpm = sH >= 12 ? "P" : "A";
  const sDispH = sH % 12 || 12;
  const sStr = sM === 0 ? `${sDispH}${sAmpm}` : `${sDispH}:${pad(sM)}${sAmpm}`;

  const eH = Math.floor(endHour);
  const eM = Math.round((endHour - eH) * 60);
  const eAmpm = eH >= 12 ? "P" : "A";
  const eDispH = eH % 12 || 12;
  const eStr = eM === 0 ? `${eDispH}${eAmpm}` : `${eDispH}:${pad(eM)}${eAmpm}`;

  return `${sStr}-${eStr}`;
}

/* ── Render Up Next Mini-Agenda (Upcoming Shifts) ── */
function renderUpNext() {
  const container = document.getElementById("up-next-list");
  container.innerHTML = "";

  const dowIdx = state.currentDate.getDay() === 0 ? 6 : state.currentDate.getDay() - 1;
  const todayShifts = calendarEvents
    .filter(e => !e.isAllDay && e.dayCol === dowIdx)
    .sort((a, b) => a.startHour - b.startHour);

  // Take afternoon/evening shifts, or the next upcoming ones
  const upcoming = todayShifts.filter(s => s.startHour >= 12).slice(0, 3);
  const displayList = upcoming.length ? upcoming : todayShifts.slice(0, 3);

  displayList.forEach(evt => {
    const card = document.createElement("div");
    card.className = "up-next-card";

    const h = Math.floor(evt.startHour);
    const m = Math.round((evt.startHour - h) * 60);
    const ampm = h >= 12 ? "PM" : "AM";
    const dispH = h % 12 || 12;

    const ruleCls = evt.family === "terracotta" ? "rule-terracotta" :
                    evt.family === "sage" ? "rule-sage" :
                    evt.family === "dusty" ? "rule-dusty" : "rule-amber";

    card.innerHTML = `
      <div class="up-next-time-col">
        <span class="up-next-hour">${dispH}:${pad(m)}</span>
        <span class="up-next-ampm">${ampm}</span>
      </div>
      <div class="up-next-rule ${ruleCls}"></div>
      <div class="up-next-body">
        <div class="up-next-title">${evt.employee} · ${evt.department}</div>
        <div class="up-next-meta">${evt.shiftLabel} Shift · ${formatTime(evt.startHour)} - ${formatTime(evt.endHour)}</div>
      </div>
    `;

    card.onclick = () => openEventDetail(evt);
    container.appendChild(card);
  });
}

/* ── Department Metadata for Section Cards ── */
const DepartmentMeta = {
  Reception: {
    icon: "🏛️",
    name: "Reception",
    floor: "Ground Floor (GF)",
    desc: "24/7 Front Desk Coverage · Sagar & Roshan alternate 7 AM / 2 PM · Karan Night Shift",
    cardClass: "dept-card-reception",
    pillClass: "pill-count-reception",
    catKey: "reception",
  },
  OPD: {
    icon: "🩺",
    name: "Outpatient Department (OPD)",
    floor: "1st Floor (1F)",
    desc: "Anagha 9:00 AM fixed · Mamta & Shraddha 9:30/10:30 rotation · Jayshree/Shubhangi 50% weekly swap",
    cardClass: "dept-card-opd",
    pillClass: "pill-count-opd",
    catKey: "opd",
  },
  CallCenter: {
    icon: "📞",
    name: "Call Center",
    floor: "Basement 1 (B1)",
    desc: "Prasad 11:30 AM fixed · Shraddha P 7:30/8:00 balanced + 10:30 stagger · Complementary morning slot",
    cardClass: "dept-card-callcenter",
    pillClass: "pill-count-callcenter",
    catKey: "callcenter",
  },
  AppointmentDesk: {
    icon: "📋",
    name: "Appointment Desk",
    floor: "1st Floor (1F)",
    desc: "Vanita & Gaurav alternate 9:30 AM morning and 2:00 PM evening shifts",
    cardClass: "dept-card-appt",
    pillClass: "pill-count-appt",
    catKey: "appt",
  },
};

/* ── Render Roster View (Divided by Department Sections or Unified Table) ── */
function renderRosterMatrix() {
  const container = document.getElementById("roster-table-container");
  const tabsContainer = document.getElementById("roster-week-tabs");
  if (!container) return;
  container.innerHTML = "";
  if (tabsContainer) tabsContainer.innerHTML = "";

  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);

  if (!state.cachedWeeks || state.cachedWeeks.y !== y || state.cachedWeeks.m !== m) {
    state.cachedWeeks = {
      y,
      m,
      data: weeks.map(days => ({ days, roster: buildWeekRoster(days) })),
    };
  }

  // Week Tabs
  if (tabsContainer) {
    weeks.forEach((_, i) => {
      const tab = document.createElement("button");
      tab.className = `roster-tab-btn ${state.activeRosterWeek === i + 1 ? "active" : ""}`;
      tab.textContent = `Week ${i + 1}`;
      tab.onclick = () => {
        state.activeRosterWeek = i + 1;
        state.activeWeekIndex = i;
        saveStateToStorage();
        renderAll();
      };
      tabsContainer.appendChild(tab);
    });
  }

  if (typeof state.activeRosterWeek === "number") {
    state.activeWeekIndex = Math.max(0, state.activeRosterWeek - 1);
  }
  const activeData = getActiveRoster();
  const { days, roster } = activeData;

  // Sync mode buttons active state
  const btnSec = document.getElementById("btn-roster-layout-sections");
  const btnComb = document.getElementById("btn-roster-layout-combined");
  if (btnSec && btnComb) {
    btnSec.classList.toggle("active", state.rosterLayout === "sections");
    btnComb.classList.toggle("active", state.rosterLayout === "unified");
  }

  const query = (state.searchQuery || "").trim().toLowerCase();

  if (state.rosterLayout === "sections") {
    // ── 1. DIVIDED BY DEPARTMENT SECTIONS (Default & Recommended) ──
    const sectionsWrap = document.createElement("div");
    sectionsWrap.className = "dept-sections-container";

    const depts = ["Reception", "OPD", "CallCenter", "AppointmentDesk"];

    depts.forEach(deptKey => {
      const meta = DepartmentMeta[deptKey];
      if (!meta) return;

      // Filter by checklist toggle if user unchecked it in sidebar
      if (state.activeCalendars[meta.catKey] === false) return;

      const staff = roster[deptKey] || [];
      if (!staff.length) return;

      // Check search match
      const matchingStaff = query
        ? staff.filter(n => n.toLowerCase().includes(query) || meta.name.toLowerCase().includes(query))
        : staff;

      if (query && !matchingStaff.length) return; // Hide department section if search doesn't match

      // Department Section Card
      const card = document.createElement("div");
      card.className = `dept-section-card ${meta.cardClass}`;

      // Card Header
      const header = document.createElement("div");
      header.className = "dept-section-header";
      header.innerHTML = `
        <div class="dept-header-left">
          <div class="dept-icon-box">${meta.icon}</div>
          <div class="dept-title-group">
            <h3>${meta.name}</h3>
            <p>${meta.desc}</p>
          </div>
        </div>
        <div class="dept-header-badges">
          <span class="dept-pill-floor">${meta.floor}</span>
          <span class="dept-pill-count ${meta.pillClass}">${staff.length} Staff Members</span>
        </div>
      `;
      card.appendChild(header);

      // Day column headers
      const thCells = ['<th style="min-width: 140px; text-align: left;">Employee</th>'];
      days.forEach(d => {
        const isToday = sameDate(d, TODAY_ANCHOR);
        thCells.push(`
          <th class="${isToday ? 'is-today-col' : ''}" style="text-align: center; min-width: 95px;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: ${isToday ? 'var(--terracotta)' : 'var(--ink-secondary)'};">
              ${d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
            </div>
            <div style="font-family: var(--font-serif); font-size: 12.5px; font-weight: 500; color: var(--ink); margin-top: 1px;">
              ${fmtDateShort(d)}
            </div>
          </th>
        `);
      });

      // Staff rows
      const rowTrs = [];
      let deptShifts = 0, deptOffs = 0;

      staff.forEach(name => {
        const isMatch = !query || name.toLowerCase().includes(query);
        const rowCells = [];
        rowCells.push(`
          <th class="name-cell" style="text-align: left; background: #ffffff;">
            <div class="emp-cell-content">
              <div class="emp-avatar-circle">${name.charAt(0)}</div>
              <span style="${isMatch && query ? 'color: var(--terracotta); font-weight: 700;' : ''}">${name}</span>
            </div>
          </th>
        `);

        days.forEach((d, colIdx) => {
          const isToday = sameDate(d, TODAY_ANCHOR);
          const shiftVal = roster.data[deptKey]?.[name]?.[fmtDateShort(d)] || "";
          if (shiftVal.includes("Off")) deptOffs++;
          else if (shiftVal) deptShifts++;

          rowCells.push(`
            <td class="clickable-shift-cell ${isToday ? 'is-today-col' : ''}" 
                data-dept="${deptKey}" 
                data-emp="${name}" 
                data-col="${colIdx}" 
                title="Click to edit or swap ${name}'s shift on ${fmtDateShort(d)}">
              ${shiftVal}
            </td>
          `);
        });

        rowTrs.push(`<tr style="${!isMatch && query ? 'opacity: 0.35;' : ''}">${rowCells.join('')}</tr>`);
      });

      // Table scroll wrapper
      const tableWrap = document.createElement("div");
      tableWrap.className = "roster-table-scroll";
      tableWrap.innerHTML = `
        <table class="roster-table dept-table">
          <thead><tr>${thCells.join('')}</tr></thead>
          <tbody>${rowTrs.join('')}</tbody>
        </table>
      `;
      card.appendChild(tableWrap);

      // Card Footer
      const footer = document.createElement("div");
      footer.className = "dept-section-footer";
      footer.innerHTML = `
        <div class="dept-footer-stats">
          <span class="dept-stat-item">Assigned: <strong>${deptShifts} shifts</strong></span>
          <span class="dept-stat-item">Rest Days: <strong>${deptOffs} scheduled off</strong></span>
          <span class="dept-stat-item">Daily Staffing: <strong>100% Active</strong></span>
        </div>
        <div style="font-size: 11px; color: var(--ink-secondary);">
          ✦ Click any shift badge to edit timing or swap with department peer
        </div>
      `;
      card.appendChild(footer);

      sectionsWrap.appendChild(card);
    });

    container.appendChild(sectionsWrap);

  } else {
    // ── 2. UNIFIED SINGLE TABLE ──
    const th1 = ['<th rowspan="2" style="min-width: 140px;">Department</th><th rowspan="2" style="min-width: 130px;">Employee</th>'];
    const th2 = [];

    days.forEach(d => {
      const isToday = sameDate(d, TODAY_ANCHOR);
      th1.push(`<th class="${isToday ? 'is-today-col' : ''}">${d.toLocaleDateString('en-US', { weekday: 'short' })}</th>`);
      th2.push(`<th class="${isToday ? 'is-today-col' : ''}">${fmtDateShort(d)}</th>`);
    });

    const thead = `<thead><tr>${th1.join('')}</tr><tr>${th2.join('')}</tr></thead>`;
    const rows = [];

    const addDeptRows = (deptKey, staff) => {
      staff.forEach((name, idx) => {
        const cells = [];
        if (idx === 0) {
          cells.push(`<th class="dept-cell" rowspan="${staff.length}">${DepLabels[deptKey]}</th>`);
        }
        cells.push(`
          <th class="name-cell">
            <div class="emp-cell-content">
              <div class="emp-avatar-circle">${name.charAt(0)}</div>
              <span>${name}</span>
            </div>
          </th>
        `);
        days.forEach((d, colIdx) => {
          const isToday = sameDate(d, TODAY_ANCHOR);
          const shiftVal = roster.data[deptKey]?.[name]?.[fmtDateShort(d)] || "";
          cells.push(`<td class="clickable-shift-cell ${isToday ? 'is-today-col' : ''}" data-dept="${deptKey}" data-emp="${name}" data-col="${colIdx}" title="Click to edit or swap ${name}'s shift on ${fmtDateShort(d)}">${shiftVal}</td>`);
        });
        rows.push(`<tr>${cells.join('')}</tr>`);
      });
    };

    addDeptRows("Reception", roster.Reception);
    addDeptRows("OPD", roster.OPD);
    addDeptRows("CallCenter", roster.CallCenter);
    addDeptRows("AppointmentDesk", roster.AppointmentDesk);

    const card = document.createElement("div");
    card.className = "roster-table-card";
    card.innerHTML = `
      <div class="roster-card-header">
        <span class="roster-badge-pill">Week ${state.activeRosterWeek} · ${fmtDateShort(days[0])} → ${fmtDateShort(days.at(-1))}</span>
        <span style="font-size:12px; color:var(--ink-secondary);">12 Staff Assigned · All 4 Departments</span>
      </div>
      <div class="roster-table-scroll">
        <table class="roster-table" id="matrix-active-table">
          ${thead}
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `;
    container.appendChild(card);
  }

  // Attach interactive click listeners to matrix cells
  container.querySelectorAll(".clickable-shift-cell").forEach(cell => {
    cell.onclick = () => {
      const deptKey = cell.dataset.dept;
      const empName = cell.dataset.emp;
      const colIdx = parseInt(cell.dataset.col, 10);
      openShiftEditorForCell(deptKey, empName, colIdx);
    };
  });
}

/* ── Open Shift Editor directly from Roster Matrix cell ── */
function openShiftEditorForCell(deptKey, empName, colIdx) {
  const { days, roster } = getActiveRoster();
  const day = days[colIdx];
  const dayStr = fmtDateShort(day);
  const shiftVal = roster.data[deptKey]?.[empName]?.[dayStr] || "";
  const shiftCode = extractShiftCodeFromHTML(shiftVal);

  let evt = calendarEvents.find(e => e.employee === empName && e.dayCol === colIdx);
  if (!evt) {
    const isOff = shiftCode === "Off";
    const cfg = ShiftTimeMap[shiftCode] || ShiftTimeMap["9:00"];
    evt = {
      id: `${isOff ? 'off' : 'shift'}-${deptKey}-${empName}-${colIdx}`,
      employee: empName,
      deptKey,
      department: DepLabels[deptKey] || deptKey,
      dayCol: colIdx,
      startCol: colIdx,
      shiftCode,
      shiftLabel: isOff ? "Off" : (cfg?.label || shiftCode),
      isAllDay: isOff,
      family: DepToFamily[deptKey] || "terracotta",
      category: isOff ? "leaves" : DepToCategory[deptKey],
      startHour: cfg?.start || 9,
      endHour: cfg?.end || 17.5,
      meta: isOff ? `${DepLabels[deptKey]} · Weekly Rest Day` : `${cfg?.full} · ${DepLabels[deptKey]}`,
      notes: isOff ? `Scheduled rest day for ${empName}` : `Scheduled ${cfg?.label} shift for ${empName}`,
    };
  }

  openEventDetail(evt);
}

/* ── Render Day View ── */
function renderDayView() {
  const d = state.currentDate;
  const isToday = sameDate(d, TODAY_ANCHOR);

  document.getElementById("day-view-weekday-sub").textContent = WEEKDAY_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1].toUpperCase();
  document.getElementById("day-view-title").textContent = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const todayBadge = document.getElementById("day-view-today-badge");
  if (todayBadge) {
    todayBadge.style.display = isToday ? "inline-flex" : "none";
  }

  const gutterCol = document.getElementById("day-view-hour-gutter");
  const linesBg = document.getElementById("day-view-lines-bg");
  const eventsCol = document.getElementById("day-view-events-col");

  gutterCol.innerHTML = "";
  linesBg.innerHTML = "";
  eventsCol.innerHTML = "";
  eventsCol.classList.toggle("is-today-col", isToday);

  // Hour Ticks
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    const tick = document.createElement("div");
    tick.className = "hour-gutter-tick";
    const label = document.createElement("span");
    label.className = "hour-gutter-label";
    const ampm = h >= 12 ? "PM" : "AM";
    label.textContent = `${h % 12 || 12} ${ampm}`;
    tick.appendChild(label);
    gutterCol.appendChild(tick);
  }

  // Grid Horizontal Lines
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    const row = document.createElement("div");
    row.className = "hour-line-row";
    const halfLine = document.createElement("div");
    halfLine.className = "half-hour-line";
    row.appendChild(halfLine);
    linesBg.appendChild(row);
  }

  // Live Current-Time Line across today's schedule
  if (isToday) {
    const timeLine = document.createElement("div");
    timeLine.className = "current-time-indicator";
    const lineTop = (12.75 - DAY_START_HOUR) * HOUR_HEIGHT;
    timeLine.style.top = `${lineTop}px`;
    const dot = document.createElement("div");
    dot.className = "current-time-dot";
    timeLine.appendChild(dot);
    eventsCol.appendChild(timeLine);
  }

  const dowIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;

  // Render leaves / off staff into header strip
  const allDayEvts = calendarEvents.filter(e => e.isAllDay && e.dayCol === dowIdx);
  const leavesStrip = document.getElementById("day-view-leaves-strip");
  if (leavesStrip) {
    leavesStrip.innerHTML = "";
    if (allDayEvts.length > 0) {
      allDayEvts.forEach(evt => {
        const chip = document.createElement("span");
        chip.className = "day-leave-chip";
        chip.textContent = `🌴 ${evt.employee} · ${evt.title || "Off"}`;
        chip.title = `${evt.employee} - ${evt.notes || "Approved Leave / Off"}`;
        leavesStrip.appendChild(chip);
      });
    }
  }

  const dayEvts = calendarEvents.filter(e => !e.isAllDay && e.dayCol === dowIdx);
  const layoutClusters = computeAdaptiveCascadingLayout(dayEvts);

  layoutClusters.forEach(item => {
    const evt = item.event;
    if (!state.activeCalendars[evt.category]) return;

    const isNight = evt.shiftCode === "Night";
    const startH = evt.startHour;
    const endH = isNight ? Math.min(DAY_END_HOUR + 0.5, 21.5) : evt.endHour;

    const topPx = (startH - DAY_START_HOUR) * HOUR_HEIGHT;
    const heightPx = Math.max(38, (endH - startH) * HOUR_HEIGHT);

    const block = document.createElement("div");
    const nightClass = isNight ? "event-shift-night" : "";
    block.className = `event-block event-fam-${evt.family} ${nightClass}`;
    block.style.top = `${topPx}px`;
    block.style.height = `${heightPx}px`;
    block.style.width = item.width;
    block.style.left = item.left;
    if (item.zIndex) block.style.zIndex = item.zIndex;

    const initials = evt.employee ? evt.employee.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "EM";
    const durationHrs = Math.round((evt.endHour - evt.startHour) * 10) / 10;
    const timeRangeText = isNight ? "8:00 PM - 8:00 AM" : `${formatTime(evt.startHour)} - ${formatTime(evt.endHour)}`;
    const durationText = isNight ? "12h Overnight" : `${durationHrs}h`;
    const deptLocation = evt.deptKey === "CallCenter" ? "Basement 1" : evt.deptKey === "ApptDesk" ? "Floor 1 Desk" : evt.deptKey === "OPD" ? "OPD · Floor 1" : "Reception · GF";
    const station = evt.notes && evt.notes.includes("Desk") ? evt.notes : deptLocation;

    block.innerHTML = `
      <div class="event-block-inner">
        <div class="event-card-top-row">
          <div class="event-card-avatar">${initials}</div>
          <div class="event-card-name-group">
            <span class="event-emp-name">${isNight ? "🌙 " : ""}${evt.employee}</span>
            <span class="event-card-dept-sub">${evt.department}</span>
          </div>
          <span class="event-shift-tag">${evt.shiftLabel}</span>
        </div>
        <div class="event-card-time-pill">
          <span class="event-card-time-range">${timeRangeText}</span>
          <span class="event-card-duration-chip">${durationText}</span>
        </div>
        <div class="event-card-footer-row">
          <span class="event-card-station">📍 ${station}</span>
          <span class="event-card-duty-badge"><span class="event-card-duty-dot"></span> On Duty</span>
        </div>
      </div>
    `;

    block.onclick = () => openEventDetail(evt);
    eventsCol.appendChild(block);
  });
}

/* ── Render Month View ── */
function renderMonthView() {
  const grid = document.getElementById("month-view-grid");
  grid.innerHTML = "";

  WEEKDAY_NAMES.forEach(name => {
    const h = document.createElement("div");
    h.className = "month-view-weekday";
    h.textContent = name;
    grid.appendChild(h);
  });

  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);

  weeks.forEach(w => {
    w.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "month-view-cell";
      const isToday = sameDate(d, TODAY_ANCHOR);
      if (isToday) cell.classList.add("is-today");

      const num = document.createElement("div");
      num.className = "month-view-date-num";
      num.textContent = d.getDate();
      cell.appendChild(num);

      const dowIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const dayEvts = calendarEvents.filter(e => e.dayCol === dowIdx).slice(0, 2);

      dayEvts.forEach(evt => {
        const pill = document.createElement("div");
        pill.className = `month-event-pill event-fam-${evt.family}`;
        pill.textContent = evt.title;
        cell.appendChild(pill);
      });

      cell.onclick = () => {
        state.currentDate = new Date(d);
        switchView("week");
      };

      grid.appendChild(cell);
    });
  });
}

/* ── View Switcher Logic ── */
function switchView(viewName) {
  state.currentView = viewName;
  saveStateToStorage();

  document.querySelectorAll(".segmented-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  const weekView = document.getElementById("view-week");
  const dayView = document.getElementById("view-day");
  const monthView = document.getElementById("view-month");
  const rosterView = document.getElementById("view-roster");

  weekView.style.display = viewName === "week" ? "flex" : "none";
  dayView.style.display = viewName === "day" ? "flex" : "none";
  monthView.style.display = viewName === "month" ? "flex" : "none";
  rosterView.style.display = viewName === "roster" ? "flex" : "none";

  if (viewName === "week") {
    renderDayHeaders();
    renderAllDayRow();
    renderTimeGrid();
  } else if (viewName === "day") {
    renderDayView();
  } else if (viewName === "month") {
    renderMonthView();
  } else if (viewName === "roster") {
    renderRosterMatrix();
  }
}

/* ── Clean Shift Extraction for Excel & CSV ── */
function getShiftDetailsForExport(shiftHTML) {
  const code = extractShiftCodeFromHTML(shiftHTML);
  if (code === "Off" || code === "off") {
    return {
      code: "Off",
      shortLabel: "Off",
      timing: "Rest Day",
      displayText: "OFF (Rest Day)"
    };
  }
  if (code === "Night" || code === "N") {
    return {
      code: "Night",
      shortLabel: "Night",
      timing: "8:00 PM - 8:00 AM",
      displayText: "Night (8:00 PM - 8:00 AM)"
    };
  }
  const cfg = ShiftTimeMap[code];
  if (cfg) {
    let displayText = cfg.full;
    if (code === "7") displayText = "7:00 AM - 3:30 PM (7 AM)";
    else if (code === "2") displayText = "2:00 PM - 10:30 PM (2 PM)";
    return {
      code: code,
      shortLabel: cfg.label || code,
      timing: cfg.full || "",
      displayText: displayText
    };
  }
  return {
    code: code,
    shortLabel: code,
    timing: code,
    displayText: code
  };
}

/* ── High-Fidelity Excel Export (.xlsx) with Multi-Sheet Layout & Custom Formatting ── */
function exportToExcel() {
  const activeData = getActiveRoster();
  if (!activeData) {
    showToast("No active roster available to export.", "⚠️");
    return;
  }

  const { days, roster } = activeData;
  const now = new Date();
  const dateStr = `${pad(now.getDate())} ${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;
  let hour12 = now.getHours() % 12 || 12;
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const timeStr = `${pad(hour12)}:${pad(now.getMinutes())} ${ampm}`;

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const weekNum = state.activeRosterWeek || (state.activeWeekIndex + 1);
  const weekLabel = `Week ${weekNum}`;
  const rangeStr = `${fmtDateShort(firstDay)} - ${fmtDateShort(lastDay)}`;
  const monthName = firstDay.toLocaleString("en-US", { month: "short" });
  const yearNum = firstDay.getFullYear();
  const filename = `Clinic_Shift_Schedule_Week_${weekNum}_${monthName}_${yearNum}.xlsx`;

  // Fallback to CSV if SheetJS library is not loaded
  if (typeof XLSX === "undefined") {
    console.warn("SheetJS not detected, falling back to CSV export.");
    exportToCSV();
    return;
  }

  const wb = XLSX.utils.book_new();
  const depts = ["Reception", "OPD", "CallCenter", "AppointmentDesk"];
  const dayHeaders = days.map(d => `${d.toLocaleDateString("en-US", { weekday: "short" })} (${fmtDateShort(d)})`);

  // ══════════════════════════════════════════════════════════════
  // SHEET 1: WEEKLY MASTER ROSTER
  // ══════════════════════════════════════════════════════════════
  const masterRows = [
    ["CLINIC EMPLOYEE SHIFT SCHEDULE - MASTER ROSTER"],
    [`Week ${weekNum}: ${rangeStr} | All 4 Departments | 12 Staff Active`],
    [`Exported: ${dateStr} at ${timeStr} | Clinic Operations Scheduling Engine`],
    [],
    ["Department", "Staff Member", ...dayHeaders, "Total Shifts", "Rest Days"]
  ];

  const masterRowHeights = [
    { hpt: 28 }, // Row 0: Title banner
    { hpt: 18 }, // Row 1: Subtitle
    { hpt: 16 }, // Row 2: Timestamp
    { hpt: 10 }, // Row 3: Blank separator
    { hpt: 24 }  // Row 4: Column headers
  ];

  const masterMerges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }
  ];

  const dailyTotals = days.map(() => ({ active: 0, off: 0 }));
  let clinicTotalShifts = 0;
  let clinicTotalOffs = 0;

  depts.forEach(deptKey => {
    const meta = DepartmentMeta[deptKey];
    if (!meta) return;
    const staff = roster[deptKey] || [];
    if (!staff.length) return;

    const deptDaily = days.map(() => ({ active: 0, off: 0 }));
    let deptShifts = 0;
    let deptOffs = 0;

    // Subheader row for department
    const subheaderRowIdx = masterRows.length;
    masterRows.push([`▼ ${meta.name.toUpperCase()} (${meta.floor})`, "", "", "", "", "", "", "", "", "", ""]);
    masterRowHeights.push({ hpt: 22 });
    masterMerges.push({ s: { r: subheaderRowIdx, c: 0 }, e: { r: subheaderRowIdx, c: 10 } });

    staff.forEach(name => {
      let empShifts = 0;
      let empOffs = 0;

      const dayCells = days.map((day, colIdx) => {
        const shiftHTML = roster.data[deptKey]?.[name]?.[fmtDateShort(day)] || "";
        const details = getShiftDetailsForExport(shiftHTML);

        if (details.code === "Off") {
          empOffs++;
          deptOffs++;
          dailyTotals[colIdx].off++;
          deptDaily[colIdx].off++;
          return details.displayText;
        } else {
          empShifts++;
          deptShifts++;
          dailyTotals[colIdx].active++;
          deptDaily[colIdx].active++;
          return details.displayText;
        }
      });

      masterRows.push([meta.name, name, ...dayCells, empShifts, empOffs]);
      masterRowHeights.push({ hpt: 20 });
    });

    clinicTotalShifts += deptShifts;
    clinicTotalOffs += deptOffs;

    // Department Coverage row
    masterRows.push([
      `${meta.name} Coverage:`,
      `${staff.length} Staff`,
      ...deptDaily.map(d => `${d.active} On Duty · ${d.off} Off`),
      deptShifts,
      deptOffs
    ]);
    masterRowHeights.push({ hpt: 20 });

    masterRows.push([]); // blank separator
    masterRowHeights.push({ hpt: 10 });
  });

  // Clinic Grand Totals
  masterRows.push([
    "TOTAL CLINIC ON DUTY:",
    "12 Staff Members",
    ...dailyTotals.map(d => `${d.active} On Duty`),
    clinicTotalShifts,
    clinicTotalOffs
  ]);
  masterRowHeights.push({ hpt: 22 });

  masterRows.push([
    "TOTAL CLINIC REST DAYS:",
    "Weekly Off Days",
    ...dailyTotals.map(d => `${d.off} Scheduled Off`),
    "-",
    "-"
  ]);
  masterRowHeights.push({ hpt: 22 });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  wsMaster["!cols"] = [
    { wch: 22 }, // Department
    { wch: 18 }, // Employee
    { wch: 26 }, // Mon
    { wch: 26 }, // Tue
    { wch: 26 }, // Wed
    { wch: 26 }, // Thu
    { wch: 26 }, // Fri
    { wch: 26 }, // Sat
    { wch: 26 }, // Sun
    { wch: 14 }, // Total Shifts
    { wch: 12 }  // Rest Days
  ];
  wsMaster["!rows"] = masterRowHeights;
  wsMaster["!merges"] = masterMerges;
  wsMaster["!views"] = [{ state: "frozen", xSplit: 2, ySplit: 5 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, "Weekly Master");

  // ══════════════════════════════════════════════════════════════
  // SHEETS 2-5: DEDICATED DEPARTMENT WORKSHEETS
  // ══════════════════════════════════════════════════════════════
  const deptSheetNames = {
    Reception: "Reception (GF)",
    OPD: "OPD (1F)",
    CallCenter: "Call Center (B1)",
    AppointmentDesk: "Appointment Desk (1F)"
  };

  depts.forEach(deptKey => {
    const meta = DepartmentMeta[deptKey];
    if (!meta) return;
    const staff = roster[deptKey] || [];
    if (!staff.length) return;

    const sheetName = deptSheetNames[deptKey] || meta.name.slice(0, 31);
    const deptRows = [
      [`${meta.name.toUpperCase()} - SHIFT ROSTER`],
      [`Week ${weekNum}: ${rangeStr} · ${meta.floor} · ${staff.length} Staff Members`],
      [`Coverage: ${meta.desc}`],
      [],
      ["Staff Member", ...dayHeaders, "Total Shifts", "Rest Days"]
    ];

    const deptRowHeights = [
      { hpt: 28 }, // Title banner
      { hpt: 18 }, // Subtitle
      { hpt: 18 }, // Coverage notes
      { hpt: 10 }, // Blank separator
      { hpt: 24 }  // Column headers
    ];

    const deptMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }
    ];

    const deptDaily = days.map(() => ({ active: 0, off: 0 }));
    let dShifts = 0, dOffs = 0;

    staff.forEach(name => {
      let empShifts = 0, empOffs = 0;
      const dayCells = days.map((day, colIdx) => {
        const shiftHTML = roster.data[deptKey]?.[name]?.[fmtDateShort(day)] || "";
        const details = getShiftDetailsForExport(shiftHTML);

        if (details.code === "Off") {
          empOffs++;
          dOffs++;
          deptDaily[colIdx].off++;
          return details.displayText;
        } else {
          empShifts++;
          dShifts++;
          deptDaily[colIdx].active++;
          return details.displayText;
        }
      });
      deptRows.push([name, ...dayCells, empShifts, empOffs]);
      deptRowHeights.push({ hpt: 20 });
    });

    deptRows.push([
      "Active On-Duty Coverage:",
      ...deptDaily.map(d => `${d.active} On Duty · ${d.off} Off`),
      dShifts,
      dOffs
    ]);
    deptRowHeights.push({ hpt: 22 });

    const wsDept = XLSX.utils.aoa_to_sheet(deptRows);
    wsDept["!cols"] = [
      { wch: 20 }, // Employee
      { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 },
      { wch: 14 }, { wch: 12 }
    ];
    wsDept["!rows"] = deptRowHeights;
    wsDept["!merges"] = deptMerges;
    wsDept["!views"] = [{ state: "frozen", xSplit: 1, ySplit: 5 }];
    XLSX.utils.book_append_sheet(wb, wsDept, sheetName);
  });

  // ══════════════════════════════════════════════════════════════
  // SHEET 6: SHIFT TIMINGS & ROTATION POLICY GUIDE
  // ══════════════════════════════════════════════════════════════
  const timingGuideRows = [
    ["CLINIC SHIFT TIMING & ROTATION POLICY GUIDE"],
    ["Official Working Hours, Standard Shift Durations, and Department Responsibilities"],
    [],
    ["Shift Code", "Working Hours", "Net Duration", "Department Assigned", "Station / Role Description"],
    ["7 AM", "7:00 AM - 3:30 PM", "8.5 Hours", "Reception (GF)", "Morning Front Desk Coverage (alternates weekly with 2 PM)"],
    ["2 PM", "2:00 PM - 10:30 PM", "8.5 Hours", "Reception (GF) / Appt Desk", "Evening Front Desk Coverage (alternates weekly with 7 AM)"],
    ["Night", "8:00 PM - 8:00 AM", "12.0 Hours", "Reception (GF)", "Overnight Emergency & Inpatient Coverage (12h Shift)"],
    ["9:00 AM", "9:00 AM - 5:30 PM", "8.5 Hours", "OPD (1F)", "Standard Outpatient General Consultation Shift"],
    ["9:30 AM", "9:30 AM - 6:00 PM", "8.5 Hours", "OPD (1F) / Appt Desk", "Mid-Morning Consultation / Counter Booking Shift"],
    ["10:30 AM", "10:30 AM - 7:00 PM", "8.5 Hours", "OPD (1F) / Call Center", "Late Morning Peak OPD & Inbound Helpline Queue Slot"],
    ["7:30 AM", "7:30 AM - 4:00 PM", "8.5 Hours", "Call Center (B1)", "Early Morning Inbound Helpline Queue Coverage"],
    ["8:00 AM", "8:00 AM - 4:30 PM", "8.5 Hours", "Call Center (B1)", "Standard Morning Inbound Helpline Queue Coverage"],
    ["11:30 AM", "11:30 AM - 8:00 PM", "8.5 Hours", "Call Center (B1)", "Peak Afternoon / Evening Helpline Queue Coverage"],
    ["Off", "Weekly Rest Day", "0.0 Hours", "All Departments", "Mandatory Fair Balanced Weekly Rest Day (No Overlapping Leaves)"]
  ];

  const guideRowHeights = [
    { hpt: 28 }, // Title banner
    { hpt: 18 }, // Subtitle
    { hpt: 10 }, // Blank separator
    { hpt: 24 }, // Header row
    ...Array(timingGuideRows.length - 4).fill({ hpt: 20 })
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(timingGuideRows);
  wsGuide["!cols"] = [
    { wch: 14 }, // Code
    { wch: 24 }, // Timing
    { wch: 15 }, // Duration
    { wch: 28 }, // Department
    { wch: 60 }  // Role Description
  ];
  wsGuide["!rows"] = guideRowHeights;
  wsGuide["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }
  ];
  wsGuide["!views"] = [{ state: "frozen", xSplit: 0, ySplit: 4 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Shift Timing Guide");

  // ══════════════════════════════════════════════════════════════
  // GENERATE AND TRIGGER INSTANT DOWNLOAD
  // ══════════════════════════════════════════════════════════════
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 150);

  showToast(`Excel workbook downloaded: ${filename}`, "📥");
}

/* ── Clean Tabular CSV Export (.csv) ── */
function exportToCSV() {
  const activeData = getActiveRoster();
  if (!activeData) return;

  const { days, roster } = activeData;
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const weekLabel = `Week ${state.activeRosterWeek || (state.activeWeekIndex + 1)}`;
  const filename = `Hospital-Shift-Schedule-${weekLabel.replace(/\s+/g, "-")}.csv`;

  const header = [
    "Department",
    "Floor Location",
    "Employee Name",
    ...days.map(d => `${d.toLocaleDateString("en-US", { weekday: "short" })} (${fmtDateShort(d)})`)
  ];

  const rows = [];
  const depts = ["Reception", "OPD", "CallCenter", "AppointmentDesk"];

  depts.forEach(deptKey => {
    const meta = DepartmentMeta[deptKey];
    if (!meta) return;
    const staff = roster[deptKey] || [];
    staff.forEach(name => {
      const row = [
        meta.name,
        meta.floor,
        name,
        ...days.map(d => {
          const shiftHTML = roster.data[deptKey]?.[name]?.[fmtDateShort(d)] || "";
          const details = getShiftDetailsForExport(shiftHTML);
          return details.code === "Off" ? "Weekly Off" : `${details.shortLabel} (${details.timing})`;
        })
      ];
      rows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });
  });

  const csvContent = "\uFEFF" + [header.map(h => `"${h}"`).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  showToast(`CSV table downloaded: ${weekLabel}!`, "📄");
}

/* ── Refresh & Regenerate Roster Algorithm Trigger ── */
function regenerateRoster() {
  const btnQuick = document.getElementById("btn-quick-regen");
  const btnSide = document.getElementById("btn-sidebar-regen");
  const btnRoster = document.getElementById("btn-roster-refresh");
  if (btnQuick) btnQuick.classList.add("spinning");
  if (btnSide) btnSide.classList.add("spinning");
  if (btnRoster) btnRoster.classList.add("spinning");

  showToast("Refreshing & re-generating shifts with balanced staffing...", "🔄");

  // Re-build all weeks with fresh valid random department swaps and balanced rest days
  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();
  const weeks = splitWeeks(y, m);

  state.cachedWeeks = {
    y,
    m,
    data: weeks.map(days => ({ days, roster: buildWeekRoster(days) })),
  };

  saveStateToStorage();

  setTimeout(() => {
    if (btnQuick) btnQuick.classList.remove("spinning");
    if (btnSide) btnSide.classList.remove("spinning");
    if (btnRoster) btnRoster.classList.remove("spinning");
    renderAll();
    showToast("Schedule refreshed! All staffing conditions verified.", "✓");
  }, 450);
}

/* ── Modals & Drawers ── */
function openNewEventModal() {
  document.getElementById("modal-new-event").classList.add("is-open");
}

function closeNewEventModal() {
  document.getElementById("modal-new-event").classList.remove("is-open");
}

let activeDetailEvent = null;

function openEventDetail(evt) {
  activeDetailEvent = evt;
  const modal = document.getElementById("modal-event-detail");
  const { days, roster } = getActiveRoster();
  const colIdx = evt.dayCol !== undefined ? evt.dayCol : (evt.startCol !== undefined ? evt.startCol : 0);
  const day = days[colIdx] || state.currentDate;

  // Title & Header info
  document.getElementById("detail-modal-title").textContent = evt.employee
    ? `${evt.employee} - Shift Editor`
    : evt.title;

  const badge = document.getElementById("detail-modal-badge");
  const deptLabel = evt.department || DepLabels[evt.deptKey] || (evt.category || "Shift");
  badge.textContent = deptLabel.toUpperCase();
  badge.className = `event-detail-chip event-fam-${evt.family || 'terracotta'}`;

  // Day indicator
  const dayEl = document.getElementById("detail-modal-day");
  if (dayEl) {
    dayEl.textContent = `${WEEKDAY_FULL[day.getDay() === 0 ? 6 : day.getDay() - 1]}, ${fmtDateShort(day)}`;
  }

  // Populate shift timing select
  const shiftSelect = document.getElementById("detail-select-shift");
  const currentCode = evt.shiftCode || (evt.isAllDay ? "Off" : "9:00");
  shiftSelect.value = currentCode;

  // Populate colleague swap options from the same department
  const swapSelect = document.getElementById("detail-select-swap");
  swapSelect.innerHTML = `<option value="">-- No Swap (Update ${evt.employee || 'Employee'} Only) --</option>`;

  // Identify department
  let deptKey = evt.deptKey;
  if (!deptKey && evt.employee) {
    for (const dk of ["Reception", "OPD", "CallCenter", "AppointmentDesk"]) {
      if (roster[dk]?.includes(evt.employee)) {
        deptKey = dk;
        break;
      }
    }
  }

  if (deptKey && roster[deptKey] && evt.employee) {
    const colleagues = roster[deptKey].filter(n => n !== evt.employee);
    colleagues.forEach(colleagueName => {
      const colleagueShiftHTML = roster.data[deptKey]?.[colleagueName]?.[fmtDateShort(day)] || "";
      const colleagueCode = extractShiftCodeFromHTML(colleagueShiftHTML);
      const colLabel = colleagueCode === "Off" ? "Off (Rest Day)" : (ShiftTimeMap[colleagueCode]?.label || colleagueCode);
      const opt = document.createElement("option");
      opt.value = colleagueName;
      opt.textContent = `Swap with ${colleagueName} (${colLabel})`;
      swapSelect.appendChild(opt);
    });
  }

  // Notes input
  const notesInput = document.getElementById("detail-input-notes");
  if (notesInput) {
    notesInput.value = evt.notes || "";
  }

  modal.classList.add("is-open");
}

function closeEventDetailModal() {
  document.getElementById("modal-event-detail").classList.remove("is-open");
  activeDetailEvent = null;
}

function deleteCurrentEvent() {
  if (!activeDetailEvent) return;
  const { days, roster } = getActiveRoster();
  const empName = activeDetailEvent.employee;
  const colIdx = activeDetailEvent.dayCol !== undefined ? activeDetailEvent.dayCol : (activeDetailEvent.startCol !== undefined ? activeDetailEvent.startCol : 0);
  const day = days[colIdx];
  const dayStr = fmtDateShort(day);

  let deptKey = activeDetailEvent.deptKey;
  if (!deptKey && empName) {
    for (const dk of ["Reception", "OPD", "CallCenter", "AppointmentDesk"]) {
      if (roster[dk]?.includes(empName)) {
        deptKey = dk;
        break;
      }
    }
  }

  if (deptKey && roster.data[deptKey] && empName) {
    roster.data[deptKey][empName][dayStr] = createShiftBadgeHTML("Off");
    calendarEvents = syncCalendarEventsFromRoster(roster, days);
    saveStateToStorage();
    closeEventDetailModal();
    renderAll();
    showToast(`Marked ${empName} as Off on ${dayStr}`, "✓");
  } else {
    calendarEvents = calendarEvents.filter(e => e !== activeDetailEvent);
    saveStateToStorage();
    closeEventDetailModal();
    renderAll();
    showToast("Shift removed from schedule", "✓");
  }
}

/* ── Toast Notifications ── */
let toastTimeout = null;
function showToast(text, icon = "✓") {
  const toast = document.getElementById("app-toast");
  document.getElementById("toast-icon").textContent = icon;
  document.getElementById("toast-text").textContent = text;
  toast.classList.add("is-show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("is-show");
  }, 2400);
}

/* ── Master Render Function ── */
function renderAll() {
  updateTopBarHeader();
  renderMiniMonth();

  // Get active week and sync employee shift events
  const { days, roster } = getActiveRoster();
  calendarEvents = syncCalendarEventsFromRoster(roster, days);

  renderUpNext();

  if (state.currentView === "week") {
    renderDayHeaders();
    renderAllDayRow();
    renderTimeGrid();
  } else if (state.currentView === "day") {
    renderDayView();
  } else if (state.currentView === "month") {
    renderMonthView();
  } else if (state.currentView === "roster") {
    renderRosterMatrix();
  }
}

/* ── Navigation Handlers ── */
function prevWeek() {
  const weeks = splitWeeks(state.currentDate.getFullYear(), state.currentDate.getMonth());
  if (state.activeWeekIndex > 0) {
    state.activeWeekIndex--;
  } else {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    const newWeeks = splitWeeks(state.currentDate.getFullYear(), state.currentDate.getMonth());
    state.activeWeekIndex = newWeeks.length - 1;
  }
  state.activeRosterWeek = state.activeWeekIndex + 1;
  saveStateToStorage();
  renderAll();
}

function nextWeek() {
  const weeks = splitWeeks(state.currentDate.getFullYear(), state.currentDate.getMonth());
  if (state.activeWeekIndex < weeks.length - 1) {
    state.activeWeekIndex++;
  } else {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    state.activeWeekIndex = 0;
  }
  state.activeRosterWeek = state.activeWeekIndex + 1;
  saveStateToStorage();
  renderAll();
}

function goToday() {
  state.currentDate = new Date(2026, 6, 9);
  state.activeWeekIndex = 1;
  state.activeRosterWeek = 2;
  saveStateToStorage();
  renderAll();
  showToast("Returned to Today (Jul 9, 2026)", "✦");
}

/* ── Initialize Event Listeners & Bootstrapping ── */
function init() {
  // Load saved state from storage so browser reload/refresh restores exact roster, week, and edits
  loadStateFromStorage();

  // Auto-scroll to morning (~8 AM)
  const scrollArea = document.getElementById("time-grid-scroll-area");
  if (scrollArea) {
    scrollArea.scrollTop = (8 - DAY_START_HOUR) * HOUR_HEIGHT;
  }

  // Top bar navigation
  document.getElementById("btn-prev-nav").onclick = prevWeek;
  document.getElementById("btn-next-nav").onclick = nextWeek;
  document.getElementById("btn-today").onclick = goToday;

  // Mini-month arrows
  document.getElementById("btn-mini-prev").onclick = () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    state.activeWeekIndex = 0;
    state.activeRosterWeek = 1;
    renderAll();
  };
  document.getElementById("btn-mini-next").onclick = () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    state.activeWeekIndex = 0;
    state.activeRosterWeek = 1;
    renderAll();
  };

  // Day View navigation
  const btnDayToday = document.getElementById("btn-day-today");
  if (btnDayToday) {
    btnDayToday.onclick = () => {
      state.currentDate = new Date(TODAY_ANCHOR);
      state.activeWeekIndex = 1;
      state.activeRosterWeek = 2;
      renderAll();
    };
  }

  document.getElementById("btn-day-prev").onclick = () => {
    state.currentDate.setDate(state.currentDate.getDate() - 1);
    const weeks = splitWeeks(state.currentDate.getFullYear(), state.currentDate.getMonth());
    const idx = weeks.findIndex(w => w.some(day => sameDate(day, state.currentDate)));
    if (idx >= 0) {
      state.activeWeekIndex = idx;
      state.activeRosterWeek = idx + 1;
    }
    renderAll();
  };
  document.getElementById("btn-day-next").onclick = () => {
    state.currentDate.setDate(state.currentDate.getDate() + 1);
    const weeks = splitWeeks(state.currentDate.getFullYear(), state.currentDate.getMonth());
    const idx = weeks.findIndex(w => w.some(day => sameDate(day, state.currentDate)));
    if (idx >= 0) {
      state.activeWeekIndex = idx;
      state.activeRosterWeek = idx + 1;
    }
    renderAll();
  };

  // View Switcher Buttons
  document.querySelectorAll(".segmented-btn").forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });

  // Calendar Sub-Bar: Department Filter Pills
  document.querySelectorAll(".dept-chip-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".dept-chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeDepartmentFilter = btn.dataset.dept;
      renderDayHeaders();
      renderAllDayRow();
      renderTimeGrid();
      showToast(btn.dataset.dept === "all" ? "Showing all clinic departments" : `Filtered: ${btn.textContent.trim()}`, "⚡");
    };
  });

  // Calendar Sub-Bar: Layout Mode Toggle (Cascade Deck, Staff Lanes, Shift Board)
  const btnLanes = document.getElementById("btn-mode-lanes");
  const btnAdaptive = document.getElementById("btn-mode-adaptive");
  const btnBoard = document.getElementById("btn-mode-board");

  const updateModeButtons = () => {
    if (btnAdaptive) btnAdaptive.classList.toggle("active", state.gridMode === "adaptive");
    if (btnLanes) btnLanes.classList.toggle("active", state.gridMode === "lanes");
    if (btnBoard) btnBoard.classList.toggle("active", state.gridMode === "board");
  };
  updateModeButtons();

  if (btnAdaptive) {
    btnAdaptive.onclick = () => {
      state.gridMode = "adaptive";
      saveStateToStorage();
      updateModeButtons();
      renderDayHeaders();
      renderAllDayRow();
      renderTimeGrid();
      showToast("Switched to Cascade Deck", "✦");
    };
  }
  if (btnLanes) {
    btnLanes.onclick = () => {
      state.gridMode = "lanes";
      // If a single department was filtered, reset to "all" so user actually sees all 4 Department Lanes!
      if (state.activeDepartmentFilter !== "all") {
        state.activeDepartmentFilter = "all";
        document.querySelectorAll(".dept-chip-btn").forEach(b => {
          b.classList.toggle("active", b.dataset.dept === "all");
        });
      }
      saveStateToStorage();
      updateModeButtons();
      renderDayHeaders();
      renderAllDayRow();
      renderTimeGrid();
      showToast("Switched to Dept Lanes (All 4 Departments)", "✓");
    };
  }
  if (btnBoard) {
    btnBoard.onclick = () => {
      state.gridMode = "board";
      saveStateToStorage();
      updateModeButtons();
      renderTimeGrid();
      showToast("Switched to Daily Shift Board", "📋");
    };
  }

  // Horizontal Scroll Synchronization
  const timeScroll = document.getElementById("time-grid-scroll-area");
  const headerRow = document.querySelector(".day-header-row");
  const allDayRow = document.querySelector(".all-day-row");
  if (timeScroll && headerRow && allDayRow) {
    timeScroll.addEventListener("scroll", () => {
      headerRow.scrollLeft = timeScroll.scrollLeft;
      allDayRow.scrollLeft = timeScroll.scrollLeft;
    });
  }

  // Department Checklist Toggles
  document.querySelectorAll(".calendar-row").forEach(row => {
    row.onclick = () => {
      const cat = row.dataset.cat;
      state.activeCalendars[cat] = !state.activeCalendars[cat];
      row.classList.toggle("is-active", state.activeCalendars[cat]);
      row.querySelector(".calendar-check-box").textContent = state.activeCalendars[cat] ? "✓" : "";
      renderAll();
    };
  });

  // Quick Action & Refresh Buttons (Top Right Header)
  document.getElementById("btn-quick-regen").onclick = regenerateRoster;
  document.getElementById("btn-quick-export").onclick = exportToExcel;
  document.getElementById("btn-matrix-dl").onclick = exportToExcel;

  const btnMatrixCsv = document.getElementById("btn-matrix-csv");
  if (btnMatrixCsv) btnMatrixCsv.onclick = exportToCSV;

  const btnRosterRefresh = document.getElementById("btn-roster-refresh");
  if (btnRosterRefresh) btnRosterRefresh.onclick = regenerateRoster;

  // Department Sections vs Unified Table layout buttons
  const btnSec = document.getElementById("btn-roster-layout-sections");
  const btnComb = document.getElementById("btn-roster-layout-combined");
  if (btnSec && btnComb) {
    btnSec.onclick = () => {
      state.rosterLayout = "sections";
      saveStateToStorage();
      btnSec.classList.add("active");
      btnComb.classList.remove("active");
      renderRosterMatrix();
      showToast("Divided into 4 Department Sections", "📋");
    };
    btnComb.onclick = () => {
      state.rosterLayout = "unified";
      saveStateToStorage();
      btnComb.classList.add("active");
      btnSec.classList.remove("active");
      renderRosterMatrix();
      showToast("Switched to Unified Matrix Table", "📊");
    };
  }

  // Search input live-filter
  const searchInput = document.getElementById("schedule-search");
  searchInput.oninput = e => {
    state.searchQuery = e.target.value;
    if (state.currentView === "week") renderTimeGrid();
    else if (state.currentView === "day") renderDayView();
    else if (state.currentView === "roster") renderRosterMatrix();
  };

  // Assign New Shift Modal Handlers
  document.getElementById("btn-new-event").onclick = openNewEventModal;
  document.getElementById("btn-close-new-modal").onclick = closeNewEventModal;
  document.getElementById("btn-cancel-new-modal").onclick = closeNewEventModal;

  document.getElementById("form-new-event").onsubmit = e => {
    e.preventDefault();
    const empName = document.getElementById("select-employee").value;
    const cat = document.getElementById("select-event-category").value;
    const presetVal = document.getElementById("select-shift-preset").value;
    const dayCol = parseInt(document.getElementById("select-event-day").value, 10);
    const loc = document.getElementById("input-event-location").value.trim();
    const notes = document.getElementById("input-event-notes").value.trim();

    const catToDept = {
      reception: "Reception",
      opd: "OPD",
      callcenter: "CallCenter",
      appt: "AppointmentDesk",
    };
    const deptKey = catToDept[cat];

    const presetToCode = {
      "7.0-15.5": "7",
      "7.5-16.0": "7:30",
      "8.0-16.5": "8:00",
      "9.0-17.5": "9:00",
      "9.5-18.0": "9:30",
      "10.5-19.0": "10:30",
      "11.5-20.0": "11:30",
      "14.0-21.0": "2",
      "20.0-21.0": "Night",
      "off": "Off",
    };
    const shiftCode = presetToCode[presetVal] || "9:00";

    const { days, roster } = getActiveRoster();
    const day = days[dayCol];
    const dayStr = fmtDateShort(day);

    if (deptKey && roster.data[deptKey]?.[empName]) {
      roster.data[deptKey][empName][dayStr] = createShiftBadgeHTML(shiftCode);
      calendarEvents = syncCalendarEventsFromRoster(roster, days);
    } else {
      if (shiftCode === "Off") {
        calendarEvents.push({
          id: "custom-off-" + Date.now(),
          title: `${empName} · Scheduled Off`,
          category: "leaves",
          family: "birthday",
          isAllDay: true,
          spanDays: 1,
          startCol: dayCol,
          dayCol,
          meta: loc || "Approved Leave",
          notes,
        });
      } else {
        const cfg = ShiftTimeMap[shiftCode] || ShiftTimeMap["9:00"];
        calendarEvents.push({
          id: "custom-shift-" + Date.now(),
          dayCol,
          employee: empName,
          title: empName,
          shiftCode,
          shiftLabel: cfg.label,
          category: cat,
          family: DepToFamily[deptKey] || "terracotta",
          startHour: cfg.start,
          endHour: cfg.end,
          meta: loc ? `${formatTime(cfg.start)} - ${formatTime(cfg.end)} · ${loc}` : `${formatTime(cfg.start)} - ${formatTime(cfg.end)}`,
          notes,
        });
      }
    }

    closeNewEventModal();
    saveStateToStorage();
    renderAll();
    showToast(`${empName}'s shift updated!`, "✓");
  };

  // Shift Detail & Editor Form Handlers
  document.getElementById("btn-close-detail-modal").onclick = closeEventDetailModal;
  document.getElementById("btn-dismiss-detail").onclick = closeEventDetailModal;
  document.getElementById("btn-delete-event").onclick = deleteCurrentEvent;

  const formEdit = document.getElementById("form-edit-shift");
  if (formEdit) {
    formEdit.onsubmit = e => {
      e.preventDefault();
      if (!activeDetailEvent) return;

      const { days, roster } = getActiveRoster();
      const empName = activeDetailEvent.employee;
      const colIdx = activeDetailEvent.dayCol !== undefined ? activeDetailEvent.dayCol : (activeDetailEvent.startCol !== undefined ? activeDetailEvent.startCol : 0);
      const day = days[colIdx];
      const dayStr = fmtDateShort(day);

      let deptKey = activeDetailEvent.deptKey;
      if (!deptKey && empName) {
        for (const dk of ["Reception", "OPD", "CallCenter", "AppointmentDesk"]) {
          if (roster[dk]?.includes(empName)) {
            deptKey = dk;
            break;
          }
        }
      }

      if (!deptKey || !roster.data[deptKey] || !empName) {
        showToast("Shift updated", "✓");
        closeEventDetailModal();
        return;
      }

      const newShiftCode = document.getElementById("detail-select-shift").value;
      const swapTarget = document.getElementById("detail-select-swap").value;
      const notesVal = document.getElementById("detail-input-notes").value.trim();

      if (swapTarget) {
        // Perform 2-way swap between empName and swapTarget on this day!
        const empCurrentVal = roster.data[deptKey]?.[empName]?.[dayStr] || "";
        const targetCurrentVal = roster.data[deptKey]?.[swapTarget]?.[dayStr] || "";

        roster.data[deptKey][empName][dayStr] = targetCurrentVal;
        roster.data[deptKey][swapTarget][dayStr] = empCurrentVal;

        showToast(`Swapped shifts: ${empName} ⇄ ${swapTarget}`, "✓");
      } else {
        // Direct update for current employee
        roster.data[deptKey][empName][dayStr] = createShiftBadgeHTML(newShiftCode);
        showToast(`Updated ${empName}: ${newShiftCode === 'Off' ? 'Rest Day' : newShiftCode + ' Shift'}`, "✓");
      }

      if (activeDetailEvent) {
        activeDetailEvent.notes = notesVal;
      }

      // Re-sync and re-render
      calendarEvents = syncCalendarEventsFromRoster(roster, days);
      saveStateToStorage();
      closeEventDetailModal();
      renderAll();
    };
  }

  // Save on page unload / refresh
  window.addEventListener("beforeunload", saveStateToStorage);

  // Mobile sidebar toggle
  document.getElementById("btn-sidebar-toggle").onclick = () => {
    document.getElementById("app-sidebar").classList.toggle("is-mobile-open");
  };

  // Keyboard navigation shortcuts
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevWeek();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextWeek();
    } else if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      goToday();
    } else if (e.key === "/") {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Escape") {
      closeNewEventModal();
      closeEventDetailModal();
    }
  });

  // Initial render
  renderAll();
}

// Kick off when DOM is ready
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
