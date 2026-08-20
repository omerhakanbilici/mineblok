# Mineblok

Mineblok, küçük çocukların tek başına veya bir yetişkinle oynayabilmesi için hazırlanmış, Türkçe ve tam ekran çalışan bir blok dünyası oyunudur. Oyuncu 100 × 100 blokluk dünyayı gezer, yıldız toplar, blok ekleyip kaldırır, hayvanlarla karşılaşır ve kırmızı düşmanlara karşı kılıcını kullanır.

Ana canlı sürüm (Render): [mineblok.onrender.com](https://mineblok.onrender.com/)

İkincil canlı sürüm (OpenAI Sites): [mineblok.hakanbil.chatgpt.site](https://mineblok.hakanbil.chatgpt.site/)

Kaynak kod: [github.com/omerhakanbilici/mineblok](https://github.com/omerhakanbilici/mineblok)

Site herkese açıktır. Oyuncular ChatGPT hesabı açmadan veya giriş yapmadan misafir olarak doğrudan oynayabilir. Oyunda kullanıcı hesabı, backend ya da sunucuda tutulan kişisel veri bulunmaz.

## Oyunun özellikleri

- Oyuncuyu ekranda tutan, hareketle beraber kayan kamera
- Fare, dokunma, yön paneli, ok tuşları ve WASD ile hareket
- Kareden kareye akıcı yürüyüş; çıkış ve iniş için farklı beden hareketleri
- Yürürken de kullanılabilen zıplama ve daha yükseğe çıkaran ikinci zıplama
- Sağ üstte gerçek çizim hızını renklerle gösteren FPS sayacı
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
| Zıpla / çift zıpla | Sağ alttaki **ZIPLA** düğmesine bas; havadayken tekrar bas | Boşluk tuşu; havadayken tekrar Boşluk |
| Kılıç kullan | Sağ alttaki **KILIÇ** düğmesine bas | `F` tuşu |
| Mod değiştir | **GEZ**, **YAP** veya **GERİ AL** düğmesine bas | — |
| Blok seç | **YAP** modunda açılan renklerden birini seç | — |
| Ses, sıfırlama, tam ekran | Sağ üstteki düğmeleri kullan | — |

### Kesilebilir hareket

Uzak bir bloğa basıldığında Mino hedefe doğru yol bulur; fakat oyuncu kontrolü hiçbir zaman kilitlenmez. Yürürken yeni bir harita noktası seçmek, yön paneline basmak, klavyeden başka bir yön vermek, mod değiştirmek veya kılıcı kullanmak mevcut yürüyüşü hemen keser. Mino en yakın kareye yerleşir ve yeni komutu uygular. Hareket sırasında hiçbir oyun düğmesi devre dışı bırakılmamalıdır.

### Zıplama

Zıplama yatay yürüyüşten bağımsızdır; Mino boş dururken veya bir hedefe yürürken zıplayabilir. İlk zıplama sırasında **ZIPLA** düğmesine ya da Boşluk tuşuna ikinci kez basmak daha uzun ve daha yüksek bir ikinci sıçrama başlatır. Üçüncü basış Mino yere inene kadar yeni bir sıçrama oluşturmaz. Kamera zemini izlemeye devam ettiği için Mino'nun yükseldiği açıkça görülür; gölgesi yerde kalıp küçülür.

## Savaş kuralları

- Mino'nun kılıcı menzil içindeki hayvanlara otomatik olarak vurur.
- Kırmızı bir düşmana hemen vurmak için **KILIÇ** düğmesi veya `F` tuşu kullanılabilir.
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
npm run test:render
npm run lint
```

`npm test` Sites/Cloudflare üretim derlemesini ve sunucu HTML'ini kontrol eder. `npm run test:render` Render için statik dışa aktarmayı üretir; `dist/client/index.html` ile referans verdiği tüm asset dosyalarını doğrular. Büyük bir görsel değişiklikte oyunu hem geniş masaüstü görünümünde hem de dar mobil görünümünde ayrıca elle deneyin.

## Teknik yapı

- React 19 + TypeScript
- vinext ve Vite
- HTML Canvas 2D çizim döngüsü
- Web Audio API ile kısa, üretilmiş ses efektleri
- Render Static Site üzerinde ana, sunucusuz yayın hedefi
- Cloudflare Workers tabanlı OpenAI Sites üzerinde ikincil public yayın hedefi

Oyunun veritabanı veya kullanıcı hesabına bağlı kalıcı kaydı yoktur. Dünya, canlılar, can ve yıldız sayısı sayfa belleğinde tutulur; yenileme veya sıfırlama yeni bir oyun başlatır.

## Tablet performansı

Çiçek ve yıldız hareketleri tek başına ana darboğaz değildir. Eski çizim yolunda önbellekteki arazi yine her animasyon karesinde tam ekran Canvas'a kopyalanıyor, Canvas çözünürlüğü `1x` altına düşemiyor ve HUD üzerindeki bulanıklıklar hareketli sahneyi tekrar işliyordu. Bu maliyet özellikle yüksek çözünürlüklü Android ve Fire OS tabletlerde belirgindir.

- Arazi/çiçekler ile karakter/canlı/efekt çizimleri iki ayrı Canvas katmanıdır. Arazi katmanı her karede kopyalanmaz; kamera hareketinde GPU destekli CSS dönüşümüyle kaydırılır.
- Arazi ancak kamera yaklaşık iki blok ilerlediğinde, ekran profili değiştiğinde veya dünya düzenlendiğinde yeniden hazırlanır.
- Blok yüzleri her arazi yenilemesinde çokgenlerden tekrar üretilmek yerine küçük bir sprite atlasından çizilir.
- Dokunmatik tablet profili 30 FPS, en fazla `0.8x` ölçek ve yaklaşık 650 bin hareketli Canvas pikseli hedefler. Düşük CPU/bellek bildiren, çizimi yavaş kalan veya ölçülen hızı 24 FPS'in altında kalan cihazlar otomatik olarak 20 FPS, `0.6x` ve 420 bin piksel profiline iner.
- Düşük güçlü profiller gerektiğinde `0.45x` ölçeğe kadar inebilir; bu, yüksek çözünürlüklü tabletlerde kesintisiz hareketi keskinlikten öncelikli tutar.
- Çiçekler ve tabletlerde yıldız süs animasyonu sabittir. Karakter yürüyüşü, hayvanlar, düşmanlar ve oyun efektleri hareket etmeye devam eder.
- Dokunmatik cihazlarda hareketli Canvas üzerinde pahalı `backdrop-filter` bulanıklıkları kapatılır; kontroller daha opak fakat aynı yerleşimde kalır.
- Sekme görünür değilken çizim yapılmaz; oyun başlamadan önce düşük güçlü cihazlarda yalnızca gerekli ilk kare çizilir.
- Sağ üstteki sayaç gerçek çizilen kareleri ölçer: 20 altı kırmızı, 20–29 turuncu, 30–34 sarı, 35 ve üzeri yeşildir.

Bu sınırları kaldırmayın veya mobil cihazlarda sınırsız `devicePixelRatio` kullanmayın. Görsel kaliteyi artırmak gerekirse önce tabletlerde ölçüm yapın; kararlı hareket, ek çözünürlükten daha önemlidir.

### Önemli dosyalar

| Dosya | Sorumluluk |
| --- | --- |
| `app/BlockGardenWorld.tsx` | Dünya üretimi, hareket, kamera, çizim, canlılar, savaş, giriş kontrolleri ve HUD |
| `app/world.css` | Tam ekran yerleşim, oyun içi kontroller ve responsive görünüm |
| `app/page.tsx` | Ana sayfaya oyunu bağlar |
| `app/layout.tsx` | Sayfa metadatası ve global stil bağlantısı |
| `tests/rendered-html.test.mjs` | Derlenmiş sayfa ve kritik oyun davranışları için regresyon kontrolleri |
| `tests/render-static.test.mjs` | Render statik çıktısının HTML ve asset bütünlüğünü kontrol eder |
| `.openai/hosting.json` | Var olan Sites projesinin kimliği ve kaynak tanımı |
| `render.yaml` | Render Static Site build, yayın dizini ve otomatik deploy tanımı |
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

## İki farklı build hedefi

- `npm run build:render`: Ana yayın hedefi Render için `RENDER_STATIC_EXPORT=true` ile tamamen statik sürümü üretir. Render'ın yayın dizini `dist/client` olur.
- `npm run build`: İkincil yayın hedefi OpenAI Sites/Cloudflare Worker paketini üretir.

Render koşulu `next.config.ts` içindeki `output: "export"` ayarını yalnızca statik build sırasında açar. `vite.config.ts` de bu build sırasında Sites ve Cloudflare eklentilerini devre dışı bırakır. Bu ayrımı kaldırmayın; aksi halde bir yayın hedefini düzeltirken diğerini bozabilirsiniz.

## Render'a yayınlama (ana hedef)

Mineblok'un ana canlı adresi [mineblok.onrender.com](https://mineblok.onrender.com/)'dur. `render.yaml`, GitHub'daki `omerhakanbilici/mineblok` reposunun `main` dalını ücretsiz bir Static Site olarak tanımlar:

- Build komutu: `npm run build:render`
- Yayın dizini: `dist/client`
- Otomatik yayın: `main` dalına gelen her commit

Render GitHub App erişimi yalnızca kişisel `omerhakanbilici/mineblok` reposuyla sınırlı tutulmalıdır. GitHub bağlantısı kurulduktan sonra sonraki Mineblok commit'leri Render'a otomatik deploy edilir. Oyun backend kullanmadığı için Free Web Service açmayın; Static Site kullanın.

Dokümantasyonda ve kullanıcıya yapılan teslimlerde Render adresini ana yayın olarak önce verin; OpenAI Sites adresini ikincil yayın olarak ayrıca belirtin.

## OpenAI Sites'a yayınlama (ikincil hedef)

İkincil public yayın [mineblok.hakanbil.chatgpt.site](https://mineblok.hakanbil.chatgpt.site/) adresindedir. Bu depo mevcut Mineblok Sites projesine bağlıdır. Yayınlama yapan agent veya geliştirici:

1. `npm test` ve `npm run lint` çalıştırır.
2. Yalnızca amaçlanan dosyaları commit eder ve Sites kaynak deposuna aynı commit SHA'sını gönderir.
3. Sites paketleme yardımcısıyla aynı çalışma ağacından arşiv üretir.
4. `.openai/hosting.json` içindeki mevcut `project_id` için yeni site sürümünü kaydeder.
5. Mevcut **public** erişimi koruyarak yayınlar ve durum `succeeded` olana kadar kontrol eder.
6. Canlı adresi açıp teslim eder.

Her iki yayın da misafir erişimine açık kalmalıdır; kullanıcı açıkça istemedikçe siteleri yeniden giriş zorunlu veya private hale getirmeyin. Kimlik bilgilerini, geçici kaynak-depo erişim anahtarlarını veya yayın tokenlarını dosyaya, loga ya da dokümantasyona yazmayın.
