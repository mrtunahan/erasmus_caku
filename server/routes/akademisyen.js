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
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Kullanıcı adını normalize et (boşlukları sil, küçük harf)
function normalizeUsername(input) {
  if (!input) return "";
  return input.replace(/\s+/g, "").toLowerCase().trim();
}

// "Kayıt Yok" sayfası mı kontrol et
function isNotFoundPage(html) {
  // ÇAKUAVİS, bulunamayan kullanıcılar için "Kayıt Yok" veya boş profil döner
  if (html.indexOf("Kayıt Yok") >= 0 || html.indexOf("Kay&#x131;t Yok") >= 0) return true;
  // Profil ismi yoksa da kayıt yok demektir
  if (!html.match(/id="kisiselBilgiler"/i)) return true;
  return false;
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

// GET /api/akademisyen/proxy/photo - Profil fotoğrafı proxy (CSP bypass)
// Bu route /:username'den ÖNCE tanımlanmalı yoksa "proxy" username olarak yakalanır
router.get("/proxy/photo", async function(req, res) {
  var url = req.query.url;
  if (!url) return res.status(400).send("url gerekli");
  if (url.indexOf("karatekin.edu.tr") < 0 && url.indexOf("websitem.karatekin.edu.tr") < 0) {
    return res.status(403).send("Sadece karatekin.edu.tr resimleri");
  }
  try {
    var mod = url.startsWith("https") ? https : require("http");
    mod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CAKU-Asistan/1.0)" } }, function(imgRes) {
      if (imgRes.statusCode !== 200) return res.status(imgRes.statusCode).send("Resim alınamadı");
      res.set("Content-Type", imgRes.headers["content-type"] || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      imgRes.pipe(res);
    }).on("error", function() { res.status(500).send("Resim alınamadı"); });
  } catch (e) { res.status(500).send("Resim alınamadı"); }
});

// GET /api/akademisyen - Akademisyenleri listele (departmentId filtreli)
router.get("/", async function(req, res) {
  try {
    var db = getDb();
    var filter = {};
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }
    var all = await db.collection("akademisyen_cache").find(filter).toArray();
    var list = all.map(function(doc) {
      return {
        username: doc._id,
        fullName: doc.data ? doc.data.fullName : "",
        photo: doc.data ? doc.data.photo : "",
        email: doc.data ? doc.data.email : "",
        department: doc.data ? doc.data.department : "",
        departmentId: doc.departmentId || null,
        fetchedAt: doc.fetchedAt
      };
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/akademisyen/:username/assign - Akademisyeni bölüme ata
router.post("/:username/assign", async function(req, res) {
  var username = normalizeUsername(req.params.username);
  var departmentId = req.body.departmentId;

  if (!departmentId) return res.status(400).json({ error: "departmentId gerekli" });

  try {
    var db = getDb();
    await db.collection("akademisyen_cache").updateOne(
      { _id: username },
      { $set: { departmentId: departmentId } },
      { upsert: false }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/akademisyen/:username - Akademisyeni sil
router.delete("/:username", async function(req, res) {
  var username = normalizeUsername(req.params.username);
  try {
    var db = getDb();
    await db.collection("akademisyen_cache").deleteOne({ _id: username });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/akademisyen/:username - Tek akademisyen bilgisi
router.get("/:username", async function(req, res) {
  var username = normalizeUsername(req.params.username);
  var departmentId = req.query.departmentId || null;

  if (!username) return res.status(400).json({ error: "Kullanıcı adı gerekli" });

  try {
    var db = getDb();

    // Önce cache'e bak (24 saat geçerli)
    var cached = await db.collection("akademisyen_cache").findOne({ _id: username });
    if (cached && cached.fetchedAt) {
      var age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        // departmentId varsa ata
        if (departmentId && !cached.departmentId) {
          await db.collection("akademisyen_cache").updateOne({ _id: username }, { $set: { departmentId: departmentId } });
        }
        return res.json(cached.data);
      }
    }

    // Siteden çek
    var html = await fetchAcademicianPage(username);

    // "Kayıt Yok" kontrolü
    if (isNotFoundPage(html)) {
      return res.status(404).json({ error: "Bu kullanıcı adı ile akademisyen bulunamadı: " + username, notFound: true });
    }

    var data = parseAcademicianHTML(html, username);

    // Cache'e kaydet (departmentId ile birlikte)
    var updateData = { data: data, fetchedAt: new Date().toISOString() };
    if (departmentId) updateData.departmentId = departmentId;
    await db.collection("akademisyen_cache").updateOne(
      { _id: username },
      { $set: updateData },
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

module.exports = router;
