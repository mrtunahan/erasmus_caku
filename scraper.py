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
import socket
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
        "www_api": {
            "url": "https://bmu.karatekin.edu.tr/datas/Icerikler/IcerikController.aspx",
            "type": 1,
            "detect_siteid": True,
        },
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
        "json_api": True,
        "www_api": {
            "url": "https://www.karatekin.edu.tr/datas/Icerikler/IcerikController.aspx",
            "siteid": 54,
            "type": 1,
            "detect_siteid": True,
        },
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

    # Birden fazla tur değeri ve endpoint dene
    api_urls = [
        f"{base_url}/jsondata/tumIcerikler.aspx?limitone=0&limittwo={JSON_API_LIMIT}&tur=1",
        f"{base_url}/jsondata/tumIcerikler.aspx?limitone=0&limittwo={JSON_API_LIMIT}&tur=2",
    ]

    headers = {
        **JSON_API_HEADERS,
        "Referer": kaynak["duyuru_url"],
    }

    data = None
    for api_url in api_urls:
        logger.info(f"  → JSON API: {api_url}")

        timeouts = [15, REQUEST_TIMEOUT]
        for attempt, t in enumerate(timeouts, 1):
            try:
                resp = requests.get(api_url, headers=headers, timeout=t, verify=True)
                resp.raise_for_status()
                resp_data = resp.json()
                if resp_data:
                    data = resp_data
                    break
            except requests.exceptions.RequestException as e:
                if attempt < len(timeouts):
                    logger.warning(f"  ⚠ JSON API deneme {attempt} başarısız, tekrar deneniyor...")
                    time.sleep(2)
                else:
                    logger.warning(f"  ✗ JSON API hatası: {e}")
            except (ValueError, KeyError) as e:
                logger.warning(f"  ✗ JSON parse hatası: {e}")
                break

        if data:
            break

    if not data:
        return []

    if debug:
        logger.info(f"  [DEBUG] JSON API: {len(data)} öğe döndü")
        if data:
            logger.info(f"  [DEBUG] İlk öğe anahtarları: {list(data[0].keys())}")

    duyurular = []
    gorulmus = set()

    for item in data:
        # paragraph veya content alanını dene
        html = item.get("paragraph", "") or item.get("content", "") or item.get("icerik", "")
        if not html:
            # Eğer item doğrudan title/link içeriyorsa (farklı format)
            if item.get("title") or item.get("baslik"):
                baslik = (item.get("title") or item.get("baslik", "")).strip()
                link = (item.get("link") or item.get("url") or item.get("href", "")).strip()
                if baslik and len(baslik) >= 5 and link:
                    full_url = urljoin(base_url + "/", link.lstrip("/"))
                    if full_url not in gorulmus:
                        gorulmus.add(full_url)
                        tarih_str = item.get("date") or item.get("tarih") or ""
                        if not tarih_str and item.get("day") and item.get("year"):
                            month_str = (item.get("month") or "").strip().lower()
                            ay = _WWW_AY_MAP.get(month_str, "")
                            if ay:
                                tarih_str = f"{item['year']}-{ay}-{int(item['day']):02d}"
                        tarih = tarih_parse(tarih_str) if tarih_str else ""
                        duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)
                        duyurular.append({
                            "id": duyuru_id,
                            "baslik": baslik[:200],
                            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
                            "url": full_url,
                        })
            continue

        soup = BeautifulSoup(html, "html.parser")

        # Başlık ve URL: <a class="header"> veya ilk anlamlı <a>
        header_link = soup.find("a", class_="header")
        if not header_link:
            header_link = soup.find("a", href=True)
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

        # Tarih: <div class="extra"> veya <span class="date"> vb.
        tarih = ""
        extra_div = soup.find("div", class_="extra")
        if not extra_div:
            extra_div = soup.find(class_=re.compile(r"date|tarih|extra|meta", re.I))
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


