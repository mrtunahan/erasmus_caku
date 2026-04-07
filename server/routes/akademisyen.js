var express = require("express");
var https = require("https");
var { getDbSafe } = require("../config/database");

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
  return input.replace(/İ/g, "i").replace(/I/g, "ı").replace(/\s+/g, "").toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").trim();
}

// "Kayıt Yok" sayfası mı kontrol et
function isNotFoundPage(html) {
  if (html.indexOf("Kayıt Yok") >= 0 || html.indexOf("Kay&#x131;t Yok") >= 0) return true;
  if (!html.match(/id="kisiselBilgiler"/i)) return true;
  return false;
}

// Section içeriğini çıkar
function extractSection(html, sectionId) {
  var regex = new RegExp('id="' + sectionId + '"[^>]*>([\\s\\S]*?)(?=<section|<\\/main|$)', 'i');
  var match = html.match(regex);
  return match ? match[1] : "";
}

// Alt kategori başlıklarıyla birlikte öğeleri çıkar (yayınlar, projeler vb.)
function extractCategorizedItems(sectionHtml) {
  if (!sectionHtml) return [];
  var categories = [];

  var timelineRegex = /<div[^>]*class="[^"]*timeline-heading[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*timeline-body[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  var tmMatch;
  var currentLabel = "";
  var labelItems = {};
  while ((tmMatch = timelineRegex.exec(sectionHtml)) !== null) {
    var heading = stripTags(tmMatch[1]).trim();
    var body = stripTags(tmMatch[2]).trim();
    if (heading && heading.length > 3 && !body) {
      currentLabel = heading;
    } else if (body && body.length > 5) {
      if (!labelItems[currentLabel]) labelItems[currentLabel] = [];
      labelItems[currentLabel].push(body);
    }
  }

  var keys = Object.keys(labelItems);
  if (keys.length > 0) {
    keys.forEach(function(k) {
      categories.push({ label: k, items: labelItems[k], count: labelItems[k].length });
    });
    return categories;
  }

  var parts = sectionHtml.split(/(?=<div[^>]*class="[^"]*(?:card\s|card"|panel\s|panel")[^"]*)/i);
  if (parts.length <= 1) {
    parts = sectionHtml.split(/(?=<h[3-5][^>]*>)/i);
  }
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var headMatch = part.match(/<(?:h[3-5])[^>]*>([\s\S]*?)<\/(?:h[3-5])>/i) ||
                    part.match(/<div[^>]*class="[^"]*(?:card-header|card-title|panel-heading|timeline-heading)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    var label = headMatch ? stripTags(headMatch[1] || headMatch[2] || "").trim() : "";
    var items = extractListItems(part);
    if (items.length > 0) {
      categories.push({ label: label || "", items: items, count: items.length });
    }
  }
  return categories.filter(function(c) { return c.items.length > 0; });
}

// Metin içinden yıl çıkar
function extractYear(text) {
  var m = text.match(/\b(20[0-2]\d|19[89]\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}

// Yayın metnini kategorize et
function categorizePublicationText(text, subLabel) {
  var combined = (text + " " + (subLabel || "")).toUpperCase();
  var upper = combined
    .replace(/İ/g, "I").replace(/Ğ/g, "G").replace(/Ü/g, "U")
    .replace(/Ş/g, "S").replace(/Ö/g, "O").replace(/Ç/g, "C")
    .replace(/ı/g, "I").replace(/ğ/g, "G").replace(/ü/g, "U")
    .replace(/ş/g, "S").replace(/ö/g, "O").replace(/ç/g, "C");

  if (upper.indexOf("SCI") >= 0 || upper.indexOf("SSCI") >= 0 || upper.indexOf("AHCI") >= 0) return "sci";
  if (upper.indexOf("SCIENCE CITATION") >= 0 || upper.indexOf("WEB OF SCIENCE") >= 0 || upper.indexOf("WOS") >= 0) return "sci";
  if (upper.indexOf("UAK") >= 0 || upper.indexOf("ALAN INDEKS") >= 0 || upper.indexOf("ALAN INDEKSI") >= 0) return "uak";
  if (upper.indexOf("ULAKBIM") >= 0 || upper.indexOf("TR DIZIN") >= 0 || upper.indexOf("TR-DIZIN") >= 0 || upper.indexOf("TRDIZIN") >= 0) return "ulakbim";
  if (upper.indexOf("KITAP") >= 0 || upper.indexOf("BOOK") >= 0 || upper.indexOf("BOLUM") >= 0 || upper.indexOf("CHAPTER") >= 0) return "book";
  if (upper.indexOf("BILDIRI") >= 0 || upper.indexOf("KONGRE") >= 0 || upper.indexOf("SEMPOZYUM") >= 0 ||
      upper.indexOf("CONFERENCE") >= 0 || upper.indexOf("SYMPOSIUM") >= 0 || upper.indexOf("PROCEEDING") >= 0 ||
      upper.indexOf("WORKSHOP") >= 0 || upper.indexOf("CONGRESS") >= 0 || upper.indexOf("SUNUL") >= 0) return "conference";

  var subUp = (subLabel || "").toUpperCase()
    .replace(/İ/g, "I").replace(/Ğ/g, "G").replace(/Ü/g, "U")
    .replace(/Ş/g, "S").replace(/Ö/g, "O").replace(/Ç/g, "C");

  if (subUp.indexOf("ULUSLARARASI") >= 0 && subUp.indexOf("DERGI") >= 0) return "sci";
  if (subUp.indexOf("ULUSAL") >= 0 && subUp.indexOf("DERGI") >= 0) return "ulakbim";
  if (subUp.indexOf("BILDIRI") >= 0 || subUp.indexOf("KONGRE") >= 0 || subUp.indexOf("SEMPOZYUM") >= 0 || subUp.indexOf("KONFERANS") >= 0) return "conference";
  if (subUp.indexOf("KITAP") >= 0 || subUp.indexOf("BOOK") >= 0) return "book";
  if (subUp.indexOf("HAKEMLI") >= 0 && subUp.indexOf("DERGI") >= 0) return "uak";

  if (upper.indexOf("JOURNAL") >= 0 || upper.indexOf("DERGI") >= 0) {
    if (upper.indexOf("INTERNATIONAL") >= 0 || upper.indexOf("ULUSLARARASI") >= 0) return "sci";
    return "uak";
  }

  return "other";
}

// Liste öğelerini çıkar
function extractListItems(sectionHtml) {
  var items = [];
  var bodyRegex = /<div[^>]*class="[^"]*(?:timeline-body|card-body|panel-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  var match;
  while ((match = bodyRegex.exec(sectionHtml)) !== null) {
    var text = stripTags(match[1]).trim();
    if (text && text.length > 5) items.push(text);
  }
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

  var imgMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*rounded-circle[^"]*"/i);
  if (imgMatch) result.photo = imgMatch[1];

  var nameMatch = html.match(/id="kisiselBilgiler"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (nameMatch) {
    result.fullName = stripTags(nameMatch[1]).replace(/\s+/g, " ").trim();
  }

  var emailMatch = html.match(/E-posta:<\/strong>\s*<span>([^<]+)/i);
  if (emailMatch) result.email = emailMatch[1].trim();

  var birimMatch = html.match(/Ba&#x11F;l&#x131; Birimi\s*:<\/strong>\s*<a[^>]*>([^<]+)/i) ||
                   html.match(/Bağlı Birimi\s*:<\/strong>\s*<a[^>]*>([^<]+)/i);
  if (birimMatch) result.department = stripTags(birimMatch[1]);

  var telMatch = html.match(/Tel[^:]*:<\/strong>\s*<span>([^<]+)/i);
  if (telMatch) result.phone = telMatch[1].trim();

  var webMatch = html.match(/Web Adresi:<\/strong>\s*<a[^>]*href="([^"]+)"/i);
  if (webMatch) result.web = webMatch[1];

  var addrMatch = html.match(/Adres:<\/strong>\s*<span>([^<]+)/i);
  if (addrMatch) result.address = stripTags(addrMatch[1]);

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

  result.stats = {};
  var statRegex = /<div[^>]*class="[^"]*dashboard-stat[^"]*"[\s\S]*?<span[^>]*class="[^"]*stat-digit[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*stat-label[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  var statMatch;
  while ((statMatch = statRegex.exec(html)) !== null) {
    var label = stripTags(statMatch[2]).trim().toLowerCase();
    var value = stripTags(statMatch[1]).trim();
    if (label && value) result.stats[label] = value;
  }
  if (Object.keys(result.stats).length === 0) {
    var statRegex2 = /<div[^>]*class="[^"]*stat[^"]*"[^>]*>[\s\S]*?<(?:span|div|h\d)[^>]*class="[^"]*(?:count|digit|number|value)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|h\d)>[\s\S]*?<(?:span|div|p)[^>]*class="[^"]*(?:label|title|desc|text)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|p)>/gi;
    while ((statMatch = statRegex2.exec(html)) !== null) {
      var label2 = stripTags(statMatch[2]).trim().toLowerCase();
      var value2 = stripTags(statMatch[1]).trim();
      if (label2 && value2) result.stats[label2] = value2;
    }
  }
  if (Object.keys(result.stats).length === 0) {
    var citMatch = html.match(/(?:at&#x131;f|atıf|atif|citation)[^<]*?(?:say&#x131;s&#x131;|sayısı|sayisi|count)?[^<]*?<[^>]*>[\s]*?(\d+)/i);
    if (citMatch) result.stats["atıf sayısı"] = citMatch[1];
  }

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

  var pubHtml = extractSection(html, "yayinlarEserler");
  if (pubHtml) {
    var subCats = extractCategorizedItems(pubHtml);
    var metrics = { sci: [], uak: [], ulakbim: [], book: [], conference: [], other: [] };
    subCats.forEach(function(cat) {
      cat.items.forEach(function(item) {
        var type = categorizePublicationText(item, cat.label);
        var year = extractYear(item);
        metrics[type].push({ text: item, year: year, subCategory: cat.label });
      });
    });
    if (subCats.length === 0 && result.sections.publications) {
      result.sections.publications.items.forEach(function(item) {
        var type = categorizePublicationText(item, "");
        var year = extractYear(item);
        metrics[type].push({ text: item, year: year, subCategory: "" });
      });
    }
    result.publicationMetrics = metrics;
  }

  var projItems = (result.sections.projects || {}).items || [];
  var allSectionItems = [];
  Object.keys(result.sections).forEach(function(key) {
    allSectionItems = allSectionItems.concat(result.sections[key].items || []);
  });
  result.project2209Count = projItems.filter(function(item) {
    return item.indexOf("2209") >= 0 || item.toUpperCase().indexOf("TUBITAK 2209") >= 0 || item.toUpperCase().indexOf("TÜBİTAK 2209") >= 0;
  }).length;
  if (result.project2209Count === 0) {
    var count2209 = (html.match(/2209/g) || []).length;
    if (count2209 > 0) result.project2209Count = count2209;
  }

  var dateMatch = html.match(/YÖKSİS Son Veri Güncelleme Tarihi\s*:\s*<\/span>\s*<span[^>]*>\s*([^<]+)/i) ||
                  html.match(/Y&#xD6;KS&#x130;S Son Veri G[\s\S]*?<span[^>]*>\s*([^<]+)/i);
  if (dateMatch) result.lastUpdate = dateMatch[1].trim();

  return result;
}

// GET /api/akademisyen/metrics/all - Tüm akademisyenlerin yayın metriklerini toplu getir
router.get("/metrics/all", async function(req, res) {
  try {
    var db = await getDbSafe();
    var filter = {};
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }
    var docs = await db.collection("akademisyen_cache").find(filter).toArray();
    var results = [];
    var staleUsernames = [];

    docs.forEach(function(doc) {
      if (!doc.data) return;
      var data = doc.data;
      if (!data.publicationMetrics) {
        staleUsernames.push({ username: doc._id, departmentId: doc.departmentId });
      }
      results.push({
        username: doc._id,
        fullName: data.fullName || "",
        department: data.department || "",
        departmentId: doc.departmentId || null,
        stats: data.stats || {},
        publicationMetrics: data.publicationMetrics || { sci: [], uak: [], ulakbim: [], book: [], conference: [], other: [] },
        project2209Count: data.project2209Count || 0,
        fetchedAt: doc.fetchedAt
      });
    });

    // Eski formattaki cache'leri arka planda yenile
    if (staleUsernames.length > 0) {
      Promise.all(staleUsernames.map(function(item) {
        return fetchAcademicianPage(item.username).then(function(html) {
          if (isNotFoundPage(html)) return null;
          var data = parseAcademicianHTML(html, item.username);
          var updateData = { data: data, fetchedAt: new Date() };
          if (item.departmentId) updateData.departmentId = item.departmentId;
          return db.collection("akademisyen_cache").updateOne(
            { _id: item.username },
            { $set: updateData },
            { upsert: true }
          );
        }).catch(function() { return null; });
      })).then(function() {
        console.log("Stale cache refreshed for: " + staleUsernames.map(function(s) { return s.username; }).join(", "));
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    var db = await getDbSafe();
    var filter = {};
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }
    var docs = await db.collection("akademisyen_cache").find(filter).toArray();
    var list = docs.map(function(doc) {
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
    var db = await getDbSafe();
    var result = await db.collection("akademisyen_cache").updateOne(
      { _id: username },
      { $set: { departmentId: departmentId } }
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
    var db = await getDbSafe();
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
  var forceRefresh = req.query.force === "true";

  if (!username) return res.status(400).json({ error: "Kullanıcı adı gerekli" });

  try {
    var db = await getDbSafe();

    // Önce cache'e bak (24 saat geçerli)
    var cached = await db.collection("akademisyen_cache").findOne({ _id: username });
    if (!forceRefresh && cached) {
      var hasMetrics = cached.data && cached.data.publicationMetrics;
      if (cached.fetchedAt && hasMetrics) {
        var fetchedTime = cached.fetchedAt instanceof Date
          ? cached.fetchedAt.getTime()
          : (cached.fetchedAt._seconds ? cached.fetchedAt._seconds * 1000 : new Date(cached.fetchedAt).getTime());
        var age = Date.now() - fetchedTime;
        if (age < 24 * 60 * 60 * 1000) {
          if (departmentId && !cached.departmentId) {
            await db.collection("akademisyen_cache").updateOne(
              { _id: username },
              { $set: { departmentId: departmentId } }
            );
          }
          return res.json(cached.data);
        }
      }
    }

    // Siteden çek
    var html = await fetchAcademicianPage(username);

    if (isNotFoundPage(html)) {
      return res.status(404).json({ error: "Bu kullanıcı adı ile akademisyen bulunamadı: " + username, notFound: true });
    }

    var data = parseAcademicianHTML(html, username);

    // Cache'e kaydet
    var updateData = { data: data, fetchedAt: new Date() };
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
      var db2 = await getDbSafe();
      var old = await db2.collection("akademisyen_cache").findOne({ _id: username });
      if (old && old.data) return res.json(old.data);
    } catch (_) {}
    res.status(500).json({ error: "Akademisyen bilgisi alınamadı: " + err.message });
  }
});

module.exports = router;
