/* ═══════════════════════════════════════════════════════
   SHIFT SCHEDULER — Core Logic
   Made with ❤️ by Suraj Khanna
   ═══════════════════════════════════════════════════════ */

console.log(
  "%c✦ Shift Scheduler %c Made with ❤️ by Suraj Khanna",
  "color:#6366f1;font-weight:bold;font-size:13px;",
  "color:#94a3b8;font-size:12px;"
)

/* ── Utilities ── */
const fmt = d => d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
const dow = d => d.toLocaleDateString("en-IN", { weekday: "short" })
const dowFull = d => d.toLocaleDateString("en-IN", { weekday: "long" })
const pick = a => a[(Math.random() * a.length) | 0]
const same = (a, b) => a && b && a.getTime() === b.getTime()
const isToday = d => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear() }
const isSunday = d => d.getDay() === 0

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

/* ── Department Data ── */
const Departments = {
  Reception: ["Sagar", "Roshan", "Karan"],
  OPD: ["Anagha", "Shraddha Tipale", "Shubhangi", "Mamta"],
  CallCenter: ["Jayshree", "Shraddha P", "Prasad"],
  AppointmentDesk: ["Vanita", "Gaurav"],
}

const depLabel = n => ({
  Reception: "Reception (GF)",
  OPD: "OPD (1F)",
  CallCenter: "Call Center (B1)",
  AppointmentDesk: "Appointment Desk (1F)",
})[n]

/* ── Shift Legend ── */
const LEGEND = [
  { cls: "t-N", label: "Night" },
  { cls: "t-7", label: "7 AM" },
  { cls: "t-2", label: "2 PM" },
  { cls: "t-9", label: "9:00" },
  { cls: "t-930", label: "9:30" },
  { cls: "t-1030", label: "10:30" },
  { cls: "t-730", label: "7:30" },
  { cls: "t-800", label: "8:00" },
  { cls: "t-1130", label: "11:30" },
]

/* ── State ── */
let currentDate = new Date()
let viewAll = false
let cachedWeeks = null

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("ss_state") || "{}")
    if (s.y != null && s.m != null) currentDate = new Date(s.y, s.m, 1)
    if (s.theme) document.documentElement.setAttribute("data-theme", s.theme)
  } catch {}
}

function saveState() {
  try {
    localStorage.setItem("ss_state", JSON.stringify({
      y: currentDate.getFullYear(),
      m: currentDate.getMonth(),
      theme: document.documentElement.getAttribute("data-theme") || "dark"
    }))
  } catch {}
}

/* ── Split Month → Weeks (Mon-Sun) ── */
function splitWeeks(year, month) {
  const len = new Date(year, month + 1, 0).getDate()
  const days = [], weeks = []
  let week = []

  for (let d = 1; d <= len; d++) days.push(new Date(year, month, d))

  days.forEach(d => {
    week.push(d)
    if (d.getDay() === 0) { weeks.push(week.slice()); week.length = 0 }
  })

  if (week.length) {
    let nx = new Date(year, month + 1, 1)
    while (nx.getDay() !== 0) { week.push(new Date(nx)); nx.setDate(nx.getDate() + 1) }
    week.push(new Date(nx))
    weeks.push(week)
  }
  return weeks
}

