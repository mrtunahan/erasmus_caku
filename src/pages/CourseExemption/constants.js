
export const MUAFIYET_TABS = [
    { id: "ayarlar", label: "Ayarlar" },
    { id: "yeni", label: "Yeni Muafiyet" },
    { id: "gecmis", label: "Geçmiş Kayıtlar" },
];

export const TR_STOPWORDS = new Set([
    "ve", "ile", "bir", "bu", "da", "de", "den", "dan", "için", "olan",
    "gibi", "kadar", "sonra", "önce", "üzere", "olarak", "veya", "ya",
    "hem", "ise", "nin", "nın", "nun", "nün", "dir", "dır", "dür", "dur",
    "ler", "lar", "tir", "tır", "tur", "tür", "the", "and", "of", "in",
    "to", "for", "on", "with", "at", "by", "an", "are", "is", "as",
    "from", "that", "which", "or", "be", "it", "its", "has", "have",
]);

export const SIMILARITY_THRESHOLD = 0.25;
