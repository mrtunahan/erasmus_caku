// ══════════════════════════════════════════════════════════════
// SALON / SINIF KULLANIMI — SINAVDA MI, DERS PROGRAMINDA MI?
//
// Bölüm Yönetimi → Sınıf / Salon listesindeki her kayıt (sınıf, oda, lab)
// sınavda, ders programında ya da ikisinde birden kullanılır. Bölüm
// yetkilisi bunu kayıtta `kullanim` alanıyla belirler:
//   'her_ikisi' (varsayılan) | 'sinav' | 'ders'
// Alanı olmayan eski kayıt "her ikisi" sayılır: bugüne kadar bütün salonlar
// iki yerde de kullanılıyordu, bu davranış bozulmaz.
//
// Sınav Otomasyonu otomatik salon atamasını ve bölüm yetkilisinin salon
// listesini YALNIZ sınav salonlarından yapar; Ders Programı derslik
// listesini yalnız ders salonlarından gösterir. Fakülte yetkilisi elle
// fakültenin bütün salonlarından seçebilir.
// ══════════════════════════════════════════════════════════════

export const SALON_KULLANIMLARI = [
  { deger: 'her_ikisi', etiket: 'Sınav ve ders programı' },
  { deger: 'sinav', etiket: 'Yalnız sınav' },
  { deger: 'ders', etiket: 'Yalnız ders programı' },
];

/** Kaydın kullanım değeri; tanınmayan ya da boş değer 'her_ikisi'. */
export function salonKullanimi(salon) {
  const k = String((salon && salon.kullanim) || '').trim();
  return k === 'sinav' || k === 'ders' ? k : 'her_ikisi';
}

export const sinavSalonuMu = (salon) => salonKullanimi(salon) !== 'ders';
export const dersSalonuMu = (salon) => salonKullanimi(salon) !== 'sinav';

/** Kullanım etiketi (liste rozetinde). */
export function salonKullanimEtiketi(salon) {
  const k = salonKullanimi(salon);
  return (SALON_KULLANIMLARI.find((x) => x.deger === k) || SALON_KULLANIMLARI[0]).etiket;
}
