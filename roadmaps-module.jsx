import { useState } from "react";

const PROJECTS = {
  unides: {
    name: "ÜNİDES",
    subtitle: "Üniversite Öğrenci Toplulukları İş Birliği ve Destek Programı",
    accent: "#E8590C", accentSoft: "#FFF7ED", accentMid: "#FDBA74",
    icon: "🏛️", badge: "75-125 bin ₺",
    badgeDesc: "Yerel: 75.000 ₺ · Ulusal: 125.000 ₺",
    info: "Gençlik ve Spor Bakanlığı Gençlik Hizmetleri Genel Müdürlüğü tarafından yürütülen ÜNİDES, üniversite öğrenci topluluklarının projelerine mali destek sağlar. 2025-2026 döneminde 5. ve 6. dönem başvuruları e-genc.gsb.gov.tr üzerinden alınmaktadır.",
    areas: ["Afet Yönetimi ve Dayanıklılık","Aile ve Değerler","Bilim ve Teknoloji","Çevre ve İklim","Eğitim ve Hayat Boyu Öğrenme","Gençlik Bilgilendirmesi","Gençlik Sağlığı ve Spor","Gönüllülük ve Sivil Toplum","İstihdam ve Girişimcilik","Sosyal Kapsayıcılık","Uluslararası Gençlik Çalışmaları"],
    evalCriteria: [],
    steps: [
      { id: 1, title: "Kulüp & Fikir Hazırlığı", desc: "Üniversitenizin onaylı öğrenci kulübüyle katılım sağlanır. Gençlik Politika Belgesi'ndeki 11 alandan birine uygun, kapsayıcı ve sürdürülebilir bir proje fikri belirlenir.", result: "Onaylı kulüp + net proje fikri", duration: "2 Hafta", docs: [] },
      { id: 2, title: "Ekip & Koordinatör", desc: "Proje ekibi kurulur, bir akademik koordinatör atanır. Koordinatör özgeçmiş formu hazırlanır, görev dağılımı yapılır.", result: "Koordinatör ataması + ekip listesi", duration: "1 Hafta", docs: ["Koordinatör Özgeçmiş Formu"] },
      { id: 3, title: "Proje Yazımı & Belgeler", desc: "Başvuru formu doldurulur, bütçe formu hazırlanır (yerel: 75 bin ₺, ulusal: 125 bin ₺), taahhütname imzalanır, paydaşlık formu ve yönetim kurulu kararı alınır.", result: "Tüm belgeler hazır", duration: "3 Hafta", docs: ["Başvuru Formu","Bütçe Formu","Taahhütname","Paydaşlık Formu","YK Kararı"] },
      { id: 4, title: "Online Başvuru", desc: "e-genc.gsb.gov.tr adresinden online başvuru yapılır. Tüm belgeler sisteme yüklenir ve başvuru tamamlanır.", result: "Başvuru onayı alındı", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Değerlendirme & Sonuç", desc: "Başvurular Gençlik Hizmetleri Genel Müdürlüğü tarafından değerlendirilir. Kabul edilen projelere destek sağlanır.", result: "Kabul / Red bildirimi", duration: "4-6 Hafta", docs: [] },
      { id: 6, title: "Projenin Uygulanması", desc: "Proje planına uygun şekilde faaliyetler gerçekleştirilir. Bütçe kullanımı takip edilir, GSB tesis ve genç ofislerinden yararlanılır.", result: "Faaliyetler tamamlandı", duration: "3-6 Ay", docs: [] },
      { id: 7, title: "Sonuç Raporu & Kapanış", desc: "Proje tamamlandıktan sonra sonuç raporu hazırlanır ve sisteme yüklenir. Mali rapor ve çıktılar sunulur.", result: "Sonuç raporu onaylandı", duration: "2 Hafta", docs: ["Sonuç Raporu"] },
    ],
  },
  tubitak2209a: {
    name: "2209-A",
    subtitle: "Üniversite Öğrencileri Araştırma Projeleri Destekleme Programı",
    accent: "#059669", accentSoft: "#ECFDF5", accentMid: "#6EE7B7",
    icon: "🔬", badge: "Maks. 12.000 ₺",
    badgeDesc: "En fazla 12 ay · TYBS üzerinden başvuru",
    info: "TÜBİTAK BİDEB tarafından yürütülen 2209-A programı, ön lisans ve lisans öğrencilerine araştırma ve proje yönetimi deneyimi kazandırmayı amaçlar. Makine/teçhizat, sarf malzeme, seyahat ve hizmet alımı giderleri desteklenir. Kongre katılım, yayın, patent ve konaklama masrafları bütçeye dahil edilemez.",
    areas: [],
    evalCriteria: [
      { name: "Bilimsel Nitelik", pct: 35 },
      { name: "Yöntem", pct: 25 },
      { name: "Proje Yönetimi", pct: 20 },
      { name: "Yaygın Etki", pct: 20 },
    ],
    steps: [
      { id: 1, title: "Konu & Danışman Belirleme", desc: "Araştırma konusu belirlenir. Güncel YÖK kaydı olan bir öğretim elemanı akademik danışman olarak atanır. Bir danışman aynı dönemde en fazla 5 projede görev alabilir. ARBİS kaydı (arbis.tubitak.gov.tr) yapılır.", result: "Konu + YÖK kayıtlı danışman + ARBİS kaydı", duration: "2 Hafta", docs: ["ARBİS Kaydı"] },
      { id: 2, title: "Araştırma Önerisi Yazımı", desc: "TÜBİTAK formatında ve Türkçe olarak araştırma önerisi hazırlanır. Proje başlığı araştırmanın amacını yansıtmalı. Bireysel veya en fazla 1 yürütücü + 4 ortak ile ekip halinde başvurulabilir.", result: "Araştırma önerisi formu tamamlandı", duration: "3 Hafta", docs: ["Araştırma Önerisi Formu","Öncelikli Alanlar Listesi"] },
      { id: 3, title: "TYBS Online Başvuru", desc: "Başvuru, proje yürütücüsü tarafından TÜBİTAK Yönetim Bilgi Sistemi (tybs.tubitak.gov.tr) üzerinden çevrimiçi yapılır. IBAN proje yürütücüsüne ait olmalıdır. Son başvuru günü 17:30'da sistem kapanır.", result: "Başvuru sisteme yüklendi", duration: "1 Hafta", docs: [] },
      { id: 4, title: "Danışman Onayı", desc: "Başvuru sonrası akademik danışmana otomatik olarak onay talebi gönderilir. Danışman bilgileri YÖKSİS ve ARBİS üzerinden doğrulanır. İade durumunda düzenleme yapılıp yeniden sunulur.", result: "Danışman onayı tamamlandı", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Kuruluş Yetkilisi e-İmza", desc: "Danışman onayının ardından başvuru, üniversitenin kuruluş yetkilisinin (Rektör/Rektör Yrd.) e-imzasına gönderilir. eimza.tubitak.gov.tr üzerinden imzalanır.", result: "e-İmza tamamlandı, başvuru geçerli", duration: "1 Hafta", docs: [] },
      { id: 6, title: "Ön İnceleme", desc: "Başvuru koşulları, belge formatı ve Türkçe dil şartı kontrol edilir. Eksik veya formata uygun olmayan başvurular bilimsel değerlendirmeye alınmadan elenir.", result: "Ön inceleme geçildi", duration: "2 Hafta", docs: [] },
      { id: 7, title: "Bilimsel Değerlendirme", desc: "Uzman danışma kurulu / panelist tarafından değerlendirilir: Bilimsel nitelik %35, Yöntem %25, Proje yönetimi %20, Yaygın etki %20. Sonuçlar e-bideb üzerinden açıklanır.", result: "Kabul / Red bildirimi", duration: "6-8 Hafta", docs: [] },
      { id: 8, title: "Projenin Yürütülmesi", desc: "Destek yürütücünün banka hesabına yatırılır. Harcamalar fatura ile belgelenir. Etik kurul gereken projelerde onay belgesi yüklenir. Proje en fazla 12 ay sürer.", result: "Araştırma tamamlandı + harcamalar belgelendi", duration: "6-12 Ay", docs: [] },
      { id: 9, title: "Sonuç Raporu & Kapanış", desc: "TÜBİTAK formatında sonuç raporu BİDEB sistemine yüklenir, danışman nihai onay verir. Çıktılar (makale, bildiri vb.) bildirilir. Tamamlayanlara 2224-A/B/D programlarında avantaj sağlanır.", result: "Rapor onaylandı + proje kapandı", duration: "2 Hafta", docs: ["Sonuç Raporu Formatı"] },
    ],
  },
  tubitak2209b: {
    name: "2209-B",
    subtitle: "Üniversite Öğrencileri Sanayiye Yönelik Araştırma Projeleri Desteği",
    accent: "#0369A1", accentSoft: "#F0F9FF", accentMid: "#7DD3FC",
    icon: "🏭", badge: "Maks. 12.000 ₺",
    badgeDesc: "En fazla 12 ay · Sanayi iş birliği zorunlu",
    info: "TÜBİTAK BİDEB tarafından yürütülen 2209-B programı, ön lisans ve lisans öğrencilerinin sanayinin ihtiyaç duyduğu alanlarda çözümler üretmesini teşvik eder. 2209-A'dan farkı: Akademik danışmanın yanı sıra bir sanayi danışmanı da zorunludur. Sanayi kuruluşu; Ar-Ge merkezi, tasarım merkezi, teknoloji geliştirme bölgesi, OSB'de faaliyet gösteren veya TÜBİTAK destekli proje tamamlamış sermaye şirketi olmalıdır.",
    areas: [],
    evalCriteria: [
      { name: "Bilimsel Nitelik", pct: 35 },
      { name: "Yöntem", pct: 25 },
      { name: "Proje Yönetimi", pct: 20 },
      { name: "Yaygın Etki", pct: 20 },
    ],
    steps: [
      { id: 1, title: "Konu & Sanayi Ortağı Bulma", desc: "Sanayinin ihtiyaç duyduğu bir alanda araştırma konusu belirlenir. Ar-Ge merkezi, teknoloji geliştirme bölgesi, OSB veya TÜBİTAK destekli proje tamamlamış bir sanayi kuruluşu ile iş birliği kurulur.", result: "Sanayi ortağı + proje konusu belirlendi", duration: "2-3 Hafta", docs: [] },
      { id: 2, title: "Danışman Atamaları", desc: "YÖK kayıtlı bir akademik danışman ve sanayi kuruluşundan bir sanayi danışmanı atanır. İki danışman aynı kişi olamaz. ARBİS kaydı yapılır.", result: "Akademik + sanayi danışmanı atandı", duration: "1 Hafta", docs: ["ARBİS Kaydı"] },
      { id: 3, title: "Araştırma Önerisi Yazımı", desc: "TÜBİTAK formatında, Türkçe olarak sanayi odaklı araştırma önerisi hazırlanır. Sanayi kuruluşunun ihtiyacı ve projenin uygulanabilirliği net şekilde belirtilir.", result: "Sanayi odaklı araştırma önerisi hazır", duration: "3 Hafta", docs: ["Araştırma Önerisi Formu"] },
      { id: 4, title: "TYBS Online Başvuru", desc: "tybs.tubitak.gov.tr üzerinden çevrimiçi başvuru yapılır. Sanayi kuruluşu bilgileri ve danışman bilgileri sisteme girilir.", result: "Başvuru sisteme yüklendi", duration: "1 Hafta", docs: [] },
      { id: 5, title: "Danışman Onayı & e-İmza", desc: "Akademik danışman sistem üzerinden onay verir. Ardından kuruluş yetkilisinin e-imzası ile başvuru geçerli hale gelir.", result: "Danışman onayı + e-İmza tamamlandı", duration: "1-2 Hafta", docs: [] },
      { id: 6, title: "Ön İnceleme & Değerlendirme", desc: "Ön incelemede belge ve koşul kontrolü yapılır. Bilimsel değerlendirme uzman paneller tarafından gerçekleştirilir: Bilimsel nitelik %35, Yöntem %25, Proje yönetimi %20, Yaygın etki %20.", result: "Kabul / Red bildirimi", duration: "6-8 Hafta", docs: [] },
      { id: 7, title: "Sanayi Odaklı Araştırma", desc: "Destek yürütücüye aktarılır. Sanayi kuruluşu ile koordineli olarak araştırma yürütülür. Harcamalar fatura ile belgelenir.", result: "Araştırma + sanayi çıktısı tamamlandı", duration: "6-12 Ay", docs: [] },
      { id: 8, title: "Sonuç Raporu & Kapanış", desc: "Sonuç raporu BİDEB sistemine yüklenir, danışman onayı alınır. Çıktılar bildirilir. Tamamlayanlara 2224-A/B/D fırsatları sunulur.", result: "Rapor onaylandı + proje kapandı", duration: "2 Hafta", docs: ["Sonuç Raporu"] },
    ],
  },
  teknofest: {
    name: "TEKNOFEST",
    subtitle: "2026 · Şanlıurfa GAP Havalimanı · 30 Eylül – 4 Ekim",
    accent: "#7C3AED", accentSoft: "#F5F3FF", accentMid: "#C4B5FD",
    icon: "🚀", badge: "75 Milyon ₺ Ödül",
    badgeDesc: "52 yarışma · 127 alt kategori · 100M+ ₺ maddi destek",
    info: "T3 Vakfı ve T.C. Sanayi ve Teknoloji Bakanlığı öncülüğünde düzenlenen TEKNOFEST, dünyanın en büyük havacılık, uzay ve teknoloji festivalidir. 2026'da Şanlıurfa GAP Havalimanı'nda 30 Eylül – 4 Ekim tarihleri arasında gerçekleşecektir. İlkokuldan lisansüstüne, mezunlardan özel sektöre kadar geniş katılımcı profiline açıktır. Başvurular t3kys.com ve teknofest.org üzerinden yapılır.",
    areas: [],
    evalCriteria: [
      { name: "Teknik Yeterlilik", pct: 30 },
      { name: "Yenilikçilik", pct: 30 },
      { name: "Uygulanabilirlik", pct: 25 },
      { name: "Sunum", pct: 15 },
    ],
    steps: [
      { id: 1, title: "Kategori Seçimi", desc: "52 ana kategori ve 127 alt kategoriden uygun olanı seçilir. İHA, roket, yapay zekâ, savunma, tarım, sağlık, otonom sistemler, maden teknolojileri, elektronik harp gibi alanlarda yarışmalar mevcuttur. Şartname ve takvim incelenir.", result: "Hedef kategori + şartname incelendi", duration: "1-2 Hafta", docs: ["Başvuru Kılavuzu","Şartname"] },
      { id: 2, title: "T3 KYS Üyelik & Giriş", desc: "T3 Kurumsal Yönetim Sistemi'ne (t3kys.com) üye olunur ve giriş yapılır. Bu platform üzerinden tüm başvuru ve takip işlemleri yürütülür.", result: "T3 KYS hesabı aktif", duration: "1 Gün", docs: [] },
      { id: 3, title: "Takım Kurma", desc: "Takım kaptanı olarak ekip oluşturulur, üyeler sisteme davet edilir. Yarışmaya göre takım en az 3, en fazla 15 kişiden oluşabilir. Bireysel veya takım halinde katılım mümkündür.", result: "Takım oluşturuldu + üyeler davet edildi", duration: "1 Hafta", docs: [] },
      { id: 4, title: "Online Başvuru", desc: "Yarışma kategorisi seçilir, proje özeti ve başvuru formu doldurulur. Proje bilgileri, takım detayları ve teknik açıklamalar girilir. Başvuru son tarihi: 28 Şubat 2026 (uzatıldı).", result: "Başvuru tamamlandı", duration: "1-2 Hafta", docs: ["Başvuru Formu"] },
      { id: 5, title: "Teknik Yeterlilik Formu", desc: "Başvuru sonrası teknik yeterlilik formu hazırlanır ve sisteme yüklenir. Son teslim: 24 Mart 2026. Sonuçlar: 10 Nisan 2026.", result: "Teknik yeterlilik onaylandı", duration: "3-4 Hafta", docs: ["Teknik Yeterlilik Formu"] },
      { id: 6, title: "Kritik Tasarım Raporu (KTR)", desc: "Detaylı teknik tasarım raporu, CAD çizimleri ve simülasyonlar hazırlanır. Son teslim: 30 Nisan 2026. Sonuçlar: 22 Mayıs 2026.", result: "KTR onaylandı", duration: "4-5 Hafta", docs: ["KTR Raporu","Teknik Çizimler"] },
      { id: 7, title: "Prototip & Test Videoları", desc: "Prototip üretilir ve test edilir. Sistem tanımlama ve kanıt videoları hazırlanır. Son teslim: 14 Temmuz 2026. Finalist takımlar: 31 Temmuz 2026.", result: "Finalist olarak seçildi", duration: "8-10 Hafta", docs: ["Kanıt Videoları","Sistem Tanımlama"] },
      { id: 8, title: "Final Hazırlık", desc: "Son testler, lojistik planlama (Şanlıurfa ulaşım/konaklama), yedek parça temini ve jüri sunum provası yapılır. Yarışmacılara ulaşım ve konaklama desteği sağlanır.", result: "Yarışmaya hazır", duration: "2-4 Hafta", docs: [] },
      { id: 9, title: "TEKNOFEST Şanlıurfa Final", desc: "30 Eylül – 4 Ekim 2026 tarihlerinde GAP Havalimanı'nda yarışma sahasında kurulum, jüri sunumu ve performans sergilenir. Hava gösterileri, atölyeler ve sergilerle birlikte festival deneyimi yaşanır.", result: "Yarışma tamamlandı", duration: "5 Gün", docs: [] },
      { id: 10, title: "Sonuç & Ödül", desc: "Sonuçlar açıklanır, ödül töreni yapılır. Toplam 75 Milyon TL ödül havuzundan dereceye göre ödül verilir. Deneyim raporlanır ve networking fırsatları değerlendirilir.", result: "Derece + Ödül + Sertifika", duration: "1 Hafta", docs: [] },
    ],
  },
};

function ProgressArc({ pct, color }) {
  const r = 24, c = 2 * Math.PI * r;
  return (
    <svg width="58" height="58" viewBox="0 0 58 58">
      <circle cx="29" cy="29" r={r} fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
      <circle cx="29" cy="29" r={r} fill="none" stroke={color} strokeWidth="4.5" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" transform="rotate(-90 29 29)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="29" y="30" textAnchor="middle" dominantBaseline="central" fill="#1E293B" fontSize="13" fontWeight="800">{pct}%</text>
    </svg>
  );
}

function EvalBar({ criteria, accent }) {
  if (!criteria || !criteria.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Değerlendirme Kriterleri</div>
      <div style={{ display: "flex", gap: 2, borderRadius: 8, overflow: "hidden", height: 28 }}>
        {criteria.map((c, i) => (
          <div key={i} style={{ width: `${c.pct}%`, background: accent, opacity: 1 - i * 0.18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{c.pct}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
        {criteria.map((c, i) => (
          <div key={i} style={{ width: `${c.pct}%`, fontSize: 9, color: "#64748B", fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
        ))}
      </div>
    </div>
  );
}

function GanttMini({ steps, accent, accentMid }) {
  const parse = (d) => { const m = d.match(/(\d+)/); return m ? parseInt(m[1]) : 1; };
  let cum = 0;
  const data = steps.map((s) => { const d = parse(s.duration); const st = cum; cum += d; return { ...s, s: st, d }; });
  const total = cum;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {data.map((d, i) => {
        const left = (d.s / total) * 100;
        const width = Math.max((d.d / total) * 100, 3);
        const done = d._status === "completed";
        const active = d._status === "in-progress";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 100, fontSize: 10, color: "#64748B", fontWeight: 500, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
            <div style={{ flex: 1, height: 18, background: "#F8FAFC", borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%",
                background: done ? accent : active ? accentMid : "#E2E8F0",
                borderRadius: 4, transition: "all 0.5s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 7.5, fontWeight: 700, color: done ? "#fff" : "#64748B" }}>{d.duration}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RoadmapsModule() {
  const [activeProject, setActiveProject] = useState("unides");
  const [expanded, setExpanded] = useState(null);
  const [view, setView] = useState("steps");
  const [statuses, setStatuses] = useState({});

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

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAFBFC", minHeight: "100vh", color: "#1E293B" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>

        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#94A3B8", textTransform: "uppercase" }}>Proje Yönetimi</span>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.02em", marginTop: 4 }}>Roadmaps</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(PROJECTS).map(([key, p]) => {
            const act = activeProject === key;
            return (
              <button key={key} onClick={() => { setActiveProject(key); setExpanded(null); }} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                background: act ? p.accentSoft : "#fff", boxShadow: act ? `0 0 0 2px ${p.accent}30` : "0 0 0 1px #E2E8F0",
                transition: "all 0.2s", minWidth: "fit-content",
              }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: act ? p.accent : "#475569" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 500 }}>{p.badge}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info */}
        <div style={{ background: proj.accentSoft, border: `1px solid ${proj.accent}18`, borderRadius: 14, padding: "14px 18px", marginBottom: 14 }}>
          <p style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.7, margin: 0 }}>{proj.info}</p>
          {proj.badgeDesc && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: proj.accent }}>{proj.badgeDesc}</div>}
        </div>

        {/* Areas */}
        {proj.areas && proj.areas.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Desteklenen Alanlar</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {proj.areas.map((a, i) => (
                <span key={i} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 14, background: "#fff", color: proj.accent, fontWeight: 600, border: `1px solid ${proj.accent}20` }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        <EvalBar criteria={proj.evalCriteria} accent={proj.accent} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <ProgressArc pct={pct} color={proj.accent} />
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>İlerleme</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0F172A" }}>{pct}%</div>
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Adımlar</div>
            <div style={{ marginTop: 4 }}><span style={{ fontSize: 20, fontWeight: 900, color: "#16A34A" }}>{completed}</span><span style={{ fontSize: 15, color: "#CBD5E1", fontWeight: 700 }}> / {steps.length}</span></div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Aktif Adım</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: proj.accent, marginTop: 6 }}>{steps.find((s) => s._status === "in-progress")?.title || "—"}</div>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Yol Haritası</h2>
          <div style={{ display: "flex", gap: 3, background: "#F1F5F9", borderRadius: 9, padding: 3 }}>
            {[{ k: "steps", l: "Adımlar" }, { k: "gantt", l: "Gantt" }].map((v) => (
              <button key={v.k} onClick={() => setView(v.k)} style={{
                padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                background: view === v.k ? "#fff" : "transparent", color: view === v.k ? "#0F172A" : "#94A3B8",
                fontSize: 11, fontWeight: 700, boxShadow: view === v.k ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}>{v.l}</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 10, color: "#B0B8C4", marginBottom: 12 }}>💡 Numaraya tıklayarak durumu değiştirebilirsiniz</div>

        {/* Steps */}
        {view === "steps" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {steps.map((s, i) => {
              const isOpen = expanded === i;
              const done = s._status === "completed";
              const active = s._status === "in-progress";
              const stInfo = done ? { bg: "#DCFCE7", color: "#16A34A" } : active ? { bg: "#FEF3C7", color: "#D97706" } : { bg: "#F1F5F9", color: "#94A3B8" };
              return (
                <div key={i} style={{ display: "flex", gap: 14, position: "relative" }}>
                  {i < steps.length - 1 && (
                    <div style={{ position: "absolute", left: 15, top: 36, bottom: 0, width: 2, background: done ? proj.accentMid : "#EEF0F4", zIndex: 0 }} />
                  )}
                  <div onClick={(e) => { e.stopPropagation(); cycleStatus(i); }} style={{ flexShrink: 0, width: 32, display: "flex", justifyContent: "center", paddingTop: 1, zIndex: 1, cursor: "pointer" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: done ? proj.accent : active ? proj.accentSoft : "#fff",
                      border: `2.5px solid ${done ? proj.accent : active ? proj.accent : "#D4D9E1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: done ? 14 : 12, fontWeight: 700,
                      color: done ? "#fff" : active ? proj.accent : "#94A3B8",
                      transition: "all 0.25s",
                    }}>
                      {done ? "✓" : s.id}
                    </div>
                  </div>
                  <div
                    onClick={() => setExpanded(isOpen ? null : i)}
                    style={{
                      flex: 1, cursor: "pointer", padding: "10px 16px", marginBottom: 6,
                      borderRadius: 12,
                      background: isOpen ? proj.accentSoft : "#fff",
                      border: `1.5px solid ${isOpen ? proj.accent + "28" : "#F1F5F9"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1E293B" }}>{s.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 14, background: stInfo.bg, color: stInfo.color }}>{s.duration}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#CBD5E1", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: proj.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sonuç →</span>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>{s.result}</span>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${proj.accent}12` }}>
                        <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
                        {s.docs.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                            {s.docs.map((d, j) => (
                              <span key={j} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 7, background: "#fff", border: "1px solid #E2E8F0", color: "#64748B", fontWeight: 500 }}>📄 {d}</span>
                            ))}
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
          <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 14, padding: 18 }}>
            <GanttMini steps={steps} accent={proj.accent} accentMid={proj.accentMid} />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 28, padding: "12px 0", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#CBD5E1" }}>Roadmaps Modülü</span>
          <div style={{ display: "flex", gap: 12 }}>
            {[{ c: "#16A34A", l: "Tamamlandı" },{ c: "#D97706", l: "Devam Ediyor" },{ c: "#CBD5E1", l: "Bekliyor" }].map((x, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: x.c }} />
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
