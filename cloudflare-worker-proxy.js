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
    try {
      const response = await fetch(hedefUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        },
        cf: { cacheTtl: 300 }, // 5 dk Cloudflare cache
      });

      const html = await response.text();

      return new Response(html, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300", // 5 dk tarayıcı cache
        },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ hata: "Sayfa alinamadi: " + e.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
