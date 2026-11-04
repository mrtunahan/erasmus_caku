// Patent & FSMH Takibi ekranlarını Offline Asistan'a bağlayan geri çağrılar
// (AppShell'deki "Offline Asistan'a dön" ve "Buluş Bildirimleri"), karar
// bekleyen bildirim sayısı (menüdeki rozet) ve başlıkta görünen kullanıcı adı.
import { createContext } from 'react';

export const KabukBaglami = createContext({
  onDon: null,
  onBildirimler: null,
  bekleyenBildirim: 0,
  kullanici: '',
});
