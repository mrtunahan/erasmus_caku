package com.takip.service;

import java.util.ArrayList;
import java.util.List;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.takip.model.Duyuru;

@Service
public class DuyuruService {

    private List<Duyuru> cachedDuyurular = new ArrayList<>();

    // Uygulama başladığında ve her 30 dakikada bir güncelle
    @Scheduled(fixedRate = 1800000, initialDelay = 0)
    public void guncelle() {
        List<Duyuru> yeniListe = new ArrayList<>();
        yeniListe.addAll(bmuDuyurulariCek());
        yeniListe.addAll(universiteDuyurulariCek());
        if (!yeniListe.isEmpty()) {
            cachedDuyurular = yeniListe;
        }
        System.out.println("--> Toplam " + cachedDuyurular.size() + " duyuru çekildi.");
    }

    public List<Duyuru> getDuyurular() {
        return cachedDuyurular;
    }

    // ── BMU Bölüm Duyuruları ──
    private List<Duyuru> bmuDuyurulariCek() {
        List<Duyuru> liste = new ArrayList<>();
        try {
            Document doc = Jsoup.connect("https://bmu.karatekin.edu.tr/")
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(15000)
                    .get();

            // Karatekin siteleri genellikle tablo veya liste yapısı kullanır
            // Birden fazla selector deneyelim
            Elements items = doc.select(".duyuru-listesi li, .announcement-list li, .news-list li");

            if (items.isEmpty()) {
                // Alternatif: tablo yapısı
                items = doc.select("table.table tbody tr, .content-area table tr");
            }

            if (items.isEmpty()) {
                // Alternatif: link listesi
                items = doc.select(".panel-body a, .card-body a, .content a[href*=duyuru]");
                for (Element item : items) {
                    String baslik = item.text().trim();
                    String link = item.absUrl("href");
                    if (!baslik.isEmpty() && !link.isEmpty()) {
                        liste.add(new Duyuru(baslik, link, "", "BMU"));
                    }
                }
                if (!liste.isEmpty()) return liste;
            }

            if (items.isEmpty()) {
                // En genel: sayfadaki tüm anlamlı linkleri tara
                Elements allLinks = doc.select("a[href]");
                for (Element a : allLinks) {
                    String href = a.absUrl("href");
                    String text = a.text().trim();
                    if (text.length() > 10 && (href.contains("duyuru") || href.contains("haber")
                            || href.contains("icerik") || href.contains("detay"))) {
                        liste.add(new Duyuru(text, href, "", "BMU"));
                    }
                }
                return liste;
            }

            for (Element item : items) {
                String baslik = "";
                String link = "";
                String tarih = "";

                // Tablo satırı mı?
                Elements tds = item.select("td");
                if (tds.size() >= 2) {
                    tarih = tds.first().text().trim();
                    Element linkEl = item.selectFirst("a");
                    if (linkEl != null) {
                        baslik = linkEl.text().trim();
                        link = linkEl.absUrl("href");
                    } else {
                        baslik = tds.get(1).text().trim();
                    }
                } else {
                    // Liste öğesi
                    Element linkEl = item.selectFirst("a");
                    if (linkEl != null) {
                        baslik = linkEl.text().trim();
                        link = linkEl.absUrl("href");
                    } else {
                        baslik = item.text().trim();
                    }
                    Element tarihEl = item.selectFirst(".tarih, .date, span, small");
                    if (tarihEl != null) {
                        tarih = tarihEl.text().trim();
                    }
                }

                if (!baslik.isEmpty()) {
                    liste.add(new Duyuru(baslik, link, tarih, "BMU"));
                }
            }
        } catch (Exception e) {
            System.err.println("--> BMU duyuruları çekilemedi: " + e.getMessage());
        }
        return liste;
    }

    // ── Üniversite Ana Sayfa Duyuruları ──
    private List<Duyuru> universiteDuyurulariCek() {
        List<Duyuru> liste = new ArrayList<>();
        try {
            Document doc = Jsoup.connect("https://www.karatekin.edu.tr/")
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(15000)
                    .get();

            Elements items = doc.select(".duyuru-listesi li, .announcement-list li, .news-list li");

            if (items.isEmpty()) {
                items = doc.select("table.table tbody tr, .content-area table tr");
            }

            if (items.isEmpty()) {
                items = doc.select(".panel-body a, .card-body a, .content a[href*=duyuru]");
                for (Element item : items) {
                    String baslik = item.text().trim();
                    String link = item.absUrl("href");
                    if (!baslik.isEmpty() && !link.isEmpty()) {
                        liste.add(new Duyuru(baslik, link, "", "Üniversite"));
                    }
                }
                if (!liste.isEmpty()) return liste;
            }

            if (items.isEmpty()) {
                Elements allLinks = doc.select("a[href]");
                for (Element a : allLinks) {
                    String href = a.absUrl("href");
                    String text = a.text().trim();
                    if (text.length() > 10 && (href.contains("duyuru") || href.contains("haber")
                            || href.contains("icerik") || href.contains("detay"))) {
                        liste.add(new Duyuru(text, href, "", "Üniversite"));
                    }
                }
                return liste;
            }

            for (Element item : items) {
                String baslik = "";
                String link = "";
                String tarih = "";

                Elements tds = item.select("td");
                if (tds.size() >= 2) {
                    tarih = tds.first().text().trim();
                    Element linkEl = item.selectFirst("a");
                    if (linkEl != null) {
                        baslik = linkEl.text().trim();
                        link = linkEl.absUrl("href");
                    } else {
                        baslik = tds.get(1).text().trim();
                    }
                } else {
                    Element linkEl = item.selectFirst("a");
                    if (linkEl != null) {
                        baslik = linkEl.text().trim();
                        link = linkEl.absUrl("href");
                    } else {
                        baslik = item.text().trim();
                    }
                    Element tarihEl = item.selectFirst(".tarih, .date, span, small");
                    if (tarihEl != null) {
                        tarih = tarihEl.text().trim();
                    }
                }

                if (!baslik.isEmpty()) {
                    liste.add(new Duyuru(baslik, link, tarih, "Üniversite"));
                }
            }
        } catch (Exception e) {
            System.err.println("--> Üniversite duyuruları çekilemedi: " + e.getMessage());
        }
        return liste;
    }
}
