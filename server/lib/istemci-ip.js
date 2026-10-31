// ══════════════════════════════════════════════════════════════
// İSTEMCİNİN GERÇEK IP'Sİ
//
// ⚠ `X-Forwarded-For` başlığının İLK değeri istemcinin kendi yazdığıdır:
// nginx (`$proxy_add_x_forwarded_for`) gerçek adresi listenin SONUNA ekler.
// İlk değeri okuyan IP sınırları (şifremi unuttum, destek talebi) her
// istekte başlık değiştirilerek aşılabiliyor, denetim kaydına sahte IP
// yazılabiliyordu. Express `trust proxy = 1` (server/index.js) ile `req.ip`
// tam olarak nginx'in gördüğü adresi verir; tek doğru kaynak odur.
// ══════════════════════════════════════════════════════════════

function istemciIp(req) {
  return String((req && (req.ip || (req.socket && req.socket.remoteAddress))) || '').trim();
}

module.exports = { istemciIp };
