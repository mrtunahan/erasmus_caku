export const SINIF_COLORS = {
    1: { bg: "#B2EBF2", text: "#006064", label: "1. Sınıf" },
    2: { bg: "#C8E6C9", text: "#1B5E20", label: "2. Sınıf" },
    3: { bg: "#FFE0B2", text: "#E65100", label: "3. Sınıf" },
    4: { bg: "#F8BBD0", text: "#880E4F", label: "4. Sınıf" },
    5: { bg: "#E1BEE7", text: "#4A148C", label: "Seçmeli Dersler" },
};

export const DEPT_CLASSROOMS = [
    { name: "M11101", capacity: 42 },
    { name: "M10Z07", capacity: 49 },
    { name: "M11103", capacity: 58 },
];

export const DEPT_SUPERVISORS = [
    "Arş. Gör. A. Tunahan KORKMAZ",
    "Arş. Gör. Öznur Şifa AKÇAM",
    "Arş. Gör. İrem Nur ECEMİŞ ÖZDEMİR",
];

export const EXAM_TYPES = [
    { value: "vize", label: "Vize", weeks: 1 },
    { value: "final", label: "Final", weeks: 2 },
    { value: "but", label: "Bütünleme", weeks: 1 },
];

// Time slots generation
export const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
        if (h === 8 && m === 0) continue;
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        TIME_SLOTS.push(`${hh}:${mm}`);
  }
}
