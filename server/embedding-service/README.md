# Semantik Benzerlik Mikroservisi (Ders Muafiyet)

LaBSE embedding modeli ile iki ders içeriği arasında **anlamsal** benzerlik
hesaplar. Sözcük örtüşmesi olmayan ama anlamca yakın içerikleri
("Yapay Sinir Ağları" ↔ "Derin Öğrenme") yakalamak için kullanılır.

**Bu servis opsiyoneldir.** Kapalıyken muafiyet modülü otomatik olarak
sözcüksel skora (TF-IDF + Jaccard + n-gram) geri döner; hiçbir akış bloklanmaz.

## Kurulum

```bash
cd server/embedding-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> İlk çalıştırmada LaBSE modeli (~1.8 GB) Hugging Face'ten indirilir ve
> `~/.cache/huggingface/` altında saklanır. ~2 GB boş RAM gerekir.

## Çalıştırma

```bash
uvicorn main:app --host 127.0.0.1 --port 5005
```

Kalıcı çalıştırma için systemd örneği:

```ini
[Unit]
Description=CAKU Muafiyet Embedding Service
After=network.target

[Service]
WorkingDirectory=/path/to/erasmus_caku/server/embedding-service
ExecStart=/path/to/erasmus_caku/server/embedding-service/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 5005
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Node backend bağlantısı

Node sunucusu `EMBEDDING_SERVICE_URL` ortam değişkenine bakar
(varsayılan `http://127.0.0.1:5005`). Farklı bir host/port kullanıyorsanız
`server/.env` dosyasına ekleyin:

```
EMBEDDING_SERVICE_URL=http://127.0.0.1:5005
```

## API

- `GET /health` → `{ "status": "ok", "model": "sentence-transformers/LaBSE" }`
- `POST /similarity` → gövde: `{ "pairs": [{ "a": "metin1", "b": "metin2" }] }`,
  yanıt: `{ "scores": [0.87] }` (0–1 arası cosine)

## Eşik kalibrasyonu (önemli)

Cosine 0.70, "içerik %70 uyumlu" ile birebir aynı şey değildir. Modül şu an
sözcüksel skorla aynı eşikleri (%70 muaf / %60–69 inceleme) kullanır. Gerçek
kararlarla ~100 etiketli ders çifti biriktikten sonra eşikler ROC analiziyle
yeniden ayarlanmalıdır (`ders-muafiyet.jsx` içindeki `THRESHOLD_AUTO_APPROVE`
ve `THRESHOLD_REVIEW`).
