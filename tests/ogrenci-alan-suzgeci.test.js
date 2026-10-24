import { describe, it, expect } from 'vitest';
import { ogrenciAlanSuzgeci } from '../server/lib/ogrenci-alan-suzgeci.js';

const suz = (kol, op, mevcut, s) => {
  const r = ogrenciAlanSuzgeci(kol, op, mevcut, s);
  return { r, data: op.data };
};

describe('staj başvurusu', () => {
  it('yeni başvuru beklemede açılır, karar alanları düşer', () => {
    const { data } = suz('internship_applications', {
      type: 'add',
      data: { status: 'tamamlandi', rejectionReason: 'x', statusUpdatedBy: 'y', adSoyad: 'A' },
    });
    expect(data).toEqual({ status: 'beklemede', adSoyad: 'A' });
  });
  it('düzenlemede kaydın tamamı gelse de karar alanları kayıttaki değerde kalır', () => {
    const mevcut = { status: 'reddedildi', rejectionReason: 'eksik', adSoyad: 'A' };
    const { r, data } = suz(
      'internship_applications',
      {
        type: 'set',
        merge: true,
        data: { status: 'devam', rejectionReason: '', statusUpdatedBy: 'ben', adSoyad: 'B' },
      },
      mevcut
    );
    expect(r.izin).toBe(true);
    expect(data).toEqual({ status: 'reddedildi', rejectionReason: 'eksik', adSoyad: 'B' });
  });
  it('staj başladıktan sonra başvuru değiştirilemez', () => {
    const { r } = suz(
      'internship_applications',
      { type: 'update', data: { adSoyad: 'B' } },
      { status: 'devam' }
    );
    expect(r.izin).toBe(false);
  });
});

describe('staj yol haritası', () => {
  const mevcut = {
    steps: {
      0: { status: 'completed', approvedBy: 'Dr. A' },
      1: { status: 'rejected', rejectedBy: 'Dr. A', rejectGerekce: 'eksik' },
    },
  };
  it('öğrenci adımı yalnız onaya gönderir; red izi korunur', () => {
    const { data } = suz(
      'internship_roadmap',
      {
        type: 'set',
        merge: true,
        data: {
          'steps.1': { status: 'pending_approval', rejectedBy: 'sahte', approvedBy: 'ben' },
        },
      },
      mevcut
    );
    expect(data['steps.1']).toEqual({
      status: 'pending_approval',
      rejectedBy: 'Dr. A',
      rejectGerekce: 'eksik',
    });
  });
  it('kendi adımını "completed" yapamaz', () => {
    const { data } = suz(
      'internship_roadmap',
      { type: 'set', merge: true, data: { 'steps.2': { status: 'completed' } } },
      mevcut
    );
    expect(data['steps.2']).toEqual({});
    const tek = suz(
      'internship_roadmap',
      { type: 'update', data: { 'steps.1.status': 'completed', 'steps.1.approvedBy': 'x' } },
      mevcut
    );
    expect(tek.data).toEqual({ 'steps.1.status': 'rejected' });
  });
  it('onaylanmış adım değişmez; haritanın tamamı yazılırsa eksik adım korunur', () => {
    const { data } = suz(
      'internship_roadmap',
      { type: 'set', merge: true, data: { steps: { 0: { status: 'pending_approval' } } } },
      mevcut
    );
    expect(data.steps[0]).toEqual(mevcut.steps[0]);
    expect(data.steps[1]).toEqual(mevcut.steps[1]);
  });
});

describe('staj belgeleri', () => {
  it('değişiklik talebini kendisi onaylayamaz', () => {
    const mevcut = { staj_defteri: { status: 'yuklendi', changeRequest: { status: 'rejected' } } };
    const { data } = suz(
      'internship_uploads',
      {
        type: 'set',
        merge: true,
        data: {
          staj_defteri: {
            status: 'yuklendi',
            changeRequest: { status: 'approved', approvedBy: 'ben' },
          },
        },
      },
      mevcut
    );
    expect(data.staj_defteri.changeRequest).toEqual({ status: 'rejected' });
    const talep = suz(
      'internship_uploads',
      {
        type: 'set',
        merge: true,
        data: { staj_defteri: { changeRequest: { status: 'pending', requestedBy: '1' } } },
      },
      mevcut
    );
    expect(talep.data.staj_defteri.changeRequest.status).toBe('pending');
  });
});