/* ── Build Week Schedule ── */
function buildWeek(weekDays) {
  const swap = Math.random() < 0.5

  let recep = [...Departments.Reception].sort()
  let opd = [...Departments.OPD].filter(n => n !== "Shubhangi" && n !== "Anagha").sort()
  let cc = [...Departments.CallCenter].filter(n => n !== "Jayshree").sort()

  if (swap) { opd.push("Jayshree"); cc.push("Shubhangi") }
  else { opd.push("Shubhangi"); cc.push("Jayshree") }
  opd.sort(); cc.sort()
  let appt = [...Departments.AppointmentDesk].sort()

  const sched = {}
  ;[recep, [...opd, "Anagha"], cc, appt].forEach((staff, i) => {
    const dept = ["Reception","OPD","CallCenter","AppointmentDesk"][i]
    sched[dept] = {}
    staff.forEach(n => sched[dept][n] = {})
  })

  function assignOffs(staff, days) {
    let offs = {}, avail = [...days]
    staff.forEach(n => {
      if (!avail.length) avail = [...days]
      const d = pick(avail)
      offs[n] = d
      avail = avail.filter(x => !same(x, d))
    })
    return offs
  }

  const offs = {
    Reception: assignOffs(recep, [...weekDays]),
    OPD: assignOffs([...opd, "Anagha"], [...weekDays]),
    CallCenter: assignOffs(cc, [...weekDays]),
    AppointmentDesk: assignOffs(appt, [...weekDays]),
  }

  // Shraddha P timing
  const spTime = {}
  const workDays = weekDays.filter(d => d.getDay() !== 0)
  const td = pick(workDays)
  let c730 = 0, c800 = 0
  workDays.forEach(d => {
    if (same(d, td)) { spTime[fmt(d)] = "10:30" }
    else if (c730 < 3 && c800 < 3) { Math.random() < 0.5 ? (spTime[fmt(d)] = "7:30", c730++) : (spTime[fmt(d)] = "8:00", c800++) }
    else if (c730 >= 3) { spTime[fmt(d)] = "8:00"; c800++ }
    else { spTime[fmt(d)] = "7:30"; c730++ }
  })

  // Appointment desk alternating
  const apt = { Vanita: {}, Gaurav: {} }
  let vm = true
  weekDays.filter(d => d.getDay() !== 0).forEach(d => {
    apt.Vanita[fmt(d)] = vm ? "9:30" : "2"
    apt.Gaurav[fmt(d)] = vm ? "2" : "9:30"
    vm = !vm
  })

  const put = (dept, name, day, val) => sched[dept][name][fmt(day)] = val
  const badge = (cls, txt) => `<span class="badge ${cls}">${txt}</span>`
  const OFF = '<span class="off">Week&nbsp;Off</span>'
  const tc = { N:"t-N", 7:"t-7", 2:"t-2", "9:00":"t-9", "9:30":"t-930", "10:30":"t-1030", "7:30":"t-730", "8:00":"t-800", "11:30":"t-1130" }

  weekDays.forEach((day, di) => {
    // Reception
    recep.forEach(n => {
      if (same(day, offs.Reception[n])) put("Reception", n, day, OFF)
      else if (n === "Karan") put("Reception", n, day, badge("t-N","N"))
      else if (n === "Sagar") { const s = di%2===0?"7":"2"; put("Reception", n, day, badge(tc[s], s)) }
      else if (n === "Roshan") { const s = di%2===0?"2":"7"; put("Reception", n, day, badge(tc[s], s)) }
    })

    // OPD
    const slots = ["9:30","10:30"]
    opd.forEach((n, ei) => {
      if (same(day, offs.OPD[n])) put("OPD", n, day, OFF)
      else put("OPD", n, day, badge(tc[slots[(ei+di)%2]], slots[(ei+di)%2]))
    })
    if (same(day, offs.OPD["Anagha"])) put("OPD","Anagha", day, OFF)
    else put("OPD","Anagha", day, badge("t-9","9:00"))

    // Call Center
    const swapped = swap ? "Shubhangi" : "Jayshree"
    cc.forEach(n => {
      if (same(day, offs.CallCenter[n])) put("CallCenter", n, day, OFF)
      else if (n === "Prasad") put("CallCenter", n, day, badge("t-1130","11:30"))
      else if (n === "Shraddha P") { const s = spTime[fmt(day)] || "7:30"; put("CallCenter", n, day, badge(tc[s], s)) }
      else if (n === swapped) {
        const ss = spTime[fmt(day)]
        if (!ss) { const r = pick(["7:30","8:00"]); put("CallCenter", n, day, badge(tc[r], r)) }
        else if (ss === "7:30") put("CallCenter", n, day, badge("t-800","8:00"))
        else if (ss === "8:00") put("CallCenter", n, day, badge("t-730","7:30"))
        else if (ss === "10:30") { const r = pick(["7:30","8:00"]); put("CallCenter", n, day, badge(tc[r], r)) }
      }
    })

    // Appointment Desk
    appt.forEach(n => {
      if (same(day, offs.AppointmentDesk[n])) put("AppointmentDesk", n, day, OFF)
      else { const s = apt[n][fmt(day)] || "9:30"; put("AppointmentDesk", n, day, badge(tc[s], s)) }
    })
  })

  return { Reception: recep, OPD: [...opd,"Anagha"], CallCenter: cc, AppointmentDesk: appt, data: sched }
}

