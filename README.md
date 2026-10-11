# Türkiye Deprem Olasılık Haritası (Earthquake Probability Mapper – Turkey)

**Versiyon:** 1.0  
**Canlı Uygulama (GitHub Pages):** [https://mserman90.github.io/turkey-earthquake-mapper/](https://mserman90.github.io/turkey-earthquake-mapper/)  
**Canlı Veri & Telemetri Sağlayıcı:** [UDES (UdesQuake) – https://udesquake.com.tr](https://udesquake.com.tr)  
**Lisans:** MIT  

Türkiye’deki aktif fay segmentleri için bilimsel tekrarlanma (**renewal**) modellerine dayalı zamana-bağımlı koşullu deprem olasılıklarını hesaplayan, belirsizlik aralıklarını (**Monte Carlo / Parametre Varyasyonu**) ve **Sismik Boşluk (Seismic Gap)** skorlarını görselleştiren, aynı zamanda gerçek zamanlı **UDES (UdesQuake) API** verilerini entegre eden modern web uygulaması.

> **BİLİMSEL UYARI:** Bu uygulama kesin deprem tahmini (gün, saat, büyüklük) yapmaz. Gösterilen tüm sonuçlar bilimsel yenilenme modellerine (BPT, Lognormal, Weibull, Poisson) dayalı koşullu olasılıklardır: $P(t < T \le t + \Delta t \mid T > t)$.

---

## Özellikler

1. **Bilimsel Olasılık Hesaplama Motoru (`src/lib/probabilityEngine.ts`)**:
   - **Brownian Passage Time (BPT / Inverse Gaussian)** (Varsayılan, Matthews et al., 2002)
   - **Lognormal Renewal Model**
   - **Weibull Hazard Model**
   - **Poisson (Zaman-Bağımsız Referans Model)** ve **Olasılık Kazancı (Probability Gain)**
   - **10 / 30 / 50 Yıllık** projeksiyon pencereleri ($\Delta t$) ve **Mw ≥ 6.5 / 7.0 / 7.5** büyüklük eşikleri
   - **%90 Güven Aralığı (P5–P95)** paleosismik parametre belirsizlik analizi ve **Sismik Boşluk Skoru (0–100)**
2. **Gerçek Zamanlı UDES (UdesQuake) API Entegrasyonu (`src/services/udesQuakeApi.ts` & `server/proxyServer.mjs`)**:
   - `/api/status`, `/api/events`, `/api/seismic_history` entegrasyonu
   - CORS, Rate-Limit koruması (100 req/dk anahtarsız, 500 req/dk `X-API-Key` ile), 429 Exponential Backoff ve 5xx önbellek (cache) yedeklemesi
   - 40 saniyelik otomatik canlı deprem yenilemesi
3. **İnteraktif Türkiye Haritası (`src/components/TurkeySeismicMap.tsx`)**:
   - Ücretsiz ve API anahtarı gerektirmeyen (**keyless**) **OpenStreetMap** harita altyapısı (Koyu / Açık tema filtreli)
   - MTA Diri Fay Haritası ve paleosismoloji literatürüyle uyumlu **12 ana aktif fay segmenti** (KAF Kuzey/Orta Kol, Yedisu, Erzincan-Niksar, DAF Palu-Bingöl, Pazarcık-Amanos, İzmir-Tuzla, Büyük Menderes, Tuz Gölü-Ecemiş)
   - **Zaman Kaydırıcı (Scenario Time Slider):** Bugünden +50 yıla kadar (2026–2076) senaryo simülasyonu
   - **Veri Dışa Aktarma:** GeoJSON, CSV tablosu ve yüksek çözünürlüklü Harita PNG çıktısı
   - **Türkçe / İngilizce** çift dil desteği ve **Koyu / Açık (Dark / Light)** tema

---

## Teşekkürler (Acknowledgments)

Bu açık kaynaklı bilimsel farkındalık ve görselleştirme projesinin hayata geçirilmesinde veri, altyapı, harita ve akademik literatür katkısı sağlayan tüm kurum ve araştırmacılara içtenlikle teşekkür ederiz:

- **UDES (UdesQuake) Ekibi ve Platformu ([udesquake.com.tr](https://udesquake.com.tr)):** Türkiye ve çevresindeki çok kaynaklı gerçek zamanlı sismik verileri tekilleştirerek (deduplication), bölgesel sismik geçmiş analizleriyle birlikte yüksek hızlı ve güvenilir bir API ([api.udesquake.com.tr](https://api.udesquake.com.tr/api/status)) üzerinden sundukları için **özel teşekkürlerimizi** sunarız.
- **Maden Tetkik ve Arama Genel Müdürlüğü (MTA):** Türkiye Yenilenmiş Diri Fay Haritaları ve aktif tektonik segmentasyon verileri için.
- **AFAD Deprem Dairesi Başkanlığı & Boğaziçi Üniversitesi Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü (KOERI) & EMSC:** Ulusal ve bölgesel sismolojik gözlem ağları ve deprem katalogları için.
- **OpenStreetMap Vakfı ve Katkıda Bulunanlar:** Açık, ücretsiz ve anahtarsız (keyless) küresel harita altyapısı için.
- **Paleosismoloji ve Aktif Tektonik Araştırmacıları:** Anadolu levhası ve sınır faylarının kayma hızlarını ve tekrarlanma periyotlarını hendek (trench) ve jeodezik çalışmalarla ortaya koyan tüm bilim insanlarına teşekkür ederiz.

---

## Yararlanılan Kaynaklar ve Bağlantılar

### 1. Canlı Sismik Veri, Harita ve Kurumsal Kaynaklar
| Kaynak / Kurum | Açıklama | Bağlantı |
| :--- | :--- | :--- |
| **UDES (UdesQuake)** | Gerçek Zamanlı Deprem Takip, Erken Uyarı ve Çoklu-Ajans Veri Platformu | [https://udesquake.com.tr](https://udesquake.com.tr) |
| **UDES (UdesQuake) API** | Canlı Depremler (`/api/events`), Sistem Durumu (`/api/status`) ve Bölgesel Geçmiş (`/api/seismic_history`) | [https://api.udesquake.com.tr/api/status](https://api.udesquake.com.tr/api/status) |
| **MTA Genel Müdürlüğü** | Türkiye Yenilenmiş Diri Fay Haritaları ve Yerbilimleri Portalı | [https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari](https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari) |
| **AFAD** | T.C. İçişleri Bakanlığı Afet ve Acil Durum Yönetimi Başkanlığı – Deprem Katalogları | [https://deprem.afad.gov.tr](https://deprem.afad.gov.tr) |
| **Kandilli Rasathanesi (KOERI)** | Boğaziçi Üniversitesi Bölgesel Deprem-Tsunami İzleme ve Değerlendirme Merkezi | [http://www.koeri.boun.edu.tr/scripts/lst5.asp](http://www.koeri.boun.edu.tr/scripts/lst5.asp) |
| **EMSC (CSEM)** | Avrupa-Akdeniz Sismoloji Merkezi (European-Mediterranean Seismological Centre) | [https://www.emsc-csem.org](https://www.emsc-csem.org) |
| **OpenStreetMap (OSM)** | Ücretsiz ve Açık Kaynaklı Harita Karoları | [https://www.openstreetmap.org/copyright](https://www.openstreetmap.org/copyright) |

### 2. Bilimsel ve Paleosismolojik Literatür Referansları
- **Matthews, M. V., Ellsworth, W. L., & Reasenberg, P. A. (2002).** *A Brownian model for recurrent earthquakes.* Bulletin of the Seismological Society of America (BSSA), 92(6), 2233–2250. [DOI: 10.1785/0120010267](https://doi.org/10.1785/0120010267)
- **Emre, Ö., Duman, T. Y., Özalp, S., Şaroğlu, F., Olgun, Ş., Elmacı, H., & Çan, T. (2018).** *Active fault database of Turkey.* Bulletin of Earthquake Engineering, 16(8), 3229–3275. [DOI: 10.1007/s10518-016-0041-2](https://doi.org/10.1007/s10518-016-0041-2)
- **Parsons, T. (2004).** *Recalculated probability of M ≥ 7 earthquakes beneath the Sea of Marmara, Turkey.* Journal of Geophysical Research: Solid Earth, 109(B5). [DOI: 10.1029/2003JB002667](https://doi.org/10.1029/2003JB002667)
- **Murru, M., Akinci, A., Falcone, G., Pucci, S., Console, R., & Parsons, T. (2016).** *M ≥ 7 earthquake rupture forecast and time-dependent probability for the Sea of Marmara region, Turkey.* Scientific Reports, 6(1), 29100. [DOI: 10.1038/srep29100](https://doi.org/10.1038/srep29100)
- **Barka, A. (1996).** *Slip distribution along the North Anatolian Fault associated with the large earthquakes of the period 1939 to 1967 in Turkey.* Annali di Geofisica, 39(5), 1009–1028.
- **Rockwell, T., Ragona, D., Seitz, G., Langridge, R., Aksoy, M. E., Uçarkuş, G., ... & Barka, A. (2009).** *Paleoseismology of the North Anatolian Fault near the Marmara Sea: implications for fault segmentation and seismic hazard.* Geological Society, London, Special Publications, 316(1), 31–54. [DOI: 10.1144/SP316.3](https://doi.org/10.1144/SP316.3)
- **Güvercin, S. E., Karabulut, H., Konca, A. Ö., Doğan, U., & Ergintav, S. (2022).** *Active seismotectonics of the East Anatolian Fault.* Geophysical Journal International, 230(1), 50–69. [DOI: 10.1093/gji/ggac045](https://doi.org/10.1093/gji/ggac045)
- **Hubert-Ferrari, A., Lamair, L., Yamamoto, S., Fujiwara, O., & Garrett, E. (2020).** *A 3800 yr paleoseismic record along the North Anatolian Fault, Turkey.* Earth and Planetary Science Letters, 538, 116152. [DOI: 10.1016/j.epsl.2020.116152](https://doi.org/10.1016/j.epsl.2020.116152)

---

## Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın (Vite Proxy ile UdesQuake API otomatik bağlanır)
npm run dev

# Unit & Entegrasyon testlerini çalıştırın
npx vitest run

# Production derlemesi oluşturun
npm run build

# Opsiyonel: Bağımsız Express Proxy sunucusunu başlatın (Port 8787)
node server/proxyServer.mjs
```

## Ortam Değişkenleri (`.env.example`)

```env
VITE_API_PROXY_URL=/api
VITE_UDESQUAKE_API_KEY=
UDESQUAKE_API_KEY=
```
