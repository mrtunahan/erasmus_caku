#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Çankırı Karatekin Üniversitesi — Duyuru Scraper
================================================
Üniversite web sitelerinden duyuruları çeker ve JSON dosyasına yazar.
Cron job ile periyodik çalıştırılmak üzere tasarlanmıştır.

Kullanım:
    python3 scraper.py
    python3 scraper.py --output /var/www/html/duyurular/duyurular.json
    python3 scraper.py --verbose
"""

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ══════════════════════════════════════════════════════════════════════════════
# YAPILANDIRMA
# ══════════════════════════════════════════════════════════════════════════════

KAYNAKLAR = [
    {
        "id": "bmu",
        "label": "Bilgisayar Müh.",
        "base_url": "https://bmu.karatekin.edu.tr",
        "duyuru_url": "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
    },
    {
        "id": "mf",
        "label": "Müh. Fakültesi",
        "base_url": "https://mf.karatekin.edu.tr",
        "duyuru_url": "https://mf.karatekin.edu.tr/tr/tum-duyurular",
    },
    {
        "id": "univ",
        "label": "Üniversite",
        "base_url": "https://www.karatekin.edu.tr",
        "duyuru_url": "https://www.karatekin.edu.tr/tr/tum-duyurular",
    },
    {
        "id": "oidb",
        "label": "Öğrenci İşleri",
        "base_url": "https://oidb.karatekin.edu.tr",
        "duyuru_url": "https://oidb.karatekin.edu.tr/tr/tum-duyurular",
    },
]

# HTTP istek ayarları
REQUEST_TIMEOUT = 30  # saniye
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# Kaynaklar arası bekleme süresi (saniye) — siteye nazik olalım
CRAWL_DELAY = 2

# ══════════════════════════════════════════════════════════════════════════════
# KATEGORİ TESPİTİ
# ══════════════════════════════════════════════════════════════════════════════

KATEGORI_KURALLARI = [
    ("sinav",    ["sınav", "sinav", "vize", "final", "mazeret", "bütünleme", "butunleme"]),
    ("burs",     ["burs", "staj", "tübitak", "tubitak", "kariyer", "iş başvuru"]),
    ("etkinlik", ["seminer", "etkinlik", "toplantı", "toplanti", "konferans", "workshop",
                  "panel", "söyleşi", "soylesi", "sergi", "tören", "toren"]),
    ("akademik", ["kayıt", "kayit", "ders", "erasmus", "akademik", "müfredat", "mufredat",
                  "yarıyıl", "yariyil", "dönem", "donem", "mezuniyet", "transkript",
                  "not sistemi", "kredi", "danışman", "danisman", "tez"]),
    ("idari",    ["kütüphane", "kutuphane", "idari", "personel", "yemekhane",
                  "taşınma", "tasinma", "bina", "tadilat", "ihale"]),
]


def kategori_belirle(baslik: str) -> str:
    """Başlık metninden otomatik kategori çıkarır."""
    metin = baslik.lower()
    for kategori, anahtar_kelimeler in KATEGORI_KURALLARI:
        for kelime in anahtar_kelimeler:
            if kelime in metin:
                return kategori
    return "genel"


# ══════════════════════════════════════════════════════════════════════════════
# TARİH PARSE
# ══════════════════════════════════════════════════════════════════════════════

# Türkçe ay adları
AY_ISIMLERI = {
    "ocak": 1, "şubat": 2, "subat": 2, "mart": 3, "nisan": 4,
    "mayıs": 5, "mayis": 5, "haziran": 6, "temmuz": 7, "ağustos": 8,
    "agustos": 8, "eylül": 9, "eylul": 9, "ekim": 10, "kasım": 11,
    "kasim": 11, "aralık": 12, "aralik": 12,
}

# Kısa ay adları
AY_KISA = {
    "oca": 1, "şub": 2, "sub": 2, "mar": 3, "nis": 4,
    "may": 5, "haz": 6, "tem": 7, "ağu": 8, "agu": 8,
    "eyl": 9, "eki": 10, "kas": 11, "ara": 12,
}


def tarih_parse(tarih_str: str) -> str:
    """
    Çeşitli Türkçe tarih formatlarını YYYY-MM-DD formatına çevirir.
    Desteklenen formatlar:
      - 24 Şubat 2025
      - 24.02.2025
      - 2025-02-24
      - 24/02/2025
      - Şub 24, 2025
    """
    if not tarih_str:
        return datetime.now().strftime("%Y-%m-%d")

    tarih_str = tarih_str.strip()

    # ISO format: 2025-02-24
    iso_match = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", tarih_str)
    if iso_match:
        return f"{iso_match.group(1)}-{int(iso_match.group(2)):02d}-{int(iso_match.group(3)):02d}"

    # Noktalı: 24.02.2025
    dot_match = re.match(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", tarih_str)
    if dot_match:
        return f"{dot_match.group(3)}-{int(dot_match.group(2)):02d}-{int(dot_match.group(1)):02d}"

    # Slash: 24/02/2025
    slash_match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", tarih_str)
    if slash_match:
        return f"{slash_match.group(3)}-{int(slash_match.group(2)):02d}-{int(slash_match.group(1)):02d}"

    # Türkçe: "24 Şubat 2025" veya "24 şubat 2025"
    metin = tarih_str.lower()
    turkce_match = re.match(r"(\d{1,2})\s+(\w+)\s+(\d{4})", metin)
    if turkce_match:
        gun, ay_adi, yil = turkce_match.groups()
        ay = AY_ISIMLERI.get(ay_adi) or AY_KISA.get(ay_adi[:3])
        if ay:
            return f"{yil}-{ay:02d}-{int(gun):02d}"

    # Bulunamazsa bugünün tarihini döndür
    return datetime.now().strftime("%Y-%m-%d")


# ══════════════════════════════════════════════════════════════════════════════
# SCRAPER
# ══════════════════════════════════════════════════════════════════════════════

def benzersiz_id(kaynak_id: str, baslik: str, url: str) -> str:
    """Duyuru için tekil ID üretir (aynı duyuru tekrar eklenmez)."""
    ham = f"{kaynak_id}:{baslik}:{url}"
    return hashlib.md5(ham.encode("utf-8")).hexdigest()[:12]


def sayfa_cek(url: str, logger: logging.Logger) -> BeautifulSoup | None:
    """Bir URL'nin HTML içeriğini çeker ve BeautifulSoup nesnesi döner."""
    try:
        logger.info(f"  → GET {url}")
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT, verify=True)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "utf-8"
        return BeautifulSoup(resp.text, "html.parser")
    except requests.exceptions.Timeout:
        logger.error(f"  ✗ Zaman aşımı: {url}")
    except requests.exceptions.ConnectionError:
        logger.error(f"  ✗ Bağlantı hatası: {url}")
    except requests.exceptions.HTTPError as e:
        logger.error(f"  ✗ HTTP hatası ({e.response.status_code}): {url}")
    except Exception as e:
        logger.error(f"  ✗ Beklenmeyen hata: {e}")
    return None


