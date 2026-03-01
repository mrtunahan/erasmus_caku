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
        "alt_duyuru_urls": [
            "https://bmu.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
        ],
        "json_api": True,
    },
    {
        "id": "mf",
        "label": "Müh. Fakültesi",
        "base_url": "https://mf.karatekin.edu.tr",
        "duyuru_url": "https://mf.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
        "json_api": True,
    },
    {
        "id": "univ",
        "label": "Üniversite",
        "base_url": "https://www.karatekin.edu.tr",
        "duyuru_url": "https://www.karatekin.edu.tr/tr/tum-duyurular",
        "alt_duyuru_urls": [
            "https://www.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
        ],
        "json_api": True,
    },
    {
        "id": "oidb",
        "label": "Öğrenci İşleri",
        "base_url": "https://oidb.karatekin.edu.tr",
        "duyuru_url": "https://oidb.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
        "json_api": True,
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
    timeouts = [15, REQUEST_TIMEOUT]
    for attempt, t in enumerate(timeouts, 1):
        try:
            logger.info(f"  → GET {url}")
            resp = requests.get(url, headers=REQUEST_HEADERS, timeout=t, verify=True)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"
            return BeautifulSoup(resp.text, "html.parser")
        except requests.exceptions.Timeout:
            if attempt < len(timeouts):
                logger.warning(f"  ⚠ Zaman aşımı, tekrar deneniyor ({t}s → {timeouts[attempt]}s)...")
                time.sleep(2)
            else:
                logger.error(f"  ✗ Zaman aşımı: {url}")
        except requests.exceptions.ConnectionError:
            if attempt < len(timeouts):
                logger.warning(f"  ⚠ Bağlantı hatası, tekrar deneniyor...")
                time.sleep(2)
            else:
                logger.error(f"  ✗ Bağlantı hatası: {url}")
        except requests.exceptions.HTTPError as e:
            logger.error(f"  ✗ HTTP {e.response.status_code}: {url}")
            return None
        except Exception as e:
            logger.error(f"  ✗ Hata: {e}")
            return None
    return None


JSON_API_HEADERS = {
    **REQUEST_HEADERS,
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
}

JSON_API_LIMIT = 50


def _json_api_scrape(kaynak: dict, logger: logging.Logger, debug: bool = False) -> list:
    """
    Karatekin CMS JSON API üzerinden duyuruları çeker.

    mf ve oidb gibi alt domainler duyuruları JavaScript ile dinamik olarak
    /jsondata/tumIcerikler.aspx endpoint'inden yüklüyor. Bu fonksiyon o
    API'yi doğrudan çağırarak duyuruları alır.

    API yanıtı: [{paragraph: "<html>..."}, ...]
    Her paragraph HTML'i Semantic UI "item" yapısında:
      <a class="header" href="..." title="...">Başlık</a>
      <div class="extra">Tarih</div>
    """
    base_url = kaynak["base_url"]
    kaynak_id = kaynak["id"]
    api_url = f"{base_url}/jsondata/tumIcerikler.aspx?limitone=0&limittwo={JSON_API_LIMIT}&tur=1"

    logger.info(f"  → JSON API: {api_url}")

    data = None
    timeouts = [15, REQUEST_TIMEOUT]
    for attempt, t in enumerate(timeouts, 1):
        try:
            resp = requests.get(api_url, headers=JSON_API_HEADERS, timeout=t, verify=True)
            resp.raise_for_status()
            data = resp.json()
            break
        except requests.exceptions.RequestException as e:
            if attempt < len(timeouts):
                logger.warning(f"  ⚠ JSON API deneme {attempt} başarısız, tekrar deneniyor...")
                time.sleep(2)
            else:
                logger.warning(f"  ✗ JSON API hatası: {e}")
                return []
        except (ValueError, KeyError) as e:
            logger.warning(f"  ✗ JSON parse hatası: {e}")
            return []

    if debug:
        logger.info(f"  [DEBUG] JSON API: {len(data)} öğe döndü")

    duyurular = []
    gorulmus = set()

    for item in data:
        html = item.get("paragraph", "")
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Başlık ve URL: <a class="header">
        header_link = soup.find("a", class_="header")
        if not header_link:
            continue

        baslik = header_link.get("title", "").strip() or header_link.get_text(strip=True)
        if not baslik or len(baslik) < 5:
            continue

        href = header_link.get("href", "").strip()
        if not href:
            continue

        full_url = urljoin(base_url + "/", href.lstrip("/"))
        if full_url in gorulmus:
            continue
        gorulmus.add(full_url)

        # Tarih: <div class="extra">
        tarih = ""
        extra_div = soup.find("div", class_="extra")
        if extra_div:
            tarih = tarih_parse(extra_div.get_text(strip=True))

        duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)
        duyurular.append({
            "id": duyuru_id,
            "baslik": baslik[:200],
            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
            "url": full_url,
        })

    if duyurular:
        logger.info(f"  ✓ {len(duyurular)} duyuru bulundu — JSON API ({kaynak['label']})")
    else:
        logger.warning(f"  ✗ JSON API'den duyuru çıkarılamadı ({kaynak['label']})")

    return duyurular


