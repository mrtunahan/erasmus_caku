// Bir belge türü için GERÇEKTEN kullanılacak şablon hangisi?
//
// Sunucudaki çözüm (/api/templates/resolve) bölüm → fakülte → üniversite
// sırasıyla arar: en özel kapsam kazanır. Şablonlar modülündeki "yüklü"
// paneli ise listeden gelen ilk kaydı alıyordu ve liste güncellenme tarihine
// göre sıralı — gösterilen şablon ile kullanılan şablon farklı olabiliyordu.
import { describe, it, expect } from 'vitest';

// sablonlar-modulu.jsx tarayıcıda global olarak yükleniyor (ESM export yok);
// kural küçük ve saf olduğu için burada birebir aynısı sınanır.
const ONCELIK = { department: 0, faculty: 1, university: 2 };
function sbEtkinSablon(adaylar) {
  return (adaylar || []).slice().sort((a, b) => {
    const ka = ONCELIK[a.scope] ?? 9;
    const kb = ONCELIK[b.scope] ?? 9;
    if (ka !== kb) return ka - kb;
    if (!!b.isDefault !== !!a.isDefault) return b.isDefault ? 1 : -1;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  })[0];
}

const bolum = { name: 'bölüm', scope: 'department', updatedAt: '2024-01-01' };
const fakulte = { name: 'fakülte', scope: 'faculty', updatedAt: '2026-01-01' };
const universite = { name: 'üniversite', scope: 'university', updatedAt: '2026-06-01' };

describe('sbEtkinSablon', () => {
  it('bölüm şablonu, DAHA YENİ fakülte/üniversite şablonunu yener', () => {
    // Asıl arıza: tarih sıralaması kapsamı eziyordu.
    expect(sbEtkinSablon([universite, fakulte, bolum]).name).toBe('bölüm');
  });

  it('bölüm şablonu yoksa fakülte kazanır', () => {
    expect(sbEtkinSablon([universite, fakulte]).name).toBe('fakülte');
  });

  it('yalnız üniversite şablonu varsa o kullanılır', () => {
    expect(sbEtkinSablon([universite]).name).toBe('üniversite');
  });

  it('aynı kapsamda VARSAYILAN işaretli olan öne geçer', () => {
    const a = { name: 'a', scope: 'department', updatedAt: '2026-01-01' };
    const b = { name: 'b', scope: 'department', updatedAt: '2020-01-01', isDefault: true };
    expect(sbEtkinSablon([a, b]).name).toBe('b');
  });

  it('aynı kapsam ve işaret: en son güncellenen', () => {
    const eski = { name: 'eski', scope: 'faculty', updatedAt: '2020-01-01' };
    const yeni = { name: 'yeni', scope: 'faculty', updatedAt: '2026-01-01' };
    expect(sbEtkinSablon([eski, yeni]).name).toBe('yeni');
  });

  it('kapsamı bilinmeyen kayıt EN SONA düşer', () => {
    const kapsamsiz = { name: 'kapsamsız', updatedAt: '2030-01-01' };
    expect(sbEtkinSablon([kapsamsiz, universite]).name).toBe('üniversite');
  });

  it('boş listede undefined döner', () => {
    expect(sbEtkinSablon([])).toBeUndefined();
    expect(sbEtkinSablon(null)).toBeUndefined();
  });
});
