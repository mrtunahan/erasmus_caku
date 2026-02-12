
import { GRADE_CONVERSION } from './constants';

export const convertGrade = (inputGrade, system = "auto") => {
    if (!inputGrade) return "Muaf";
    const grade = inputGrade.toString().trim().toUpperCase();
    if (system === "auto") {
        if (/^[A-F]X?$/.test(grade)) return GRADE_CONVERSION.ectsGrades[grade] || grade;
        if (GRADE_CONVERSION.letterGrades[grade]) return GRADE_CONVERSION.letterGrades[grade];
        const num = parseFloat(grade);
        if (!isNaN(num)) {
            if (num <= 4) return GRADE_CONVERSION.numericToGrade(num * 25);
            if (num <= 5) return GRADE_CONVERSION.scale5a[grade] || GRADE_CONVERSION.numericToGrade(num * 20);
            if (num <= 10) return GRADE_CONVERSION.scale10[Math.floor(num).toString()] || GRADE_CONVERSION.numericToGrade(num * 10);
            return GRADE_CONVERSION.numericToGrade(num);
        }
        const lowerGrade = inputGrade.toLowerCase();
        if (GRADE_CONVERSION.table1[lowerGrade]) return GRADE_CONVERSION.table1[lowerGrade];
    }
    return inputGrade;
};

