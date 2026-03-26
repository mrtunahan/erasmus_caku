var express = require("express");
var https = require("https");
var { getDb } = require("../config/database");

var router = express.Router();

// HTML'den metin çıkar (basit tag temizleme)
function stripTags(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x([0-9A-Fa-f]+);/g, function(m, c) { return String.fromCharCode(parseInt(c, 16)); })
    .replace(/&#(\d+);/g, function(m, c) { return String.fromCharCode(parseInt(c)); })
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').trim();
}

// Section içeriğini çıkar
function extractSection(html, sectionId) {
  var regex = new RegExp('id="' + sectionId + '"[^>]*>([\\s\\S]*?)(?=<section|<\\/main|$)', 'i');
  var match = html.match(regex);
  return match ? match[1] : "";
}

// Liste öğelerini çıkar (timeline-body veya card-body içinden)
function extractListItems(sectionHtml) {
  var items = [];
  // timeline-body veya card-body divlerini bul
  var bodyRegex = /<div[^>]*class="[^"]*(?:timeline-body|card-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  var match;
  while ((match = bodyRegex.exec(sectionHtml)) !== null) {
    var text = stripTags(match[1]).trim();
    if (text && text.length > 5) items.push(text);
  }
  // Eğer timeline-body yoksa, tablo satırlarını dene
  if (items.length === 0) {
    var trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((match = trRegex.exec(sectionHtml)) !== null) {
      var cells = [];
      var tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      var td;
      while ((td = tdRegex.exec(match[1])) !== null) {
        var cellText = stripTags(td[1]).trim();
        if (cellText) cells.push(cellText);
      }
      if (cells.length > 0) items.push(cells.join(" | "));
    }
  }
  // Hala yoksa, li öğelerini dene
  if (items.length === 0) {
    var liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = liRegex.exec(sectionHtml)) !== null) {
      var liText = stripTags(match[1]).trim();
      if (liText && liText.length > 10) items.push(liText);
    }
  }
  return items;
}

// ÇAKUAVİS'ten akademisyen bilgisi çek
function fetchAcademicianPage(username) {
  return new Promise(function(resolve, reject) {
    var url = "https://cakuavis.karatekin.edu.tr/" + username;
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CAKU-Asistan/1.0)" } }, function(res) {
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode));
        return;
      }
      var data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() { resolve(data); });
    }).on("error", reject);
  });
}

