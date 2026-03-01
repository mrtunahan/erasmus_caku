#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Çankırı Karatekin Üniversitesi — Duyuru Scraper
================================================
Üniversite web sitelerinden duyuruları çeker ve JSON dosyasına yazar.
Cron job ile periyodik çalıştırılmak üzere tasarlanmıştır.

Kullanım:
    python3 scraper.py
    python3 scraper.py --output duyurular/duyurular.json
    python3 scraper.py --verbose
    python3 scraper.py --kaynaklar bmu oidb
"""

import argparse
import hashlib
import json
import logging
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

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
        "duyuru_url": "https://mf.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
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
        "duyuru_url": "https://oidb.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
    },
]

REQUEST_TIMEOUT = 30
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
}

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
    metin = baslik.lower()
    for kategori, kelimeler in KATEGORI_KURALLARI:
        for kelime in kelimeler:
            if kelime in metin:
                return kategori
    return "genel"


# ══════════════════════════════════════════════════════════════════════════════
# TARİH PARSE
# ══════════════════════════════════════════════════════════════════════════════

AY_ISIMLERI = {
    "ocak": 1, "şubat": 2, "subat": 2, "mart": 3, "nisan": 4,
    "mayıs": 5, "mayis": 5, "haziran": 6, "temmuz": 7, "ağustos": 8,
    "agustos": 8, "eylül": 9, "eylul": 9, "ekim": 10, "kasım": 11,
    "kasim": 11, "aralık": 12, "aralik": 12,
}

AY_KISA = {
    "oca": 1, "şub": 2, "sub": 2, "mar": 3, "nis": 4,
    "may": 5, "haz": 6, "tem": 7, "ağu": 8, "agu": 8,
    "eyl": 9, "eki": 10, "kas": 11, "ara": 12,
}


def tarih_parse(tarih_str: str) -> str:
    if not tarih_str:
        return datetime.now().strftime("%Y-%m-%d")

    tarih_str = tarih_str.strip()

    iso = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", tarih_str)
    if iso:
        return f"{iso.group(1)}-{int(iso.group(2)):02d}-{int(iso.group(3)):02d}"

    dot = re.match(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", tarih_str)
    if dot:
        return f"{dot.group(3)}-{int(dot.group(2)):02d}-{int(dot.group(1)):02d}"

    slash = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", tarih_str)
    if slash:
        return f"{slash.group(3)}-{int(slash.group(2)):02d}-{int(slash.group(1)):02d}"

    metin = tarih_str.lower()
    tr = re.match(r"(\d{1,2})\s+(\w+)\s+(\d{4})", metin)
    if tr:
        gun, ay_adi, yil = tr.groups()
        ay = AY_ISIMLERI.get(ay_adi) or AY_KISA.get(ay_adi[:3])
        if ay:
            return f"{yil}-{ay:02d}-{int(gun):02d}"

    return datetime.now().strftime("%Y-%m-%d")


# ══════════════════════════════════════════════════════════════════════════════
# SCRAPER
# ══════════════════════════════════════════════════════════════════════════════

def benzersiz_id(kaynak_id: str, baslik: str, url: str) -> str:
    ham = f"{kaynak_id}:{baslik}:{url}"
    return hashlib.md5(ham.encode("utf-8")).hexdigest()[:12]


def sayfa_cek(url: str, logger: logging.Logger) -> BeautifulSoup | None:
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
        logger.error(f"  ✗ HTTP {e.response.status_code}: {url}")
    except Exception as e:
        logger.error(f"  ✗ Hata: {e}")
    return None


def is_duyuru_href(href: str) -> bool:
    """
    Karatekin CMS'indeki duyuru içerik linklerini tanır.
    Tipik pattern'ler:
      /tr/baslik-XXXXX-duyurusu-icerigi.karatekin
      /tr/baslik-XXXXX-haberi-icerigi.karatekin
      /tr/baslik-XXXXX-icerigi.karatekin
    """
    return bool(re.search(
        r"-icerigi\.karatekin$|duyurusu-icerigi|haberi-icerigi|duyuru-icerigi",
        href,
        re.IGNORECASE
    ))


def tarih_yakinda_bul(element) -> str:
    """
    Bir link elementinin yakınındaki (parent, sibling) tarih bilgisini bulur.
    """
    date_patterns = [
        r"\d{1,2}\.\d{1,2}\.\d{4}",
        r"\d{4}-\d{1,2}-\d{1,2}",
        r"\d{1,2}/\d{1,2}/\d{4}",
        r"\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}",
    ]

    # 4 seviye yukarıya kadar çık
    node = element.parent
    for _ in range(4):
        if node is None:
            break
        text = node.get_text(" ", strip=True)
        for pat in date_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return tarih_parse(m.group(0))
        node = node.parent

    return ""


def duyurulari_parse_et(soup: BeautifulSoup, kaynak: dict, logger: logging.Logger) -> list:
    """
    Karatekin Üniversitesi duyuru liste sayfasını parse eder.

    Positive filter: Sadece URL pattern'i gerçekten duyuru olan linkleri alır.
    Karatekin CMS'inde duyuru linkleri '-icerigi.karatekin' ile biter.
    """
    duyurular = []
    kaynak_id = kaynak["id"]
    base_url = kaynak["base_url"]
    gorulmus_url = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()

        # Sadece gerçek duyuru linkleri
        if not is_duyuru_href(href):
            continue

        # Tam URL oluştur
        full_url = urljoin(base_url + "/", href.lstrip("/"))

        # Aynı domain'de olmalı
        if urlparse(full_url).netloc != urlparse(base_url).netloc:
            continue

        if full_url in gorulmus_url:
            continue
        gorulmus_url.add(full_url)

        # Başlık: link metni ya da title attribute
        baslik = a.get_text(strip=True)
        if not baslik:
            baslik = a.get("title", "").strip()
        if not baslik or len(baslik) < 5:
            continue

        # Tarihi yakın elementten çıkar
        tarih = tarih_yakinda_bul(a)

        duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)
        duyurular.append({
            "id": duyuru_id,
            "baslik": baslik,
            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
            "url": full_url,
        })

    logger.info(f"  ✓ {len(duyurular)} duyuru bulundu ({kaynak['label']})")
    return duyurular


def kaynak_scrape(kaynak: dict, logger: logging.Logger) -> list:
    logger.info(f"📡 Kaynak: {kaynak['label']} ({kaynak['duyuru_url']})")

    soup = sayfa_cek(kaynak["duyuru_url"], logger)
    if not soup:
        logger.warning(f"  ⚠ {kaynak['label']} sayfası çekilemedi.")
        return []

    ham_duyurular = duyurulari_parse_et(soup, kaynak, logger)

    sonuclar = []
    for d in ham_duyurular[:50]:
        sonuclar.append({
            "id": d["id"],
            "baslik": d["baslik"],
            "ozet": "",
            "tarih": d["tarih"],
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
    parser.add_argument("--output", "-o", default=None,
                        help="JSON çıktı dosyası yolu")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Detaylı log çıktısı")
    parser.add_argument("--kaynaklar", nargs="*",
                        choices=[k["id"] for k in KAYNAKLAR],
                        help="Sadece belirtilen kaynakları çek")
    # Geriye dönük uyumluluk için (kullanılmaz)
    parser.add_argument("--no-detail", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logger = logging.getLogger("scraper")

    # Çıktı yolu — "json" keyword'ü veya None ise varsayılan kullan
    if args.output and args.output != "json":
        output_path = Path(args.output)
    else:
        output_path = Path(__file__).parent / "duyurular" / "duyurular.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info("🚀 Karatekin Duyuru Scraper başlatılıyor...")
    logger.info(f"📂 Çıktı: {output_path}")
    logger.info("=" * 60)

    aktif_kaynaklar = KAYNAKLAR
    if args.kaynaklar:
        aktif_kaynaklar = [k for k in KAYNAKLAR if k["id"] in args.kaynaklar]

    tum_duyurular = []
    basarili = 0
    basarisiz = 0

    for i, kaynak in enumerate(aktif_kaynaklar):
        try:
            duyurular = kaynak_scrape(kaynak, logger)
            tum_duyurular.extend(duyurular)
            basarili += 1
        except Exception as e:
            logger.error(f"  ✗ {kaynak['label']} scrape hatası: {e}")
            basarisiz += 1

        if i < len(aktif_kaynaklar) - 1:
            time.sleep(CRAWL_DELAY)

    tum_duyurular.sort(key=lambda d: d["tarih"], reverse=True)

    cikti = {
        "meta": {
            "son_guncelleme": datetime.now().isoformat(),
            "toplam_duyuru": len(tum_duyurular),
            "kaynaklar": {
                k["id"]: len([d for d in tum_duyurular if d["kaynak"] == k["id"]])
                for k in aktif_kaynaklar
            },
            "scraper_surumu": "3.0.0",
        },
        "duyurular": tum_duyurular,
    }

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
