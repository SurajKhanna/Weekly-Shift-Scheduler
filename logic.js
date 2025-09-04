/* ========= Utility helpers - Basic helper functions ========= */
// const fmt  = d => d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
console.log(
  "%c Made with ❤️ by Suraj Khanna ",
  "color:#5b7cfa; font-size:14px; font-weight:bold;"
)

// Date ko US format mein convert karta hai - makes date look like "4 Sep 2025"
const fmt = (dateToFormat) =>
  dateToFormat.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

// Day of week nikalta hai - like "Monday", "Tuesday" etc
const dow = (dateToCheck) => dateToCheck.toLocaleDateString("en-IN", { weekday: "long" })

// Array se random item pick karta hai - jaise lucky draw
const pick = (arrayToPickFrom) => arrayToPickFrom[(Math.random() * arrayToPickFrom.length) | 0]

// Array ko shuffle karta hai - cards shuffle karne jaisa
const shuffle = (arrayToShuffle) => [...arrayToShuffle].sort(() => Math.random() - 0.5)

// Do dates same hai ya nahi check karta hai
const same = (firstDate, secondDate) => firstDate && secondDate && firstDate.getTime() === secondDate.getTime()

/* ========= Fixed staff - Permanent employee list for cloning ========= */
const Departments = {
  Reception: ["Sagar", "Roshan", "Karan"],
  OPD: ["Anagha", "Shraddha Tipale", "Shubhangi", "Mamta"],
  CallCenter: ["Jayshree", "Shraddha P", "Prasad"],
  AppointmentDesk: ["Vanita", "Gaurav"],
}

/* ========= Split month into weeks - Month ko weeks mein baantna ========= */
function splitWeeks(yearToSplit, monthToSplit) {
  const monthLength = new Date(yearToSplit, monthToSplit + 1, 0).getDate() // Month mein kitne din hai
  const allDaysInMonth = [], // Saare din store karne ke liye
        weeksArray = [], // Final weeks array
        currentWeek = [] // Current week building karne ke liye
  
  // Month ke saare dates banao
  for (let dayNumber = 1; dayNumber <= monthLength; dayNumber++) {
    allDaysInMonth.push(new Date(yearToSplit, monthToSplit, dayNumber))
  }

  // Har day check karo and weeks banao
  allDaysInMonth.forEach((currentDate) => {
    currentWeek.push(currentDate)
    if (currentDate.getDay() === 0) {
      // Sunday hai matlab week khatam - Sunday → end of week
      weeksArray.push(currentWeek.slice()) // Copy banao current week ka
      currentWeek.length = 0 // Array clear karo
    }
  })

  // Agar last week incomplete hai, toh next month se days add karo until Sunday
  if (currentWeek.length) {
    let nextMonthDate = new Date(yearToSplit, monthToSplit + 1, 1)
    while (nextMonthDate.getDay() !== 0) {
      // Sunday tak add karte raho
      currentWeek.push(new Date(nextMonthDate))
      nextMonthDate.setDate(nextMonthDate.getDate() + 1)
    }
    currentWeek.push(new Date(nextMonthDate)) // Sunday bhi include karo
    weeksArray.push(currentWeek)
  }
  return weeksArray
}

/* ========= Build table - HTML table banane ke liye ========= */
// Department names ko proper labels deta hai
const depLabel = (departmentName) =>
  ({
    Reception: "Reception (GF)",
    OPD: "OPD (1F)", 
    CallCenter: "Call Center (B1)",
    AppointmentDesk: "Appointment Desk (1F)",
  }[departmentName])