// HTML parse et
function parseAcademicianHTML(html, username) {
  var result = { username: username, sections: {} };

  // Profil resmi
  var imgMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*rounded-circle[^"]*"/i);
  if (imgMatch) result.photo = imgMatch[1];

  // İsim ve unvan
  var nameMatch = html.match(/id="kisiselBilgiler"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (nameMatch) {
    result.fullName = stripTags(nameMatch[1]).replace(/\s+/g, " ").trim();
  }

  // Email
  var emailMatch = html.match(/E-posta:<\/strong>\s*<span>([^<]+)/i);
  if (emailMatch) result.email = emailMatch[1].trim();

  // Bağlı birim
  var birimMatch = html.match(/Ba&#x11F;l&#x131; Birimi\s*:<\/strong>\s*<a[^>]*>([^<]+)/i) ||
                   html.match(/Bağlı Birimi\s*:<\/strong>\s*<a[^>]*>([^<]+)/i);
  if (birimMatch) result.department = stripTags(birimMatch[1]);

  // Telefon
  var telMatch = html.match(/Tel[^:]*:<\/strong>\s*<span>([^<]+)/i);
  if (telMatch) result.phone = telMatch[1].trim();

  // Web adresi
  var webMatch = html.match(/Web Adresi:<\/strong>\s*<a[^>]*href="([^"]+)"/i);
  if (webMatch) result.web = webMatch[1];

  // Adres
  var addrMatch = html.match(/Adres:<\/strong>\s*<span>([^<]+)/i);
  if (addrMatch) result.address = stripTags(addrMatch[1]);

  // Akademik linkler (YÖKSİS, ORCID, WOS, Google Scholar)
  result.links = {};
  var linkPatterns = [
    { key: "yoksis", pattern: /href="(https:\/\/akademik\.yok\.gov\.tr[^"]+)"/i },
    { key: "orcid", pattern: /href="(https:\/\/orcid\.org[^"]+)"/i },
    { key: "wos", pattern: /href="(https:\/\/www\.webofscience\.com[^"]+)"/i },
    { key: "scholar", pattern: /href="(https:\/\/scholar\.google\.com[^"]+)"/i }
  ];
  linkPatterns.forEach(function(lp) {
    var m = html.match(lp.pattern);
    if (m) result.links[lp.key] = m[1];
  });

  // Atıf istatistikleri (dashboard-stat divleri)
  var statRegex = /<div[^>]*class="[^"]*dashboard-stat[^"]*"[\s\S]*?<span[^>]*class="[^"]*stat-digit[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*stat-label[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  result.stats = {};
  var statMatch;
  while ((statMatch = statRegex.exec(html)) !== null) {
    var label = stripTags(statMatch[2]).trim().toLowerCase();
    var value = stripTags(statMatch[1]).trim();
    if (label && value) result.stats[label] = value;
  }

  // Bölümleri çıkar
  var sectionDefs = [
    { id: "egitimBilgileri", key: "education", label: "Eğitim Bilgileri" },
    { id: "arastirmaAlanlari", key: "researchAreas", label: "Araştırma Alanları" },
    { id: "AkademikIdariDeneyim", key: "experience", label: "Akademik & İdari Görevler" },
    { id: "Tezler", key: "theses", label: "Yönetilen Tezler" },
    { id: "Dersler", key: "courses", label: "Verilen Dersler" },
    { id: "yayinlarEserler", key: "publications", label: "Yayınlar & Eserler" },
    { id: "projePatentTasarim", key: "projects", label: "Proje & Patent & Tasarım" },
    { id: "bilimselFaaliyetler", key: "activities", label: "Bilimsel Faaliyetler" },
    { id: "basarilarTaninirlik", key: "awards", label: "Başarılar & Tanınırlık" }
  ];

  sectionDefs.forEach(function(sec) {
    var sectionHtml = extractSection(html, sec.id);
    if (sectionHtml) {
      var items = extractListItems(sectionHtml);
      if (items.length > 0) {
        result.sections[sec.key] = { label: sec.label, items: items };
      }
    }
  });

  // YÖKSİS güncelleme tarihi
  var dateMatch = html.match(/YÖKSİS Son Veri Güncelleme Tarihi\s*:\s*<\/span>\s*<span[^>]*>\s*([^<]+)/i) ||
                  html.match(/Y&#xD6;KS&#x130;S Son Veri G[\s\S]*?<span[^>]*>\s*([^<]+)/i);
  if (dateMatch) result.lastUpdate = dateMatch[1].trim();

  return result;
}

// GET /api/akademisyen/:username - Tek akademisyen bilgisi
router.get("/:username", async function(req, res) {
  var username = req.params.username.toLowerCase().trim();

  try {
    var db = getDb();

    // Önce cache'e bak (24 saat geçerli)
    var cached = await db.collection("akademisyen_cache").findOne({ _id: username });
    if (cached && cached.fetchedAt) {
      var age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return res.json(cached.data);
      }
    }

    // Siteden çek
    var html = await fetchAcademicianPage(username);
    var data = parseAcademicianHTML(html, username);

    // Cache'e kaydet
    await db.collection("akademisyen_cache").updateOne(
      { _id: username },
      { $set: { data: data, fetchedAt: new Date().toISOString() } },
      { upsert: true }
    );

    res.json(data);
  } catch (err) {
    console.error("Akademisyen fetch error:", err.message);
    // Cache varsa eski veriyi dön
    try {
      var db2 = getDb();
      var old = await db2.collection("akademisyen_cache").findOne({ _id: username });
      if (old && old.data) return res.json(old.data);
    } catch (_) {}
    res.status(500).json({ error: "Akademisyen bilgisi alınamadı: " + err.message });
  }
});

// GET /api/akademisyen - Tüm cache'lenmiş akademisyenleri listele
router.get("/", async function(req, res) {
  try {
    var db = getDb();
    var all = await db.collection("akademisyen_cache").find({}).toArray();
    var list = all.map(function(doc) {
      return {
        username: doc._id,
        fullName: doc.data ? doc.data.fullName : "",
        photo: doc.data ? doc.data.photo : "",
        email: doc.data ? doc.data.email : "",
        department: doc.data ? doc.data.department : "",
        fetchedAt: doc.fetchedAt
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
