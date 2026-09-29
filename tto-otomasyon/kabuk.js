// TTO Otomasyonu ekranlarını Offline Asistan'a bağlayan geri çağrılar
// (AppShell'deki "Offline Asistan'a dön" ve "İşbirliği Talepleri").
import { createContext } from 'react';

export const KabukBaglami = createContext({ onDon: null, onTalepler: null });
