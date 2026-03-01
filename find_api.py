#!/usr/bin/env python3
"""Raw HTML'den JavaScript/AJAX endpoint'lerini çıkaran script."""

import re
import sys
from pathlib import Path

def extract_js(kaynak_id):
    raw_path = Path(f"debug_html/{kaynak_id}_raw.html")
    if not raw_path.exists():
        print(f"Dosya bulunamadı: {raw_path}")
        return

    html = raw_path.read_text(encoding="utf-8")

    print(f"\n{'='*80}")
    print(f"KAYNAK: {kaynak_id}")
    print(f"{'='*80}")

    # Find all script tags
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL | re.IGNORECASE)
    print(f"\nToplam <script> bloğu: {len(scripts)}")

    for i, script in enumerate(scripts):
        script = script.strip()
        if not script:
            continue
        # Look for AJAX/fetch/XMLHttpRequest calls
        if re.search(r"ajax|fetch|XMLHttpRequest|\.get\(|\.post\(|\.load\(|url\s*:|endpoint|api|duyuru|icerik|content|load|yükle|yukle", script, re.IGNORECASE):
            print(f"\n--- Script #{i+1} (AJAX/API ile ilgili) ---")
            # Show max 200 lines
            lines = script.split('\n')
            for line in lines[:200]:
                print(f"  {line.rstrip()}")
            if len(lines) > 200:
                print(f"  ... ({len(lines)-200} satır daha)")

    # Also look for data attributes on elements
    print(f"\n--- data-* attributes ---")
    data_attrs = re.findall(r'data-[a-z-]+=["\']([^"\']*)["\']', html, re.IGNORECASE)
    for attr in set(data_attrs):
        if len(attr) > 5:
            print(f"  {attr}")

    # Look for URLs in JavaScript
    print(f"\n--- JS içindeki URL pattern'leri ---")
    all_js = "\n".join(scripts)
    urls = re.findall(r'["\'](/[a-zA-Z0-9._/-]+(?:duyuru|icerik|content|api|load|list|json)[a-zA-Z0-9._/-]*)["\']', all_js, re.IGNORECASE)
    for url in set(urls):
        print(f"  {url}")

    # Look for any URL containing 'api', 'json', 'load', 'ajax'
    api_urls = re.findall(r'["\']([^"\']*(?:api|json|load|ajax|icerik|duyuru)[^"\']*)["\']', all_js, re.IGNORECASE)
    for url in set(api_urls):
        if len(url) < 200:
            print(f"  {url}")

    # Look for "Daha Fazla" button context
    print(f"\n--- 'Daha Fazla' butonu çevresi ---")
    idx = html.lower().find("daha fazla")
    if idx >= 0:
        start = max(0, idx - 500)
        end = min(len(html), idx + 500)
        context = html[start:end]
        print(context)


if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["mf", "oidb"]
    for t in targets:
        extract_js(t)
