/**
 * HIZ SINIRI ANAHTARI — KİŞİ BAŞINA, GİRİŞSİZDE IP BAŞINA
 *
 * Kampüsteki kullanıcılar aynı dış IP'den çıkıyor (NAT). IP başına sayaçta
 * yoğun saatte bütün üniversite tek kişi sayılıp sınıra takılıyordu: okuma
 * 429 alınca sağ menüden fakülteler kayboluyor, şablon bulunamıyor, modüller
 * geç açılıyordu. Giriş yapmış istek oturum kimliğine göre sayılır.
 */
const { verifyToken } = require('../middleware/auth');

function sinirAnahtariUret(rateLimit) {
  const rl = rateLimit || {};
  return function sinirAnahtari(req) {
    let jeton = (req.cookies && req.cookies.caku_auth) || '';
    const h = req.headers && req.headers.authorization;
    if (!jeton && h && h.startsWith('Bearer ')) jeton = h.split(' ')[1];
    if (jeton) {
      try {
        const u = verifyToken(jeton);
        if (u && u.role) return 'u:' + u.role + ':' + String(u.identifier || u.role);
      } catch (_) {
        /* geçersiz jeton: IP'ye düşer */
      }
    }
    // `ipKeyGenerator` adı bu işlevin İÇİNDE geçmeli: express-rate-limit
    // anahtar işlevinin kaynağını tarayıp IPv6 yardımcısını göremezse her
    // açılışta "ERR_ERL_KEY_GEN_IPV6" uyarısı basıyordu (davranış doğruydu).
    return 'ip:' + (rl.ipKeyGenerator ? rl.ipKeyGenerator(req.ip || '') : String(req.ip || ''));
  };
}

module.exports = { sinirAnahtariUret };
