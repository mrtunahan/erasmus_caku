/**
 * Cloudflare Worker — Karatekin Üniversitesi Duyuru Proxy
 *
 * Bu worker'ı deploy etmek için:
 *   1. https://workers.cloudflare.com adresinden ücretsiz hesap aç
 *   2. Dashboard > Workers & Pages > Create Worker
 *   3. Bu dosyanın içeriğini yapıştır ve "Deploy" tıkla
 *   4. Worker URL'ini (ör: https://duyuru-proxy.KULLANICI.workers.dev) kopyala
 *   5. duyuru-entegrasyonu.jsx içindeki WORKER_URL değişkenine yapıştır
 *
 * Kullanım:
 *   GET https://duyuru-proxy.KULLANICI.workers.dev/?url=https://bmu.karatekin.edu.tr/tr/tum-duyurular
 *
 * Ücretsiz plan: Günde 100.000 istek (fazlasıyla yeterli)
 */

export default {
  async fetch(request) {
    const IZINLI_DOMAINLER = [
      "bmu.karatekin.edu.tr",
      "mf.karatekin.edu.tr",
      "www.karatekin.edu.tr",
      "oidb.karatekin.edu.tr",
      "karatekin.edu.tr",
    ];

    // CORS — sadece izinli origin'lere yanıt ver
    const IZINLI_ORIGINLER = [
      "https://caku-erasmus.web.app",
      "https://caku-erasmus.firebaseapp.com",
    ];
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigin = IZINLI_ORIGINLER.includes(requestOrigin) ? requestOrigin : IZINLI_ORIGINLER[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // URL parametresini al
    const reqUrl = new URL(request.url);
    const hedefUrl = reqUrl.searchParams.get("url");

    if (!hedefUrl) {
      return new Response(
        JSON.stringify({
          hata: "url parametresi gerekli",
          ornek: reqUrl.origin + "/?url=https://bmu.karatekin.edu.tr/tr/tum-duyurular",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Domain ve protokol kontrolü
    let hedefDomain;
    let hedefParsed;
    try {
      hedefParsed = new URL(hedefUrl);
      hedefDomain = hedefParsed.hostname;
    } catch (e) {
      return new Response(
        JSON.stringify({ hata: "Gecersiz URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sadece HTTP/HTTPS protokollerine izin ver (SSRF koruması)
    if (hedefParsed.protocol !== "https:" && hedefParsed.protocol !== "http:") {
      return new Response(
        JSON.stringify({ hata: "Sadece HTTP/HTTPS protokollerine izin verilir" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const izinli = IZINLI_DOMAINLER.some(function (d) {
      return hedefDomain === d || hedefDomain.endsWith("." + d);
    });

    if (!izinli) {
      return new Response(
        JSON.stringify({ hata: "Bu domain izinli degil: " + hedefDomain }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tarayıcı benzeri header'lar
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    };

    // Deneme URL'leri: HTTPS + HTTP
    const urls = [hedefUrl];
    try {
      const parsed = new URL(hedefUrl);
      if (parsed.protocol === "https:") {
        parsed.protocol = "http:";
        urls.push(parsed.toString());
      } else if (parsed.protocol === "http:") {
        parsed.protocol = "https:";
        urls.push(parsed.toString());
      }
    } catch (e) { /* ignore */ }

    let lastError = null;
    let lastStatus = null;

    // Her URL için 2 deneme (toplam: 2 URL x 2 deneme = 4 deneme)
    for (const tryUrl of urls) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // İkinci denemede kısa bekleme
          if (attempt > 0) {
            await new Promise(function(r) { setTimeout(r, 1000); });
          }

          const response = await fetch(tryUrl, {
            headers: browserHeaders,
            redirect: "follow",
          });

          // 5xx hata ise tekrar dene
          if (response.status >= 500) {
            lastError = new Error("HTTP " + response.status);
            lastStatus = response.status;
            continue;
          }

          // 4xx hatası ise (404 gibi) — hedef sayfa yok, sonraki URL'ye geç
          if (response.status >= 400) {
            lastError = new Error("HTTP " + response.status);
            lastStatus = response.status;
            break; // Bu URL için tekrar deneme, sonraki URL'ye geç
          }

          const html = await response.text();

          // Çok kısa yanıt ise (boş sayfa) reddet
          if (!html || html.length < 100) {
            lastError = new Error("Bos veya cok kisa yanit (" + (html ? html.length : 0) + " karakter)");
            continue;
          }

          return new Response(html, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "X-Fetched-From": tryUrl,
              "X-Attempt": String(attempt + 1),
            },
          });
        } catch (e) {
          lastError = e;
          continue;
        }
      }
    }

    return new Response(
      JSON.stringify({
        hata: "Sayfa alinamadi: " + (lastError ? lastError.message : "bilinmeyen hata"),
        denenen_urllar: urls,
        son_status: lastStatus,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  },
};
