// ══════════════════════════════════════════════════════════════
// POSTA SERVİSİ — sistemin gönderdiği bütün e-postalar buradan çıkar.
//
//   gonder({ kime, konu, baslik, paragraflar, dugme, altNot, tur })
//
// Sağlayıcı: Resend (https://resend.com) REST API'si — ek paket gerekmez.
// Gönderen adres SABİTTİR ve sunucu ortamından gelir:
//   RESEND_API_KEY   → Resend anahtarı (yalnız server/.env'de durur)
//   MAIL_GONDEREN    → "Offline Asistan <no-reply@offlineasistan.com.tr>"
//   UYGULAMA_ADRESI  → https://offlineasistan.com.tr (bağlantıların kökü)
//
// Anahtar tanımlı değilse (geliştirme/test) e-posta GÖNDERİLMEZ; konsola
// yazılır. POSTA_TEST_KUTUSU=1 iken son iletiler bellekte de tutulur ki
// uçtan uca testler kodu/bağlantıyı okuyabilsin — üretimde bu kutu kapalıdır.
//
// İleride modüller (staj, başvuru sonuçları…) aynı `gonder` işlevini
// kullanır; şablon, gönderen ve kayıt tek yerde kalır.
// ══════════════════════════════════════════════════════════════

const { getDbSafe } = require('../config/database');
const { epostaMaskele } = require('./eposta-kurali');

const RESEND_URL = 'https://api.resend.com/emails';
const VARSAYILAN_GONDEREN = 'Offline Asistan <no-reply@offlineasistan.com.tr>';
const VARSAYILAN_ADRES = 'https://offlineasistan.com.tr';

const anahtar = () => String(process.env.RESEND_API_KEY || '').trim();
const gonderen = () => String(process.env.MAIL_GONDEREN || VARSAYILAN_GONDEREN).trim();

/** Uygulamanın dışarıya açık kökü — sonunda / olmadan. */
function uygulamaAdresi() {
  return String(process.env.UYGULAMA_ADRESI || VARSAYILAN_ADRES)
    .trim()
    .replace(/\/+$/, '');
}

/** Gerçek gönderim yapılandırılmış mı? */
function postaHazirMi() {
  // Biçim katı denetlenmez (Resend anahtar biçimini değiştirebilir); yanlış
  // anahtar gönderimde 401 döner ve günlüğe düşer.
  const a = anahtar();
  return a.startsWith('re_') && a.length >= 12 && !/\s/.test(a);
}

const testKutusuAcik = () =>
  process.env.POSTA_TEST_KUTUSU === '1' && process.env.NODE_ENV !== 'production';
const testKutusu = [];

