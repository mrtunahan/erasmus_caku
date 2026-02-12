import { DEPT_CLASSROOMS, DEPT_SUPERVISORS, TIME_SLOTS } from './constants';

export function formatDate(d) {
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

export function formatDateISO(d) {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

export function parseDateISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getDayName(d) {
  const names = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return names[d.getDay()];
}

export function getWeekDays(startDate, weeks) {
  const days = [];
  const start = new Date(startDate);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);

  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      days.push(new Date(d));
    }
  }
  return days;
}

export function timeToSlotIndex(timeStr) {
  const idx = TIME_SLOTS.indexOf(timeStr);
  return idx >= 0 ? idx : 0;
}

export function slotSpan(durationMinutes) {
  return Math.ceil(durationMinutes / 30);
}

export function assignClassroom(studentCount) {
  if (!studentCount || studentCount <= 0) return "M11101";
  if (studentCount <= 42) return "M11101";
  
  let bestPair = null;
  let bestDiff = Infinity;
  for (let i = 0; i < DEPT_CLASSROOMS.length; i++) {
    for (let j = i + 1; j < DEPT_CLASSROOMS.length; j++) {
      const cap = DEPT_CLASSROOMS[i].capacity + DEPT_CLASSROOMS[j].capacity;
      if (cap >= studentCount) {
        const diff = cap - studentCount;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestPair = DEPT_CLASSROOMS[i].name + " - " + DEPT_CLASSROOMS[j].name;
        }
      }
    }
  }
  
  if (!bestPair) {
    const sorted = [...DEPT_CLASSROOMS].sort((a, b) => b.capacity - a.capacity);
    bestPair = sorted[0].name + " - " + sorted[1].name;
  }
  return bestPair;
}