/* ── Stats ── */
function statsHTML(weekDays, ws) {
  const depts = ["Reception","OPD","CallCenter","AppointmentDesk"]
  let html = '<div class="stats-row">'
  depts.forEach(dept => {
    (ws[dept] || []).forEach(name => {
      let shifts = 0, off = 0
      weekDays.forEach(d => {
        const v = ws.data[dept]?.[name]?.[fmt(d)] || ""
        if (v.includes("Off") || v.includes("off")) off++
        else if (v) shifts++
      })
      html += `<span class="stat-chip"><span class="stat-name">${name}</span>${shifts}s <span class="stat-off">${off} off</span></span>`
    })
  })
  return html + '</div>'
}

/* ── Table HTML ── */
function tableHTML(weekDays, ws, idx) {
  const data = ws.data
  const th1 = ['<th rowspan="2">Dept</th><th rowspan="2">Employee</th>']
  const th2 = []

  weekDays.forEach(d => {
    const cls = [isSunday(d) ? "col-sun" : "", isToday(d) ? "col-today" : ""].filter(Boolean).join(" ")
    th1.push(`<th class="${cls}">${dow(d)}</th>`)
    th2.push(`<th class="${cls}">${fmt(d)}</th>`)
  })

  const thead = `<thead><tr>${th1.join("")}</tr><tr>${th2.join("")}</tr></thead>`
  const rows = []

  const addBlock = (dept, staff) =>
    staff.forEach((name, i) => {
      const cells = []
      if (i === 0) cells.push(`<th class="dept" rowspan="${staff.length}">${depLabel(dept)}</th>`)
      cells.push(`<th>${name}</th>`)
      weekDays.forEach(d => {
        const cls = [isSunday(d) ? "col-sun" : "", isToday(d) ? "col-today" : ""].filter(Boolean).join(" ")
        cells.push(`<td class="${cls}">${data[dept][name][fmt(d)] || ""}</td>`)
      })
      rows.push(`<tr>${cells.join("")}</tr>`)
    })

  addBlock("Reception", ws.Reception)
  addBlock("OPD", ws.OPD)
  addBlock("CallCenter", ws.CallCenter)
  addBlock("AppointmentDesk", ws.AppointmentDesk)

  return `<section class="week-card" data-w="${idx}">
    <div class="week-head">
      <span class="week-badge">Week ${idx}</span>
      <span class="week-range">${fmt(weekDays[0])} → ${fmt(weekDays.at(-1))}</span>
    </div>
    <div class="table-scroll"><table>${thead}<tbody>${rows.join("")}</tbody></table></div>
    ${statsHTML(weekDays, ws)}
  </section>`
}

/* ── Legend ── */
function renderLegend() {
  const el = document.getElementById("legend")
  let h = '<span class="legend-label">Shifts</span>'
  LEGEND.forEach(l => { h += `<span class="legend-item"><span class="legend-dot badge ${l.cls}"></span>${l.label}</span>` })
  h += `<span class="legend-item"><span class="legend-dot" style="background:var(--shift-off-bg);border:1px solid var(--shift-off-border)"></span>Off</span>`
  el.innerHTML = h
}