function kacis(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Ortak şablon: başlık, paragraflar, isteğe bağlı düğme ve alt not.
 * E-posta istemcileri harici CSS'i çoğunlukla yok saydığı için stiller
 * satır içi ve tablo düzenindedir. Renkler uygulama paletiyle aynı.
 */
function sablon({ baslik, paragraflar = [], dugme, kod, altNot }) {
  const p = paragraflar
    .filter(Boolean)
    .map(
      (x) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1E293B">${kacis(x)}</p>`
    )
    .join('');
  const kodHtml = kod
    ? `<div style="margin:6px 0 20px;padding:16px;border-radius:12px;background:#F0FDFA;border:1px solid #99F6E4;text-align:center;font-size:30px;letter-spacing:8px;font-weight:800;color:#115E59;font-family:Consolas,Menlo,monospace">${kacis(kod)}</div>`
    : '';
  const dugmeHtml =
    dugme && dugme.url
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 20px"><tr><td style="border-radius:10px;background:#0F766E"><a href="${kacis(dugme.url)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px">${kacis(dugme.metin)}</a></td></tr></table>
         <p style="margin:0 0 14px;font-size:12.5px;line-height:1.5;color:#64748B">Düğme çalışmazsa bu adresi tarayıcınıza yapıştırın:<br><span style="word-break:break-all;color:#0F766E">${kacis(dugme.url)}</span></p>`
      : '';
  const alt = altNot
    ? `<p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#64748B">${kacis(altNot)}</p>`
    : '';
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:0;background:#F5F7FA">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F7FA;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;font-family:Inter,Segoe UI,Arial,sans-serif">
<tr><td style="background:#1B2A4A;border-radius:14px 14px 0 0;padding:18px 24px;color:#FFFFFF;font-size:16px;font-weight:700;letter-spacing:.02em">Offline Asistan</td></tr>
<tr><td style="padding:26px 24px 24px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1B2A4A">${kacis(baslik)}</h1>
${p}${kodHtml}${dugmeHtml}${alt}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #E2E8F0;font-size:11.5px;color:#94A3B8">Bu ileti Offline Asistan tarafından otomatik gönderildi; lütfen yanıtlamayın.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Düz metin yedeği (HTML göstermeyen istemciler ve spam filtreleri için). */
function duzMetin({ baslik, paragraflar = [], dugme, kod, altNot }) {
  return [
    baslik,
    '',
    ...paragraflar.filter(Boolean),
    kod ? '\nKod: ' + kod : '',
    dugme && dugme.url ? '\n' + dugme.metin + ': ' + dugme.url : '',
    altNot ? '\n' + altNot : '',
    '\n— Offline Asistan',
  ]
    .filter((x) => x !== '')
    .join('\n');
}

async function kayitYaz(kayit) {
  try {
    const db = await getDbSafe();
    await db.collection('eposta_gonderimleri').insertOne({ ...kayit, at: new Date() });
  } catch (_) {
    /* gönderim kaydı yazılamasa da akış sürer */
  }
}

/**
 * E-posta gönder. Hata FIRLATMAZ; { ok, id?, hata? } döner — çağıran
 * (ör. şifremi unuttum) kullanıcıya her durumda aynı yanıtı verebilsin.
 * Kayıtta adres MASKELİ, içerik (kod/bağlantı) hiç tutulmaz.
 */
async function gonder({ kime, konu, tur = 'genel', yanitAdresi, ...icerik }) {
  const alici = String(kime || '').trim();
  if (!alici) return { ok: false, hata: 'alıcı yok' };
  const html = sablon(icerik);
  const text = duzMetin(icerik);

  if (!postaHazirMi()) {
    console.info('[posta] (gönderim yapılandırılmamış) →', alici, '|', konu, '\n' + text);
    if (testKutusuAcik()) {
      testKutusu.push({ kime: alici, konu, tur, metin: text, at: Date.now() });
      if (testKutusu.length > 200) testKutusu.shift();
    }
    await kayitYaz({ tur, kime: epostaMaskele(alici), konu, durum: 'yapilandirilmamis' });
    return { ok: true, id: 'yerel', yerel: true };
  }

  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + anahtar(), 'Content-Type': 'application/json' },
      // `yanitAdresi`: "Yanıtla" denince iletinin gideceği adres (ör. destek
      // talebini gönderen kişi). Gönderen adres yine sabittir.
      body: JSON.stringify({
        from: gonderen(),
        to: [alici],
        subject: konu,
        html,
        text,
        ...(yanitAdresi ? { reply_to: String(yanitAdresi).trim() } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const hata = (j && (j.message || j.name)) || 'HTTP ' + r.status;
      console.warn('[posta] gönderilemedi:', tur, hata);
      await kayitYaz({ tur, kime: epostaMaskele(alici), konu, durum: 'hata', hata });
      return { ok: false, hata };
    }
    await kayitYaz({ tur, kime: epostaMaskele(alici), konu, durum: 'gonderildi', id: j.id });
    return { ok: true, id: j.id };
  } catch (e) {
    console.warn('[posta] ağ hatası:', tur, e && e.message);
    await kayitYaz({ tur, kime: epostaMaskele(alici), konu, durum: 'hata', hata: e && e.message });
    return { ok: false, hata: e && e.message };
  }
}

module.exports = {
  gonder,
  postaHazirMi,
  uygulamaAdresi,
  sablon,
  duzMetin,
  testKutusu,
  testKutusuAcik,
};
