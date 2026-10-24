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
  const ipAnahtari =
    (rateLimit && rateLimit.ipKeyGenerator) || ((ip) => String(ip == null ? '' : ip));
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
    return 'ip:' + ipAnahtari(req.ip || '');
  };
}

module.exports = { sinirAnahtariUret };