// ── Word Document Generators ──
export const generateOutgoingWordDoc = (student) => {
    if (!student.outgoingMatches || student.outgoingMatches.length === 0) { alert('Bu öğrencinin henüz gidiş eşleştirmesi bulunmamaktadır.'); return; }
    const totalHomeCredits = student.outgoingMatches.reduce((sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
    const totalHostCredits = student.outgoingMatches.reduce((sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);
    const semester = student.semester || "Fall 2025";
    const [season, year] = semester.split(" ");
    const seasonTR = season === "Fall" ? "Güz" : "Bahar";
    const academicYear = season === "Fall" ? `${year}-${parseInt(year) + 1}` : `${parseInt(year) - 1}-${year}`;
    const donemText = seasonTR;

    // Determine Statüsü: S for elective, Z for others
    const getStatus = (course) => {
        if (!course) return '';
        const name = (course.name || '').toLowerCase();
        return (name.includes('elective') || name.includes('seçmeli')) ? 'S' : 'Z';
    };

    // Host institution header with Faculty of / Department of format
    const hostHeader = `${student.hostInstitution}${student.hostFaculty ? ' Faculty of ' + student.hostFaculty : ''}${student.hostDepartment ? ' Department of ' + student.hostDepartment : ''} Bölümünden Alacağı Dersin`;

    // Build rows: use rowspan when one course matches multiple on the other side
    const rows = [];
    student.outgoingMatches.forEach(match => {
        const hostLen = match.hostCourses.length;
        const homeLen = match.homeCourses.length;
        const maxLen = Math.max(hostLen, homeLen);
        const bd = "border: 1px solid black;";
        for (let i = 0; i < maxLen; i++) {
            let hostCells = '';
            let homeCells = '';
            // Host side (4 cols: Kodu, Adı, AKTS, Dönem)
            if (hostLen === 1 && homeLen > 1) {
                if (i === 0) { const hc = match.hostCourses[0]; hostCells = `<td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.code || '-'}</td><td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.name}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.credits}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.semester || donemText}</td>`; }
            } else {
                const hc = match.hostCourses[i]; hostCells = `<td style='${bd}'>${hc ? (hc.code || '-') : ''}</td><td style='${bd}'>${hc ? hc.name : ''}</td><td style='${bd} text-align: center;'>${hc ? hc.credits : ''}</td><td style='${bd} text-align: center;'>${hc ? (hc.semester || donemText) : ''}</td>`;
            }
            // Home side (5 cols: Kodu, Adı, AKTS, Dönem, Statüsü)
            if (homeLen === 1 && hostLen > 1) {
                if (i === 0) { const mc = match.homeCourses[0]; homeCells = `<td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.code || '-'}</td><td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.name}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.credits}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.semester || donemText}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${getStatus(mc)}</td>`; }
            } else {
                const mc = match.homeCourses[i]; homeCells = `<td style='${bd}'>${mc ? (mc.code || '-') : ''}</td><td style='${bd}'>${mc ? mc.name : ''}</td><td style='${bd} text-align: center;'>${mc ? mc.credits : ''}</td><td style='${bd} text-align: center;'>${mc ? (mc.semester || donemText) : ''}</td><td style='${bd} text-align: center;'>${getStatus(mc)}</td>`;
            }
            rows.push(`<tr>${hostCells}${homeCells}</tr>`);
        }
    });

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Gidiş Değerlendirmesi</title><style>@page { size: A4 landscape; margin: 2cm; }</style></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ GİDİŞ ÖNCESİ DERS EŞLEŞTİRME DEĞERLENDİRMESİ</h3>
<p style='text-align: justify; margin: 20px 0;'>Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${student.lastName}</b>'nın, <b>${academicYear} Eğitim-Öğretim Yılı ${seasonTR} Dönemi</b>'ni ERASMUS+ Öğrenim Hareketliliği programı kapsamında <b>${student.hostCountry}</b>'da bulunan "<b>${student.hostInstitution}</b>"${student.hostFaculty ? ' ' + student.hostFaculty : ''}${student.hostDepartment ? ' ' + student.hostDepartment : ''} Bölümünde alacağı derslerin karşılıklarının uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>
<table border='1' cellpadding='4' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt;'>
<thead><tr style='background-color: #e8e8e8; font-weight: bold; font-size: 8pt;'>
<td colspan='4' style='border: 1px solid black; text-align: center;'><b>${hostHeader}</b></td>
<td colspan='5' style='border: 1px solid black; text-align: center;'><b>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin</b></td>
</tr>
<tr style='background-color: #e0e0e0; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Dönem</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Dönem</th><th style='border: 1px solid black;'>Statüsü</th>
</tr></thead><tbody>
${rows.join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td><td style='border: 1px solid black;'></td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td><td style='border: 1px solid black;'></td><td style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin: 15px 0;'><strong>Öğrenci:</strong> ${student.firstName} ${student.lastName} (${student.studentNumber})</p>
</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${student.lastName}_${student.firstName}_Gidis_Degerlendirme.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

export const generateReturnWordDoc = (student) => {
    if (student.returnMatches.length === 0) { alert('Bu öğrencinin henüz dönüş eşleştirmesi bulunmamaktadır.'); return; }
    const totalHomeCredits = student.returnMatches.reduce((sum, m) => sum + m.homeCourses.reduce((s, c) => s + c.credits, 0), 0);
    const totalHostCredits = student.returnMatches.reduce((sum, m) => sum + m.hostCourses.reduce((s, c) => s + c.credits, 0), 0);
    const semester = student.semester || "Fall 2025";
    const [season, year] = semester.split(" ");
    const seasonTR = season === "Fall" ? "Güz" : "Bahar";
    const academicYear = season === "Fall" ? `${year}-${parseInt(year) + 1}` : `${parseInt(year) - 1}-${year}`;

    // Determine Statüsü: S for elective, Z for others
    const getStatus = (course) => {
        if (!course) return '';
        const name = (course.name || '').toLowerCase();
        return (name.includes('elective') || name.includes('seçmeli')) ? 'S' : 'Z';
    };

    // Host institution header with Faculty of / Department of format
    const hostHeader = `${student.hostInstitution}${student.hostFaculty ? ' Faculty of ' + student.hostFaculty : ''}${student.hostDepartment ? ' Department of ' + student.hostDepartment : ''} Bölümünden Aldığı Dersin`;

    // Build rows: use rowspan when one course matches multiple on the other side
    const rows = [];
    student.returnMatches.forEach(match => {
        const originalHostGrade = match.hostGrade || 'A';
        const converted = convertGrade(originalHostGrade);
        const hostLen = match.hostCourses.length;
        const homeLen = match.homeCourses.length;
        const maxLen = Math.max(hostLen, homeLen);
        const bd = "border: 1px solid black;";
        for (let i = 0; i < maxLen; i++) {
            let hostCells = '';
            let homeCells = '';
            // Host side (4 cols: Kodu, Adı, AKTS, Başarı Notu)
            if (hostLen === 1 && homeLen > 1) {
                if (i === 0) { const hc = match.hostCourses[0]; hostCells = `<td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.code || '-'}</td><td rowspan='${homeLen}' style='${bd} vertical-align: middle;'>${hc.name}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${hc.credits}</td><td rowspan='${homeLen}' style='${bd} text-align: center; vertical-align: middle;'>${originalHostGrade}</td>`; }
            } else {
                const hc = match.hostCourses[i]; hostCells = `<td style='${bd}'>${hc ? (hc.code || '-') : ''}</td><td style='${bd}'>${hc ? hc.name : ''}</td><td style='${bd} text-align: center;'>${hc ? hc.credits : ''}</td><td style='${bd} text-align: center;'>${hc ? originalHostGrade : ''}</td>`;
            }
            // Home side (5 cols: Kodu, Adı, AKTS, Başarı Notu, Statüsü)
            if (homeLen === 1 && hostLen > 1) {
                if (i === 0) { const mc = match.homeCourses[0]; homeCells = `<td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.code || '-'}</td><td rowspan='${hostLen}' style='${bd} vertical-align: middle;'>${mc.name}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${mc.credits}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${converted}</td><td rowspan='${hostLen}' style='${bd} text-align: center; vertical-align: middle;'>${getStatus(mc)}</td>`; }
            } else {
                const mc = match.homeCourses[i]; homeCells = `<td style='${bd}'>${mc ? (mc.code || '-') : ''}</td><td style='${bd}'>${mc ? mc.name : ''}</td><td style='${bd} text-align: center;'>${mc ? mc.credits : ''}</td><td style='${bd} text-align: center;'>${mc ? converted : ''}</td><td style='${bd} text-align: center;'>${getStatus(mc)}</td>`;
            }
            rows.push(`<tr>${hostCells}${homeCells}</tr>`);
        }
    });

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Erasmus Dönüş Muafiyeti</title><style>@page { size: A4 landscape; margin: 2cm; }</style></head>
<body style='font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;'>
<h3 style='text-align: center; margin-bottom: 30px;'>ERASMUS+ DÖNÜŞÜ MUAFİYET İSTEĞİ</h3>
<p style='text-align: justify; margin: 20px 0;'>Bölümümüz <b>${student.studentNumber}</b> numaralı öğrencisi <b>${student.firstName} ${student.lastName}</b>'nın, <b>${academicYear} Akademik Yılı ${seasonTR} Dönemi</b>'nde ERASMUS+ programı kapsamında yurtdışında almış olduğu derslerin, Bilgisayar Mühendisliği Bölümü lisans programında hangi derslere karşılık geldiği, hangi derslere sayılacağının belirlenmesi talebi hakkında vermiş olduğu dilekçesi incelenmiş olup, aşağıda tabloda verildiği şekliyle uygun olduğuna ve gereği için Fakültemiz ilgili kurullarında görüşülmek üzere Dekanlık Makamına sunulmasına,</p>
<table border='1' cellpadding='4' cellspacing='0' style='width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt;'>
<thead><tr style='background-color: #e8e8e8; font-weight: bold; font-size: 8pt;'>
<td colspan='4' style='border: 1px solid black; text-align: center;'><b>${hostHeader}</b></td>
<td colspan='5' style='border: 1px solid black; text-align: center;'><b>Çankırı Karatekin Üniversitesi Mühendislik Fakültesi Bilgisayar Mühendisliği Bölümünde Muaf Olacağı Dersin</b></td>
</tr>
<tr style='background-color: #e0e0e0; font-weight: bold;'>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Başarı Notu</th>
<th style='border: 1px solid black;'>Kodu</th><th style='border: 1px solid black;'>Adı</th><th style='border: 1px solid black;'>AKTS</th><th style='border: 1px solid black;'>Başarı Notu</th><th style='border: 1px solid black;'>Statüsü</th>
</tr></thead><tbody>
${rows.join('')}
<tr style='font-weight: bold; background-color: #f0f0f0;'>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHostCredits}</td><td style='border: 1px solid black;'></td>
<td colspan='2' style='border: 1px solid black; text-align: right;'>Toplam</td><td style='border: 1px solid black; text-align: center;'>${totalHomeCredits}</td><td style='border: 1px solid black;'></td><td style='border: 1px solid black;'></td>
</tr></tbody></table>
<p style='margin: 15px 0;'><strong>Öğrenci:</strong> ${student.firstName} ${student.lastName} (${student.studentNumber})</p>
</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${student.lastName}_${student.firstName}_Donus_Muafiyet.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};
