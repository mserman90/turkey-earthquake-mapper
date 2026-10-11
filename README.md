# Türkiye Deprem Olasılık Haritası (Earthquake Probability Mapper – Turkey)

**Versiyon:** 1.0  
**Lisans:** MIT  

Türkiye’deki aktif fay segmentleri için bilimsel tekrarlanma (**renewal**) modellerine dayalı zamana-bağımlı koşullu deprem olasılıklarını hesaplayan, belirsizlik aralıklarını (**Monte Carlo / Parametre Varyasyonu**) ve **Sismik Boşluk (Seismic Gap)** skorlarını görselleştiren, aynı zamanda gerçek zamanlı **UdesQuake API** verilerini entegre eden modern web uygulaması.

> **BİLİMSEL UYARI:** Bu uygulama kesin deprem tahmini (gün, saat, büyüklük) yapmaz. Gösterilen tüm sonuçlar bilimsel yenilenme modellerine (BPT, Lognormal, Weibull, Poisson) dayalı koşullu olasılıklardır.

---

## Özellikler

1. **Bilimsel Olasılık Hesaplama Motoru (`src/lib/probabilityEngine.ts`)**:
   - **Brownian Passage Time (BPT / Inverse Gaussian)** (Varsayılan, Matthews et al., 2002)
   - **Lognormal Renewal Model**
   - **Weibull Hazard Model**
   - **Poisson (Zaman-Bağımsız Referans Model)** ve **Olasılık Kazancı (Probability Gain)**
   - **10 / 30 / 50 Yıllık** projeksiyon pencereleri ($\Delta t$) ve **Mw ≥ 6.5 / 7.0 / 7.5** büyüklük eşikleri
   - **%90 Güven Aralığı (P5–P95)** paleosismik parametre belirsizlik analizi ve **Sismik Boşluk Skoru (0–100)**
2. **Gerçek Zamanlı UdesQuake API Entegrasyonu (`src/services/udesQuakeApi.ts` & `server/proxyServer.mjs`)**:
   - `/api/status`, `/api/events`, `/api/seismic_history` entegrasyonu
   - CORS, Rate-Limit koruması (100 req/dk anahtarsız, 500 req/dk `X-API-Key` ile), 429 Exponential Backoff ve 5xx önbellek (cache) yedeklemesi
   - 40 saniyelik otomatik canlı deprem yenilemesi
3. **İnteraktif Türkiye Haritası (`src/components/TurkeySeismicMap.tsx`)**:
   - MTA Diri Fay Haritası ve paleosismoloji literatürüyle uyumlu **12 ana aktif fay segmenti** (KAF Kuzey/Orta Kol, Yedisu, Erzincan-Niksar, DAF Palu-Bingöl, Pazarcık-Amanos, İzmir-Tuzla, Büyük Menderes, Tuz Gölü-Ecemiş)
   - **Zaman Kaydırıcı (Scenario Time Slider):** Bugünden +50 yıla kadar (2026–2076) senaryo simülasyonu
   - **Veri Dışa Aktarma:** GeoJSON, CSV tablosu ve yüksek çözünürlüklü Harita PNG çıktısı
   - **Türkçe / İngilizce** çift dil desteği ve **Koyu / Açık (Dark / Light)** tema

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