// Week ka complete HTML table banata hai
function tableHTML(weekDays, weekScheduleObject, weekIndex) {
  const scheduleData = weekScheduleObject.data
  
  // Table headers banao - department aur employee names ke liye
  const topHeaders = [
    '<th rowspan="2">Department</th><th rowspan="2">Name of Employee</th>',
  ]
  const dateHeaders = []
  
  // Har din ke liye headers add karo
  weekDays.forEach((currentDay) => {
    topHeaders.push(`<th>${dow(currentDay)}</th>`) // Day name like Monday
    dateHeaders.push(`<th>${fmt(currentDay)}</th>`) // Date like 4 Sep
  })
  
  const tableHead = `<thead><tr>${topHeaders.join("")}</tr><tr>${dateHeaders.join("")}</tr></thead>`
  const tableRows = []
  
  // Department wise rows banane ka function
  const createDepartmentBlock = (deptName, employeeArray) =>
    employeeArray.forEach((personName, employeeIndex) => {
      const rowCells = []
      
      // Pehla employee hai toh department name add karo
      if (employeeIndex === 0)
        rowCells.push(
          `<th class="dept" rowspan="${employeeArray.length}">${depLabel(deptName)}</th>`
        )
      
      rowCells.push(`<th>${personName}</th>`) // Employee name
      
      // Har din ke liye schedule add karo
      weekDays.forEach((dayToCheck) =>
        rowCells.push(`<td>${scheduleData[deptName][personName][fmt(dayToCheck)] || ""}</td>`)
      )
      tableRows.push(`<tr>${rowCells.join("")}</tr>`)
    })

  // Saare departments ke blocks banao
  createDepartmentBlock("Reception", weekScheduleObject.Reception)
  createDepartmentBlock("OPD", weekScheduleObject.OPD)
  createDepartmentBlock("CallCenter", weekScheduleObject.CallCenter)
  createDepartmentBlock("AppointmentDesk", weekScheduleObject.AppointmentDesk)

  return `<section class="card week" data-w="${weekIndex}">
    <div style="margin-bottom:8px"><span class="badge t-7">Week ${weekIndex}</span>
      <small class="muted">(${fmt(weekDays[0])} → ${fmt(weekDays.at(-1))})</small>
    </div><br> <div class="table-wrap"> <table>${tableHead}<tbody>${tableRows.join(
    ""
  )}</tbody></table> </div> </section>`
}

/* ========= Render month - Pura month display karna ========= */
function renderMonth(yearToRender, monthToRender) {
  const monthWeeks = splitWeeks(yearToRender, monthToRender),
        mainContainer = document.getElementById("weeks"),
        tabsContainer = document.getElementById("tabs")
  
  // Containers clear karo
  mainContainer.innerHTML = ""
  tabsContainer.innerHTML = ""
  
  // Har week ke liye table aur tab banao
  monthWeeks.forEach((weekDays, weekIndex) => {
    const weekSchedule = buildWeek(weekDays)
    mainContainer.insertAdjacentHTML("beforeend", tableHTML(weekDays, weekSchedule, weekIndex + 1))
    tabsContainer.insertAdjacentHTML(
      "beforeend",
      `<button class="tab" data-w="${weekIndex + 1}">Week ${weekIndex + 1}</button>`
    )
  })
  
  // Current week find karo and activate karo
  const todayDate = new Date(),
        currentWeekIndex =
          todayDate.getFullYear() === yearToRender && todayDate.getMonth() === monthToRender
            ? monthWeeks.findIndex((weekToCheck) =>
                weekToCheck.some((dayToCheck) => dayToCheck.getDate() === todayDate.getDate())
              ) + 1
            : 1
            
  activate(currentWeekIndex)
  
  // Tab click handlers
  tabsContainer.onclick = (clickEvent) => {
    const weekNumber = clickEvent.target.dataset.w
    weekNumber && activate(+weekNumber)
  }
}

// Particular week ko active karta hai
function activate(weekNumber) {
  // Saare tabs se active class hatao, selected wale mein lagao
  document
    .querySelectorAll(".tab")
    .forEach((tabElement) => tabElement.classList.toggle("active", +tabElement.dataset.w === weekNumber))
    
  // Saare weeks hide karo, selected wala show karo
  document
    .querySelectorAll(".week")
    .forEach((weekElement) => weekElement.classList.toggle("hidden", +weekElement.dataset.w !== weekNumber))
}

