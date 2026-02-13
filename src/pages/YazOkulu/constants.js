// Yaz Okulu sabitleri

export const YAZ_OKULU_STATUS = {
  DRAFT: 'taslak',
  SUBMITTED: 'gonderildi',
  APPROVED: 'onaylandi',
  REJECTED: 'reddedildi',
};

export const STATUS_LABELS = {
  taslak: 'Taslak',
  gonderildi: 'Gönderildi',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
};

export const STATUS_COLORS = {
  taslak: { color: '#F59E0B', bg: '#FEF3C7' },
  gonderildi: { color: '#3B82F6', bg: '#DBEAFE' },
  onaylandi: { color: '#10B981', bg: '#D1FAE5' },
  reddedildi: { color: '#EF4444', bg: '#FEE2E2' },
};

// Ders statüsü seçenekleri (intibak tablosu sağ taraf)
export const DERS_STATUSU = ['Zorunlu', 'Seçmeli', 'Ortak Zorunlu'];

// Boş başvuru şablonu
export const EMPTY_APPLICATION = {
  // Öğrenci bilgileri
  studentNo: '',
  studentName: '',
  academicYear: '',
  semester: 'Yaz',
  // Diğer üniversite bilgileri
  otherUniversity: '',
  otherFaculty: '',
  otherDepartment: '',
  // ÇAKÜ bilgileri
  cakuFaculty: '',
  cakuDepartment: '',
  // Ders eşleştirmeleri
  courseMatches: [
    {
      // Diğer üniversitede alınan ders
      extCode: '',
      extName: '',
      extAKTS: '',
      extGrade: '',
      // ÇAKÜ'de muaf olunacak ders
      cakuCode: '',
      cakuName: '',
      cakuAKTS: '',
      cakuGrade: '', // dönüştürülmüş not
      cakuStatus: 'Zorunlu',
    }
  ],
  // Durum
  status: 'taslak',
  createdAt: null,
  updatedAt: null,
};