def duyurulari_parse_et(soup: BeautifulSoup, kaynak: dict, logger: logging.Logger) -> list:
    """
    Karatekin Üniversitesi sitelerindeki duyuru listesini parse eder.

    Karatekin siteleri genelde şu yapıları kullanır:
    - <div class="announcements-list"> veya <div class="duyuru-listesi">
    - <table> içinde satırlar
    - <ul>/<li> listeleri
    - <div class="card"> yapıları

    Bu fonksiyon birden fazla HTML yapısını destekler.
    """
    duyurular = []
    kaynak_id = kaynak["id"]
    base_url = kaynak["base_url"]

    # ── Strateji 1: Karatekin CMS yapısı — link listesi ──
    # Genellikle .announcements, .duyuru-list, .content-list gibi container'lar içinde
    # <a> tagları ile duyuru linkleri listelenir
    link_containers = soup.select(
        ".announcements-list, .duyuru-listesi, .duyuru-list, "
        ".content-list, .news-list, .haberler-listesi, "
        "#content-area, .page-content, .entry-content, "
        ".container .row .col"
    )

    # Container bulunamazsa tüm body'ye bak
    if not link_containers:
        link_containers = [soup.find("body") or soup]

    for container in link_containers:
        # Tüm anlamlı linkleri bul
        links = container.find_all("a", href=True)
        for link in links:
            href = link.get("href", "").strip()
            baslik = link.get_text(strip=True)

            # Çok kısa veya navigasyon linkleri atla
            if not baslik or len(baslik) < 10:
                continue

            # Sadece duyuru linkleri (genelde '-duyurusu-' veya '-haber-' içerir)
            # veya /tr/ altındaki detay sayfaları
            if not any(x in href.lower() for x in [
                "duyuru", "haber", "ilan", "etkinlik",
                "-icerigi", "icerik", "detay", "detail"
            ]):
                # Eğer link ana sayfa, menü vb. ise atla
                if href in ("#", "/", "/tr", "/tr/", "/en", "/en/"):
                    continue
                # Kısa path'ler navigasyon olabilir
                if href.startswith("/") and href.count("/") <= 2 and len(href) < 20:
                    continue

            # Tam URL oluştur
            if href.startswith("/"):
                full_url = base_url + href
            elif href.startswith("http"):
                full_url = href
            else:
                full_url = base_url + "/" + href

            # Aynı domain kontrolü
            if base_url.replace("https://", "").replace("http://", "").split("/")[0] not in full_url:
                continue

            duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)

            duyurular.append({
                "id": duyuru_id,
                "baslik": baslik,
                "ozet": "",  # Detay sayfasından çekilebilir
                "url": full_url,
            })

    # ── Strateji 2: Tablo yapısı ──
    if not duyurular:
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                link = row.find("a", href=True)
                if link and len(link.get_text(strip=True)) > 10:
                    baslik = link.get_text(strip=True)
                    href = link["href"]
                    if href.startswith("/"):
                        href = base_url + href
                    duyuru_id = benzersiz_id(kaynak_id, baslik, href)

                    # Tarih hücresini bul
                    tarih_str = ""
                    for cell in cells:
                        text = cell.get_text(strip=True)
                        if re.search(r"\d{1,2}[./]\d{1,2}[./]\d{4}", text) or \
                           re.search(r"\d{1,2}\s+\w+\s+\d{4}", text):
                            tarih_str = text
                            break

                    duyurular.append({
                        "id": duyuru_id,
                        "baslik": baslik,
                        "ozet": "",
                        "url": href,
                        "tarih_raw": tarih_str,
                    })

    # ── Strateji 3: Card/div yapısı ──
    if not duyurular:
        cards = soup.select(".card, .duyuru-item, .news-item, .list-group-item, article")
        for card in cards:
            link = card.find("a", href=True)
            title_el = card.find(["h2", "h3", "h4", "h5", ".card-title", ".title"])
            if not link and not title_el:
                continue

            baslik = ""
            href = "#"

            if title_el:
                baslik = title_el.get_text(strip=True)
                inner_link = title_el.find("a", href=True)
                if inner_link:
                    href = inner_link["href"]
            if not baslik and link:
                baslik = link.get_text(strip=True)
                href = link["href"]

            if not baslik or len(baslik) < 10:
                continue

            if href.startswith("/"):
                href = base_url + href

            # Özet
            ozet = ""
            desc_el = card.find(["p", ".card-text", ".description", ".ozet"])
            if desc_el:
                ozet = desc_el.get_text(strip=True)[:300]

            duyuru_id = benzersiz_id(kaynak_id, baslik, href)
            duyurular.append({
                "id": duyuru_id,
                "baslik": baslik,
                "ozet": ozet,
                "url": href,
            })

    # Tekrarları kaldır (ID bazlı)
    gorulen = set()
    benzersiz = []
    for d in duyurular:
        if d["id"] not in gorulen:
            gorulen.add(d["id"])
            benzersiz.append(d)

    logger.info(f"  ✓ {len(benzersiz)} duyuru bulundu ({kaynak['label']})")
    return benzersiz


