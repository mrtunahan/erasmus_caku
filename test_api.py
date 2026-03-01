#!/usr/bin/env python3
"""Karatekin JSON API endpoint'ini test eden script."""

import json
import requests
import sys

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "X-Requested-With": "XMLHttpRequest",
}

SOURCES = {
    "mf": "https://mf.karatekin.edu.tr",
    "oidb": "https://oidb.karatekin.edu.tr",
}

def test_api(kaynak_id):
    base = SOURCES.get(kaynak_id)
    if not base:
        print(f"Bilinmeyen kaynak: {kaynak_id}")
        return

    url = f"{base}/jsondata/tumIcerikler.aspx?limitone=0&limittwo=10&tur=1"
    print(f"\n{'='*80}")
    print(f"GET {url}")
    print(f"{'='*80}")

    resp = requests.get(url, headers=HEADERS, timeout=30, verify=True)
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
    print(f"Response length: {len(resp.text)} chars")

    try:
        data = resp.json()
        print(f"JSON array length: {len(data)}")
        print(f"\nKeys in first item: {list(data[0].keys()) if data else 'EMPTY'}")

        # Show first 3 items
        for i, item in enumerate(data[:3]):
            print(f"\n--- Item #{i+1} ---")
            for key, value in item.items():
                val_str = str(value)
                if len(val_str) > 300:
                    val_str = val_str[:300] + "..."
                print(f"  {key}: {val_str}")

        # Save full response
        with open(f"debug_html/{kaynak_id}_api_response.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nTam yanıt kaydedildi: debug_html/{kaynak_id}_api_response.json")

    except Exception as e:
        print(f"JSON parse hatası: {e}")
        print(f"Raw response (ilk 2000 karakter):\n{resp.text[:2000]}")

if __name__ == "__main__":
    import os
    os.makedirs("debug_html", exist_ok=True)
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["mf", "oidb"]
    for t in targets:
        try:
            test_api(t)
        except Exception as e:
            print(f"HATA ({t}): {e}")
