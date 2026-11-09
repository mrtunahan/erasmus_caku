// ══════════════════════════════════════════════════════════════
// ÖĞRENCİ PORTALI — GEÇMİŞ ETKİLEŞİMLERİN ONARIMI (denetim kaydından)
//
// İki hata geçmişte veri kaybettirdi:
//   1) Alt koleksiyon kayıtlarına (yorumlar, portal bildirimleri) üst belge
//      kimliği YAZILMIYORDU: yorum hangi gönderiye, bildirim kime ait
//      bilinmiyordu (her gönderinin altında bütün yorumlar görünüyordu).
//   2) Öğrencinin başkasının gönderisine tepkisi, oyu, yorum beğenisi ve yorum
//      sayacı sunucuda REDDEDİLİYORDU.
// Denetim kaydı (audit_logs, `api_write`) her isteğin kimin, ne zaman, hangi
// belgede, hangi ALANLARA yazmaya çalıştığını ve sonucunu tutar (değerleri
// değil). Buradan geri kazanılanlar:
//   • Yorum / portal bildirimi → üst belge: kaydın oluşma anı (ObjectId) ile
//     o andaki "alt kayıt eklendi" isteği eşleştirilir (yazar da tutarsa
//     öncelikli). Eşleşme belirsizse dokunulmaz.
//   • Tepki ve yorum beğenisi: işlem aç/kapat'tır; bir kişinin aynı kayıtta
//     aynı türdeki REDDEDİLEN denemelerinin sayısı tekse son niyeti "ekle"dir.
//   • Yorum sayısı: yorumlar gönderilerine bağlandıktan sonra yeniden sayılır.
// Geri KAZANILAMAYAN: yukarı/aşağı oyların YÖNÜ kayıtta yok; yalnız sayılır
// ve raporlanır, uydurulmaz.
// ══════════════════════════════════════════════════════════════
const metin = (v) => String(v == null ? '' : v).trim();
const ESLESME_PENCERESI_MS = 15000;

function zamanOf(v) {
  if (!v) return NaN;
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
}

/** Belgenin oluşma anı: ObjectId zaman damgası, yoksa createdAt. */
function olusmaAni(doc) {
  const id = doc && doc._id;
  if (id && typeof id === 'object' && typeof id.getTimestamp === 'function') {
    return id.getTimestamp().getTime();
  }
  if (typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }
  return zamanOf(doc && doc.createdAt);
}

/** Denetim kaydından düzleştirilmiş işlemler. */
function islemler(kayitlar) {
  const out = [];
  (kayitlar || []).forEach((k) => {
    const at = zamanOf(k.at || k.createdAt);
    (Array.isArray(k.operations) ? k.operations : []).forEach((op) => {
      if (!op) return;
      out.push({
        at,
        aktor: metin(k.actor),
        basarili: Number(k.status) > 0 && Number(k.status) < 400,
        tur: op.type,
        koleksiyon: op.collection,
        alt: op.subCollection || '',
        ust: metin(op.parentDocId),
        docId: metin(op.docId),
        alanlar: Array.isArray(op.fields) ? op.fields : [],
      });
    });
  });
  return out;
}

/**
 * Sahipsiz alt kayıtları (yorum/bildirim) "ekleme" isteklerine eşler.
 * @returns {Map<string, string>} kayıt kimliği → üst belge kimliği
 */
function altKayitEslestir(belgeler, ekler, yazarAktoruMu) {
  const kullanilan = new Set();
  const sonuc = new Map();
  const sirali = [...belgeler].sort((a, b) => olusmaAni(a) - olusmaAni(b));
  sirali.forEach((b) => {
    const t = olusmaAni(b);
    if (!Number.isFinite(t)) return;
    const adaylar = ekler
      .map((e, i) => ({ e, i, fark: Math.abs(e.at - t) }))
      .filter((x) => !kullanilan.has(x.i) && x.fark <= ESLESME_PENCERESI_MS);
    if (!adaylar.length) return;
    const yazarli = adaylar.filter((x) => yazarAktoruMu(b, x.e.aktor));
    const havuz = yazarli.length ? yazarli : adaylar;
    havuz.sort((a, c) => a.fark - c.fark);
    // Belirsizlik: en yakın iki aday aynı uzaklıkta ve farklı üst belgedeyse dokunma.
    if (havuz.length > 1 && havuz[0].fark === havuz[1].fark && havuz[0].e.ust !== havuz[1].e.ust) {
      return;
    }
    kullanilan.add(havuz[0].i);
    sonuc.set(String(b._id), havuz[0].e.ust);
  });
  return sonuc;
}

