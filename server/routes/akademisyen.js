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

// Alt kategori başlıklarıyla birlikte öğeleri çıkar (yayınlar, projeler vb.)
function extractCategorizedItems(sectionHtml) {
  if (!sectionHtml) return [];
  var categories = [];
  // card veya panel sınırlarında böl
  var parts = sectionHtml.split(/(?=<div[^>]*class="[^"]*(?:card\s|panel\s)[^"]*")/i);
  if (parts.length <= 1) {
    // card yapısı yoksa h3/h4/h5 başlıklarında böl
    parts = sectionHtml.split(/(?=<h[3-5][^>]*>)/i);
  }
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    // Başlık çıkar
    var headMatch = part.match(/<(?:h[3-5]|div)[^>]*(?:class="[^"]*(?:card-header|card-title|panel-heading|timeline-heading)[^"]*")?[^>]*>([\s\S]*?)<\/(?:h[3-5]|div)>/i);
    var label = headMatch ? stripTags(headMatch[1]).trim() : "";
    // Bu parçadaki öğeleri çıkar
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
  var upper = (text + " " + (subLabel || "")).toUpperCase();
  if (upper.indexOf("SCI") >= 0 || upper.indexOf("SSCI") >= 0 || upper.indexOf("AHCI") >= 0) return "sci";
  if (upper.indexOf("ÜAK") >= 0 || upper.indexOf("ALAN İNDEKS") >= 0 || upper.indexOf("UAK") >= 0) return "uak";
  if (upper.indexOf("ULAKBİM") >= 0 || upper.indexOf("ULAKBIM") >= 0 || upper.indexOf("TR DİZİN") >= 0 || upper.indexOf("TR DIZIN") >= 0) return "ulakbim";
  if (upper.indexOf("KİTAP") >= 0 || upper.indexOf("KITAP") >= 0 || upper.indexOf("BOOK") >= 0 || upper.indexOf("BÖLÜM") >= 0 || upper.indexOf("BOLUM") >= 0) return "book";
  if (upper.indexOf("BİLDİRİ") >= 0 || upper.indexOf("BILDIRI") >= 0 || upper.indexOf("KONGRE") >= 0 || upper.indexOf("SEMPOZYUM") >= 0 || upper.indexOf("CONFERENCE") >= 0 || upper.indexOf("SYMPOSIUM") >= 0) return "conference";
  return "other";
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

  // Kategorize edilmiş yayın verileri (analiz dashboard'u için)
  var pubHtml = extractSection(html, "yayinlarEserler");
  if (pubHtml) {
    var subCats = extractCategorizedItems(pubHtml);
    var metrics = { sci: [], uak: [], ulakbim: [], book: [], conference: [], other: [] };
    // Alt kategori başlıklarıyla eşleştir
    subCats.forEach(function(cat) {
      cat.items.forEach(function(item) {
        var type = categorizePublicationText(item, cat.label);
        var year = extractYear(item);
        metrics[type].push({ text: item, year: year, subCategory: cat.label });
      });
    });
    // Alt kategori yoksa düz item listesinden kategorize et
    if (subCats.length === 0 && result.sections.publications) {
      result.sections.publications.items.forEach(function(item) {
        var type = categorizePublicationText(item, "");
        var year = extractYear(item);
        metrics[type].push({ text: item, year: year, subCategory: "" });
      });
    }
    result.publicationMetrics = metrics;
  }

  // 2209 proje sayısı
  var projItems = (result.sections.projects || {}).items || [];
  result.project2209Count = projItems.filter(function(item) { return item.indexOf("2209") >= 0; }).length;

  // YÖKSİS güncelleme tarihi
  var dateMatch = html.match(/YÖKSİS Son Veri Güncelleme Tarihi\s*:\s*<\/span>\s*<span[^>]*>\s*([^<]+)/i) ||
                  html.match(/Y&#xD6;KS&#x130;S Son Veri G[\s\S]*?<span[^>]*>\s*([^<]+)/i);
  if (dateMatch) result.lastUpdate = dateMatch[1].trim();

  return result;
}

// GET /api/akademisyen/metrics/all - Tüm akademisyenlerin yayın metriklerini toplu getir
router.get("/metrics/all", async function(req, res) {
  try {
    var db = await getDbSafe();
    var query = db.collection("akademisyen_cache");
    if (req.query.departmentId) {
      query = query.where("departmentId", "==", req.query.departmentId);
    }
    var snapshot = await query.get();
    var results = [];
    var staleUsernames = [];

    snapshot.docs.forEach(function(doc) {
      var d = doc.data();
      if (!d.data) return;
      var data = d.data;
      // publicationMetrics eksikse yeniden çekilecekler listesine ekle
      if (!data.publicationMetrics) {
        staleUsernames.push({ username: doc.id, departmentId: d.departmentId });
      }
      results.push({
        username: doc.id,
        fullName: data.fullName || "",
        department: data.department || "",
        departmentId: d.departmentId || null,
        stats: data.stats || {},
        publicationMetrics: data.publicationMetrics || { sci: [], uak: [], ulakbim: [], book: [], conference: [], other: [] },
        project2209Count: data.project2209Count || 0,
        fetchedAt: d.fetchedAt
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
          return db.collection("akademisyen_cache").doc(item.username).set(updateData, { merge: true });
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
    var query = db.collection("akademisyen_cache");
    if (req.query.departmentId) {
      query = query.where("departmentId", "==", req.query.departmentId);
    }
    var snapshot = await query.get();
    var list = snapshot.docs.map(function(doc) {
      var d = doc.data();
      return {
        username: doc.id,
        fullName: d.data ? d.data.fullName : "",
        photo: d.data ? d.data.photo : "",
        email: d.data ? d.data.email : "",
        department: d.data ? d.data.department : "",
        departmentId: d.departmentId || null,
        fetchedAt: d.fetchedAt
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
    var docRef = db.collection("akademisyen_cache").doc(username);
    var doc = await docRef.get();
    if (doc.exists) {
      await docRef.update({ departmentId: departmentId });
    }
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
    await db.collection("akademisyen_cache").doc(username).delete();
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
    var docRef = db.collection("akademisyen_cache").doc(username);
    var cached = await docRef.get();
    if (!forceRefresh && cached.exists) {
      var cachedData = cached.data();
      // publicationMetrics yoksa cache'i geçersiz say (eski format)
      var hasMetrics = cachedData.data && cachedData.data.publicationMetrics;
      if (cachedData.fetchedAt && hasMetrics) {
        var fetchedTime = cachedData.fetchedAt && cachedData.fetchedAt._seconds
          ? cachedData.fetchedAt._seconds * 1000
          : new Date(cachedData.fetchedAt).getTime();
        var age = Date.now() - fetchedTime;
        if (age < 24 * 60 * 60 * 1000) {
          // departmentId varsa ata
          if (departmentId && !cachedData.departmentId) {
            await docRef.update({ departmentId: departmentId });
          }
          return res.json(cachedData.data);
        }
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
    var updateData = { data: data, fetchedAt: new Date() };
    if (departmentId) updateData.departmentId = departmentId;
    await docRef.set(updateData, { merge: true });

    res.json(data);
  } catch (err) {
    console.error("Akademisyen fetch error:", err.message);
    // Cache varsa eski veriyi dön
    try {
      var db2 = await getDbSafe();
      var old = await db2.collection("akademisyen_cache").doc(username).get();
      if (old.exists) {
          var oldData = old.data();
          if (oldData && oldData.data) return res.json(oldData.data);
        }
    } catch (_) {}
    res.status(500).json({ error: "Akademisyen bilgisi alınamadı: " + err.message });
  }
});

module.exports = router;