/* ── Render Month ── */
function renderMonth(y, m) {
  const weeks = splitWeeks(y, m)
  const container = document.getElementById("weeks")
  const tabs = document.getElementById("tabs")

  container.innerHTML = ""
  tabs.innerHTML = ""
  cachedWeeks = { y, m, data: [] }

  weeks.forEach((days, i) => {
    const ws = buildWeek(days)
    cachedWeeks.data.push({ days, ws })
    container.insertAdjacentHTML("beforeend", tableHTML(days, ws, i + 1))
    tabs.insertAdjacentHTML("beforeend", `<button class="tab" data-w="${i+1}">Week ${i+1}</button>`)
  })

  document.getElementById("month-name").textContent = `${MONTHS[m]} ${y}`

  const today = new Date()
  let active = 1
  if (today.getFullYear() === y && today.getMonth() === m) {
    const idx = weeks.findIndex(w => w.some(d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()))
    if (idx >= 0) active = idx + 1
  }

  viewAll ? showAll() : activate(active)

  tabs.onclick = e => {
    const w = e.target.dataset.w
    if (w) { viewAll = false; updateToggle(); activate(+w) }
  }

  saveState()
}

/* ── Tab activation ── */
function activate(n) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", +t.dataset.w === n))
  document.querySelectorAll(".week-card").forEach(w => {
    const match = +w.dataset.w === n
    w.classList.toggle("hidden", !match)
    if (match) { w.style.animation = "none"; w.offsetHeight; w.style.animation = "" }
  })
}

function showAll() {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"))
  document.querySelectorAll(".week-card").forEach(w => {
    w.classList.remove("hidden")
    w.style.animation = "none"; w.offsetHeight; w.style.animation = ""
  })
}

function updateToggle() {
  const btn = document.getElementById("view-toggle")
  btn.classList.toggle("active", viewAll)
  btn.querySelector("span") && (btn.querySelector("span").textContent = viewAll ? "Tabbed" : "All Weeks")
  // Update text content after icon
  const svg = btn.querySelector("svg").outerHTML
  btn.innerHTML = svg + (viewAll ? " Tabbed" : " All Weeks")
}

/* ── Excel Download ── */
function dlWeek(table, name) {
  if (!table) return
  const now = new Date()
  const pad = n => String(n).padStart(2, "0")
  const ds = `${pad(now.getDate())} ${now.toLocaleString("en-US",{month:"short"})} ${now.getFullYear()}`
  let h = now.getHours(), mi = pad(now.getMinutes())
  const ap = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  const ts = `${pad(h)}.${mi} ${ap}`

  const style = `<style>
    body{background:#1e263d;margin:0}
    table{margin:36px auto;background:#262f49;border-radius:18px;border-collapse:separate!important;border-spacing:0;box-shadow:0 6px 40px #0006;font-family:Inter,Segoe UI,sans-serif}
    thead th{background:linear-gradient(90deg,#33408e,#5b7cfa 60%,#30c9e8);font-size:1.05rem;color:#f3f7ff;border-right:1.5px solid #253a65;border-bottom:2.5px solid #3c6ee0;padding:14px 12px;font-weight:bold;text-align:center}
    thead tr:nth-child(2) th{background:#21305b;color:#dbeafe;font-weight:600;border-bottom:1.5px solid #4f5bbd}
    tbody th{background:#212a3d;color:#ffe2f1;font-weight:bold;text-align:left;padding:12px;border-right:1px solid #313970;border-bottom:1px solid #2c335a}
    tbody td{padding:11px 6px;color:#f3f7ff;text-align:center;font-size:1rem;border-right:1px solid #313970;border-bottom:1px solid #242b4f;background:rgba(35,45,63,.91)}
    tbody tr:nth-child(even) td{background:#293354}
    .badge,.off{border-radius:8px;padding:5px 9px;font-weight:600;display:inline-block;font-size:1rem}
    .badge{background:#4750b4;color:#fff}.off{color:#ec6174;background:rgba(240,51,80,.12);border:1px dashed #e67397}
  </style>`

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8">${style}</head>
    <body><div style="text-align:center;padding:20px;color:#95b8ff;font-size:1.1rem;font-weight:600">${name} | ${ds} ${ts}</div>${table.outerHTML}</body></html>`

  const blob = new Blob([html], { type: "application/vnd.ms-excel" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${name} - ${ds} - ${ts}.xls`
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ── Button Loading ── */
function btnLoad(btn, text, anim = "spin") {
  if (btn.dataset.loading === "true") return
  btn.dataset.loading = "true"
  btn.classList.add("loading")
  const orig = btn.dataset.orig || btn.innerHTML
  btn.dataset.orig = orig
  let dots = 0
  btn.innerHTML = `<span class="spinner-${anim}">⏳</span> ${text}`
  const iv = setInterval(() => { dots = (dots+1)%4; btn.innerHTML = `<span class="spinner-${anim}">⏳</span> ${text}${".".repeat(dots)}` }, 350)
  return msg => {
    clearInterval(iv)
    btn.innerHTML = `✓ ${msg}`
    btn.classList.remove("loading")
    setTimeout(() => { btn.innerHTML = orig; btn.dataset.loading = "false" }, 1000)
  }
}

/* ── Theme ── */
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme")
  document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark")
  saveState()
}