def is_duyuru_href(href: str) -> bool:
    """
    Karatekin CMS'indeki duyuru içerik linklerini tanır.

    Tipik pattern'ler:
      /tr/baslik-XXXXX-duyurusu-icerigi.karatekin   ← bmu, www
      /tr/baslik-XXXXX-haberi-icerigi.karatekin
      /tr/baslik-XXXXX-icerigi.karatekin
      /tr/baslik-XXXXX-icerikleri.karatekin          ← mf, oidb liste öğeleri

    Hariç tutulanlar (liste/kategori sayfaları):
      tum-duyurular
      tum.duyurular-1-icerikleri.karatekin
    """
    # Liste/kategori sayfalarını hariç tut
    if re.search(r"tum[-.]duyurular|tum-haberler|tum[-.]etkinlikler", href, re.IGNORECASE):
        return False

    # Navigasyon/statik sayfaları hariç tut
    if re.search(r"-sayfasi\.karatekin", href, re.IGNORECASE):
        return False

    # Pozitif: tüm Karatekin içerik URL varyantları
    return bool(re.search(
        r"icerigi\.karatekin|icerikleri\.karatekin"
        r"|duyurusu-icerigi|haberi-icerigi|duyuru-icerigi"
        r"|-duyurusu\.karatekin|-haberi\.karatekin"
        r"|\d+-icerigi\b|\d+-duyuru\b",
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


def _icerik_alani_bul(soup: BeautifulSoup):
    """Sayfanın ana içerik alanını (main content) bulur."""
    # Sırayla dene: yaygın Karatekin CMS class/id pattern'leri
    selectors = [
        ("div", {"class": re.compile(r"icerik|content-list|duyuru-list|page-content", re.I)}),
        ("div", {"id": re.compile(r"content|icerik|main", re.I)}),
        ("main", {}),
        ("div", {"class": re.compile(r"main-content", re.I)}),
    ]
    for tag, attrs in selectors:
        found = soup.find(tag, attrs)
        if found:
            return found

    # Son çare: en çok metin içeren büyük div
    return soup.body or soup


def _navigasyon_linkleri(soup: BeautifulSoup) -> set:
    """Nav, header, footer, sidebar gibi bölümlerdeki linkleri döndürür."""
    nav_links = set()
    for tag_name in ["nav", "header", "footer"]:
        for tag in soup.find_all(tag_name):
            for a in tag.find_all("a"):
                nav_links.add(id(a))

    for cls_pat in [r"sidebar", r"menu", r"navbar", r"nav-", r"footer", r"header"]:
        for tag in soup.find_all(class_=re.compile(cls_pat, re.I)):
            for a in tag.find_all("a"):
                nav_links.add(id(a))

    return nav_links


TARIH_REGEX = re.compile(
    r"\d{1,2}[./]\d{1,2}[./]\d{4}"
    r"|\d{4}-\d{1,2}-\d{1,2}"
    r"|\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}",
    re.IGNORECASE,
)


def _yapisal_duyuru_bul(
    soup: BeautifulSoup, kaynak: dict, logger: logging.Logger, debug: bool = False
) -> list:
    """
    Yapısal (structural) fallback parser.

    Link tabanlı parse çalışmadığında sayfanın HTML yapısından
    duyuru bloklarını tespit eder. Karatekin CMS'inde duyurular
    bazen link yerine metin blokları (div/li/article) olarak listelenir.

    Ayrıca navigasyon-dışı linkleri de kontrol eder.
    """
    kaynak_id = kaynak["id"]
    base_url = kaynak["base_url"]
    duyuru_url = kaynak["duyuru_url"]
    duyurular = []
    gorulmus = set()

    nav_ids = _navigasyon_linkleri(soup)
    content_area = _icerik_alani_bul(soup)

    if debug:
        logger.info(f"  [DEBUG-YAPISAL] İçerik alanı: <{content_area.name} class={content_area.get('class', '')}>")

    # ── Strateji 1: İçerik alanındaki navigasyon-dışı linkler ────────────
    content_links = []
    for a in content_area.find_all("a", href=True):
        if id(a) in nav_ids:
            continue
        href = a["href"].strip()
        text = a.get_text(strip=True)
        if not text or len(text) < 10:
            continue
        # Bilinen navigasyon pattern'lerini atla
        if re.search(
            r"-sayfasi\.karatekin|tum[-.]duyurular|tum[-.]etkinlikler"
            r"|tum-haberler|anasayfa|mailto:|javascript:|\.pdf$"
            r"|personel|iletisim|bologna|ubys|uzem|rehber|medya",
            href, re.IGNORECASE
        ):
            continue
        content_links.append((a, href, text))

    if debug:
        logger.info(f"  [DEBUG-YAPISAL] İçerik alanı navigasyon-dışı linkler ({len(content_links)} adet):")
        for a, href, text in content_links[:20]:
            logger.info(f"    href={href!r}  text={text[:80]!r}")

    for a, href, text in content_links:
        full_url = urljoin(base_url + "/", href.lstrip("/"))
        parsed = urlparse(full_url)
        # Farklı domain ise atla (ancak karatekin alt domainleri kabul et)
        if "karatekin.edu.tr" not in parsed.netloc:
            continue
        if full_url in gorulmus:
            continue
        gorulmus.add(full_url)

        tarih = tarih_yakinda_bul(a)
        duyuru_id = benzersiz_id(kaynak_id, text, full_url)
        duyurular.append({
            "id": duyuru_id,
            "baslik": text[:200],
            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
            "url": full_url,
        })

    if duyurular:
        logger.info(f"  ⚡ Yapısal parse (linkler): {len(duyurular)} duyuru bulundu")
        return duyurular

    # ── Strateji 2: Tarih içeren içerik blokları ─────────────────────────
    # Duyuru öğeleri genellikle tarih + başlık içeren tekrarlayan yapılardır
    for container_tag in ["div", "li", "article", "tr"]:
        items = content_area.find_all(container_tag, recursive=True)
        found = []

        for item in items:
            text = item.get_text(" ", strip=True)
            if len(text) < 15 or len(text) > 1000:
                continue

            date_match = TARIH_REGEX.search(text)
            if not date_match:
                continue

            # Alt elemanları çok olan yapılar atla (büyük container'lar)
            if len(item.find_all(container_tag)) > 3:
                continue

            # Başlık çıkar
            baslik = None
            # Önce içindeki link metnini dene
            inner_a = item.find("a", href=True)
            if inner_a:
                baslik = inner_a.get_text(strip=True)
            # Link yoksa heading dene
            if not baslik:
                for h_tag in ["h2", "h3", "h4", "h5", "strong", "b"]:
                    h = item.find(h_tag)
                    if h:
                        baslik = h.get_text(strip=True)
                        break
            # Heading de yoksa, tarih kısmını çıkar ve kalanı kullan
            if not baslik:
                baslik = text.replace(date_match.group(0), "").strip()
                baslik = re.sub(r"\s+", " ", baslik)

            if not baslik or len(baslik) < 10:
                continue

            if baslik in gorulmus:
                continue
            gorulmus.add(baslik)

            # URL: varsa inner link, yoksa liste sayfası URL'si
            url = duyuru_url
            if inner_a:
                url = urljoin(base_url + "/", inner_a["href"].strip().lstrip("/"))

            tarih = tarih_parse(date_match.group(0))
            duyuru_id = benzersiz_id(kaynak_id, baslik, url)
            found.append({
                "id": duyuru_id,
                "baslik": baslik[:200],
                "tarih": tarih,
                "url": url,
            })

        if len(found) >= 2:
            duyurular = found
            if debug:
                logger.info(f"  [DEBUG-YAPISAL] <{container_tag}> bloklarından {len(found)} duyuru çıkarıldı")
            break

    if duyurular:
        logger.info(f"  ⚡ Yapısal parse (bloklar): {len(duyurular)} duyuru bulundu")

    return duyurular


def duyurulari_parse_et(
    soup: BeautifulSoup, kaynak: dict, logger: logging.Logger, debug: bool = False
) -> list:
    """
    Karatekin Üniversitesi duyuru liste sayfasını parse eder.

    İki aşamalı strateji:
      1) Link tabanlı: URL pattern'i duyuru olan linkleri alır
      2) Yapısal fallback: link bulunamazsa HTML yapısından çıkarır

    debug=True ile sayfadaki tüm linkler loglanır (sorun tespiti için).
    """
    duyurular = []
    kaynak_id = kaynak["id"]
    base_url = kaynak["base_url"]
    gorulmus_url = set()

    all_links = soup.find_all("a", href=True)

    if debug:
        logger.info(f"  [DEBUG] Sayfadaki toplam link sayısı: {len(all_links)}")

        # Tüm linkleri göster (sadece .karatekin değil)
        karatekin_links = []
        diger_links = []
        for a in all_links:
            href = a["href"].strip()
            text = a.get_text(strip=True)[:80]
            if not href or href.startswith("#") or href.startswith("javascript:"):
                continue
            if ".karatekin" in href.lower() or "karatekin.edu.tr" in href.lower():
                karatekin_links.append((href, text))
            elif text and len(text) > 5:
                diger_links.append((href, text))

        logger.info(f"  [DEBUG] '.karatekin' içeren linkler ({len(karatekin_links)} adet):")
        for href, text in karatekin_links:
            marker = " ✔ DUYURU" if is_duyuru_href(href) else ""
            logger.info(f"    href={href!r}  text={text!r}{marker}")

        if diger_links:
            logger.info(f"  [DEBUG] Diğer linkler ({len(diger_links)} adet):")
            for href, text in diger_links[:30]:
                logger.info(f"    href={href!r}  text={text!r}")

        # Sayfa yapısı: ana div'ler ve class'lar
        logger.info(f"  [DEBUG] Sayfa yapısı (link içeren büyük div'ler):")
        for div in soup.find_all("div", class_=True):
            link_count = len(div.find_all("a", href=True, recursive=False))
            if link_count >= 3:
                cls = " ".join(div.get("class", []))
                logger.info(f"    <div class='{cls}'> → {link_count} doğrudan link")

    # ── Aşama 1: Link tabanlı parse ─────────────────────────────────────
    for a in all_links:
        href = a["href"].strip()

        if not is_duyuru_href(href):
            continue

        full_url = urljoin(base_url + "/", href.lstrip("/"))

        if urlparse(full_url).netloc != urlparse(base_url).netloc:
            continue

        if full_url in gorulmus_url:
            continue
        gorulmus_url.add(full_url)

        baslik = a.get_text(strip=True)
        if not baslik:
            baslik = a.get("title", "").strip()
        if not baslik or len(baslik) < 5:
            continue

        tarih = tarih_yakinda_bul(a)

        duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)
        duyurular.append({
            "id": duyuru_id,
            "baslik": baslik,
            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
            "url": full_url,
        })

    if duyurular:
        logger.info(f"  ✓ {len(duyurular)} duyuru bulundu — link tabanlı ({kaynak['label']})")
        return duyurular

    # ── Aşama 2: Yapısal fallback parse ──────────────────────────────────
    logger.info(f"  ⚠ Link tabanlı parse 0 sonuç, yapısal parse deneniyor...")
    duyurular = _yapisal_duyuru_bul(soup, kaynak, logger, debug=debug)

    if duyurular:
        logger.info(f"  ✓ {len(duyurular)} duyuru bulundu — yapısal ({kaynak['label']})")
    else:
        logger.warning(f"  ✗ Hiç duyuru bulunamadı ({kaynak['label']})")

    return duyurular


def kaynak_scrape(kaynak: dict, logger: logging.Logger, debug: bool = False) -> list:
    logger.info(f"📡 Kaynak: {kaynak['label']} ({kaynak['duyuru_url']})")

    ham_duyurular = []

    # JSON API destekleyen kaynaklar için önce API'yi dene
    if kaynak.get("json_api"):
        ham_duyurular = _json_api_scrape(kaynak, logger, debug=debug)

    # JSON API yoksa veya başarısız olduysa HTML parse'a düş
    if not ham_duyurular:
        urls_to_try = [kaynak["duyuru_url"]] + kaynak.get("alt_duyuru_urls", [])

        for try_url in urls_to_try:
            soup = sayfa_cek(try_url, logger)
            if not soup:
                continue

            # Debug modunda ham HTML'i dosyaya kaydet
            if debug:
                dump_dir = Path(__file__).parent / "debug_html"
                dump_dir.mkdir(parents=True, exist_ok=True)
                dump_path = dump_dir / f"{kaynak['id']}_raw.html"
                with open(dump_path, "w", encoding="utf-8") as f:
                    f.write(str(soup))
                logger.info(f"  [DEBUG] Ham HTML kaydedildi: {dump_path}")

            ham_duyurular = duyurulari_parse_et(soup, kaynak, logger, debug=debug)
            if ham_duyurular:
                break
            logger.info(f"  ⚠ Alternatif URL deneniyor...")

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
    parser.add_argument("--debug", action="store_true",
                        help="Her sayfadaki tüm linkleri göster (sorun tespiti)")
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
            duyurular = kaynak_scrape(kaynak, logger, debug=args.debug)
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
            "scraper_surumu": "3.1.0",
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