# Ay kısaltmaları (www API yanıtında Türkçe kısa ay isimleri döner)
_WWW_AY_MAP = {
    "oca": "01", "sub": "02", "şub": "02", "mar": "03", "nis": "04",
    "may": "05", "haz": "06", "tem": "07", "ağu": "08", "agu": "08",
    "eyl": "09", "eki": "10", "kas": "11", "ara": "12",
    # Tam isimler de olabilir
    "ocak": "01", "şubat": "02", "subat": "02", "mart": "03", "nisan": "04",
    "mayıs": "05", "mayis": "05", "haziran": "06", "temmuz": "07",
    "ağustos": "08", "agustos": "08", "eylül": "09", "eylul": "09",
    "ekim": "10", "kasım": "11", "kasim": "11", "aralık": "12", "aralik": "12",
}


def _detect_siteid(soup: BeautifulSoup, logger: logging.Logger) -> int | None:
    """HTML sayfasındaki JavaScript'ten siteid değerini otomatik tespit eder."""
    for script in soup.find_all("script"):
        text = script.get_text()
        if not text:
            continue
        # siteid parametresini bul: siteid=54, siteid: 54, siteid="54" vb.
        match = re.search(r'siteid["\s:=]+["\']?(\d+)', text, re.IGNORECASE)
        if match:
            siteid = int(match.group(1))
            logger.info(f"  → Otomatik siteid tespit edildi: {siteid}")
            return siteid
    return None


def _try_icerik_api(
    api_base_url: str, siteid: int, type_val: int,
    kaynak: dict, logger: logging.Logger, debug: bool = False,
) -> list:
    """Tek bir siteid ile IcerikController API'sini dener (POST ve GET)."""
    kaynak_id = kaynak["id"]
    base_url = kaynak["base_url"]
    api_url = (
        f"{api_base_url}?siteid={siteid}&language=T"
        f"&limitOne=0&limitTwo={JSON_API_LIMIT}&limit=1&type={type_val}"
    )

    headers = {
        **JSON_API_HEADERS,
        "Referer": kaynak["duyuru_url"],
    }

    data = None

    # Önce POST, sonra GET dene
    for method_name, method_func in [("POST", requests.post), ("GET", requests.get)]:
        logger.info(f"  → IcerikController ({method_name}, siteid={siteid}): {api_url}")

        timeouts = [15, REQUEST_TIMEOUT]
        for attempt, t in enumerate(timeouts, 1):
            try:
                kwargs = {"headers": headers, "timeout": t, "verify": True}
                if method_name == "POST":
                    kwargs["data"] = ""
                resp = method_func(api_url, **kwargs)
                resp.raise_for_status()
                resp_data = resp.json()
                if resp_data:
                    data = resp_data
                    break
            except requests.exceptions.RequestException as e:
                if attempt < len(timeouts):
                    logger.warning(f"  ⚠ IcerikController {method_name} deneme {attempt} başarısız...")
                    time.sleep(2)
                else:
                    logger.warning(f"  ✗ IcerikController {method_name} hatası: {e}")
            except (ValueError, KeyError) as e:
                logger.warning(f"  ✗ IcerikController JSON parse hatası: {e}")
                break

        if data:
            break

    if not data:
        return []

    # Yanıt yapısı: [{data: [...]}] veya [...]
    items = None
    try:
        if isinstance(data, list) and data and isinstance(data[0], dict):
            if "data" in data[0]:
                items = data[0]["data"]
            elif "title" in data[0] or "link" in data[0]:
                items = data
    except (IndexError, KeyError, TypeError):
        pass

    if not items:
        logger.warning(f"  ✗ IcerikController beklenmeyen yanıt formatı (siteid={siteid})")
        if debug:
            logger.info(f"  [DEBUG] IcerikController yanıt: {str(data)[:500]}")
        return []

    if debug:
        logger.info(f"  [DEBUG] IcerikController: {len(items)} öğe döndü (siteid={siteid})")

    duyurular = []
    gorulmus = set()

    for item in items:
        baslik = (item.get("title") or item.get("baslik", "")).strip()
        if not baslik or len(baslik) < 5:
            continue

        link = (item.get("link") or item.get("url", "")).strip()
        if not link:
            continue

        full_url = urljoin(base_url + "/", link.lstrip("/"))
        if full_url in gorulmus:
            continue
        gorulmus.add(full_url)

        # Tarih: day, month, year alanlarından
        day = str(item.get("day", "")).strip()
        month_str = str(item.get("month", "")).strip().lower()
        year = str(item.get("year", "")).strip()

        tarih = ""
        if day and year:
            ay = _WWW_AY_MAP.get(month_str, "")
            if ay:
                tarih = f"{year}-{ay}-{int(day):02d}"
            else:
                try:
                    tarih = f"{year}-{int(month_str):02d}-{int(day):02d}"
                except ValueError:
                    pass

        # date alanı da olabilir
        if not tarih:
            date_str = str(item.get("date") or item.get("tarih") or "").strip()
            if date_str:
                tarih = tarih_parse(date_str)

        duyuru_id = benzersiz_id(kaynak_id, baslik, full_url)
        duyurular.append({
            "id": duyuru_id,
            "baslik": baslik[:200],
            "tarih": tarih or datetime.now().strftime("%Y-%m-%d"),
            "url": full_url,
        })

    if duyurular:
        logger.info(f"  ✓ {len(duyurular)} duyuru bulundu — IcerikController (siteid={siteid}, {kaynak['label']})")

    return duyurular


