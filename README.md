# Mineblok

Mineblok, küçük çocukların tek başına veya bir yetişkinle oynayabilmesi için hazırlanmış, Türkçe ve tam ekran çalışan bir blok dünyası oyunudur. Oyuncu 100 × 100 blokluk dünyayı gezer, yıldız toplar, blok ekleyip kaldırır, hayvanlarla karşılaşır ve kırmızı düşmanlara karşı kılıcını kullanır.

Canlı sürüm: [mineblok.hakanbil.chatgpt.site](https://mineblok.hakanbil.chatgpt.site/)

## Oyunun özellikleri

- Oyuncuyu ekranda tutan, hareketle beraber kayan kamera
- Fare, dokunma, yön paneli, ok tuşları ve WASD ile hareket
- Kareden kareye akıcı yürüyüş; çıkış ve iniş için farklı beden hareketleri
- Kesintisiz yıldız toplama ve ekranda toplam yıldız sayacı
- Koyun, civciv, inek, domuz ve tavşanlardan oluşan hareketli hayvanlar
- 100 canla başlayan, kırmızı düşmanlara karşı çalışan basit savaş sistemi
- Blok ekleme ve geri alma modları
- Tamamen Canvas 2D ile çizilen Minecraft esintili karakterler ve dünya
- Masaüstü ve mobil ekranlara uyumlu, oyun alanının içinde kalan kontroller

## Kontroller

| Eylem | Fare / dokunma | Klavye |
| --- | --- | --- |
| Bir yere git | Haritadaki hedef bloğa bas | Ok tuşları veya WASD |
| Bir blok ilerle | Sol alttaki yön paneline bas | Ok tuşları veya WASD |
| Kılıç kullan | Sağ alttaki **KILIÇ** düğmesine bas | Boşluk tuşu |
| Mod değiştir | **GEZ**, **YAP** veya **GERİ AL** düğmesine bas | — |
| Blok seç | **YAP** modunda açılan renklerden birini seç | — |
| Ses, sıfırlama, tam ekran | Sağ üstteki düğmeleri kullan | — |

### Kesilebilir hareket

Uzak bir bloğa basıldığında Mino hedefe doğru yol bulur; fakat oyuncu kontrolü hiçbir zaman kilitlenmez. Yürürken yeni bir harita noktası seçmek, yön paneline basmak, klavyeden başka bir yön vermek, mod değiştirmek veya kılıcı kullanmak mevcut yürüyüşü hemen keser. Mino en yakın kareye yerleşir ve yeni komutu uygular. Hareket sırasında hiçbir oyun düğmesi devre dışı bırakılmamalıdır.

## Savaş kuralları

- Mino'nun kılıcı menzil içindeki hayvanlara otomatik olarak vurur.
- Kırmızı bir düşmana hemen vurmak için **KILIÇ** düğmesi veya boşluk tuşu kullanılabilir.
- Oyuncu düşmanın yanında beklerse ilk saldırıyı düşman yapar: 1200 ms sonra 2 can eksilir.
- Mino, düşmanın ilk vuruşundan 520 ms sonra otomatik karşılık verir.
- Hayvanlar ve düşmanlar tek vuruşta toz efektiyle kaybolur.
- Can sıfıra inerse Mino başlangıç noktasına dönüp yeniden 100 canla devam eder.

Bu oyun 4 yaş civarındaki çocuklar düşünülerek tasarlandığı için savaş görsel olarak yumuşaktır; kan, yara veya korkutucu içerik yoktur.

## Yerelde çalıştırma

Gerekenler:

- Node.js `>=22.13.0`
- npm

Kurulum ve geliştirme:

```bash
npm install
npm run dev
```

Geliştirme sunucusu varsayılan olarak `http://localhost:3000/` adresinde açılır.

## Doğrulama

Bir değişiklikten sonra ikisini de çalıştırın:

```bash
npm test
npm run lint
```

`npm test` önce üretim derlemesini oluşturur, sonra sunucu tarafından üretilen HTML'i ve oyunun önemli kaynak sözleşmelerini kontrol eder. Büyük bir görsel değişiklikte oyunu hem geniş masaüstü görünümünde hem de dar mobil görünümünde ayrıca elle deneyin.

## Teknik yapı

- React 19 + TypeScript
- vinext ve Vite
- HTML Canvas 2D çizim döngüsü
- Web Audio API ile kısa, üretilmiş ses efektleri
- Cloudflare Workers tabanlı OpenAI Sites barındırması

Oyunun veritabanı veya kullanıcı hesabına bağlı kalıcı kaydı yoktur. Dünya, canlılar, can ve yıldız sayısı sayfa belleğinde tutulur; yenileme veya sıfırlama yeni bir oyun başlatır.

### Önemli dosyalar

| Dosya | Sorumluluk |
| --- | --- |
| `app/BlockGardenWorld.tsx` | Dünya üretimi, hareket, kamera, çizim, canlılar, savaş, giriş kontrolleri ve HUD |
| `app/world.css` | Tam ekran yerleşim, oyun içi kontroller ve responsive görünüm |
| `app/page.tsx` | Ana sayfaya oyunu bağlar |
| `app/layout.tsx` | Sayfa metadatası ve global stil bağlantısı |
| `tests/rendered-html.test.mjs` | Derlenmiş sayfa ve kritik oyun davranışları için regresyon kontrolleri |
| `.openai/hosting.json` | Var olan Sites projesinin kimliği ve kaynak tanımı |
| `AGENTS.md` | Bu projede çalışacak AI agentlar için davranış ve yayınlama sözleşmesi |

### Mimari özeti

Dünya koordinatları `{ x, y }`, karakter ve kamera koordinatları `{ x, y, z }` biçimindedir. `world[y][x]` bir blok sütunudur; dizinin son elemanı görünen yüzeydir. İzometrik ekran konumu `tileCenter` ile hesaplanır.

Animasyonun her karesinde sık değişen veriler `useRef` içinde tutulur. React state yalnızca HUD veya DOM görünümünün yeniden çizilmesi gerektiğinde kullanılır. Bu ayrım, Canvas animasyonunun her karede React render tetiklemesini önler.

Hareket akışı şöyledir:

1. Hedef, `findWalkingPath` ile yürünebilir komşu karelere ayrılır.
2. `walkRef` o anki kareler arası geçişi ve süresini saklar.
3. Çizim döngüsü karakter ile kamerayı birlikte yumuşatır.
4. Yeni komut gelirse `stopWalking` geçişin ilerlemesine göre en yakın kareyi seçer.
5. Yeni yol veya eylem bu sabit kareden başlar.

Sahne çizim sırası derinlik hissi için önemlidir: arazi ve dekorlar, yıldızlar/canlılar/düşmanlar, toz efektleri ve oyuncu ekran derinliğine göre sıralanır. Yeni bir dünya nesnesi eklerken bu sıralamayı koruyun.

## Değişiklik yaparken korunacak davranışlar

- Hareket sırasında kontrolleri `disabled` yapmayın.
- Devam eden yürüyüş varken yeni hedefi görmezden gelmeyin; `stopWalking` üzerinden kesip yeni komutu başlatın.
- Fare ve dokunma için ortak Pointer Events akışını koruyun.
- Karakter ve kamera hareketini aynı dünya pozisyonundan üretin.
- Oyun metinlerini Türkçe, kısa ve küçük bir çocuğun anlayacağı biçimde tutun.
- Savaş görsellerini oyuncak benzeri ve şiddetsiz tutun.
- Yıldız toplama için bir bitiş koşulu eklemeyin; sayaç artmaya devam etmelidir.
- Var olan `.openai/hosting.json` proje kimliğini koruyun; yeni bir Sites projesi oluşturmayın.

Daha ayrıntılı uygulama sözleşmesi için [AGENTS.md](./AGENTS.md) dosyasını okuyun.

## Yayınlama

Bu depo mevcut Mineblok Sites projesine bağlıdır. Yayınlama yapan agent veya geliştirici:

1. `npm test` ve `npm run lint` çalıştırır.
2. Yalnızca amaçlanan dosyaları commit eder ve Sites kaynak deposuna aynı commit SHA'sını gönderir.
3. Sites paketleme yardımcısıyla aynı çalışma ağacından arşiv üretir.
4. `.openai/hosting.json` içindeki mevcut `project_id` için yeni site sürümünü kaydeder.
5. Sürümü **private** olarak yayınlar ve durum `succeeded` olana kadar kontrol eder.
6. Canlı adresi açıp teslim eder.

Kimlik bilgilerini, geçici kaynak-depo erişim anahtarlarını veya yayın tokenlarını dosyaya, loga ya da dokümantasyona yazmayın.
