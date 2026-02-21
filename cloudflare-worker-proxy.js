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
    // Sadece karatekin.edu.tr domainlerinden izin ver
    const IZINLI_DOMAINLER = [
      "bmu.karatekin.edu.tr",
      "mf.karatekin.edu.tr",
      "www.karatekin.edu.tr",
      "oidb.karatekin.edu.tr",
      "karatekin.edu.tr",
    ];

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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

    // Domain kontrolü — sadece karatekin.edu.tr'ye izin ver
    let hedefDomain;
    try {
      hedefDomain = new URL(hedefUrl).hostname;
    } catch (e) {
      return new Response(
        JSON.stringify({ hata: "Geçersiz URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const izinli = IZINLI_DOMAINLER.some(function (d) {
      return hedefDomain === d || hedefDomain.endsWith("." + d);
    });

    if (!izinli) {
      return new Response(
        JSON.stringify({ hata: "Bu domain izinli değil: " + hedefDomain }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hedef sayfayı fetch et
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    };

    // URL'leri dene: orijinal + HTTP/HTTPS alternatifi
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

    for (const tryUrl of urls) {
      try {
        const response = await fetch(tryUrl, {
          headers: browserHeaders,
          redirect: "follow",
        });

        // 5xx hata (522 Connection Timed Out gibi) ise sonraki URL'yi dene
        if (response.status >= 500) {
          lastError = new Error("HTTP " + response.status);
          lastStatus = response.status;
          continue;
        }

        const html = await response.text();

        return new Response(html, {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Fetched-From": tryUrl,
          },
        });
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    // Her iki URL de başarısız olduysa, üçüncü yöntem: Google Web Cache dene
    try {
      const cacheUrl = "https://webcache.googleusercontent.com/search?q=cache:" + encodeURIComponent(hedefUrl);
      const cacheResponse = await fetch(cacheUrl, {
        headers: browserHeaders,
        redirect: "follow",
      });
      if (cacheResponse.status === 200) {
        const html = await cacheResponse.text();
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Fetched-From": "google-cache",
            "X-Cache-Notice": "Orijinal sunucuya ulasilamadi, Google onbelleginden alindi",
          },
        });
      }
    } catch (e) { /* Google cache de başarısız, aşağıda hata dön */ }

    return new Response(
      JSON.stringify({
        hata: "Sayfa alinamadi (HTTPS, HTTP ve Google Cache denendi): " + (lastError ? lastError.message : "bilinmeyen hata"),
        denenen_urllar: urls,
        son_status: lastStatus,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  },
};