def _www_api_scrape(kaynak: dict, logger: logging.Logger, debug: bool = False) -> list:
    """
    IcerikController API üzerinden duyuruları çeker.

    Ana site ve bazı alt domainler bu API'yi kullanır:
      POST/GET /datas/Icerikler/IcerikController.aspx?siteid=XX&language=T&limitOne=0&limitTwo=50&limit=1&type=1
    Yanıt: [{data: [{title, link, day, month, year, image}, ...]}]

    Otomatik siteid tespiti: HTML sayfasındaki JavaScript'ten siteid çıkarılır.
    """
    cfg = kaynak["www_api"]
    api_base_url = cfg["url"]
    type_val = cfg.get("type", 1)

    # Denenecek siteid listesi oluştur
    siteids = []
    if "siteid" in cfg:
        siteids.append(cfg["siteid"])

    # Otomatik siteid tespiti
    if cfg.get("detect_siteid"):
        page_soup = sayfa_cek(kaynak["duyuru_url"], logger)
        if page_soup:
            detected = _detect_siteid(page_soup, logger)
            if detected and detected not in siteids:
                siteids.insert(0, detected)  # Tespit edileni önce dene

    if not siteids:
        logger.warning(f"  ✗ IcerikController: siteid bulunamadı ({kaynak['label']})")
        return []

    # Her siteid ile dene
    for siteid in siteids:
        duyurular = _try_icerik_api(api_base_url, siteid, type_val, kaynak, logger, debug)
        if duyurular:
            return duyurular

    logger.warning(f"  ✗ IcerikController'dan duyuru çıkarılamadı ({kaynak['label']})")
    return []


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

    # www.karatekin.edu.tr özel API'si
    if kaynak.get("www_api"):
        ham_duyurular = _www_api_scrape(kaynak, logger, debug=debug)

    # Subdomain JSON API
    if not ham_duyurular and kaynak.get("json_api"):
        ham_duyurular = _json_api_scrape(kaynak, logger, debug=debug)

    # API'ler başarısız olduysa HTML parse'a düş
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
# BAĞLANTI KONTROLÜ
# ══════════════════════════════════════════════════════════════════════════════

def dns_cozumle(hostname: str) -> list:
    """Hostname için IPv4 ve IPv6 adreslerini çözümler."""
    sonuclar = []
    for family, label in [(socket.AF_INET, "IPv4"), (socket.AF_INET6, "IPv6")]:
        try:
            infos = socket.getaddrinfo(hostname, 443, family, socket.SOCK_STREAM)
            for info in infos:
                ip = info[4][0]
                if ip not in [s["ip"] for s in sonuclar]:
                    sonuclar.append({"ip": ip, "aile": label})
        except socket.gaierror:
            pass
    return sonuclar


