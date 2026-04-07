const { useState, useEffect, useMemo } = React;

const PROJECTS = {
  unides: {
    abbr: "ÜN",
    name: "ÜNİDES",
    subtitle: "Üniversite Öğrenci Toplulukları İş Birliği ve Destek Programı",
    accent: "#E8590C", accentSoft: "#FFF7ED", accentMid: "#FDBA74",
    logo: "https://www.gsb.gov.tr/favicon.ico",
    logoFull: "https://www.google.com/s2/favicons?domain=gsb.gov.tr&sz=64",
    badge: "75-125 bin ₺",
    badgeDesc: "Yerel: 75.000 ₺ · Ulusal: 125.000 ₺",
    info: "Gençlik ve Spor Bakanlığı Gençlik Hizmetleri Genel Müdürlüğü tarafından yürütülen ÜNİDES, üniversite öğrenci topluluklarının projelerine mali destek sağlar. 2025-2026 döneminde 5. ve 6. dönem başvuruları e-genc.gsb.gov.tr üzerinden alınmaktadır.",
    links: [
      { label: "e-Genç Başvuru Portalı", url: "https://e-genc.gsb.gov.tr" },
      { label: "ÜNİDES Bilgilendirme", url: "https://www.gsb.gov.tr/unides" },
    ],
    areas: ["Afet Yönetimi ve Dayanıklılık","Aile ve Değerler","Bilim ve Teknoloji","Çevre ve İklim","Eğitim ve Hayat Boyu Öğrenme","Gençlik Bilgilendirmesi","Gençlik Sağlığı ve Spor","Gönüllülük ve Sivil Toplum","İstihdam ve Girişimcilik","Sosyal Kapsayıcılık","Uluslararası Gençlik Çalışmaları"],
    evalCriteria: [],
    steps: [
      { id: 1, title: "Kulüp & Fikir Hazırlığı", desc: "Üniversitenizin onaylı öğrenci kulübüyle katılım sağlanır. Gençlik Politika Belgesi'ndeki 11 alandan birine uygun, kapsayıcı ve sürdürülebilir bir proje fikri belirlenir.", result: "Onaylı kulüp + net proje fikri", duration: "2 Hafta", docs: [] },
      { id: 2, title: "Ekip & Koordinatör", desc: "Proje ekibi kurulur, bir akademik koordinatör atanır. Koordinatör özgeçmiş formu hazırlanır, görev dağılımı yapılır.", result: "Koordinatör ataması + ekip listesi", duration: "1 Hafta", docs: [
        { name: "Koordinatör Özgeçmiş Formu", url: "https://e-genc.gsb.gov.tr/Content/Yardim/UnidesBelgeler/koordinator-ozgecmis-formu.docx" },
      ] },
      { id: 3, title: "Proje Yazımı & Belgeler", desc: "Başvuru formu doldurulur, bütçe formu hazırlanır (yerel: 75 bin ₺, ulusal: 125 bin ₺), taahhütname imzalanır, paydaşlık formu ve yönetim kurulu kararı alınır.", result: "Tüm belgeler hazır", duration: "3 Hafta", docs: [
        { name: "Başvuru Formu (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
        { name: "Bütçe Formu (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
        { name: "Taahhütname (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
        { name: "Paydaşlık Formu (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
        { name: "YK Kararı (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
      ] },
      { id: 4, title: "Online Başvuru", desc: "e-genc.gsb.gov.tr adresinden online başvuru yapılır. Tüm belgeler sisteme yüklenir ve başvuru tamamlanır.", result: "Başvuru onayı alındı", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Değerlendirme & Sonuç", desc: "Başvurular Gençlik Hizmetleri Genel Müdürlüğü tarafından değerlendirilir. Kabul edilen projelere destek sağlanır.", result: "Kabul / Red bildirimi", duration: "4-6 Hafta", docs: [] },
      { id: 6, title: "Projenin Uygulanması", desc: "Proje planına uygun şekilde faaliyetler gerçekleştirilir. Bütçe kullanımı takip edilir, GSB tesis ve genç ofislerinden yararlanılır.", result: "Faaliyetler tamamlandı", duration: "3-6 Ay", docs: [] },
      { id: 7, title: "Sonuç Raporu & Kapanış", desc: "Proje tamamlandıktan sonra sonuç raporu hazırlanır ve sisteme yüklenir. Mali rapor ve çıktılar sunulur.", result: "Sonuç raporu onaylandı", duration: "2 Hafta", docs: [
        { name: "Sonuç Raporu (e-Genç Portal)", url: "https://e-genc.gsb.gov.tr" },
      ] },
    ],
  },
  tubitak2209a: {
    abbr: "2A",
    name: "2209-A",
    subtitle: "Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı",
    accent: "#059669", accentSoft: "#ECFDF5", accentMid: "#6EE7B7",
    logo: "https://www.tubitak.gov.tr/favicon.ico",
    logoFull: "https://www.google.com/s2/favicons?domain=tubitak.gov.tr&sz=64",
    badge: "Maks. 12.000 ₺",
    badgeDesc: "En fazla 12 ay · TYBS üzerinden başvuru",
    info: "TÜBİTAK BİDEB tarafından yürütülen 2209-A programı, ön lisans ve lisans öğrencilerine araştırma ve proje yönetimi deneyimi kazandırmayı amaçlar. Makine/teçhizat, sarf malzeme, seyahat ve hizmet alımı giderleri desteklenir. Kongre katılım, yayın, patent ve konaklama masrafları bütçeye dahil edilemez.",
    links: [
      { label: "TYBS Başvuru Sistemi", url: "https://tybs.tubitak.gov.tr" },
      { label: "ARBİS Kayıt", url: "https://arbis.tubitak.gov.tr" },
      { label: "e-İmza Portalı", url: "https://eimza.tubitak.gov.tr" },
      { label: "e-BİDEB Sonuç Sorgulama", url: "https://ebideb.tubitak.gov.tr" },
    ],
    areas: [],
    evalCriteria: [
      { name: "Bilimsel Nitelik", pct: 35 },
      { name: "Yöntem", pct: 25 },
      { name: "Proje Yönetimi", pct: 20 },
      { name: "Yaygın Etki", pct: 20 },
    ],
    steps: [
      { id: 1, title: "Konu & Danışman Belirleme", desc: "Araştırma konusu belirlenir. Güncel YÖK kaydı olan bir öğretim elemanı akademik danışman olarak atanır. Bir danışman aynı dönemde en fazla 5 projede görev alabilir. ARBİS kaydı (arbis.tubitak.gov.tr) yapılır.", result: "Konu + YÖK kayıtlı danışman + ARBİS kaydı", duration: "2 Hafta", docs: [
        { name: "ARBİS Kaydı", url: "https://arbis.tubitak.gov.tr" },
      ] },
      { id: 2, title: "Araştırma Önerisi Yazımı", desc: "TÜBİTAK formatında ve Türkçe olarak araştırma önerisi hazırlanır. Proje başlığı araştırmanın amacını yansıtmalı. Bireysel veya en fazla 1 yürütücü + 4 ortak ile ekip halinde başvurulabilir.", result: "Araştırma önerisi formu tamamlandı", duration: "3 Hafta", docs: [
        { name: "Araştırma Önerisi Formu (TYBS)", url: "https://tybs.tubitak.gov.tr" },
        { name: "Öncelikli Alanlar Listesi", url: "https://www.tubitak.gov.tr/tr/destekler/akademik/ulusal-destek-programlari/icerik-2209-a" },
      ] },
      { id: 3, title: "TYBS Online Başvuru", desc: "Başvuru, proje yürütücüsü tarafından TÜBİTAK Yönetim Bilgi Sistemi (tybs.tubitak.gov.tr) üzerinden çevrimiçi yapılır. IBAN proje yürütücüsüne ait olmalıdır. Son başvuru günü 17:30'da sistem kapanır.", result: "Başvuru sisteme yüklendi", duration: "1 Hafta", docs: [] },
      { id: 4, title: "Danışman Onayı", desc: "Başvuru sonrası akademik danışmana otomatik olarak onay talebi gönderilir. Danışman bilgileri YÖKSİS ve ARBİS üzerinden doğrulanır. İade durumunda düzenleme yapılıp yeniden sunulur.", result: "Danışman onayı tamamlandı", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Kuruluş Yetkilisi e-İmza", desc: "Danışman onayının ardından başvuru, üniversitenin kuruluş yetkilisinin (Rektör/Rektör Yrd.) e-imzasına gönderilir. eimza.tubitak.gov.tr üzerinden imzalanır.", result: "e-İmza tamamlandı, başvuru geçerli", duration: "1 Hafta", docs: [] },
      { id: 6, title: "Ön İnceleme", desc: "Başvuru koşulları, belge formatı ve Türkçe dil şartı kontrol edilir. Eksik veya formata uygun olmayan başvurular bilimsel değerlendirmeye alınmadan elenir.", result: "Ön inceleme geçildi", duration: "2 Hafta", docs: [] },
      { id: 7, title: "Bilimsel Değerlendirme", desc: "Uzman danışma kurulu / panelist tarafından değerlendirilir: Bilimsel nitelik %35, Yöntem %25, Proje yönetimi %20, Yaygın etki %20. Sonuçlar e-bideb üzerinden açıklanır.", result: "Kabul / Red bildirimi", duration: "6-8 Hafta", docs: [] },
      { id: 8, title: "Projenin Yürütülmesi", desc: "Destek yürütücünün banka hesabına yatırılır. Harcamalar fatura ile belgelenir. Etik kurul gereken projelerde onay belgesi yüklenir. Proje en fazla 12 ay sürer.", result: "Araştırma tamamlandı + harcamalar belgelendi", duration: "6-12 Ay", docs: [] },
      { id: 9, title: "Sonuç Raporu & Kapanış", desc: "TÜBİTAK formatında sonuç raporu BİDEB sistemine yüklenir, danışman nihai onay verir. Çıktılar (makale, bildiri vb.) bildirilir. Tamamlayanlara 2224-A/B/D programlarında avantaj sağlanır.", result: "Rapor onaylandı + proje kapandı", duration: "2 Hafta", docs: [
        { name: "Sonuç Raporu Formatı (TYBS)", url: "https://tybs.tubitak.gov.tr" },
      ] },
    ],
  },
  tubitak2209b: {
    abbr: "2B",
    name: "2209-B",
    subtitle: "Üniversite Öğrencileri Sanayiye Yönelik Araştırma Projeleri Desteği",
    accent: "#0369A1", accentSoft: "#F0F9FF", accentMid: "#7DD3FC",
    logo: "https://www.tubitak.gov.tr/favicon.ico",
    logoFull: "https://www.google.com/s2/favicons?domain=tubitak.gov.tr&sz=64",
    badge: "Maks. 12.000 ₺",
    badgeDesc: "En fazla 12 ay · Sanayi iş birliği zorunlu",
    info: "TÜBİTAK BİDEB tarafından yürütülen 2209-B programı, ön lisans ve lisans öğrencilerinin sanayinin ihtiyaç duyduğu alanlarda çözümler üretmesini teşvik eder. 2209-A'dan farkı: Akademik danışmanın yanı sıra bir sanayi danışmanı da zorunludur. Sanayi kuruluşu; Ar-Ge merkezi, tasarım merkezi, teknoloji geliştirme bölgesi, OSB'de faaliyet gösteren veya TÜBİTAK destekli proje tamamlamış sermaye şirketi olmalıdır.",
    links: [
      { label: "TYBS Başvuru Sistemi", url: "https://tybs.tubitak.gov.tr" },
      { label: "ARBİS Kayıt", url: "https://arbis.tubitak.gov.tr" },
      { label: "2209-B Program Detayları", url: "https://www.tubitak.gov.tr/tr/destekler/akademik/ulusal-destek-programlari/icerik-2209-b" },
    ],
    areas: [],
    evalCriteria: [
      { name: "Bilimsel Nitelik", pct: 35 },
      { name: "Yöntem", pct: 25 },
      { name: "Proje Yönetimi", pct: 20 },
      { name: "Yaygın Etki", pct: 20 },
    ],
    steps: [
      { id: 1, title: "Konu & Sanayi Ortağı Bulma", desc: "Sanayinin ihtiyaç duyduğu bir alanda araştırma konusu belirlenir. Ar-Ge merkezi, teknoloji geliştirme bölgesi, OSB veya TÜBİTAK destekli proje tamamlamış bir sanayi kuruluşu ile iş birliği kurulur.", result: "Sanayi ortağı + proje konusu belirlendi", duration: "2-3 Hafta", docs: [] },
      { id: 2, title: "Danışman Atamaları", desc: "YÖK kayıtlı bir akademik danışman ve sanayi kuruluşundan bir sanayi danışmanı atanır. İki danışman aynı kişi olamaz. ARBİS kaydı yapılır.", result: "Akademik + sanayi danışmanı atandı", duration: "1 Hafta", docs: [
        { name: "ARBİS Kaydı", url: "https://arbis.tubitak.gov.tr" },
      ] },
      { id: 3, title: "Araştırma Önerisi Yazımı", desc: "TÜBİTAK formatında, Türkçe olarak sanayi odaklı araştırma önerisi hazırlanır. Sanayi kuruluşunun ihtiyacı ve projenin uygulanabilirliği net şekilde belirtilir.", result: "Sanayi odaklı araştırma önerisi hazır", duration: "3 Hafta", docs: [
        { name: "Araştırma Önerisi Formu (TYBS)", url: "https://tybs.tubitak.gov.tr" },
      ] },
      { id: 4, title: "TYBS Online Başvuru", desc: "tybs.tubitak.gov.tr üzerinden çevrimiçi başvuru yapılır. Sanayi kuruluşu bilgileri ve danışman bilgileri sisteme girilir.", result: "Başvuru sisteme yüklendi", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Danışman Onayı & e-İmza", desc: "Akademik danışman sistem üzerinden onay verir. Ardından kuruluş yetkilisinin e-imzası ile başvuru geçerli hale gelir.", result: "Danışman onayı + e-İmza tamamlandı", duration: "1-2 Hafta", docs: [] },
      { id: 6, title: "Ön İnceleme & Değerlendirme", desc: "Ön incelemede belge ve koşul kontrolü yapılır. Bilimsel değerlendirme uzman paneller tarafından gerçekleştirilir: Bilimsel nitelik %35, Yöntem %25, Proje yönetimi %20, Yaygın etki %20.", result: "Kabul / Red bildirimi", duration: "6-8 Hafta", docs: [] },
      { id: 7, title: "Sanayi Odaklı Araştırma", desc: "Destek yürütücüye aktarılır. Sanayi kuruluşu ile koordineli olarak araştırma yürütülür. Harcamalar fatura ile belgelenir.", result: "Araştırma + sanayi çıktısı tamamlandı", duration: "6-12 Ay", docs: [] },
      { id: 8, title: "Sonuç Raporu & Kapanış", desc: "Sonuç raporu BİDEB sistemine yüklenir, danışman onayı alınır. Çıktılar bildirilir. Tamamlayanlara 2224-A/B/D fırsatları sunulur.", result: "Rapor onaylandı + proje kapandı", duration: "2 Hafta", docs: [
        { name: "Sonuç Raporu (TYBS)", url: "https://tybs.tubitak.gov.tr" },
      ] },
    ],
  },
  teknofest: {
    abbr: "TE",
    name: "TEKNOFEST",
    subtitle: "2026 · Şanlıurfa GAP Havalimanı · 30 Eylül – 4 Ekim",
    accent: "#7C3AED", accentSoft: "#F5F3FF", accentMid: "#C4B5FD",
    logo: "https://www.teknofest.org/favicon.ico",
    logoFull: "https://www.google.com/s2/favicons?domain=teknofest.org&sz=64",
    badge: "75 Milyon ₺ Ödül",
    badgeDesc: "52 yarışma · 127 alt kategori · 100M+ ₺ maddi destek",
    info: "T3 Vakfı ve T.C. Sanayi ve Teknoloji Bakanlığı öncülüğünde düzenlenen TEKNOFEST, dünyanın en büyük havacılık, uzay ve teknoloji festivalidir. 2026'da Şanlıurfa GAP Havalimanı'nda 30 Eylül – 4 Ekim tarihleri arasında gerçekleşecektir. İlkokuldan lisansüstüne, mezunlardan özel sektöre kadar geniş katılımcı profiline açıktır.",
    links: [
      { label: "TEKNOFEST Resmi Site", url: "https://www.teknofest.org" },
      { label: "T3 KYS Başvuru Sistemi", url: "https://t3kys.com" },
      { label: "Yarışma Kategorileri", url: "https://www.teknofest.org/tr/yarisma-kategorileri/" },
    ],
    areas: [],
    evalCriteria: [
      { name: "Teknik Yeterlilik", pct: 30 },
      { name: "Yenilikçilik", pct: 30 },
      { name: "Uygulanabilirlik", pct: 25 },
      { name: "Sunum", pct: 15 },
    ],
    steps: [
      { id: 1, title: "Kategori Seçimi", desc: "52 ana kategori ve 127 alt kategoriden uygun olanı seçilir. İHA, roket, yapay zekâ, savunma, tarım, sağlık, otonom sistemler, maden teknolojileri, elektronik harp gibi alanlarda yarışmalar mevcuttur. Şartname ve takvim incelenir.", result: "Hedef kategori + şartname incelendi", duration: "1-2 Hafta", docs: [
        { name: "Başvuru Kılavuzu", url: "https://www.teknofest.org" },
        { name: "Şartname", url: "https://www.teknofest.org/tr/yarisma-kategorileri/" },
      ] },
      { id: 2, title: "T3 KYS Üyelik & Giriş", desc: "T3 Kurumsal Yönetim Sistemi'ne (t3kys.com) üye olunur ve giriş yapılır. Bu platform üzerinden tüm başvuru ve takip işlemleri yürütülür.", result: "T3 KYS hesabı aktif", duration: "1 Gün", docs: [] },
      { id: 3, title: "Takım Kurma", desc: "Takım kaptanı olarak ekip oluşturulur, üyeler sisteme davet edilir. Yarışmaya göre takım en az 3, en fazla 15 kişiden oluşabilir. Bireysel veya takım halinde katılım mümkündür.", result: "Takım oluşturuldu + üyeler davet edildi", duration: "1 Hafta", docs: [] },
      { id: 4, title: "Online Başvuru", desc: "Yarışma kategorisi seçilir, proje özeti ve başvuru formu doldurulur. Proje bilgileri, takım detayları ve teknik açıklamalar girilir. Başvuru son tarihi: 28 Şubat 2026 (uzatıldı).", result: "Başvuru tamamlandı", duration: "1-2 Hafta", docs: [
        { name: "Başvuru Formu (T3 KYS)", url: "https://t3kys.com" },
      ] },
      { id: 5, title: "Teknik Yeterlilik Formu", desc: "Başvuru sonrası teknik yeterlilik formu hazırlanır ve sisteme yüklenir. Son teslim: 24 Mart 2026. Sonuçlar: 10 Nisan 2026.", result: "Teknik yeterlilik onaylandı", duration: "3-4 Hafta", docs: [
        { name: "Teknik Yeterlilik Formu (T3 KYS)", url: "https://t3kys.com" },
      ] },
      { id: 6, title: "Kritik Tasarım Raporu (KTR)", desc: "Detaylı teknik tasarım raporu, CAD çizimleri ve simülasyonlar hazırlanır. Son teslim: 30 Nisan 2026. Sonuçlar: 22 Mayıs 2026.", result: "KTR onaylandı", duration: "4-5 Hafta", docs: [
        { name: "KTR Raporu (T3 KYS)", url: "https://t3kys.com" },
        { name: "Teknik Çizimler (T3 KYS)", url: "https://t3kys.com" },
      ] },
      { id: 7, title: "Prototip & Test Videoları", desc: "Prototip üretilir ve test edilir. Sistem tanımlama ve kanıt videoları hazırlanır. Son teslim: 14 Temmuz 2026. Finalist takımlar: 31 Temmuz 2026.", result: "Finalist olarak seçildi", duration: "8-10 Hafta", docs: [
        { name: "Kanıt Videoları (T3 KYS)", url: "https://t3kys.com" },
        { name: "Sistem Tanımlama (T3 KYS)", url: "https://t3kys.com" },
      ] },
      { id: 8, title: "Final Hazırlık", desc: "Son testler, lojistik planlama (Şanlıurfa ulaşım/konaklama), yedek parça temini ve jüri sunum provası yapılır. Yarışmacılara ulaşım ve konaklama desteği sağlanır.", result: "Yarışmaya hazır", duration: "2-4 Hafta", docs: [] },
      { id: 9, title: "TEKNOFEST Şanlıurfa Final", desc: "30 Eylül – 4 Ekim 2026 tarihlerinde GAP Havalimanı'nda yarışma sahasında kurulum, jüri sunumu ve performans sergilenir. Hava gösterileri, atölyeler ve sergilerle birlikte festival deneyimi yaşanır.", result: "Yarışma tamamlandı", duration: "5 Gün", docs: [] },
      { id: 10, title: "Sonuç & Ödül", desc: "Sonuçlar açıklanır, ödül töreni yapılır. Toplam 75 Milyon TL ödül havuzundan dereceye göre ödül verilir. Deneyim raporlanır ve networking fırsatları değerlendirilir.", result: "Derece + Ödül + Sertifika", duration: "1 Hafta", docs: [] },
    ],
  },
};

/* ─── Progress Arc ─── */
function ProgressArc({ pct, color }) {
  const r = 28, c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#F1F5F9" strokeWidth="5" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="34" y="35" textAnchor="middle" dominantBaseline="central"
        fill="#1E293B" fontSize="15" fontWeight="800">{pct}%</text>
    </svg>
  );
}

/* ─── Eval Criteria Bar ─── */
function EvalBar({ criteria, accent }) {
  if (!criteria || !criteria.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 3, borderRadius: 10, overflow: "hidden", height: 34 }}>
        {criteria.map((c, i) => (
          <div key={i} style={{
            width: `${c.pct}%`, background: accent, opacity: 1 - i * 0.18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{c.pct}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {criteria.map((c, i) => (
          <div key={i} style={{
            width: `${c.pct}%`, fontSize: 11, color: "#64748B", fontWeight: 600,
            textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.name}</div>
        ))}
      </div>
    </div>
  );
}

/* ─── Gantt Mini ─── */
function GanttMini({ steps, accent, accentMid }) {
  const parse = (d) => { const m = d.match(/(\d+)/); return m ? parseInt(m[1]) : 1; };
  let cum = 0;
  const data = steps.map((s) => { const d = parse(s.duration); const st = cum; cum += d; return { ...s, s: st, d }; });
  const total = cum;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {data.map((d, i) => {
        const left = (d.s / total) * 100;
        const width = Math.max((d.d / total) * 100, 3);
        const done = d._status === "completed";
        const active = d._status === "in-progress";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 120, fontSize: 12, color: "#64748B", fontWeight: 500, textAlign: "right",
              flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{d.title}</span>
            <div style={{ flex: 1, height: 22, background: "#F8FAFC", borderRadius: 6, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%",
                background: done ? accent : active ? accentMid : "#E2E8F0",
                borderRadius: 6, transition: "all 0.5s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: done ? "#fff" : "#64748B" }}>{d.duration}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Link Icon ─── */
function LinkIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ─── Road View ─── */
function RoadView({ steps, proj, cycleStatus, expanded, setExpanded, notes, saveNote, activeProject }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const StepCard = ({ step, i, isOpen }) => {
    const done = step._status === "completed";
    const active = step._status === "in-progress";
    const stBg = done ? "#DCFCE7" : active ? "#FEF3C7" : "#F1F5F9";
    const stColor = done ? "#16A34A" : active ? "#D97706" : "#94A3B8";
    const noteText = notes[`${activeProject}-${i}`] || "";

    return (
      <div
        onClick={() => setExpanded(isOpen ? null : i)}
        style={{
          background: isOpen ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${isOpen ? proj.accent + "50" : "rgba(255,255,255,0.4)"}`,
          borderRadius: 16, padding: "16px", cursor: "pointer",
          width: "100%", maxWidth: isMobile ? "100%" : 320,
          boxShadow: isOpen ? `0 8px 30px ${proj.accent}15` : "0 4px 12px rgba(0,0,0,0.04)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isOpen ? "scale(1.02)" : "scale(1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", lineHeight: 1.4 }}>{step.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: stBg, color: stColor, flexShrink: 0 }}>{step.duration}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: proj.accent }}>Sonuç</span>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{step.result}</span>
        </div>
        {isOpen && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${proj.accent}18` }}>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            {step.docs && step.docs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {step.docs.map((d, j) => {
                  const doc = typeof d === "string" ? { name: d, url: null } : d;
                  if (doc.url) return (
                    <a key={j} href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="rm-doc-link" onClick={e => e.stopPropagation()}
                      style={{ borderColor: proj.accent + "30", color: proj.accent }}>
                      <LinkIcon size={12} color={proj.accent} />{doc.name}
                    </a>
                  );
                  return <span key={j} className="rm-doc-link" style={{ cursor: "default", opacity: 0.6 }}>{doc.name}</span>;
                })}
              </div>
            )}
            
            {/* Kişisel Not Alanı */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #CBD5E1" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>KİŞİSEL NOT / TARİH</div>
              <textarea
                placeholder="Bu adımla ilgili notlarınızı veya deadline'ı yazın..."
                value={noteText}
                onChange={(e) => saveNote(i, e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8,
                  fontSize: 13, background: "rgba(255,255,255,0.8)", minHeight: 60,
                  resize: "vertical", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
                  color: "#1E293B", transition: "border-color 0.2s"
                }}
                onFocus={e => e.target.style.borderColor = proj.accent}
                onBlur={e => e.target.style.borderColor = "#E2E8F0"}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "relative", paddingBottom: 24, userSelect: "none" }}>

      {/* ── Modern Vertical Timeline Strip ── */}
      <div style={{
        position: "absolute",
        left: isMobile ? 32 : "50%",
        transform: isMobile ? "none" : "translateX(-50%)",
        width: 4,
        top: 0, bottom: 0,
        background: `linear-gradient(to bottom, transparent 0%, #E2E8F0 5%, ${proj.accentMid} 50%, #E2E8F0 95%, transparent 100%)`,
        zIndex: 0,
        borderRadius: 4,
      }}>
        {/* Active Pulse Segment */}
        <div style={{
           position: "absolute", left: -2, top: "15%", height: "20%", width: 8,
           background: `linear-gradient(to bottom, transparent, ${proj.accent}, transparent)`,
           borderRadius: 4, opacity: 0.8,
           boxShadow: `0 0 15px ${proj.accent}`,
        }} />
      </div>

      {/* ── START marker ── */}
      <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", paddingLeft: isMobile ? 0 : 0, marginBottom: 32, position: "relative", zIndex: 2 }}>
        <div style={{
          marginLeft: isMobile ? 6 : 0,
          background: proj.accent, color: "#fff",
          padding: "8px 22px", borderRadius: 8,
          fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
          boxShadow: `0 3px 12px ${proj.accent}40`,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>BAŞLANGIÇ</div>
      </div>

      {/* ── Steps ── */}
      {steps.map((step, i) => {
        const isLeft = !isMobile && i % 2 === 0;
        const isOpen = expanded === i;
        const done = step._status === "completed";
        const active = step._status === "in-progress";

        return (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 40, position: "relative", zIndex: 1,
            flexDirection: isMobile ? "row" : "row",
          }}>

            {/* Left card OR connector placeholder */}
            {!isMobile && (
              <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", paddingRight: 14 }}>
                {isLeft ? (
                  <StepCard step={step} i={i} isOpen={isOpen} />
                ) : (
                  /* dotted connector for empty left side */
                  <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${proj.accentMid} 0, ${proj.accentMid} 5px, transparent 5px, transparent 10px)` }} />
                )}
              </div>
            )}

            {/* Road node (glowing circle) */}
            <div style={{
              width: isMobile ? 64 : 64, flexShrink: 0, display: "flex", justifyContent: "center", zIndex: 2,
            }}>
              <div
                onClick={e => { e.stopPropagation(); cycleStatus(i); }}
                title="Durumu değiştir"
                style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: done ? proj.accent : active ? "#fff" : "#F8FAFC",
                  border: `3px solid ${done ? "rgba(255,255,255,0.85)" : active ? proj.accent : "#CBD5E1"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: done
                    ? `0 0 0 6px ${proj.accent}30, 0 4px 14px rgba(0,0,0,0.2)`
                    : active
                      ? `0 0 0 6px ${proj.accent}25, 0 4px 20px ${proj.accent}40`
                      : "0 2px 8px rgba(0,0,0,0.05)",
                  fontWeight: 800, fontSize: done ? 18 : 15,
                  color: done ? "#fff" : active ? proj.accent : "#94A3B8",
                  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  transform: active ? "scale(1.1)" : "scale(1)",
                }}
              >
                {done ? "✓" : step.id}
              </div>
            </div>

            {/* Right card OR connector placeholder */}
            <div style={{ flex: 1, paddingLeft: 14 }}>
              {(!isMobile && !isLeft) || isMobile ? (
                <StepCard step={step} i={i} isOpen={isOpen} />
              ) : (
                <div style={{ height: 2, width: 32, background: `repeating-linear-gradient(to right, ${proj.accentMid} 0, ${proj.accentMid} 5px, transparent 5px, transparent 10px)` }} />
              )}
            </div>
          </div>
        );
      })}

      {/* ── FINISH marker ── */}
      <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "center", marginTop: 8, position: "relative", zIndex: 2 }}>
        <div style={{
          marginLeft: isMobile ? 6 : 0,
          background: "#0F172A", color: "#fff",
          padding: "8px 22px", borderRadius: 8,
          fontWeight: 800, fontSize: 11, letterSpacing: "0.12em",
          boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>BİTİŞ</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */
export default function RoadmapsModule({ currentUser, activeDepartment, departmentInfo } = {}) {
  const [activeProject, setActiveProject] = useState("unides");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("road");
  const [guideOpen, setGuideOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const STORAGE_KEY = "roadmaps_statuses_" + (currentUser && currentUser.uid ? currentUser.uid : "guest");
  const [statuses, setStatuses] = useState(function() {
    try { var s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
  });
  React.useEffect(function() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses)); } catch(e) {}
  }, [statuses, STORAGE_KEY]);

  // Yeni Not Ekleme State'i
  const NOTES_KEY = "roadmaps_notes_" + (currentUser && currentUser.uid ? currentUser.uid : "guest");
  const [notes, setNotes] = useState(function() {
    try { var n = localStorage.getItem(NOTES_KEY); return n ? JSON.parse(n) : {}; } catch(e) { return {}; }
  });
  React.useEffect(function() {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch(e) {}
  }, [notes, NOTES_KEY]);

  const saveNote = (idx, text) => {
    const key = `${activeProject}-${idx}`;
    setNotes(prev => ({ ...prev, [key]: text }));
  };

  const proj = PROJECTS[activeProject];
  const steps = proj.steps.map((s, i) => ({
    ...s,
    _status: statuses[`${activeProject}-${i}`] || (i === 0 ? "in-progress" : "upcoming"),
  }));
  const completed = steps.filter((s) => s._status === "completed").length;
  const pct = Math.round((completed / steps.length) * 100);

  const cycleStatus = (idx) => {
    const key = `${activeProject}-${idx}`;
    const order = ["upcoming", "in-progress", "completed"];
    const cur = statuses[key] || steps[idx]._status;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setStatuses((p) => ({ ...p, [key]: next }));
  };

  const resetProgress = function() {
    var keys = Object.keys(statuses).filter(function(k) { return k.startsWith(activeProject + "-"); });
    setStatuses(function(prev) {
      var next = Object.assign({}, prev);
      keys.forEach(function(k) { delete next[k]; });
      return next;
    });
  };

  /* ── Section Divider ── */
  const SectionDivider = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${proj.accent}25)` }} />
      {label && (
        <span style={{ fontSize: 11, fontWeight: 700, color: proj.accent, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, flexShrink: 0 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${proj.accent}25)` }} />
    </div>
  );

  /* ── Logo with fallback ── */
  const ProjectLogo = ({ p, size = 36 }) => {
    const [err, setErr] = useState(false);
    return err ? (
      <div style={{
        width: size, height: size, borderRadius: size * 0.25,
        background: p.accent, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 900, color: "#fff", flexShrink: 0,
        letterSpacing: "-0.03em",
      }}>
        {p.name.slice(0, 2)}
      </div>
    ) : (
      <img
        src={p.logoFull}
        alt={p.name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: size * 0.2, flexShrink: 0 }}
      />
    );
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAFBFC", minHeight: "100vh", color: "#1E293B" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .rm-doc-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; padding: 5px 12px; border-radius: 8px;
          background: #fff; border: 1px solid #E2E8F0; color: #475569;
          font-weight: 600; text-decoration: none; transition: all 0.2s;
          cursor: pointer; line-height: 1.4;
        }
        .rm-doc-link:hover {
          border-color: #94A3B8; color: #1E293B;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .rm-ext-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: inherit;
          text-decoration: none; padding: 6px 14px; border-radius: 8px;
          border: 1px solid currentColor; opacity: 0.8;
          transition: all 0.2s;
        }
        .rm-ext-link:hover { opacity: 1; transform: translateY(-1px); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Premium Unified Header ── */}
        <div style={{
          background: "#fff",
          borderRadius: 24, padding: "32px", marginBottom: 32,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04)", border: "1px solid #E2E8F0"
        }}>
          {/* Top Row: Title & Tabs */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 20, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B", letterSpacing: "-0.02em", margin: 0 }}>Kariyer ve Proje Yol Haritaları 🚀</h1>
              <p style={{ fontSize: 14, color: "#64748B", marginTop: 6, margin: 0 }}>Adım adım başvuru rehberi ve kişisel not defteriniz.</p>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", background: "#F1F5F9", padding: 6, borderRadius: 16, gap: 4, width: isMobile ? "100%" : "auto", overflowX: "auto" }}>
              {Object.entries(PROJECTS).map(([key, p]) => {
                const act = activeProject === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveProject(key); setExpanded(null); setView("road"); }}
                    style={{
                      padding: "8px 16px", borderRadius: 12, border: "none",
                      background: act ? "#fff" : "transparent",
                      color: act ? p.accent : "#64748B",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      boxShadow: act ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s", whiteSpace: "nowrap"
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: 32 }}>
            {/* Left Column: Project Info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                 <div style={{ width: 48, height: 48, borderRadius: 14, background: proj.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: proj.accent, fontSize: 16, fontWeight: 900 }}>{proj.abbr}</div>
                 <div>
                   <div style={{ fontSize: 18, fontWeight: 800, color: "#1E293B", lineHeight: 1.2 }}>{proj.subtitle}</div>
                   <div style={{ fontSize: 12, fontWeight: 700, color: proj.accent, marginTop: 4 }}>{proj.badgeDesc || proj.badge}</div>
                 </div>
              </div>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 24px 0" }}>{proj.info}</p>
              
              {/* Links */}
              {proj.links && proj.links.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {proj.links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 12, fontWeight: 700, color: proj.accent,
                        textDecoration: "none", padding: "8px 16px", borderRadius: 10,
                        background: proj.accentSoft, transition: "all 0.2s",
                      }}>
                      <LinkIcon size={14} color={proj.accent} /> {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Progress & Eval */}
            <div style={{ background: "#FAFBFC", borderRadius: 16, padding: 24, border: "1px dashed #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                 <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>İlerleme Durumu</div>
                 <div style={{ fontSize: 28, fontWeight: 900, color: proj.accent }}>{pct}%</div>
              </div>
              
              <div style={{ height: 10, background: "#E2E8F0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", width: pct + "%", background: proj.accent, borderRadius: 10, transition: "width 0.6s ease" }} />
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: proj.evalCriteria?.length ? 24 : 0 }}>
                 <span>{completed} / {steps.length} Görev</span>
                 <button onClick={resetProgress} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>Sıfırla</button>
              </div>

              {proj.evalCriteria && proj.evalCriteria.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Değerlendirme Kriterleri</div>
                  <EvalBar criteria={proj.evalCriteria} accent={proj.accent} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Road / Steps / Gantt ── */}
        {view === "road" ? (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 20, padding: "32px 20px" }}>
            <RoadView steps={steps} proj={proj} cycleStatus={cycleStatus} expanded={expanded} setExpanded={setExpanded} notes={notes} saveNote={saveNote} activeProject={activeProject} />
          </div>
        ) : view === "steps" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((s, i) => {
              const isOpen = expanded === i;
              const done = s._status === "completed";
              const active = s._status === "in-progress";
              const stInfo = done
                ? { bg: "#DCFCE7", color: "#16A34A" }
                : active
                  ? { bg: "#FEF3C7", color: "#D97706" }
                  : { bg: "#F1F5F9", color: "#94A3B8" };
              return (
                <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
                  {/* Vertical connector line */}
                  {i < steps.length - 1 && (
                    <div style={{
                      position: "absolute", left: 17, top: 40, bottom: 0, width: 2,
                      background: done ? proj.accentMid : "#EEF0F4", zIndex: 0,
                    }} />
                  )}

                  {/* Step number circle */}
                  <div onClick={(e) => { e.stopPropagation(); cycleStatus(i); }} style={{
                    flexShrink: 0, width: 36, display: "flex", justifyContent: "center", paddingTop: 2, zIndex: 1, cursor: "pointer",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: done ? proj.accent : active ? proj.accentSoft : "#fff",
                      border: `2.5px solid ${done ? proj.accent : active ? proj.accent : "#D4D9E1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: done ? 16 : 14, fontWeight: 700,
                      color: done ? "#fff" : active ? proj.accent : "#94A3B8",
                      transition: "all 0.25s",
                    }}>
                      {done ? "✓" : s.id}
                    </div>
                  </div>

                  {/* Step content card */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : i)}
                    style={{
                      flex: 1, cursor: "pointer", padding: "14px 20px", marginBottom: 8,
                      borderRadius: 14,
                      background: isOpen ? proj.accentSoft : "#fff",
                      border: `1.5px solid ${isOpen ? proj.accent + "30" : "#F1F5F9"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>{s.title}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 14,
                          background: stInfo.bg, color: stInfo.color,
                        }}>{s.duration}</span>
                      </div>
                      <span style={{
                        fontSize: 13, color: "#CBD5E1",
                        transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s",
                      }}>▾</span>
                    </div>

                    {/* Result preview */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: proj.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Sonuç
                      </span>
                      <span style={{ fontSize: 14, color: "#475569", fontWeight: 600 }}>{s.result}</span>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${proj.accent}15` }}>
                        <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.8, margin: 0 }}>{s.desc}</p>

                        {/* Document links */}
                        {s.docs && s.docs.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                            {s.docs.map((d, j) => {
                              const doc = typeof d === "string" ? { name: d, url: null } : d;
                              if (doc.url) {
                                return (
                                  <a key={j} href={doc.url} target="_blank" rel="noopener noreferrer" className="rm-doc-link"
                                    onClick={(e) => e.stopPropagation()}>
                                    <LinkIcon size={13} />
                                    {doc.name}
                                  </a>
                                );
                              }
                              return (
                                <span key={j} className="rm-doc-link" style={{ cursor: "default", opacity: 0.7 }}>
                                  📄 {doc.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, padding: 22 }}>
            <GanttMini steps={steps} accent={proj.accent} accentMid={proj.accentMid} />
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          marginTop: 28, padding: "14px 0",
          borderTop: `1px solid ${proj.accent}15`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              background: proj.accent + "25",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900, color: proj.accent, fontFamily: "monospace",
            }}>{proj.abbr}</div>
            <span style={{ fontSize: 12, color: "#CBD5E1", fontWeight: 500 }}>{proj.name} · Yol Haritası</span>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { c: "#16A34A", l: "Tamamlandı" },
              { c: "#D97706", l: "Devam Ediyor" },
              { c: "#CBD5E1", l: "Bekliyor" },
            ].map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: x.c }} />
                <span style={{ fontSize: 11, color: "#94A3B8" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.RoadmapsModuleApp = RoadmapsModule;