/**
 * Reddedilmiş aç/kapat denemelerinden son niyet: { docId, alan, aktor } →
 * tek sayıda deneme = ekle.
 */
function acKapatNiyetleri(liste, alanSecici) {
  const sayac = new Map();
  liste.forEach((x) => {
    x.alanlar.filter(alanSecici).forEach((alan) => {
      const k = x.docId + '\u0000' + alan + '\u0000' + x.aktor;
      sayac.set(k, (sayac.get(k) || 0) + 1);
    });
  });
  const out = [];
  sayac.forEach((n, k) => {
    if (n % 2 === 1) {
      const [docId, alan, aktor] = k.split('\u0000');
      out.push({ docId, alan, aktor });
    }
  });
  return out;
}

/**
 * @param {object} db
 * @param {object} o  { uygula: boolean, yedek?: (koleksiyon, belge) => void }
 */
async function portalGecmisiOnar(db, o) {
  const uygula = !!(o && o.uygula);
  const yedek = (o && o.yedek) || (() => {});
  const rapor = {
    yorumBaglandi: 0,
    yorumBaglanamadi: 0,
    bildirimBaglandi: 0,
    bildirimBaglanamadi: 0,
    tepkiEklendi: 0,
    yorumBegeniEklendi: 0,
    oyDenemesiKurtarilamadi: 0,
    yorumSayaciGuncellendi: 0,
  };

  const kayitlar = await db
    .collection('audit_logs')
    .find(
      { 'operations.collection': { $in: ['portal_posts', 'portal_notifications'] } },
      { projection: { at: 1, createdAt: 1, actor: 1, status: 1, operations: 1 } }
    )
    .toArray();
  const ops = islemler(kayitlar);

  // ── Kişi → portal kimliği (portal kişiyi e-posta || ad ile tanır) ──
  const ogrenciler = await db
    .collection('students')
    .find({}, { projection: { studentNumber: 1, firstName: 1, lastName: 1, name: 1, email: 1 } })
    .toArray();
  const hocalar = await db
    .collection('professors')
    .find({}, { projection: { name: 1, email: 1 } })
    .toArray();
  const portalKimligi = new Map(); // aktör → portal kimliği
  const tumKimlikler = new Map(); // aktör → bütün olası kimlikler
  ogrenciler.forEach((s) => {
    const no = metin(s.studentNumber);
    if (!no) return;
    const ad = metin([s.firstName, s.lastName].filter(Boolean).join(' ')) || metin(s.name);
    portalKimligi.set(no, ad || no);
    tumKimlikler.set(no, [no, ad, metin(s.name), metin(s.email)].filter(Boolean));
  });
  hocalar.forEach((p) => {
    const ad = metin(p.name);
    if (!ad) return;
    portalKimligi.set(ad, metin(p.email) || ad);
    tumKimlikler.set(ad, [ad, metin(p.email)].filter(Boolean));
  });
  const yazarAktoruMu = (belge, aktor) => {
    const k = tumKimlikler.get(aktor) || [aktor];
    return k.includes(metin(belge.authorId)) || k.includes(metin(belge.authorName));
  };

  // ── 1) Yorumlar → gönderi ──
  const yorumEkleri = ops.filter(
    (x) =>
      x.basarili &&
      x.tur === 'add' &&
      x.koleksiyon === 'portal_posts' &&
      x.alt === 'comments' &&
      x.ust
  );
  const sahipsizYorumlar = await db
    .collection('portal_posts_comments')
    .find({ _parentDocId: { $exists: false } })
    .toArray();
  const yorumUst = altKayitEslestir(sahipsizYorumlar, yorumEkleri, yazarAktoruMu);
  for (const y of sahipsizYorumlar) {
    const ust = yorumUst.get(String(y._id));
    if (!ust) {
      rapor.yorumBaglanamadi += 1;
      continue;
    }
    rapor.yorumBaglandi += 1;
    if (uygula) {
      yedek('portal_posts_comments', y);
      await db
        .collection('portal_posts_comments')
        .updateOne({ _id: y._id }, { $set: { _parentDocId: ust } });
    }
  }

  // ── 2) Portal bildirimleri → alıcı ──
  const bildirimEkleri = ops.filter(
    (x) =>
      x.basarili &&
      x.tur === 'add' &&
      x.koleksiyon === 'portal_notifications' &&
      x.alt === 'items' &&
      x.ust
  );
  const sahipsizBildirimler = await db
    .collection('portal_notifications_items')
    .find({ _parentDocId: { $exists: false } })
    .toArray();
  const bildirimUst = altKayitEslestir(sahipsizBildirimler, bildirimEkleri, () => false);
  for (const b of sahipsizBildirimler) {
    const ust = bildirimUst.get(String(b._id));
    if (!ust) {
      rapor.bildirimBaglanamadi += 1;
      continue;
    }
    rapor.bildirimBaglandi += 1;
    if (uygula) {
      yedek('portal_notifications_items', b);
      await db
        .collection('portal_notifications_items')
        .updateOne({ _id: b._id }, { $set: { _parentDocId: ust } });
    }
  }

  // ── 3) Reddedilmiş tepkiler (gönderi) ve yorum beğenileri ──
  const reddedilen = ops.filter(
    (x) => !x.basarili && x.tur === 'update' && x.koleksiyon === 'portal_posts' && x.docId
  );
  const gonderi = reddedilen.filter((x) => !x.alt);
  const yorumIslem = reddedilen.filter((x) => x.alt === 'comments');
  rapor.oyDenemesiKurtarilamadi = gonderi.filter((x) =>
    x.alanlar.some((a) => a === 'upvotes' || a === 'downvotes')
  ).length;

  const bul = async (kol, id) => {
    const c = db.collection(kol);
    let doc = await c.findOne({ _id: id });
    if (!doc && /^[0-9a-f]{24}$/i.test(id)) {
      try {
        const { ObjectId } = require('mongodb');
        doc = await c.findOne({ _id: new ObjectId(id) });
      } catch (_) {
        doc = null;
      }
    }
    return doc || (await c.findOne({ _docId: id })) || null;
  };
  const ekle = async (kol, niyet, rKey) => {
    const doc = await bul(kol, niyet.docId);
    const kimlik = portalKimligi.get(niyet.aktor);
    if (!doc || !kimlik) return;
    const mevcut = niyet.alan.split('.').reduce((x, k) => (x == null ? x : x[k]), doc) || [];
    const olasi = tumKimlikler.get(niyet.aktor) || [kimlik];
    if (mevcut.some((v) => olasi.includes(metin(v)))) return;
    rapor[rKey] += 1;
    if (uygula) {
      yedek(kol, doc);
      await db.collection(kol).updateOne({ _id: doc._id }, { $addToSet: { [niyet.alan]: kimlik } });
    }
  };
  for (const n of acKapatNiyetleri(gonderi, (a) => /^reactions\.[A-Za-z0-9_]+$/.test(a))) {
    await ekle('portal_posts', n, 'tepkiEklendi');
  }
  for (const n of acKapatNiyetleri(yorumIslem, (a) => a === 'likes')) {
    await ekle('portal_posts_comments', n, 'yorumBegeniEklendi');
  }

  // ── 4) Yorum sayıları (bağlanmış yorumlardan) ──
  const gonderiler = await db
    .collection('portal_posts')
    .find({}, { projection: { _id: 1, _docId: 1, commentCount: 1 } })
    .toArray();
  for (const p of gonderiler) {
    const kimlikler = [String(p._id), metin(p._docId)].filter(Boolean);
    let sayi = 0;
    if (uygula || yorumUst.size === 0) {
      sayi = await db
        .collection('portal_posts_comments')
        .countDocuments({ _parentDocId: { $in: kimlikler } });
    } else {
      // Kuru çalışmada bağlanacak yorumlar da sayılır.
      sayi = await db
        .collection('portal_posts_comments')
        .countDocuments({ _parentDocId: { $in: kimlikler } });
      yorumUst.forEach((ust) => {
        if (kimlikler.includes(ust)) sayi += 1;
      });
    }
    if (Number(p.commentCount || 0) !== sayi) {
      rapor.yorumSayaciGuncellendi += 1;
      if (uygula) {
        yedek('portal_posts', p);
        await db
          .collection('portal_posts')
          .updateOne({ _id: p._id }, { $set: { commentCount: sayi } });
      }
    }
  }
  return rapor;
}

module.exports = { portalGecmisiOnar, altKayitEslestir, acKapatNiyetleri, islemler, olusmaAni };