/* ========= Excel export - Excel file download karne ke liye ========= */
function download() {
  const currentTable = document.querySelector(".week:not(.hidden) table")
  if (!currentTable) return // Koi table nahi mili toh return

  // Week name nikalo
  let weekNameForFile =
    document.querySelector(".tab.active")?.textContent.trim() ||
    document
      .querySelector(".week:not(.hidden) .badge.t-7")
      ?.textContent.trim() ||
    "Week"

  // Current date and time nikalo filename ke liye
  const currentDateTime = new Date()
  const padNumber = (numberToPad) => String(numberToPad).padStart(2, "0")
  const dateStringForFile = `${padNumber(currentDateTime.getDate())} ${currentDateTime.toLocaleString("en-US", {
    month: "short",
  })} ${currentDateTime.getFullYear()}`
  
  // Time formatting - 12 hour format
  let hourFor12Format = currentDateTime.getHours(),
      minutesFormatted = padNumber(currentDateTime.getMinutes())
  const amPmIndicator = hourFor12Format >= 12 ? "PM" : "AM"
  hourFor12Format = hourFor12Format % 12
  if (hourFor12Format === 0) hourFor12Format = 12
  const timeStringForFile = `${padNumber(hourFor12Format)}.${minutesFormatted} ${amPmIndicator}`
  
  // Final filename banao
  const filenameToSave = `${weekNameForFile} - ${dateStringForFile} - ${timeStringForFile}.xls`

  // Excel ke liye styling - fancy colors aur formatting
  const excelStyling = `
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
  `

  // Complete HTML banao Excel ke liye
  const htmlForExcel = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8">${excelStyling}</head>
      <body>
        <section>
          <div style="margin-bottom:17px; font-size:1.18rem; color:#95b8ff; font-weight:600; letter-spacing:0.7px;">
            ${weekNameForFile} | Exported on ${dateStringForFile} ${timeStringForFile}
          </div>
          ${currentTable.outerHTML}
        </section>
      </body>
    </html>
  `

  // File download karo
  const excelBlob = new Blob([htmlForExcel], { type: "application/vnd.ms-excel" })
  const downloadLink = document.createElement("a")
  downloadLink.href = URL.createObjectURL(excelBlob)
  downloadLink.download = filenameToSave
  downloadLink.click()
}

/* ========= Animated button helpers - Button animations ke liye ========= */
function setButtonLoading(buttonElement, loadingText, emojiForLoading = "🔄", animationStyle = "spin") {
  // Agar button already loading hai toh return
  if (buttonElement.dataset.loading === "true") return
  buttonElement.dataset.loading = "true"
  buttonElement.classList.add("loading")

  // Original text save karo
  const originalButtonText = buttonElement.dataset.originalText || buttonElement.textContent
  buttonElement.dataset.originalText = originalButtonText

  let dotCounter = 0
  buttonElement.innerHTML = `<span class="spinner-${animationStyle}">${emojiForLoading}</span> ${loadingText}`

  // Dots animation - har 500ms mein dots change karo
  const dotInterval = setInterval(() => {
    dotCounter = (dotCounter + 1) % 4
    buttonElement.innerHTML = `<span class="spinner-${animationStyle}">${emojiForLoading}</span> ${loadingText}${".".repeat(
      dotCounter
    )}`
  }, 500)

  // Success function return karo
  return (successMessage = "✅ Done!") => {
    clearInterval(dotInterval)
    buttonElement.textContent = successMessage
    buttonElement.classList.remove("loading")
    // 1.5 second baad original text wapas lao
    setTimeout(() => {
      buttonElement.textContent = originalButtonText
      buttonElement.dataset.loading = "false"
    }, 1500)
  }
}

/* ========= Buttons & bootstrap - Button events aur initial load ========= */
// Regenerate button - Nayi schedule banane ke liye
document.getElementById("regen").onclick = () => {
  const regenButton = document.getElementById("regen")
  const finishLoading = setButtonLoading(regenButton, "Regenerating", "🔄", "spin")
  setTimeout(() => {
    renderMonth(currentDate.getFullYear(), currentDate.getMonth())
    finishLoading("✅ Roster Ready!")
  }, 1200)
}

// Download button - Excel download ke liye
document.getElementById("dl").onclick = () => {
  const downloadButton = document.getElementById("dl")
  const finishDownload = setButtonLoading(downloadButton, "Downloading", "⬇️", "bounce")
  setTimeout(() => {
    download()
    finishDownload("✅ Downloaded!")
  }, 1200)
}

// Page load hote hi current month ka schedule banao
const currentDate = new Date()
renderMonth(currentDate.getFullYear(), currentDate.getMonth())

// Main buildWeek function - Ek week ka complete schedule banata hai
function buildWeek(weekDays) {
  // Random decide karo ki Jayshree aur Shubhangi ko swap karna hai ya nahi
  const shouldSwapThisWeek = Math.random() < 0.5

  // Staff arrays banao - original list se copy karo aur sort karo
  let receptionStaffList = [...Departments.Reception].sort()
  
  // OPD staff - Shubhangi aur Anagha ko temporarily hatao
  let opdStaffList = [...Departments.OPD]
    .filter((employeeName) => employeeName !== "Shubhangi" && employeeName !== "Anagha")
    .sort()
    
  // Call center staff - Jayshree ko temporarily hatao  
  let callCenterStaffList = [...Departments.CallCenter]
    .filter((employeeName) => employeeName !== "Jayshree")
    .sort()
    
  // Weekly swap logic - Jayshree aur Shubhangi ka departments
  if (shouldSwapThisWeek) {
    opdStaffList.push("Jayshree")      // Jayshree goes to OPD
    callCenterStaffList.push("Shubhangi") // Shubhangi goes to Call Center
  } else {
    opdStaffList.push("Shubhangi")     // Shubhangi stays in OPD
    callCenterStaffList.push("Jayshree")  // Jayshree stays in Call Center
  }
  
  // Re-sort after adding swapped employees
  opdStaffList.sort()
  callCenterStaffList.sort()
  let appointmentDeskStaffList = [...Departments.AppointmentDesk].sort()

  // Schedule object banao - har department aur employee ke liye
  const scheduleObject = {}
  ;[
    receptionStaffList,
    [...opdStaffList, "Anagha"], // Anagha ko wapas add karo OPD mein
    callCenterStaffList,
    appointmentDeskStaffList,
  ].forEach((staffArray, departmentIndex) => {
    const deptName = ["Reception", "OPD", "CallCenter", "AppointmentDesk"][departmentIndex]
    scheduleObject[deptName] = {}
    staffArray.forEach((personName) => (scheduleObject[deptName][personName] = {}))
  })

  // Unique off days assign karne ka function - har department mein alag alag din off
  function assignUniqueOffs(staffArray, availableDays) {
    let offsObject = {}
    let daysAvailable = [...availableDays]
    staffArray.forEach((employeeName) => {
      if (daysAvailable.length === 0) daysAvailable = [...availableDays] // Days khatam ho gaye toh recycle
      let selectedDay = pick(daysAvailable)
      offsObject[employeeName] = selectedDay
      // Selected day ko remove karo taaki duplicate na ho
      daysAvailable = daysAvailable.filter((dayToCheck) => !same(dayToCheck, selectedDay))
    })
    return offsObject
  }

  // Har department ke liye off days decide karo
  const offDaysForDepartments = {
    Reception: assignUniqueOffs(receptionStaffList, (allWeekDays = [...weekDays])),
    OPD: assignUniqueOffs([...opdStaffList, "Anagha"], [...weekDays]),
    CallCenter: assignUniqueOffs(callCenterStaffList, [...weekDays]),
    AppointmentDesk: assignUniqueOffs(appointmentDeskStaffList, [...weekDays]),
  }

  // Shraddha P ka special schedule - Call Center mein variety chahiye
  const shraddhaPTimings = {}
  let workingDays = weekDays.filter((dayToCheck) => dayToCheck.getDay() !== 0) // Sunday ko chhod do
  let tenThirtySelectedDay = pick(workingDays) // Ek din 10:30 shift
  let sevenThirtyCount = 0,
      eightOClockCount = 0
      
  workingDays.forEach((currentDay) => {
    if (same(currentDay, tenThirtySelectedDay)) {
      shraddhaPTimings[fmt(currentDay)] = "10:30"
    } else {
      // 7:30 aur 8:00 mein balance banao - max 3-3
      if (sevenThirtyCount < 3 && eightOClockCount < 3) {
        if (Math.random() < 0.5) {
          shraddhaPTimings[fmt(currentDay)] = "7:30"
          sevenThirtyCount++
        } else {
          shraddhaPTimings[fmt(currentDay)] = "8:00"
          eightOClockCount++
        }
      } else if (sevenThirtyCount >= 3) {
        shraddhaPTimings[fmt(currentDay)] = "8:00"
        eightOClockCount++
      } else {
        shraddhaPTimings[fmt(currentDay)] = "7:30"
        sevenThirtyCount++
      }
    }
  })

  // Appointment Desk ka alternating schedule - Vanita aur Gaurav alternate shifts
  const appointmentDeskTimings = { Vanita: {}, Gaurav: {} }
  let nonSundayDays = weekDays.filter((dayToCheck) => dayToCheck.getDay() !== 0)
  let isVanitaMorning = true // Starting with Vanita morning shift
  
  nonSundayDays.forEach((currentDay) => {
    const vanitaSlot = isVanitaMorning ? "9:30" : "2"      // Morning ya afternoon
    const gauravSlot = isVanitaMorning ? "2" : "9:30"      // Opposite of Vanita
    appointmentDeskTimings["Vanita"][fmt(currentDay)] = vanitaSlot
    appointmentDeskTimings["Gaurav"][fmt(currentDay)] = gauravSlot
    isVanitaMorning = !isVanitaMorning // Next day flip karo
  })

  // Helper functions - Schedule mein data daalne ke liye
  const putSchedule = (departmentName, employeeName, dayDate, scheduleValue) => 
    (scheduleObject[departmentName][employeeName][fmt(dayDate)] = scheduleValue)
    
  const createBadge = (cssClass, displayText) => `<span class="badge ${cssClass}">${displayText}</span>`
  
  const OFF_DISPLAY = '<span class="off">Week&nbsp;Off</span>'
  
  // Time slots ke liye CSS classes
  const timeSlotClasses = {
    N: "t-N",
    7: "t-7", 
    2: "t-2",
    "9:00": "t-9",
    "9:30": "t-930",
    "10:30": "t-1030",
    "7:30": "t-730",
    "8:00": "t-800", 
    "11:30": "t-1130",
  }

  // Har din ka schedule fill karo
  weekDays.forEach((currentDay, dayIndex) => {
    // ---------- Reception Department ----------
    receptionStaffList.forEach((employeeName) => {
      if (same(currentDay, offDaysForDepartments.Reception[employeeName])) {
        putSchedule("Reception", employeeName, currentDay, OFF_DISPLAY)
      } else if (employeeName === "Karan") {
        // Karan hamesha Night shift
        putSchedule("Reception", employeeName, currentDay, createBadge("t-N", "N"))
      } else if (employeeName === "Sagar") {
        // Sagar alternate karta hai 7 aur 2 shift mein
        putSchedule(
          "Reception",
          employeeName, 
          currentDay,
          createBadge(timeSlotClasses[dayIndex % 2 === 0 ? "7" : "2"], dayIndex % 2 === 0 ? "7" : "2")
        )
      } else if (employeeName === "Roshan") {
        // Roshan opposite of Sagar - jab Sagar 7 tab ye 2
        putSchedule(
          "Reception",
          employeeName,
          currentDay, 
          createBadge(timeSlotClasses[dayIndex % 2 === 0 ? "2" : "7"], dayIndex % 2 === 0 ? "2" : "7")
        )
      }
    })

    // ---------- OPD Department ---------- 
    let opdTimeSlots = ["9:30", "10:30"] // Do slots available
    opdStaffList.forEach((employeeName, employeeIndex) => {
      if (same(currentDay, offDaysForDepartments.OPD[employeeName])) {
        putSchedule("OPD", employeeName, currentDay, OFF_DISPLAY)
      } else {
        // Cycle through time slots based on day and employee index
        const assignedSlot = opdTimeSlots[(employeeIndex + dayIndex) % 2]
        putSchedule("OPD", employeeName, currentDay, createBadge(timeSlotClasses[assignedSlot], assignedSlot))
      }
    })
    
    // Anagha ka special case - hamesha 9:00 shift
    if (same(currentDay, offDaysForDepartments.OPD["Anagha"])) {
      putSchedule("OPD", "Anagha", currentDay, OFF_DISPLAY)
    } else {
      putSchedule("OPD", "Anagha", currentDay, createBadge("t-9", "9:00"))
    }

    // ---------- Call Center Department ----------
    let swappedEmployee = shouldSwapThisWeek ? "Shubhangi" : "Jayshree" // Kon swap hua hai
    callCenterStaffList.forEach((employeeName) => {
      if (same(currentDay, offDaysForDepartments.CallCenter[employeeName])) {
        putSchedule("CallCenter", employeeName, currentDay, OFF_DISPLAY)
      } else if (employeeName === "Prasad") {
        // Prasad hamesha 11:30 shift
        putSchedule("CallCenter", employeeName, currentDay, createBadge("t-1130", "11:30"))
      } else if (employeeName === "Shraddha P") {
        // Shraddha P ka pre-planned schedule use karo
        let assignedSlot = shraddhaPTimings[fmt(currentDay)] || "7:30"
        putSchedule("CallCenter", employeeName, currentDay, createBadge(timeSlotClasses[assignedSlot], assignedSlot))
      } else if (employeeName === swappedEmployee) {
        // Swapped employee ka timing Shraddha P ke opposite rakho
        let shraddhaSlot = shraddhaPTimings[fmt(currentDay)]
        if (!shraddhaSlot) {
          // Agar Shraddha ka slot nahi mila toh random assign karo
          let randomSlot = pick(["7:30", "8:00"])
          putSchedule("CallCenter", employeeName, currentDay, createBadge(timeSlotClasses[randomSlot], randomSlot))
        } else if (shraddhaSlot === "7:30") {
          // Shraddha 7:30 hai toh ye 8:00 lega
          putSchedule("CallCenter", employeeName, currentDay, createBadge("t-800", "8:00"))
        } else if (shraddhaSlot === "8:00") {
          // Shraddha 8:00 hai toh ye 7:30 lega
          putSchedule("CallCenter", employeeName, currentDay, createBadge("t-730", "7:30"))
        } else if (shraddhaSlot === "10:30") {
          // Shraddha 10:30 hai toh koi bhi de sakte hai
          let randomSlot = pick(["7:30", "8:00"])
          putSchedule("CallCenter", employeeName, currentDay, createBadge(timeSlotClasses[randomSlot], randomSlot))
        }
      }
    })

    // ---------- Appointment Desk Department ----------
    appointmentDeskStaffList.forEach((employeeName) => {
      if (same(currentDay, offDaysForDepartments.AppointmentDesk[employeeName])) {
        putSchedule("AppointmentDesk", employeeName, currentDay, OFF_DISPLAY)
      } else {
        // Pre-planned alternating schedule use karo
        const assignedSlot = appointmentDeskTimings[employeeName][fmt(currentDay)] || "9:30"
        putSchedule("AppointmentDesk", employeeName, currentDay, createBadge(timeSlotClasses[assignedSlot], assignedSlot))
      }
    })
  })

  // Final week object return karo with all staff lists and schedule data
  return {
    Reception: receptionStaffList,
    OPD: [...opdStaffList, "Anagha"], // Anagha ko wapas add kar diya
    CallCenter: callCenterStaffList,
    AppointmentDesk: appointmentDeskStaffList,
    data: scheduleObject, // Actual schedule data
  }
}