describe('ÇAP / yatay geçiş / proje / bildirim', () => {
  it('ÇAP başvurusu onaylı açılamaz', () => {
    const { data } = suz('cap_yandal_basvurular', {
      type: 'add',
      data: { status: 'approved', decidedBy: 'x', ogrenciNo: '1' },
    });
    expect(data).toEqual({ status: 'pending', ogrenciNo: '1' });
  });
  it('yatay geçişte değerlendirme alanları öğrencide boş kalır', () => {
    const { data } = suz('yatay_gecis_basvurular', {
      type: 'add',
      data: { degerlendirme: 'asil', degerlendirmeSira: '1', ekMadde1Dogrulama: true, turu: 'x' },
    });
    expect(data).toEqual({ degerlendirme: '', degerlendirmeSira: '', turu: 'x' });
    const g = suz(
      'yatay_gecis_basvurular',
      { type: 'update', data: { degerlendirme: 'asil' } },
      { degerlendirme: 'yedek' }
    );
    expect(g.data.degerlendirme).toBe('yedek');
  });
  it('proje öğrencide onaylı açılamaz, takvim yazılamaz', () => {
    const { data } = suz('projects', {
      type: 'add',
      data: { status: 'approved', scheduleDate: '2026-01-01', name: 'P' },
    });
    expect(data).toEqual({ status: 'pending', name: 'P' });
    const g = suz(
      'projects',
      { type: 'update', data: { status: 'approved' } },
      { status: 'pending' }
    );
    expect(g.data.status).toBe('pending');
  });
  it('tam değiştirmede (merge yok) karar alanı kayıttan geri yazılır', () => {
    const g = suz(
      'projects',
      { type: 'set', merge: false, data: { name: 'P' } },
      { status: 'approved', name: 'P' }
    );
    expect(g.data).toEqual({ name: 'P', status: 'approved' });
  });
  it('öğrenci bildirimi "çözüldü" yapılamaz', () => {
    const { data } = suz(
      'student_notifications',
      { type: 'update', data: { cozuldu: true, read: true } },
      { cozuldu: false }
    );
    expect(data).toEqual({ cozuldu: false, read: true });
  });
});

describe('muafiyet faz geçmişi', () => {
  const mevcut = { stage: 'on_onay', stageHistory: [{ from: '', to: 'on_inceleme' }] };
  it('geçmiş öğrencide yeniden yazılamaz; geçişte sunucu tek satır ekler', () => {
    const { data } = suz(
      'muafiyet_records',
      {
        type: 'update',
        data: { stage: 'belge_teslim', stageHistory: [], notDonusumLink: 'http://x' },
      },
      mevcut,
      { ident: '2021001', simdi: new Date('2026-01-01T00:00:00Z') }
    );
    expect(data.notDonusumLink).toBeUndefined();
    expect(data.stageHistory).toEqual([
      { from: '', to: 'on_inceleme' },
      { from: 'on_onay', to: 'belge_teslim', by: '2021001', at: '2026-01-01T00:00:00.000Z' },
    ]);
    const g = suz('muafiyet_records', { type: 'update', data: { stageHistory: [] } }, mevcut);
    expect('stageHistory' in g.data).toBe(false);
  });
});

describe('öğrenci kaydı', () => {
  it('Erasmus notunu kendisi onaylanmış yapamaz', () => {
    const { data } = suz(
      'students',
      { type: 'update', data: { erasmusNotDurumu: 'onaylandi' } },
      { erasmusNotDurumu: 'onay-bekliyor' }
    );
    expect(data.erasmusNotDurumu).toBe('onay-bekliyor');
    const g = suz('students', { type: 'update', data: { erasmusNotDurumu: 'onay-bekliyor' } }, {});
    expect(g.data.erasmusNotDurumu).toBe('onay-bekliyor');
  });
});