/* ── Fullscreen ── */
function toggleFS() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
  else document.exitFullscreen().catch(() => {})
}

/* ── Month Nav ── */
function prevMonth() { currentDate.setMonth(currentDate.getMonth() - 1); renderMonth(currentDate.getFullYear(), currentDate.getMonth()) }
function nextMonth() { currentDate.setMonth(currentDate.getMonth() + 1); renderMonth(currentDate.getFullYear(), currentDate.getMonth()) }
function goToday() { currentDate = new Date(); renderMonth(currentDate.getFullYear(), currentDate.getMonth()) }

/* ── Keyboard ── */
function onKey(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "ArrowLeft") { e.preventDefault(); prevMonth() }
    else if (e.key === "ArrowRight") { e.preventDefault(); nextMonth() }
  } else {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      const a = document.querySelector(".tab.active")
      if (a && +a.dataset.w > 1) { viewAll = false; updateToggle(); activate(+a.dataset.w - 1) }
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      const a = document.querySelector(".tab.active")
      const total = document.querySelectorAll(".tab").length
      if (a && +a.dataset.w < total) { viewAll = false; updateToggle(); activate(+a.dataset.w + 1) }
    }
  }
}

/* ── Init ── */
function init() {
  loadState()
  renderLegend()
  renderMonth(currentDate.getFullYear(), currentDate.getMonth())

  document.getElementById("regen").onclick = () => {
    const done = btnLoad(document.getElementById("regen"), "Generating")
    setTimeout(() => { renderMonth(currentDate.getFullYear(), currentDate.getMonth()); done("Ready!") }, 600)
  }

  document.getElementById("dl").onclick = () => {
    const done = btnLoad(document.getElementById("dl"), "Exporting", "bounce")
    setTimeout(() => {
      const t = document.querySelector(".week-card:not(.hidden) table")
      const n = document.querySelector(".tab.active")?.textContent.trim() || "Week"
      dlWeek(t, n); done("Done!")
    }, 500)
  }

  document.getElementById("dl-all").onclick = () => {
    const done = btnLoad(document.getElementById("dl-all"), "Exporting", "bounce")
    setTimeout(() => {
      document.querySelectorAll(".week-card table").forEach((t, i) => setTimeout(() => dlWeek(t, `Week ${i+1}`), i * 400))
      done("Done!")
    }, 500)
  }

  document.getElementById("view-toggle").onclick = () => {
    viewAll = !viewAll
    updateToggle()
    if (viewAll) showAll()
    else {
      const today = new Date()
      let a = 1
      if (cachedWeeks && today.getFullYear() === cachedWeeks.y && today.getMonth() === cachedWeeks.m) {
        const idx = cachedWeeks.data.findIndex(w => w.days.some(d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()))
        if (idx >= 0) a = idx + 1
      }
      activate(a)
    }
  }

  document.getElementById("theme-toggle").onclick = toggleTheme
  document.getElementById("fullscreen-btn").onclick = toggleFS
  document.getElementById("prev-month").onclick = prevMonth
  document.getElementById("next-month").onclick = nextMonth
  document.getElementById("go-today").onclick = goToday
  document.addEventListener("keydown", onKey)
}

document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init()
