// ISO "YYYY-MM-DD" -> "GG.AA.YYYY" (Date nesnesi kullanılmaz); boş/geçersizse "-".
export function formatDate(iso) {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '-';
}
// Backend normalize_tr ile aynı mantık (İ->i, I->ı, küçük harf, boşluk tekilleştirme); yalnızca ortak tekrarı uyarısı için.
export function normalizeKey(value) {
  return value
    .trim()
    .normalize('NFC')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
export function typeStyle(name) {
  switch (normalizeKey(name)) {
    case 'patent':
      return {
        pill: 'bg-type-patent-bg text-type-patent-fg',
        dot: 'bg-type-patent-dot',
        stripe: 'border-type-patent-dot',
        box: 'bg-type-patent-bg text-type-patent-fg',
      };
    case 'tasarım tescili':
      return {
        pill: 'bg-type-tasarim-bg text-type-tasarim-fg',
        dot: 'bg-type-tasarim-dot',
        stripe: 'border-type-tasarim-dot',
        box: 'bg-type-tasarim-bg text-type-tasarim-fg',
      };
    case 'faydalı model':
      return {
        pill: 'bg-type-faydali-bg text-type-faydali-fg',
        dot: 'bg-type-faydali-dot',
        stripe: 'border-type-faydali-dot',
        box: 'bg-type-faydali-bg text-type-faydali-fg',
      };
    case 'marka':
      return {
        pill: 'bg-type-marka-bg text-type-marka-fg',
        dot: 'bg-type-marka-dot',
        stripe: 'border-type-marka-dot',
        box: 'bg-type-marka-bg text-type-marka-fg',
      };
    case 'telif hakkı':
      return {
        pill: 'bg-type-telif-bg text-type-telif-fg',
        dot: 'bg-type-telif-dot',
        stripe: 'border-type-telif-dot',
        box: 'bg-type-telif-bg text-type-telif-fg',
      };
    default:
      return {
        pill: 'bg-type-other-bg text-type-other-fg',
        dot: 'bg-type-other-dot',
        stripe: 'border-type-other-dot',
        box: 'bg-type-other-bg text-type-other-fg',
      };
  }
}
// Ad ve soyadın baş harfi (ilk ve son kelime); tek kelimede ilk iki harf.
export function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const pick =
    words.length === 1
      ? Array.from(words[0]).slice(0, 2).join('')
      : Array.from(words[0])[0] + Array.from(words[words.length - 1])[0];
  return pick.toLocaleUpperCase('tr');
}
// Bölüm / firma / ortak monogramı: ilk iki kelimenin baş harfi; tek kelimede ilk iki harf.
export function wordInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const pick =
    words.length === 1
      ? Array.from(words[0]).slice(0, 2).join('')
      : words
          .slice(0, 2)
          .map((w) => Array.from(w)[0])
          .join('');
  return pick.toLocaleUpperCase('tr');
}
// Addan deterministik avatar rengi (tema tonları).
const AVATAR_TONES = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-primary-container text-on-primary-container',
];
export function avatarTone(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
// "63,6" gibi Türkçe yüzde (toplam 0 ise "0").
export function percent(part, total) {
  if (total <= 0) return '0';
  return ((part / total) * 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
// Patent durumu hap renkleri.
export function statusStyle(status) {
  switch (status) {
    case 'Tescillendi':
      return 'bg-primary-fixed text-on-primary-fixed';
    case 'Süreç Devam Ediyor':
      return 'bg-secondary-fixed text-on-secondary-fixed';
    case 'Reddedildi':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-container-highest text-on-surface';
  }
}
