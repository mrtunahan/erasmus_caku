#!/usr/bin/env python3
"""API yanıtındaki paragraph HTML yapısını analiz eder."""

import json
import sys
from pathlib import Path
from bs4 import BeautifulSoup

def analyze(kaynak_id):
    path = Path(f"debug_html/{kaynak_id}_api_response.json")
    if not path.exists():
        print(f"Dosya bulunamadı: {path} — önce test_api.py çalıştırın")
        return

    data = json.loads(path.read_text(encoding="utf-8"))
    print(f"\n{'='*80}")
    print(f"KAYNAK: {kaynak_id} — {len(data)} öğe")
    print(f"{'='*80}")

    for i, item in enumerate(data[:5]):
        html = item.get("paragraph", "")
        soup = BeautifulSoup(html, "html.parser")

        print(f"\n--- Öğe #{i+1} ---")
        print(f"Ham HTML ({len(html)} karakter):")
        print(html[:600])
        print("...")

        # Find links
        links = soup.find_all("a", href=True)
        print(f"\nLinkler ({len(links)} adet):")
        for a in links:
            print(f"  href={a['href']!r}  text={a.get_text(strip=True)[:100]!r}")

        # Find date-like text
        import re
        text = soup.get_text(" ", strip=True)
        dates = re.findall(r"\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}", text, re.IGNORECASE)
        print(f"\nTarihler: {dates}")

        # Find headers/strong
        for tag in ["h1", "h2", "h3", "h4", "h5", "strong", "b"]:
            elements = soup.find_all(tag)
            if elements:
                for el in elements:
                    print(f"<{tag}>: {el.get_text(strip=True)[:100]!r}")

        # Show class structure
        print(f"\nYapı:")
        def show(el, depth=0):
            if depth > 4 or not hasattr(el, 'name') or not el.name:
                return
            cls = " ".join(el.get("class", []))
            text_short = el.get_text(strip=True)[:60].replace('\n', ' ')
            indent = "  " * depth
            print(f"{indent}<{el.name} class='{cls}'> text={text_short!r}")
            for child in el.children:
                show(child, depth + 1)
        for child in soup.children:
            show(child)

        print()

if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["mf", "oidb"]
    for t in targets:
        analyze(t)
