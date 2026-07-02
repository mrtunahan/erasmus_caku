# ══════════════════════════════════════════════════════════════
# ÇAKÜ Ders Muafiyet — Semantik Benzerlik Mikroservisi
#
# LaBSE (Language-agnostic BERT Sentence Embedding) ile iki ders
# içeriği metni arasında cosine benzerliği hesaplar. Türkçe dahil
# 109 dilde çalışır; "Yapay Sinir Ağları" ↔ "Derin Öğrenme" gibi
# sözcük örtüşmesi olmayan ama anlamca yakın içerikleri yakalar.
#
# Node backend'i /api/semantic/* üzerinden buraya proxy yapar.
# Servis kapalıysa sistem sözcüksel skora (TF-IDF/Jaccard) düşer —
# bu servis opsiyoneldir, muafiyet akışını bloklamaz.
#
# Çalıştırma (bkz. README.md):
#   uvicorn main:app --host 127.0.0.1 --port 5005
# ══════════════════════════════════════════════════════════════
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/LaBSE"
# LaBSE girişi ~256 wordpiece ile sınırlı; çok uzun metinler parçalanıp
# ortalaması alınır. Parça boyutu karakter cinsinden yaklaşık ayarlanır.
CHUNK_CHARS = 1000
MAX_CHUNKS = 8
MAX_PAIRS = 50

app = FastAPI(title="caku-muafiyet-embedding", version="1.0")

# Model süreç başında bir kez yüklenir (ilk çalıştırmada ~1.8GB indirir)
model = SentenceTransformer(MODEL_NAME)


class Pair(BaseModel):
    a: str
    b: str


class SimilarityRequest(BaseModel):
    pairs: list[Pair] = Field(..., min_length=1, max_length=MAX_PAIRS)


def chunk_text(text: str) -> list[str]:
    """Metni CHUNK_CHARS boyutlu parçalara böl (en fazla MAX_CHUNKS)."""
    text = " ".join((text or "").split())
    if not text:
        return [""]
    chunks = [text[i : i + CHUNK_CHARS] for i in range(0, len(text), CHUNK_CHARS)]
    return chunks[:MAX_CHUNKS]


def embed_document(text: str) -> np.ndarray:
    """Uzun belgeyi parça embedding'lerinin ortalamasıyla temsil et."""
    chunks = chunk_text(text)
    vecs = model.encode(chunks, normalize_embeddings=True)
    doc = np.asarray(vecs).mean(axis=0)
    norm = np.linalg.norm(doc)
    return doc / norm if norm > 0 else doc


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/similarity")
def similarity(req: SimilarityRequest):
    try:
        scores = []
        for pair in req.pairs:
            va = embed_document(pair.a)
            vb = embed_document(pair.b)
            cos = float(np.dot(va, vb))
            # Negatif cosine pratikte "tamamen ilgisiz" demektir → 0'a kırp
            scores.append(max(0.0, min(1.0, cos)))
        return {"scores": scores}
    except Exception as exc:  # noqa: BLE001 — proxy'ye anlamlı hata dönsün
        raise HTTPException(status_code=500, detail=str(exc)) from exc