def port_kontrol(ip: str, port: int = 443, timeout: float = 5.0) -> dict:
    """Belirtilen IP:port'a TCP bağlantısı test eder."""
    family = socket.AF_INET6 if ":" in ip else socket.AF_INET
    baslangic = time.time()
    try:
        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sonuc = sock.connect_ex((ip, port))
        sure = time.time() - baslangic
        sock.close()
        return {"acik": sonuc == 0, "sure": round(sure, 3), "hata": None}
    except Exception as e:
        sure = time.time() - baslangic
        return {"acik": False, "sure": round(sure, 3), "hata": str(e)}


def http_kontrol(url: str, timeout: float = 10.0) -> dict:
    """URL'ye HTTP GET isteği gönderir ve durumu raporlar."""
    baslangic = time.time()
    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=timeout, verify=True)
        sure = time.time() - baslangic
        return {"durum": resp.status_code, "sure": round(sure, 3), "hata": None}
    except requests.exceptions.Timeout:
        sure = time.time() - baslangic
        return {"durum": 0, "sure": round(sure, 3), "hata": "Zaman aşımı"}
    except requests.exceptions.ConnectionError as e:
        sure = time.time() - baslangic
        return {"durum": 0, "sure": round(sure, 3), "hata": f"Bağlantı hatası: {e}"}
    except Exception as e:
        sure = time.time() - baslangic
        return {"durum": 0, "sure": round(sure, 3), "hata": str(e)}


def baglanti_kontrol(logger: logging.Logger):
    """Tüm kaynaklar için bağlantı durumunu kontrol eder ve raporlar."""
    logger.info("=" * 60)
    logger.info("🔍 Bağlantı Kontrol Raporu")
    logger.info("=" * 60)

    # Sunucu kendi IP'si
    try:
        resp = requests.get("https://ifconfig.me", timeout=5,
                            headers={"User-Agent": "curl/7.88.1"})
        logger.info(f"🖥  Sunucu IP: {resp.text.strip()}")
    except Exception:
        logger.info("🖥  Sunucu IP: tespit edilemedi")

    logger.info("")

    for kaynak in KAYNAKLAR:
        parsed = urlparse(kaynak["base_url"])
        hostname = parsed.netloc
        logger.info(f"📡 {kaynak['label']} ({hostname})")

        # DNS çözümleme
        dns_sonuclari = dns_cozumle(hostname)
        if not dns_sonuclari:
            logger.error(f"   ✗ DNS çözümlenemedi!")
            logger.info("")
            continue

        for dns in dns_sonuclari:
            logger.info(f"   DNS: {dns['ip']} ({dns['aile']})")

        # Port kontrolü
        for dns in dns_sonuclari:
            port = port_kontrol(dns["ip"])
            durum = "AÇIK ✓" if port["acik"] else "KAPALI ✗"
            logger.info(f"   Port 443 [{dns['ip']}]: {durum} ({port['sure']}s)")
            if port["hata"]:
                logger.info(f"   Hata: {port['hata']}")

        # HTTP kontrolü
        http = http_kontrol(kaynak["base_url"])
        if http["durum"] > 0:
            logger.info(f"   HTTP: {http['durum']} ({http['sure']}s) ✓")
        else:
            logger.error(f"   HTTP: {http['durum']} ({http['sure']}s) — {http['hata']} ✗")

        # JSON API kontrolü
        if kaynak.get("json_api"):
            api_url = f"{kaynak['base_url']}/jsondata/tumIcerikler.aspx?limitone=0&limittwo=1&tur=1"
            api = http_kontrol(api_url)
            if api["durum"] > 0:
                logger.info(f"   JSON API: {api['durum']} ({api['sure']}s) ✓")
            else:
                logger.error(f"   JSON API: {api['durum']} ({api['sure']}s) — {api['hata']} ✗")

        logger.info("")

    logger.info("=" * 60)


