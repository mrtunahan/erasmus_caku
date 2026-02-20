"""
Çankırı Karatekin Üniversitesi - Bilgisayar Mühendisliği Bölümü
Duyuru Scraper (Web Scraping + RSS)

Bu script, bmu.karatekin.edu.tr sitesindeki duyuruları otomatik olarak çeker
ve Öğrenci Portalı'na aktarılabilir formatta döndürür.

Kullanım:
    python scraper.py                  # Tek seferlik çalıştır
    python scraper.py --schedule 30    # Her 30 dakikada bir çalıştır
    python scraper.py --output json    # JSON formatında kaydet
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
from dataclasses import dataclass, asdict
import json
import logging
import time
import hashlib
import argparse
import os
from typing import Optional


# ─── Yapılandırma ────────────────────────────────────────────────────────────

CONFIG = {
    # Ana duyuru sayfası URL'i
    "base_url": "https://bmu.karatekin.edu.tr",
    "announcements_url": "https://bmu.karatekin.edu.tr/tr/tum-duyurular",

    # Alternatif URL kalıpları (Karatekin CMS farklı path kullanabilir)
    "alt_urls": [
        "https://bmu.karatekin.edu.tr/tr/tum-duyurular",
        "https://bmu.karatekin.edu.tr/tr/duyurular",
        "https://bmu.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
    ],

    # RSS feed URL'leri (varsa)
    "rss_urls": [
        "https://bmu.karatekin.edu.tr/rss",
        "https://bmu.karatekin.edu.tr/tr/rss",
        "https://bmu.karatekin.edu.tr/feed",
    ],

    # Request ayarları
    "timeout": 15,
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    },

    # Çıktı
    "output_dir": "duyurular",
    "db_file": "duyurular/duyurular.json",
}


# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Veri Modeli ─────────────────────────────────────────────────────────────

@dataclass
class Duyuru:
    """Bir duyuruyu temsil eden veri modeli."""
    id: str                       # Benzersiz hash ID
    baslik: str                   # Duyuru başlığı
    ozet: str                     # Kısa özet / ilk paragraf
    icerik: Optional[str]         # Tam içerik (detay sayfasından)
    tarih: str                    # Yayınlanma tarihi
    url: str                      # Orijinal duyuru linki
    kategori: str = "Duyuru"     # Kategori
    kaynak: str = "BMU"          # Kaynak bölüm
    cekilme_tarihi: str = ""     # Scrape edildiği tarih

    def __post_init__(self):
        if not self.id:
            # URL + başlık'tan benzersiz ID üret
            raw = f"{self.url}{self.baslik}"
            self.id = hashlib.md5(raw.encode()).hexdigest()[:12]
        if not self.cekilme_tarihi:
            self.cekilme_tarihi = datetime.now().isoformat()


# ─── Scraper Sınıfı ─────────────────────────────────────────────────────────

class KaratekinScraper:
    """
    Karatekin Üniversitesi web sitesinden duyuru çeken scraper.

    Üç farklı strateji dener:
    1. RSS Feed (en güvenilir, varsa)
    2. HTML Scraping (ana yöntem)
    3. API endpoint (bazı CMS'lerde mevcut)
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(CONFIG["headers"])
        self.mevcut_duyurular: list[Duyuru] = []
        os.makedirs(CONFIG["output_dir"], exist_ok=True)
        self._yukle_mevcut()

    # ── Mevcut verileri yükle ────────────────────────────────────────────

    def _yukle_mevcut(self):
        """Daha önce çekilmiş duyuruları dosyadan yükle."""
        if os.path.exists(CONFIG["db_file"]):
            try:
                with open(CONFIG["db_file"], "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.mevcut_duyurular = [Duyuru(**d) for d in data]
                logger.info(f"{len(self.mevcut_duyurular)} mevcut duyuru yuklendi.")
            except Exception as e:
                logger.warning(f"Mevcut veriler yuklenemedi: {e}")

    def _kaydet(self):
        """Duyuruları JSON dosyasına kaydet."""
        with open(CONFIG["db_file"], "w", encoding="utf-8") as f:
            json.dump(
                [asdict(d) for d in self.mevcut_duyurular],
                f,
                ensure_ascii=False,
                indent=2,
            )
        logger.info(f"{len(self.mevcut_duyurular)} duyuru kaydedildi.")

    def _zaten_var_mi(self, url: str, baslik: str) -> bool:
        """Duyurunun daha önce çekilip çekilmediğini kontrol et."""
        for d in self.mevcut_duyurular:
            if d.url == url or d.baslik == baslik:
                return True
        return False

    # ── HTTP İstek ───────────────────────────────────────────────────────

    def _fetch(self, url: str) -> Optional[str]:
        """URL'den içerik çek, hata durumunda None döndür."""
        try:
            response = self.session.get(url, timeout=CONFIG["timeout"])
            response.raise_for_status()
            response.encoding = response.apparent_encoding or "utf-8"
            return response.text
        except requests.exceptions.RequestException as e:
            logger.warning(f"Istek basarisiz: {url} - {e}")
            return None

    # ── Strateji 1: RSS Feed ─────────────────────────────────────────────

    def rss_ile_cek(self) -> list[Duyuru]:
        """RSS feed üzerinden duyuruları çek."""
        logger.info("RSS feed deneniyor...")
        duyurular = []

        for rss_url in CONFIG["rss_urls"]:
            html = self._fetch(rss_url)
            if not html:
                continue

            try:
                soup = BeautifulSoup(html, "xml")
                items = soup.find_all("item")
                if not items:
                    continue

                logger.info(f"RSS feed bulundu: {rss_url} ({len(items)} oge)")

                for item in items:
                    baslik = item.find("title")
                    link = item.find("link")
                    desc = item.find("description")
                    tarih = item.find("pubDate")

                    if not baslik or not link:
                        continue

                    baslik_text = baslik.get_text(strip=True)
                    link_text = link.get_text(strip=True)

                    if self._zaten_var_mi(link_text, baslik_text):
                        continue

                    duyuru = Duyuru(
                        id="",
                        baslik=baslik_text,
                        ozet=desc.get_text(strip=True)[:300] if desc else "",
                        icerik=None,
                        tarih=tarih.get_text(strip=True) if tarih else "",
                        url=link_text,
                    )
                    duyurular.append(duyuru)

                if duyurular:
                    return duyurular

            except Exception as e:
                logger.warning(f"RSS parse hatasi: {e}")

        return duyurular

    # ── Strateji 2: HTML Scraping ────────────────────────────────────────

    def html_ile_cek(self) -> list[Duyuru]:
        """
        HTML sayfasından duyuruları parse et.

        Karatekin CMS'inin tipik yapısı:
        - Duyuru listesi genelde bir <div> veya <ul> içinde
        - Her duyuru bir <a> ile başlık + link içerir
        - Tarih genelde bir <span> veya <small> içinde
        """
        logger.info("HTML scraping deneniyor...")
        duyurular = []

        for url in CONFIG["alt_urls"]:
            html = self._fetch(url)
            if not html:
                continue

            soup = BeautifulSoup(html, "html.parser")
            logger.info(f"Sayfa yuklendi: {url}")

            # ── Çeşitli CSS seçici kalıplarını dene ──
            selectors = [
                # Kalıp 1: Yaygın CMS yapısı
                {
                    "container": "div.duyuru-listesi",
                    "items": "div.duyuru-item, li.duyuru-item",
                    "title": "a, h3 a, h4 a",
                    "date": "span.tarih, small.tarih, time",
                    "summary": "p, div.ozet, span.aciklama",
                },
                # Kalıp 2: Tablo yapısı
                {
                    "container": "table",
                    "items": "tr",
                    "title": "td a",
                    "date": "td:last-child, td span.tarih",
                    "summary": "",
                },
                # Kalıp 3: Kart yapısı
                {
                    "container": "div.content-list, div.news-list, div.icerik-listesi",
                    "items": "div.item, div.card, article",
                    "title": "a, h2 a, h3 a, h4 a, div.baslik a",
                    "date": "span.date, time, small, div.tarih",
                    "summary": "p, div.summary, div.ozet",
                },
                # Kalıp 4: Genel link tabanlı
                {
                    "container": "div#content, div.page-content, main, div.icerik",
                    "items": "li, div.row, div.col",
                    "title": "a[href*='duyur'], a[href*='haber'], a[href*='icerik']",
                    "date": "span, small, time",
                    "summary": "p",
                },
                # Kalıp 5: En genel — sayfadaki tüm duyuru linklerini bul
                {
                    "container": None,
                    "items": None,
                    "title": None,
                    "date": None,
                    "summary": None,
                    "fallback": True,
                },
            ]

            for selector in selectors:
                if selector.get("fallback"):
                    # Fallback: Sayfadaki tüm anlamlı linkleri çek
                    duyurular.extend(self._fallback_parse(soup, url))
                    break

                container = None
                if selector["container"]:
                    for sel in selector["container"].split(", "):
                        container = soup.select_one(sel)
                        if container:
                            break

                if not container:
                    continue

                items = container.select(selector["items"])
                if not items:
                    continue

                logger.info(f"  Kalip eslesti: {selector['container']} ({len(items)} oge)")

                for item in items:
                    title_el = item.select_one(selector["title"]) if selector["title"] else None
                    if not title_el:
                        continue

                    baslik = title_el.get_text(strip=True)
                    link = title_el.get("href", "")

                    if not baslik or len(baslik) < 5:
                        continue

                    # Relative URL'yi absolute yap
                    if link and not link.startswith("http"):
                        link = CONFIG["base_url"] + ("" if link.startswith("/") else "/") + link

                    # Tarih
                    tarih = ""
                    if selector["date"]:
                        date_el = item.select_one(selector["date"])
                        if date_el:
                            tarih = date_el.get_text(strip=True)

                    # Özet
                    ozet = ""
                    if selector["summary"]:
                        summary_el = item.select_one(selector["summary"])
                        if summary_el and summary_el != title_el:
                            ozet = summary_el.get_text(strip=True)[:300]

                    if self._zaten_var_mi(link, baslik):
                        continue

                    duyuru = Duyuru(
                        id="",
                        baslik=baslik,
                        ozet=ozet,
                        icerik=None,
                        tarih=tarih,
                        url=link,
                    )
                    duyurular.append(duyuru)

                if duyurular:
                    break  # İlk eşleşen kalıptan sonra dur

            if duyurular:
                break  # İlk çalışan URL'den sonra dur

        return duyurular

    def _fallback_parse(self, soup: BeautifulSoup, page_url: str) -> list[Duyuru]:
        """
        Fallback: Sayfadaki duyuru olabilecek tüm linkleri topla.
        URL'de 'duyuru', 'haber', 'icerik' gibi anahtar kelimeler aranır.
        """
        logger.info("  Fallback parse kullaniliyor...")
        duyurular = []
        keywords = ["duyuru", "haber", "icerik", "etkinlik", "announce"]

        links = soup.find_all("a", href=True)
        for a in links:
            href = a["href"]
            baslik = a.get_text(strip=True)

            if not baslik or len(baslik) < 10:
                continue

            if not any(kw in href.lower() for kw in keywords):
                continue

            if not href.startswith("http"):
                href = CONFIG["base_url"] + ("" if href.startswith("/") else "/") + href

            if self._zaten_var_mi(href, baslik):
                continue

            # Aynı linkin tekrarını önle
            if any(d.url == href for d in duyurular):
                continue

            duyuru = Duyuru(
                id="",
                baslik=baslik,
                ozet="",
                icerik=None,
                tarih="",
                url=href,
            )
            duyurular.append(duyuru)

        logger.info(f"  Fallback: {len(duyurular)} duyuru bulundu")
        return duyurular

    # ── Detay Sayfası ────────────────────────────────────────────────────

    def detay_cek(self, duyuru: Duyuru) -> Duyuru:
        """Duyurunun detay sayfasından tam içeriği çek."""
        if not duyuru.url or duyuru.icerik:
            return duyuru

        html = self._fetch(duyuru.url)
        if not html:
            return duyuru

        soup = BeautifulSoup(html, "html.parser")

        # İçerik alanını bul
        content_selectors = [
            "div.icerik-detay",
            "div.content-detail",
            "div.page-content",
            "article",
            "div.detail",
            "div#content",
            "main",
        ]

        for sel in content_selectors:
            content_el = soup.select_one(sel)
            if content_el:
                # Script ve style etiketlerini temizle
                for tag in content_el.find_all(["script", "style", "nav", "footer"]):
                    tag.decompose()
                duyuru.icerik = content_el.get_text(separator="\n", strip=True)
                break

        # Tarih yoksa detay sayfasından bulmaya çalış
        if not duyuru.tarih:
            date_selectors = ["time", "span.date", "span.tarih", "div.tarih", "small.date"]
            for sel in date_selectors:
                date_el = soup.select_one(sel)
                if date_el:
                    duyuru.tarih = date_el.get_text(strip=True)
                    break

        return duyuru

    # ── Ana Çalıştırma Metodu ────────────────────────────────────────────

    def calistir(self, detay_cek: bool = True) -> list[Duyuru]:
        """
        Tüm stratejileri sırayla dener ve yeni duyuruları döndürür.

        Args:
            detay_cek: True ise her duyurunun detay sayfası da çekilir

        Returns:
            Yeni bulunan duyuruların listesi
        """
        logger.info("=" * 60)
        logger.info("Duyuru taramasi basliyor...")
        logger.info("=" * 60)

        yeni_duyurular = []

        # Strateji 1: RSS
        yeni_duyurular = self.rss_ile_cek()
        if yeni_duyurular:
            logger.info(f"RSS ile {len(yeni_duyurular)} yeni duyuru bulundu.")
        else:
            # Strateji 2: HTML Scraping
            yeni_duyurular = self.html_ile_cek()
            if yeni_duyurular:
                logger.info(f"HTML ile {len(yeni_duyurular)} yeni duyuru bulundu.")
            else:
                logger.info("Yeni duyuru bulunamadi.")
                return []

        # Detay sayfalarını çek
        if detay_cek:
            logger.info("Detay sayfalari cekiliyor...")
            for i, duyuru in enumerate(yeni_duyurular):
                logger.info(f"  [{i+1}/{len(yeni_duyurular)}] {duyuru.baslik[:50]}...")
                self.detay_cek(duyuru)
                time.sleep(1)  # Rate limiting

        # Kaydet
        self.mevcut_duyurular.extend(yeni_duyurular)
        self._kaydet()

        logger.info("=" * 60)
        logger.info(f"Tamamlandi! {len(yeni_duyurular)} yeni duyuru eklendi.")
        logger.info(f"Toplam: {len(self.mevcut_duyurular)} duyuru")
        logger.info("=" * 60)

        return yeni_duyurular


# ─── Portal Entegrasyon Yardımcıları ────────────────────────────────────────

def portal_formatina_cevir(duyurular: list[Duyuru]) -> list[dict]:
    """
    Duyuruları Öğrenci Portalı'nın gönderi formatına çevirir.
    Bu fonksiyon, portalınızın API'sine göre özelleştirilmelidir.
    """
    gonderiler = []
    for d in duyurular:
        gonderi = {
            "title": d.baslik,
            "content": d.icerik or d.ozet or d.baslik,
            "category": "Duyuru",
            "tags": ["otomatik", "bmu"],
            "author": "Sistem",
            "source_url": d.url,
            "published_at": d.tarih,
            "created_at": datetime.now().isoformat(),
            "metadata": {
                "scraper_id": d.id,
                "kaynak": d.kaynak,
            },
        }
        gonderiler.append(gonderi)
    return gonderiler


def portala_gonder(gonderiler: list[dict], api_url: str, api_key: str = ""):
    """
    Duyuruları Öğrenci Portalı API'sine gönderir.

    Args:
        gonderiler: Portal formatındaki gönderi listesi
        api_url: Portal API endpoint (orn: http://localhost:3000/api/posts)
        api_key: API anahtarı (opsiyonel)
    """
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    for gonderi in gonderiler:
        try:
            response = requests.post(api_url, json=gonderi, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                logger.info(f"  Gonderildi: {gonderi['title'][:50]}")
            else:
                logger.warning(
                    f"  Gonderilemedi: {gonderi['title'][:50]} "
                    f"(HTTP {response.status_code})"
                )
        except Exception as e:
            logger.error(f"  Hata: {gonderi['title'][:50]} - {e}")


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Karatekin Universitesi BMU Duyuru Scraper"
    )
    parser.add_argument(
        "--schedule",
        type=int,
        default=0,
        help="Otomatik calistirma araligi (dakika). 0 = tek sefer.",
    )
    parser.add_argument(
        "--output",
        choices=["json", "console", "portal"],
        default="json",
        help="Cikti formati",
    )
    parser.add_argument(
        "--portal-url",
        type=str,
        default="http://localhost:3000/api/posts",
        help="Portal API URL'i (--output portal icin)",
    )
    parser.add_argument(
        "--portal-key",
        type=str,
        default="",
        help="Portal API anahtari",
    )
    parser.add_argument(
        "--no-detail",
        action="store_true",
        help="Detay sayfalarini cekme (daha hizli)",
    )

    args = parser.parse_args()

    def calistir_bir_kez():
        scraper = KaratekinScraper()
        yeni = scraper.calistir(detay_cek=not args.no_detail)

        if not yeni:
            return

        if args.output == "console":
            for d in yeni:
                print(f"\n{'─' * 60}")
                print(f"  {d.baslik}")
                print(f"  {d.tarih}")
                print(f"  {d.url}")
                if d.ozet:
                    print(f"  {d.ozet[:200]}")

        elif args.output == "portal":
            gonderiler = portal_formatina_cevir(yeni)
            portala_gonder(gonderiler, args.portal_url, args.portal_key)

        # JSON çıktı her durumda kaydedilir

    if args.schedule > 0:
        logger.info(f"Her {args.schedule} dakikada bir calisacak.")
        while True:
            calistir_bir_kez()
            logger.info(f"{args.schedule} dakika bekleniyor...")
            time.sleep(args.schedule * 60)
    else:
        calistir_bir_kez()


if __name__ == "__main__":
    main()