def tarih_bul(soup: BeautifulSoup, duyuru: dict) -> str:
    """Duyuru kartı veya sayfasındaki tarih bilgisini bulmaya çalışır."""
    # Önce raw tarih varsa onu kullan
    if duyuru.get("tarih_raw"):
        return tarih_parse(duyuru["tarih_raw"])

    # Sayfada tarih patternleri ara
    text = soup.get_text()

    # "24 Şubat 2025" formatı
    turkce = re.search(
        r"(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})",
        text, re.IGNORECASE
    )
    if turkce:
        return tarih_parse(turkce.group(0))

    # "24.02.2025" formatı
    dot = re.search(r"\d{1,2}\.\d{1,2}\.\d{4}", text)
    if dot:
        return tarih_parse(dot.group(0))

    return datetime.now().strftime("%Y-%m-%d")


def kaynak_scrape(kaynak: dict, logger: logging.Logger) -> list:
    """Tek bir kaynağı scrape eder."""
    logger.info(f"📡 Kaynak: {kaynak['label']} ({kaynak['duyuru_url']})")

    soup = sayfa_cek(kaynak["duyuru_url"], logger)
    if not soup:
        logger.warning(f"  ⚠ {kaynak['label']} sayfası çekilemedi, atlanıyor.")
        return []

    ham_duyurular = duyurulari_parse_et(soup, kaynak, logger)

    # Sonuçları zenginleştir
    sonuclar = []
    for d in ham_duyurular[:30]:  # Her kaynaktan max 30 duyuru
        tarih = tarih_bul(soup, d)
        sonuclar.append({
            "id": d["id"],
            "baslik": d["baslik"],
            "ozet": d.get("ozet", ""),
            "tarih": tarih,
            "kaynak": kaynak["id"],
            "kategori": kategori_belirle(d["baslik"]),
            "url": d["url"],
        })

    return sonuclar


