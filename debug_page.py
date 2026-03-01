#!/usr/bin/env python3
"""Karatekin duyuru sayfalarının HTML yapısını analiz eden debug scripti."""

import requests
from bs4 import BeautifulSoup, Tag
import re
import sys

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}

URLS = {
    "mf": "https://mf.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
    "oidb": "https://oidb.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
    "bmu": "https://bmu.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
    "univ": "https://www.karatekin.edu.tr/tr/tum.duyurular-1-icerikleri.karatekin",
}

def analyze(kaynak_id):
    url = URLS.get(kaynak_id)
    if not url:
        print(f"Bilinmeyen kaynak: {kaynak_id}")
        return

    print(f"\n{'='*80}")
    print(f"KAYNAK: {kaynak_id} — {url}")
    print(f"{'='*80}")

    resp = requests.get(url, headers=HEADERS, timeout=30, verify=True)
    resp.encoding = resp.apparent_encoding or "utf-8"
    soup = BeautifulSoup(resp.text, "html.parser")

    # Save raw HTML
    with open(f"debug_html/{kaynak_id}_raw.html", "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    print(f"Ham HTML kaydedildi: debug_html/{kaynak_id}_raw.html")

    # Find content area candidates
    print(f"\n--- İçerik alanı adayları ---")
    for selector_name, tag, attrs in [
        ("page-content", "div", {"class": re.compile(r"page-content", re.I)}),
        ("icerik/content-list", "div", {"class": re.compile(r"icerik|content-list|duyuru-list", re.I)}),
        ("ui items", "div", {"class": re.compile(r"\bitems?\b", re.I)}),
        ("ui list", "div", {"class": re.compile(r"\blist\b", re.I)}),
        ("main", "main", {}),
        ("article", "article", {}),
    ]:
        found = soup.find_all(tag, attrs, limit=5)
        for el in found:
            cls = el.get("class", [])
            children_tags = [c.name for c in el.children if isinstance(c, Tag)][:10]
            links = el.find_all("a", href=True)
            text_preview = el.get_text(strip=True)[:150]
            print(f"  [{selector_name}] <{tag} class={cls}> children={children_tags} links={len(links)}")
            print(f"    text preview: {text_preview!r}")

    # Find the pusher div and show its structure
    print(f"\n--- pusher div yapısı ---")
    pusher = soup.find("div", class_=lambda c: c and "pusher" in c)
    if pusher:
        def show_tree(el, depth=0, max_depth=4):
            if depth > max_depth or not isinstance(el, Tag):
                return
            cls = " ".join(el.get("class", []))
            text = el.get_text(strip=True)
            direct_links = len(el.find_all("a", href=True, recursive=False))
            total_links = len(el.find_all("a", href=True))
            indent = "  " * depth
            tag_info = f"<{el.name}"
            if cls:
                tag_info += f" class='{cls}'"
            if el.get("id"):
                tag_info += f" id='{el.get('id')}'"
            tag_info += ">"
            text_short = text[:60].replace('\n', ' ') if text else ""
            print(f"{indent}{tag_info} links={direct_links}/{total_links} text={text_short!r}")

            for child in el.children:
                if isinstance(child, Tag):
                    show_tree(child, depth + 1, max_depth)

        show_tree(pusher, max_depth=3)

    # Look for repeated structures (potential announcement items)
    print(f"\n--- Tekrarlayan yapılar (potansiyel duyuru öğeleri) ---")
    for cls_pattern in ["item", "event", "duyuru", "announcement", "card", "segment"]:
        items = soup.find_all(class_=re.compile(rf"\b{cls_pattern}\b", re.I))
        if items:
            print(f"\n  class=~'{cls_pattern}' → {len(items)} adet")
            for item in items[:3]:
                cls = " ".join(item.get("class", []))
                inner_links = item.find_all("a", href=True)
                text = item.get_text(" ", strip=True)[:200]
                print(f"    <{item.name} class='{cls}'>")
                for a in inner_links[:3]:
                    print(f"      <a href='{a['href']}'>{a.get_text(strip=True)[:60]}</a>")
                print(f"      text: {text!r}")

    # Show all links that contain numbers in path (potential content IDs)
    print(f"\n--- Sayı içeren linkler (potansiyel içerik ID'leri) ---")
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        text = a.get_text(strip=True)
        if re.search(r"/\d{3,}", href) and text and len(text) > 10:
            if "-sayfasi" not in href:
                print(f"  href={href!r}")
                print(f"  text={text!r}")
                print()


if __name__ == "__main__":
    import os
    os.makedirs("debug_html", exist_ok=True)

    targets = sys.argv[1:] if len(sys.argv) > 1 else ["mf", "oidb", "bmu"]
    for t in targets:
        try:
            analyze(t)
        except Exception as e:
            print(f"HATA ({t}): {e}")
