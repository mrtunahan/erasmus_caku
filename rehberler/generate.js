// ══════════════════════════════════════════════════════════════
// ÇAKÜ Modül Rehberleri - PDF üretici
// Kullanım: node rehberler/generate.js
// Çıktı: public/rehberler/<modul-id>.pdf
// ══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const REHBERLER = require("./guides.js");

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
// DejaVuSans-Oblique sistemde yok; italik için regular kullanılır
const FONT_ITALIC = FONT_REGULAR;

const OUT_DIR = path.join(__dirname, "..", "public", "rehberler");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Renkler — sistemdeki tasarım dilini izler
const C = {
  navy: "#1B2A4A",
  navyLight: "#2D4A7A",
  gold: "#C4973B",
  text: "#2C2C2C",
  muted: "#6B7280",
  bg: "#F7F5F0",
  border: "#E5E1D8",
};

const ROL_ETIKET = {
  student: "Öğrenci",
  professor: "Akademisyen",
  admin: "Yönetici",
};

function rolEtiketleri(roller) {
  return roller.map((r) => ROL_ETIKET[r] || r).join(" · ");
}

function bugun() {
  const d = new Date();
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function olusturRehber(rehber) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 64, bottom: 56, left: 56, right: 56 },
    info: {
      Title: `${rehber.baslik} — Kullanıcı Rehberi`,
      Author: "ÇAKÜ Yönetim Sistemi",
      Subject: rehber.ozet,
      Keywords: "çakü, rehber, kullanım, " + rehber.id,
    },
  });

  doc.registerFont("Regular", FONT_REGULAR);
  doc.registerFont("Bold", FONT_BOLD);
  doc.registerFont("Italic", FONT_ITALIC);

  const outPath = path.join(OUT_DIR, `${rehber.id}.pdf`);
  doc.pipe(fs.createWriteStream(outPath));

  // ── KAPAK BAŞLIĞI ──
  // Üst bant
  doc.rect(0, 0, doc.page.width, 110).fill(C.navy);
  // Altın çizgi
  doc.rect(0, 110, doc.page.width, 4).fill(C.gold);

  doc.fillColor("#FFFFFF").font("Bold").fontSize(11)
    .text("ÇAKÜ YÖNETİM SİSTEMİ", 56, 32, { characterSpacing: 1.5 });
  doc.font("Regular").fontSize(10).fillColor("#E8D5A8")
    .text("Kullanıcı Rehberi", 56, 48);

  doc.font("Bold").fontSize(24).fillColor("#FFFFFF")
    .text(rehber.baslik, 56, 72, { width: doc.page.width - 112 });

  // İçerik başlangıcı
  doc.moveDown(2);
  doc.x = 56;
  doc.y = 140;

  // Özet kutusu
  doc.font("Italic").fontSize(11).fillColor(C.muted)
    .text(rehber.ozet, { width: doc.page.width - 112, lineGap: 2 });
  doc.moveDown(0.8);

  // Meta satırı (hedef rol + tarih)
  doc.font("Regular").fontSize(9).fillColor(C.muted)
    .text(
      `Hedef kullanıcılar: ${rolEtiketleri(rehber.roller)}    ·    Sürüm tarihi: ${bugun()}`,
      { width: doc.page.width - 112 }
    );
  doc.moveDown(0.6);

  // Ayraç
  doc.moveTo(56, doc.y).lineTo(doc.page.width - 56, doc.y)
    .lineWidth(0.5).strokeColor(C.border).stroke();
  doc.moveDown(1.2);

  // ── BÖLÜMLER ──
  rehber.bolumler.forEach((bolum, idx) => {
    // Sayfa kalmadıysa yeni sayfa
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
      doc.y = 56;
    }

    // Bölüm başlığı
    const bashYukseklik = doc.y;
    // Sol numara badge
    doc.roundedRect(56, bashYukseklik, 24, 24, 6).fill(C.gold);
    doc.fillColor("#FFFFFF").font("Bold").fontSize(11)
      .text(String(idx + 1), 56, bashYukseklik + 6, { width: 24, align: "center" });

    doc.font("Bold").fontSize(14).fillColor(C.navy)
      .text(bolum.baslik, 90, bashYukseklik + 4, { width: doc.page.width - 146 });

    doc.y = bashYukseklik + 36;
    doc.x = 56;

    // İçerik metni
    if (bolum.icerik) {
      doc.font("Regular").fontSize(11).fillColor(C.text)
        .text(bolum.icerik, 56, doc.y, {
          width: doc.page.width - 112,
          lineGap: 3,
          align: "justify",
        });
      doc.moveDown(0.6);
    }

    // Madde listesi
    if (bolum.liste && bolum.liste.length) {
      bolum.liste.forEach((madde) => {
        // Yeni sayfa kontrolü
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
          doc.y = 56;
        }
        const y0 = doc.y;
        // Bullet
        doc.circle(62, y0 + 6, 2).fill(C.gold);
        doc.font("Regular").fontSize(10.5).fillColor(C.text)
          .text(madde, 72, y0, {
            width: doc.page.width - 128,
            lineGap: 2,
          });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.4);
    } else {
      doc.moveDown(0.6);
    }
  });

  // ── ALT BİLGİ (footer) — her sayfaya ──
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const ySonu = doc.page.height - 36;
    doc.font("Regular").fontSize(8).fillColor(C.muted)
      .text(
        "ÇAKÜ Yönetim Sistemi · " + rehber.baslik,
        56, ySonu, { width: doc.page.width - 112, align: "left", lineBreak: false }
      );
    doc.text(
      `Sayfa ${i - range.start + 1} / ${range.count}`,
      56, ySonu, { width: doc.page.width - 112, align: "right", lineBreak: false }
    );
  }

  doc.end();
  return outPath;
}

// Tümünü üret
(async () => {
  console.log(`${REHBERLER.length} rehber PDF'i üretiliyor...`);
  for (const rehber of REHBERLER) {
    try {
      const out = olusturRehber(rehber);
      console.log("  ✓", path.basename(out));
    } catch (err) {
      console.error("  ✗", rehber.id, err.message);
    }
  }
  console.log(`Tamamlandı. Çıktı: ${OUT_DIR}`);
})();
