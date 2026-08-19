// ══════════════════════════════════════════════════════════════
// ÇAKÜ Ders Yönetimi Modülü
// Sınav otomasyonu için gerekli tüm derslerin eklendiği ve yönetildiği alan
// ══════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;

// Shared bileşenlerden importlar
const C = window.C;
const Modal = window.Modal;
const Input = window.Input;
const Select = window.Select;
const FormField = window.FormField;
const Btn = window.Btn;
const Badge = window.Badge;
const DBWrite = window.DBWrite || {};

const SINIF_COLORS = {
  1: { bg: '#B2EBF2', text: '#006064', label: '1. Sınıf' },
  2: { bg: '#C8E6C9', text: '#1B5E20', label: '2. Sınıf' },
  3: { bg: '#FFE0B2', text: '#E65100', label: '3. Sınıf' },
  4: { bg: '#F8BBD0', text: '#880E4F', label: '4. Sınıf' },
  5: { bg: '#E1BEE7', text: '#4A148C', label: 'Seçmeli Dersler' },
};

// ══════════════════════════════════════════════════════════════
// AÇILAN DERSLER LİSTESİNİ İÇE AKTARMA
//
// Bölüm her dönem "açılan dersler" listesini Word olarak hazırlıyor; o liste
// buraya elle tek tek giriliyordu. Belgeden okunabilen alanlar okunur, geri
// kalanı yetkili verir.
//
// ── ÜÇ ALAN NEDEN TOPLU VERİLİYOR ──
// Dönem, seviye ve Bologna linki belgede YOKTUR. Bir liste tek dönemi ve tek
// seviyeyi anlatır, o yüzden üstteki toplu alanlar hepsine birden uygulanır;
// ama istisna olur (yaz okulu dersi, ortak seviye dersi) ve her satır kendi
// değerini taşır — toplu alan yalnız BAŞLANGIÇ değeridir, satır tek tek
// değiştirilebilir.
//
// ── EKSİK SATIR KAYDEDİLMEZ ──
// Zorunlu alanı boş bir satır sessizce yarım kaydedilmez: satır kırmızı
// işaretlenir, eksiği yazılır ve seçimi kaldırılana ya da doldurulana kadar
// "Kaydet" onu atlar. Yarım ders kaydı, sınav otomasyonunda ortaya çıkan bir
// sorundur; girildiği anda görünmesi gerekir.
// ══════════════════════════════════════════════════════════════
function DersListesiIceAktarModal({
  open,
  onClose,
  professors,
  mevcutDersler,
  departmentId,
  onDone,
}) {
  const [dosyaAdi, setDosyaAdi] = useState('');
  const [okunuyor, setOkunuyor] = useState(false);
  const [hata, setHata] = useState('');
  const [uyarilar, setUyarilar] = useState([]);
  const [satirlar, setSatirlar] = useState(null);
  const [toplu, setToplu] = useState({ donem: '', seviye: 'lisans', bolognaLink: '' });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const DL = window.DersListesi || {};

  const dosyaSec = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setHata('');
    setSatirlar(null);
    setOkunuyor(true);
    setDosyaAdi(file.name);
    try {
      const sonuc = await DL.oku(file);
      if (!sonuc.dersler.length) {
        throw new Error(
          'Belgede ders satırı bulunamadı. Tablonun başlık satırında en az ' +
            '"DERS KODU" ve "DERSİN ADI" sütunları olmalı.'
        );
      }
      const kunye = DL.kunyeTahmini((sonuc.baslik || []).join('\n'));
      const baslangic = {
        donem: kunye.donem || '',
        seviye: kunye.seviye || 'lisans',
        bolognaLink: '',
      };
      setToplu(baslangic);
      setUyarilar(sonuc.uyarilar || []);
      setSatirlar(
        DL.iceAktarmaSatirlari(sonuc.dersler, {
          akademisyenler: professors,
          mevcutDersler,
          ...baslangic,
        })
      );
    } catch (err) {
      setHata(err.message);
    } finally {
      setOkunuyor(false);
      e.target.value = '';
    }
  };

  // Toplu alanı DEĞİŞTİRMEK, satırlardaki değeri de günceller. Sessizce
  // yalnız yenilere uygulamak, yetkilinin "hepsine verdim" sanmasına yol
  // açardı; ne yaptığı görünür olmalı.
  const topluUygula = (alan, deger) => {
    setToplu((t) => ({ ...t, [alan]: deger }));
    setSatirlar((liste) =>
      (liste || []).map((r) => {
        const yeni = { ...r, [alan]: deger };
        // Dönem değişince "yeni mi güncelleme mi" de değişir: aynı kod başka
        // dönemde ayrı bir derstir.
        if (alan === 'donem') {
          const m = DL.mevcutDersBul(yeni, deger, mevcutDersler);
          yeni.mevcutId = m ? m.id : null;
          yeni.durum = m ? 'guncelle' : 'yeni';
        }
        return yeni;
      })
    );
  };

  const satirGuncelle = (i, yama) =>
    setSatirlar((liste) => (liste || []).map((r, idx) => (idx === i ? { ...r, ...yama } : r)));

  const seciliSatirlar = (satirlar || []).filter((r) => r.secili);
  const eksikli = seciliSatirlar.filter((r) => DL.eksikAlanlar(r).length > 0);
  const yeniSayisi = seciliSatirlar.filter((r) => r.durum === 'yeni').length;
  const guncelSayisi = seciliSatirlar.filter((r) => r.durum === 'guncelle').length;

  const kaydet = async () => {
    if (!seciliSatirlar.length) return;
    if (eksikli.length) {
      return alert(
        eksikli.length +
          ' satırda eksik alan var; bunlar kaydedilemez.\n\n' +
          eksikli
            .slice(0, 10)
            .map((r) => `• ${r.kod}: ${DL.eksikAlanlar(r).join(', ')}`)
            .join('\n') +
          (eksikli.length > 10 ? '\n…' : '') +
          '\n\nEksikleri doldurun ya da o satırların seçimini kaldırın.'
      );
    }
    setKaydediliyor(true);
    try {
      const simdi = new Date().toISOString();
      const ops = seciliSatirlar.map((r) => {
        const data = {
          code: r.kod.trim(),
          name: r.ad.trim(),
          sinif: parseInt(r.sinif, 10) || 1,
          akts: parseInt(r.akts, 10) || 0,
          statu: r.statu,
          donem: r.donem,
          seviye: r.seviye,
          bolognaLink: r.bolognaLink.trim(),
          professor: r.professor || '',
          departmentId: departmentId || 'bilgisayar',
          updatedAt: simdi,
        };
        if (r.mevcutId) {
          return { collection: 'sinav_dersler', type: 'set', docId: r.mevcutId, data, merge: true };
        }
        // Sınav süresi ve öğrenci sayısı belgede yok: var olan varsayılanlar
        // korunur, güncellemede ELLENMEZ (merge) — yetkilinin girdiği süre
        // içe aktarmayla sıfırlanmamalı.
        return {
          collection: 'sinav_dersler',
          type: 'add',
          data: { ...data, duration: 30, studentCount: 0, createdAt: simdi },
        };
      });
      await DBWrite.batch(ops);
      if (window.audit) {
        window.audit('course_import', 'sinav_dersler', '', {
          meta: { dosya: dosyaAdi, yeni: yeniSayisi, guncellenen: guncelSayisi },
        });
      }
      alert(`${yeniSayisi} ders eklendi, ${guncelSayisi} ders güncellendi.`);
      onDone();
    } catch (err) {
      console.error(err);
      alert('İçe aktarma başarısız: ' + err.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!open) return null;

  const hucre = { padding: '6px 8px', fontSize: 12, verticalAlign: 'top' };
  const kucukSecim = {
    width: '100%',
    padding: '5px 6px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #D1D5DB',
  };

  return (
    <Modal open={true} title="Açılan Dersler Listesini İçe Aktar" onClose={onClose} width={1180}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          Bölümün <b>açılan dersler</b> tablosunu (.docx ya da .pdf) seçin. Belgeden{' '}
          <b>ders kodu, ders adı, Z/S, AKTS ve öğretim elemanı</b> okunur; sınıf, tablodaki
          “1.SINIF” başlıklarından çıkarılır. <b>Dönem, seviye ve Bologna linki</b> belgede
          bulunmadığı için aşağıdan toplu verilir — her satırda tek tek değiştirebilirsiniz.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label
            style={{
              padding: '8px 14px',
              border: '1px dashed #A5B4FC',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#4F46E5',
              background: '#EEF2FF',
            }}
          >
            📄 Dosya Seç (.docx / .pdf)
            <input
              type="file"
              accept=".docx,.pdf"
              onChange={dosyaSec}
              style={{ display: 'none' }}
            />
          </label>
          {dosyaAdi && <span style={{ fontSize: 12.5, color: '#374151' }}>{dosyaAdi}</span>}
          {okunuyor && <span style={{ fontSize: 12.5, color: '#6B7280' }}>Belge okunuyor…</span>}
        </div>

        {hata && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            {hata}
          </div>
        )}

        {uyarilar.length > 0 && (
          <div
            style={{
              background: '#FFFBEB',
              color: '#92400E',
              border: '1px solid #FDE68A',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            <b>Okunamayan satırlar:</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {uyarilar.slice(0, 6).map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        )}

        {satirlar && (
          <>
            {/* Toplu alanlar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 190px 1fr',
                gap: 10,
                padding: 12,
                background: '#F5F3FF',
                border: '1px solid #DDD6FE',
                borderRadius: 10,
              }}
            >
              <FormField label="Dönem — hepsine *">
                <Select
                  value={toplu.donem}
                  onChange={(e) => topluUygula('donem', e.target.value)}
                  style={kucukSecim}
                >
                  <option value="">— Seçiniz —</option>
                  <option value="guz">Güz</option>
                  <option value="bahar">Bahar</option>
                </Select>
              </FormField>
              <FormField label="Seviye — hepsine *">
                <Select
                  value={toplu.seviye}
                  onChange={(e) => topluUygula('seviye', e.target.value)}
                  style={kucukSecim}
                >
                  <option value="lisans">Lisans</option>
                  <option value="yukseklisans">Yüksek Lisans</option>
                  <option value="doktora">Doktora</option>
                </Select>
              </FormField>
              <FormField label="Bologna linki — hepsine *">
                <Input
                  value={toplu.bolognaLink}
                  onChange={(e) => topluUygula('bolognaLink', e.target.value)}
                  placeholder="https://bologna.cankiri.edu.tr/… (her satırda ayrıca düzenlenebilir)"
                  style={kucukSecim}
                />
              </FormField>
            </div>

            <div style={{ fontSize: 12.5, color: '#374151' }}>
              <b>{satirlar.length}</b> ders okundu · <b>{seciliSatirlar.length}</b> seçili ·{' '}
              <span style={{ color: '#047857' }}>{yeniSayisi} yeni</span> ·{' '}
              <span style={{ color: '#B45309' }}>{guncelSayisi} güncellenecek</span>
              {eksikli.length > 0 && (
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  {' '}
                  · {eksikli.length} satırda eksik alan
                </span>
              )}
            </div>

            <div
              style={{
                maxHeight: 420,
                overflow: 'auto',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                  <tr style={{ textAlign: 'left', color: '#6B7280' }}>
                    <th style={{ ...hucre, width: 34 }} />
                    <th style={hucre}>Kod</th>
                    <th style={hucre}>Ders Adı</th>
                    <th style={{ ...hucre, width: 74 }}>Sınıf</th>
                    <th style={{ ...hucre, width: 62 }}>Z/S</th>
                    <th style={{ ...hucre, width: 62 }}>AKTS</th>
                    <th style={{ ...hucre, width: 200 }}>Öğretim Elemanı</th>
                    <th style={{ ...hucre, width: 96 }}>Dönem</th>
                    <th style={{ ...hucre, width: 120 }}>Seviye</th>
                    <th style={{ ...hucre, width: 180 }}>Bologna Linki</th>
                    <th style={{ ...hucre, width: 96 }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((r, i) => {
                    const eksik = DL.eksikAlanlar(r);
                    const sorunlu = r.secili && eksik.length > 0;
                    return (
                      <tr
                        key={i}
                        style={{
                          borderTop: '1px solid #F3F4F6',
                          background: !r.secili ? '#FAFAFA' : sorunlu ? '#FEF2F2' : 'white',
                          opacity: r.secili ? 1 : 0.55,
                        }}
                      >
                        <td style={hucre}>
                          <input
                            type="checkbox"
                            checked={r.secili}
                            onChange={(e) => satirGuncelle(i, { secili: e.target.checked })}
                          />
                        </td>
                        <td style={{ ...hucre, fontWeight: 700 }}>
                          {r.kod}
                          {sorunlu && (
                            <div style={{ color: '#DC2626', fontWeight: 500, fontSize: 10.5 }}>
                              eksik: {eksik.join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={hucre}>{r.ad}</td>
                        <td style={hucre}>
                          <Select
                            value={r.sinif == null ? '' : r.sinif}
                            onChange={(e) =>
                              satirGuncelle(i, { sinif: parseInt(e.target.value, 10) })
                            }
                            style={kucukSecim}
                          >
                            {[1, 2, 3, 4, 5].map((x) => (
                              <option key={x} value={x}>
                                {x === 5 ? 'Seçmeli' : x}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td style={hucre}>
                          <Select
                            value={r.statu}
                            onChange={(e) => satirGuncelle(i, { statu: e.target.value })}
                            style={kucukSecim}
                          >
                            <option value="">—</option>
                            <option value="Z">Z</option>
                            <option value="S">S</option>
                          </Select>
                        </td>
                        <td style={hucre}>
                          <Input
                            type="number"
                            value={r.akts == null ? '' : r.akts}
                            onChange={(e) => satirGuncelle(i, { akts: e.target.value })}
                            style={kucukSecim}
                          />
                        </td>
                        <td style={hucre}>
                          <Select
                            value={r.professor}
                            onChange={(e) => satirGuncelle(i, { professor: e.target.value })}
                            style={kucukSecim}
                          >
                            <option value="">— Eşleşmedi —</option>
                            {/* Belgedeki adlar önce: yetkili "belgede kim yazıyordu"
                                sorusunu listeyi kapatmadan görebilsin. */}
                            {r.eslesenler
                              .filter((e) => e.akademisyen)
                              .map((e, j) => (
                                <option key={'b' + j} value={e.akademisyen.name}>
                                  {e.akademisyen.name}
                                </option>
                              ))}
                            {professors
                              .filter(
                                (p) =>
                                  !r.eslesenler.some(
                                    (e) => e.akademisyen && e.akademisyen.name === p.name
                                  )
                              )
                              .map((p, j) => (
                                <option key={'t' + j} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                          </Select>
                          {r.eslesmeyen.length > 0 && (
                            <div style={{ color: '#B45309', fontSize: 10.5, marginTop: 3 }}>
                              belgede eşleşmeyen: {r.eslesmeyen.join(', ')}
                            </div>
                          )}
                          {r.ogretimElemanlari.length > 1 && (
                            <div style={{ color: '#6B7280', fontSize: 10.5, marginTop: 3 }}>
                              belgede {r.ogretimElemanlari.length} kişi yazılı — biri seçilir
                            </div>
                          )}
                        </td>
                        <td style={hucre}>
                          <Select
                            value={r.donem}
                            onChange={(e) => satirGuncelle(i, { donem: e.target.value })}
                            style={kucukSecim}
                          >
                            <option value="">—</option>
                            <option value="guz">Güz</option>
                            <option value="bahar">Bahar</option>
                          </Select>
                        </td>
                        <td style={hucre}>
                          <Select
                            value={r.seviye}
                            onChange={(e) => satirGuncelle(i, { seviye: e.target.value })}
                            style={kucukSecim}
                          >
                            <option value="lisans">Lisans</option>
                            <option value="yukseklisans">Yük. Lisans</option>
                            <option value="doktora">Doktora</option>
                          </Select>
                        </td>
                        <td style={hucre}>
                          <Input
                            value={r.bolognaLink}
                            onChange={(e) => satirGuncelle(i, { bolognaLink: e.target.value })}
                            placeholder="https://…"
                            style={kucukSecim}
                          />
                        </td>
                        <td style={hucre}>
                          <Badge
                            style={{
                              background: r.durum === 'guncelle' ? '#FEF3C7' : '#D1FAE5',
                              color: r.durum === 'guncelle' ? '#92400E' : '#065F46',
                              fontSize: 10.5,
                            }}
                          >
                            {r.durum === 'guncelle' ? 'Güncellenecek' : 'Yeni'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            İptal
          </button>
          <Btn onClick={kaydet} disabled={kaydediliyor || !seciliSatirlar.length}>
            {kaydediliyor ? 'Kaydediliyor…' : `${seciliSatirlar.length} dersi kaydet`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function DersYonetimiModuluApp({ currentUser, activeDepartment }) {
  const [courses, setCourses] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    sinif: 1,
    duration: 30,
    professor: '',
    donem: 'guz',
    akts: 6,
    bolognaLink: '',
    statu: '', // Z/S — bilinçli seçim zorunlu, varsayılan yok
    seviye: 'lisans', // lisans | yukseklisans | doktora
  });
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [search, setSearch] = useState('');
  const [iceAktarAcik, setIceAktarAcik] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isDeptManager = currentUser?.role === 'bolum_yetkilisi';
  const hasAccess = isAdmin || isDeptManager;

  const loadData = async () => {
    setLoading(true);
    try {
      // Dersleri getir (bölüm bazlı)
      const whereParam = activeDepartment ? `departmentId:eq:${activeDepartment}` : undefined;
      let allCourses = await window.apiRead(
        'sinav_dersler',
        whereParam ? { where: whereParam } : {}
      );
      setCourses(allCourses);

      // Akademisyenleri getir (dropdown için) — çapraz-bölüm desteği için
      // tüm listeyi al, sonra (admin değilse) profMatchesDept ile filtrele.
      let allProfs = await window.apiRead('professors');
      if (!isAdmin && activeDepartment) {
        const dept = (window.DEPARTMENTS || []).find((x) => x.id === activeDepartment);
        allProfs = (allProfs || []).filter((p) =>
          window.profMatchesDept
            ? window.profMatchesDept(p, activeDepartment, dept?.name)
            : p.departmentId === activeDepartment
        );
      }
      setProfessors(allProfs);
    } catch (e) {
      console.error('Ders yönetimi yüklenirken hata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [hasAccess, activeDepartment]);

  const startEdit = (c) => {
    setEditingCourse(c);
    setForm({
      code: c.code,
      name: c.name,
      sinif: c.sinif,
      duration: c.duration,
      professor: c.professor || '',
      donem: c.donem || 'guz',
      akts: c.akts || 6,
      bolognaLink: c.bolognaLink || '',
      statu: c.statu || (c.sinif === 5 ? 'S' : ''),
      seviye: c.seviye || 'lisans',
    });
  };

  const startNew = () => {
    setEditingCourse('new');
    setForm({
      code: '',
      name: '',
      sinif: 1,
      duration: 30,
      professor: '',
      donem: 'guz',
      akts: 6,
      bolognaLink: '',
      statu: '',
      seviye: 'lisans',
    });
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return alert('Ders kodu ve adı zorunludur.');
    const bolognaLink = (form.bolognaLink || '').trim();
    if (!bolognaLink) return alert('Ders Bologna linki zorunludur.');
    if (form.statu !== 'Z' && form.statu !== 'S')
      return alert('Zorunlu (Z) / Seçmeli (S) seçimi zorunludur.');
    setSaving(true);
    try {
      const dataToSave = {
        code: form.code.trim(),
        name: form.name.trim(),
        sinif: parseInt(form.sinif) || 1,
        duration: parseInt(form.duration) || 30,
        akts: parseInt(form.akts) || 6,
        professor: form.professor || '',
        donem: form.donem,
        bolognaLink: bolognaLink,
        statu: form.statu,
        seviye: form.seviye || 'lisans',
        departmentId: activeDepartment || 'bilgisayar',
        updatedAt: new Date().toISOString(),
      };

      if (editingCourse === 'new') {
        dataToSave.studentCount = 0;
        dataToSave.createdAt = dataToSave.updatedAt;
        await DBWrite.add('sinav_dersler', dataToSave);
        if (window.audit)
          window.audit('course_create', 'sinav_dersler', '', {
            meta: { code: dataToSave.code, name: dataToSave.name },
          });
      } else {
        await DBWrite.set('sinav_dersler', editingCourse.id, dataToSave, true);
        if (window.audit)
          window.audit('course_update', 'sinav_dersler', editingCourse.id, {
            meta: { code: dataToSave.code, name: dataToSave.name },
          });
      }

      setEditingCourse(null);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Ders kaydedilemedi: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`${c.code} kodlu ${c.name} dersini silmek istediğinize emin misiniz?`)) return;
    try {
      await DBWrite.remove('sinav_dersler', c.id);
      if (window.audit)
        window.audit('course_delete', 'sinav_dersler', c.id, {
          meta: { code: c.code, name: c.name },
        });
      setCourses(courses.filter((course) => course.id !== c.id));
    } catch (e) {
      console.error(e);
      alert('Silme başarısız: ' + e.message);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (filterClass !== 'all' && c.sinif.toString() !== filterClass) return false;
        if (filterTerm === 'none' && c.donem && (c.donem === 'guz' || c.donem === 'bahar'))
          return false;
        if (filterTerm !== 'all' && filterTerm !== 'none' && c.donem !== filterTerm) return false;
        if (
          search &&
          !c.code.toLowerCase().includes(search.toLowerCase()) &&
          !c.name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.sinif !== b.sinif) return a.sinif - b.sinif;
        return a.code.localeCompare(b.code);
      });
  }, [courses, filterClass, filterTerm, search]);

  if (!hasAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
        <h2 style={{ color: '#DC2626' }}>Erişim Reddedildi</h2>
        <p>Bu modüle sadece Fakülte Yöneticisi veya Bölüm Yetkilileri erişebilir.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1B2A4A', margin: 0 }}>
            Ders Yönetimi
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
            Bölüme ait derslerin programı, hocası ve temel tanımlamaları
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIceAktarAcik(true)}
            title="Bölümün açılan dersler tablosunu (.docx / .pdf) okuyup toplu ekler"
            style={{
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #A5B4FC',
              color: '#4F46E5',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            📄 Listeden İçe Aktar
          </button>
          <Btn onClick={startNew}>+ Yeni Ders Tanımla</Btn>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Tümü</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{courses.length}</div>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Güz Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0D47A1' }}>
            {courses.filter((c) => c.donem === 'guz').length}
          </div>
        </div>
        <div
          style={{
            background: 'white',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Bahar Dönemi</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1B5E20' }}>
            {courses.filter((c) => c.donem === 'bahar').length}
          </div>
        </div>
        {courses.filter((c) => !c.donem || (c.donem !== 'guz' && c.donem !== 'bahar')).length >
          0 && (
          <div
            style={{
              background: '#FFF7ED',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #FED7AA',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, color: '#C2410C', fontWeight: 600 }}>
              Dönem Belirtilmemiş
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#EA580C' }}>
              {courses.filter((c) => !c.donem || (c.donem !== 'guz' && c.donem !== 'bahar')).length}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              gap: 12,
              background: '#F9FAFB',
              flexWrap: 'wrap',
            }}
          >
            <Input
              placeholder="Ders kodu veya adı ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="1">1. Sınıf</option>
              <option value="2">2. Sınıf</option>
              <option value="3">3. Sınıf</option>
              <option value="4">4. Sınıf</option>
              <option value="5">Seçmeli</option>
            </Select>
            <Select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="all">Tüm Dönemler</option>
              <option value="guz">Güz</option>
              <option value="bahar">Bahar</option>
              <option value="none">Belirtilmemiş</option>
            </Select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}
            >
              <thead>
                <tr style={{ background: 'white' }}>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Kod
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Ders Adı
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Sınıf
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Dönem
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    AKTS
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Süre
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    Akademisyen
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: `2px solid ${C.border}`,
                      color: '#374151',
                    }}
                  >
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge
                        style={{
                          background: SINIF_COLORS[c.sinif]?.bg,
                          color: SINIF_COLORS[c.sinif]?.text,
                        }}
                      >
                        {c.code}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {c.sinif === 5 ? 'Seçmeli' : `${c.sinif}. Sınıf`}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Badge
                        style={{
                          background:
                            c.donem === 'bahar'
                              ? '#C8E6C9'
                              : c.donem === 'guz'
                                ? '#BBDEFB'
                                : '#FEE2E2',
                          color:
                            c.donem === 'bahar'
                              ? '#1B5E20'
                              : c.donem === 'guz'
                                ? '#0D47A1'
                                : '#DC2626',
                          fontSize: 11,
                        }}
                      >
                        {c.donem === 'bahar' ? 'Bahar' : c.donem === 'guz' ? 'Güz' : '—'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {c.akts || 6}
                      {c.statu && (
                        <span
                          title={c.statu === 'Z' ? 'Zorunlu' : 'Seçmeli'}
                          style={{
                            marginLeft: 6,
                            padding: '1px 6px',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            background: c.statu === 'Z' ? '#DBEAFE' : '#E1BEE7',
                            color: c.statu === 'Z' ? '#0D47A1' : '#4A148C',
                          }}
                        >
                          {c.statu}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{c.duration} dk</td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {c.professor || <span style={{ color: '#9CA3AF' }}>Bilinmiyor</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                          onClick={() => startEdit(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6366F1',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
                      Aradığınız kritere uygun ders bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DersListesiIceAktarModal
        open={iceAktarAcik}
        onClose={() => setIceAktarAcik(false)}
        professors={professors}
        mevcutDersler={courses}
        departmentId={activeDepartment}
        onDone={() => {
          setIceAktarAcik(false);
          loadData();
        }}
      />

      {/* Ders Düzenle/Ekle Modal */}
      {editingCourse && (
        <Modal
          open={true}
          title={editingCourse === 'new' ? 'Yeni Ders Tanımla' : 'Ders Bilgilerini Düzenle'}
          onClose={() => setEditingCourse(null)}
          width={600}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <FormField label="Ders Kodu">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Örn: BİL101"
                />
              </FormField>
              <FormField label="Ders Adı">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Algoritmalara Giriş"
                />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Sınıf">
                <Select
                  value={form.sinif}
                  onChange={(e) => setForm({ ...form, sinif: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s}>
                      {s === 5 ? 'Seçmeli' : `${s}. Sınıf`}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Dönem">
                <Select
                  value={form.donem}
                  onChange={(e) => setForm({ ...form, donem: e.target.value })}
                >
                  <option value="guz">Güz</option>
                  <option value="bahar">Bahar</option>
                </Select>
              </FormField>
              <FormField label="AKTS">
                <Select
                  value={form.akts}
                  onChange={(e) => setForm({ ...form, akts: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
                    <option key={a} value={a}>
                      {a} AKTS
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Zorunlu / Seçmeli *">
                <Select
                  value={form.statu}
                  onChange={(e) => setForm({ ...form, statu: e.target.value })}
                >
                  <option value="">— Seçiniz —</option>
                  <option value="Z">Z (Zorunlu)</option>
                  <option value="S">S (Seçmeli)</option>
                </Select>
              </FormField>
              <FormField label="Seviye">
                <Select
                  value={form.seviye}
                  onChange={(e) => setForm({ ...form, seviye: e.target.value })}
                >
                  <option value="lisans">Lisans</option>
                  <option value="yukseklisans">Yüksek Lisans</option>
                  <option value="doktora">Doktora</option>
                </Select>
              </FormField>
              <FormField label="Sınav Süresi (dk)">
                <Select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                >
                  {[30, 45, 60, 75, 90, 105, 120, 150].map((d) => (
                    <option key={d} value={d}>
                      {d} dk
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="İlgili Akademisyen">
                <Input
                  value={form.professor}
                  onChange={(e) => setForm({ ...form, professor: e.target.value })}
                  placeholder="İsim yazın veya seçin..."
                  list="course-prof-lookup"
                />
                <datalist id="course-prof-lookup">
                  {professors.map((p, i) => (
                    <option key={i} value={p.name} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Ders Bologna Linki *">
                <Input
                  value={form.bolognaLink}
                  onChange={(e) => setForm({ ...form, bolognaLink: e.target.value })}
                  placeholder="https://bologna.cankiri.edu.tr/..."
                />
              </FormField>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setEditingCourse(null)}
                style={{
                  padding: '10px 16px',
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                İptal
              </button>
              <Btn onClick={handleSave} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

window.DersYonetimiModuluApp = DersYonetimiModuluApp;