def onbellek_yukle(output_path: Path, logger: logging.Logger) -> dict:
    """Mevcut JSON dosyasından önbelleklenmiş duyuruları yükler."""
    if not output_path.exists():
        return {}
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        onbellek = {}
        for d in data.get("duyurular", []):
            kaynak_id = d.get("kaynak")
            if kaynak_id:
                onbellek.setdefault(kaynak_id, []).append(d)
        return onbellek
    except Exception as e:
        logger.warning(f"⚠ Önbellek yüklenemedi: {e}")
        return {}


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
    parser.add_argument("--check", action="store_true",
                        help="Sadece bağlantı kontrolü yap (scrape etme)")
    parser.add_argument("--onbellek-koru", action="store_true", default=True,
                        help="Erişilemeyen kaynak için önceki duyuruları koru (varsayılan: açık)")
    parser.add_argument("--no-onbellek", action="store_true",
                        help="Önbellek korumasını devre dışı bırak")
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

    # --check modu: sadece bağlantı durumunu kontrol et
    if args.check:
        baglanti_kontrol(logger)
        return 0

    # Çıktı yolu — "json" keyword'ü veya None ise varsayılan kullan
    if args.output and args.output != "json":
        output_path = Path(args.output)
    else:
        output_path = Path(__file__).parent / "duyurular" / "duyurular.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Önbellek koruması aktif mi?
    onbellek_aktif = args.onbellek_koru and not args.no_onbellek
    onbellek = onbellek_yukle(output_path, logger) if onbellek_aktif else {}

    logger.info("=" * 60)
    logger.info("🚀 Karatekin Duyuru Scraper başlatılıyor...")
    logger.info(f"📂 Çıktı: {output_path}")
    if onbellek:
        logger.info(f"📦 Önbellek: {sum(len(v) for v in onbellek.values())} duyuru yüklendi")
    logger.info("=" * 60)

    aktif_kaynaklar = KAYNAKLAR
    if args.kaynaklar:
        aktif_kaynaklar = [k for k in KAYNAKLAR if k["id"] in args.kaynaklar]

    tum_duyurular = []
    basarili = 0
    basarisiz = 0
    kaynak_durumlari = {}

    for i, kaynak in enumerate(aktif_kaynaklar):
        kaynak_id = kaynak["id"]
        try:
            duyurular = kaynak_scrape(kaynak, logger, debug=args.debug)
            if duyurular:
                tum_duyurular.extend(duyurular)
                basarili += 1
                kaynak_durumlari[kaynak_id] = "basarili"
            else:
                # Kaynak erişilebilir ama duyuru yok veya parse edilemedi
                # Önbellekten koru
                if onbellek_aktif and kaynak_id in onbellek and onbellek[kaynak_id]:
                    onbellek_sayisi = len(onbellek[kaynak_id])
                    tum_duyurular.extend(onbellek[kaynak_id])
                    logger.warning(
                        f"  📦 {kaynak['label']}: 0 yeni duyuru — "
                        f"önbellekten {onbellek_sayisi} duyuru korundu"
                    )
                    kaynak_durumlari[kaynak_id] = f"onbellek ({onbellek_sayisi})"
                    basarili += 1
                else:
                    basarisiz += 1
                    kaynak_durumlari[kaynak_id] = "bos"
        except Exception as e:
            logger.error(f"  ✗ {kaynak['label']} scrape hatası: {e}")
            # Hata durumunda önbellekten koru
            if onbellek_aktif and kaynak_id in onbellek and onbellek[kaynak_id]:
                onbellek_sayisi = len(onbellek[kaynak_id])
                tum_duyurular.extend(onbellek[kaynak_id])
                logger.warning(
                    f"  📦 {kaynak['label']}: hata sonrası önbellekten "
                    f"{onbellek_sayisi} duyuru korundu"
                )
                kaynak_durumlari[kaynak_id] = f"hata+onbellek ({onbellek_sayisi})"
            else:
                kaynak_durumlari[kaynak_id] = "hata"
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
            "kaynak_durumlari": kaynak_durumlari,
            "scraper_surumu": "3.3.0",
        },
        "duyurular": tum_duyurular,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=2)

    logger.info("=" * 60)
    logger.info(f"✅ Tamamlandı! {len(tum_duyurular)} duyuru kaydedildi.")
    logger.info(f"   Başarılı: {basarili}, Başarısız: {basarisiz}")
    for kid, durum in kaynak_durumlari.items():
        logger.info(f"   {kid}: {durum}")
    logger.info(f"   Dosya: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")
    logger.info("=" * 60)

    return 0 if basarisiz == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
