package com.takip.model;

public class Duyuru {
    private String baslik;
    private String link;
    private String tarih;
    private String kaynak; // "BMU" veya "Universite"

    public Duyuru(String baslik, String link, String tarih, String kaynak) {
        this.baslik = baslik;
        this.link = link;
        this.tarih = tarih;
        this.kaynak = kaynak;
    }

    public String getBaslik() { return baslik; }
    public String getLink() { return link; }
    public String getTarih() { return tarih; }
    public String getKaynak() { return kaynak; }

    public void setBaslik(String baslik) { this.baslik = baslik; }
    public void setLink(String link) { this.link = link; }
    public void setTarih(String tarih) { this.tarih = tarih; }
    public void setKaynak(String kaynak) { this.kaynak = kaynak; }
}
