// TTO Otomasyonu ekranlarını Offline Asistan'a bağlayan geri çağrılar
// (AppShell'deki "Offline Asistan'a dön" ve "İşbirliği Talepleri") ve
// karar bekleyen talep sayısı (menüdeki rozet).
import { createContext } from 'react';

export const KabukBaglami = createContext({ onDon: null, onTalepler: null, bekleyenTalep: 0 });