# ══════════════════════════════════════════════════════════════════════════════
# ANA FONKSİYON
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Karatekin Üniversitesi Duyuru Scraper")
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="JSON çıktı dosyası yolu (varsayılan: ./duyurular/duyurular.json)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Detaylı log çıktısı"
    )
    parser.add_argument(
        "--kaynaklar",
        nargs="*",
        choices=[k["id"] for k in KAYNAKLAR],
        help="Sadece belirtilen kaynakları çek (örn: --kaynaklar bmu oidb)"
    )
    args = parser.parse_args()

    # Logger
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logger = logging.getLogger("scraper")

    # Çıktı yolu
    if args.output:
        output_path = Path(args.output)
    else:
        # Varsayılan: script dizini altında duyurular/duyurular.json
        output_path = Path(__file__).parent / "duyurular" / "duyurular.json"

    # Çıktı dizinini oluştur
    output_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("🚀 Karatekin Duyuru Scraper başlatılıyor...")
    logger.info(f"📂 Çıktı: {output_path}")
    logger.info("=" * 60)

    # Hangi kaynaklar?
    aktif_kaynaklar = KAYNAKLAR
    if args.kaynaklar:
        aktif_kaynaklar = [k for k in KAYNAKLAR if k["id"] in args.kaynaklar]

    # Tüm kaynakları scrape et
    tum_duyurular = []
    basarili = 0
    basarisiz = 0

    for kaynak in aktif_kaynaklar:
        try:
            duyurular = kaynak_scrape(kaynak, logger)
            tum_duyurular.extend(duyurular)
            basarili += 1
        except Exception as e:
            logger.error(f"  ✗ {kaynak['label']} scrape hatası: {e}")
            basarisiz += 1

        # Kaynaklar arası bekleme
        if kaynak != aktif_kaynaklar[-1]:
            logger.debug(f"  ⏳ {CRAWL_DELAY}s bekleniyor...")
            time.sleep(CRAWL_DELAY)

    # Tarihe göre sırala (en yeni önce)
    tum_duyurular.sort(key=lambda d: d["tarih"], reverse=True)

    # Metadata ekle
    cikti = {
        "meta": {
            "son_guncelleme": datetime.now().isoformat(),
            "toplam_duyuru": len(tum_duyurular),
            "kaynaklar": {k["id"]: len([d for d in tum_duyurular if d["kaynak"] == k["id"]])
                          for k in aktif_kaynaklar},
            "scraper_surumu": "2.0.0",
        },
        "duyurular": tum_duyurular,
    }

    # JSON yaz
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=2)

    logger.info("=" * 60)
    logger.info(f"✅ Tamamlandı! {len(tum_duyurular)} duyuru kaydedildi.")
    logger.info(f"   Başarılı: {basarili}, Başarısız: {basarisiz}")
    logger.info(f"   Dosya: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")
    logger.info("=" * 60)

    return 0 if basarisiz == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
