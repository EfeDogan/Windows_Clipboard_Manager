# Clipboard Manager

Windows tray üzerinden açılan metin ve görsel pano geçmişi. Bir kayda tıklamak içeriği panoya kopyalar ve paneli kapatır. Yapıştırma kullanıcıya aittir.

## Windows için indir ve çalıştır

**[Windows x64 için indir — v0.1.0 (ZIP)](https://github.com/EfeDogan/Windows_Clipboard_Manager/releases/download/v0.1.0/Clipboard-Manager-0.1.0-windows-x64.zip)** · [Sürüm notları](https://github.com/EfeDogan/Windows_Clipboard_Manager/releases/tag/v0.1.0)

1. Yukarıdaki bağlantıdan ZIP dosyasını indir.
2. ZIP'e sağ tıklayıp **Tümünü ayıkla** seçeneğiyle kalıcı bir klasöre çıkar.
3. Klasördeki **Clipboard Manager.exe** dosyasını çift tıklayarak aç.
4. Tray simgesine tıkla veya **Ctrl+Shift+V** kullan. Simge görünmüyorsa saatin yanındaki gizli simgeler menüsüne bak.

**Node.js, Git, terminal komutu veya ayrı bir kurulum gerekmez.** EXE'yi yanındaki dosyalardan ayırma ve doğrudan ZIP'in içinden çalıştırma.

Bu, Windows x64 için bir ön sürümdür. Paket imzasızdır ve henüz gerçek bir Windows makinesinde denenmemiştir. Klasörden çalışır; kurulum sihirbazı içermez. Uygulama arayüzü Türkçedir.

Hazır uygulama için yukarıdaki bağlantıyı veya sürüm sayfasındaki **Assets** bölümünün ZIP dosyasını kullan. GitHub'ın otomatik **Source code** arşivleri çalıştırılabilir uygulama içermez.

## Özellikler

- Metin ve PNG/JPEG/BMP/WebP görsellerin takibi; görselleri PNG olarak saklama.
- Arama, ok tuşları ve Enter ile seçim; Escape veya panel dışına tıklamayla kapanma.
- Her satırda düzenleme/görsel açma, sabitleme, kopyalama, tam içerik ve silme.
- Tekrarlanan içerik yeni kayıt oluşturmaz; son kullanılan kayıt yukarı taşınır. Sabitlenmiş kayıtlar en üstte görünür.
- Gizli kip yeni kayıtları durdurur. Kip kapatılınca o sırada panodaki gizli içerik kaydedilmez. Mevcut geçmiş silinmez.
- 50/100/200/500 kayıt sınırı; sabitler bu sayıdan hariçtir. En fazla 100 sabitlenmiş kayıt, toplam 50 MB ve tek kayıt 10 MB sınırı.
- Geçmişi temizleme işleminde sabitler varsayılan olarak korunur.
- Ayarlardan Windows başlangıcında açılma seçeneği.

Veriler `%APPDATA%/clipboard-manager/history.json` dosyasında **şifrelenmeden** tutulur. Ayarlardaki “Veri klasörünü aç” gerçek konumu gösterir. Uygulama bulut veya sunucu kullanmaz. Gizli kip otomatik parola algılama yapmaz. Metinler düz metin olarak saklanır; zengin metin, dosya kopyalama ve kaynak uygulama bilgisi ilk sürüme dahil değildir. Pano 700 ms aralıkla okunur; çok hızlı ardışık kopyalamalar kaçabilir.

## Geliştirme: kaynak koddan çalıştırma

Node.js 22.12 veya üzeri ve npm gerekir. Proje klasöründe:

```sh
npm ci
npm start
```

Uygulama tray simgesiyle başlar. Simgeye tıklayın veya **Ctrl+Shift+V** kullanın. Tray sağ tık menüsünde çıkış bulunur. Kısayol başka bir uygulamadaysa panelde bilgi gösterilir; tray kullanılabilir.

## Geliştirme: Windows paketi oluşturma

Windows makinesinde:

```sh
npm ci
npm run dist:win
```

`release/Clipboard-Manager-0.1.0-windows-x64.zip` üretilir. Windows'ta ZIP'in **tamamını bir klasöre çıkarın**, ardından `Clipboard Manager.exe` dosyasını açın. EXE'yi yanındaki dosyalardan ayırmayın. Başlangıçta çalıştıracaksanız klasörü kalıcı bir konuma yerleştirin. Paket henüz imzalı değildir; yürütülebilir dosyanın Explorer simgesi Electron'un varsayılan simgesidir, tray/pencere simgeleri uygulamaya özeldir.

Linux üzerinde Windows uygulama klasörünü üretmek için `npm run pack:win`, ZIP için `npm run dist:win` kullanılabilir. NSIS kurulumu ilk sürüme dahil değildir: bu ortamda kurulum derleyicisi `Invalid command: !addincludedir` hatası verdi. Windows'ta tray konumu, çoklu ekran/DPI, açılışta başlama ve farklı uygulamalardan kopyalama ayrıca denenmelidir.

Bağımlılık kontrolünde çalışma zamanı npm paketlerinde açık raporlanmadı; electron-builder geliştirme/paketleme bağımlılıklarında 15 orta seviye uyarı bulunuyor. Bunlar dağıtılan uygulamanın `app.asar` dosyasına alınmaz.

## Kontrol

```sh
npm test
```

Linux'ta Xvfb mevcutsa:

```sh
npm run test:smoke
```

Smoke testi geçici bir veri profili ve ayrı X ekranı kullanır; gerçek pano/metin/görsel yazıp okumayı, gizli kipi, düzenlemeyi ve arayüzü denetler. Ön izleme `test-output/panel.png` dosyasına yazılır. Bu test normal masaüstü panosunda doğrudan çalıştırılmamalıdır; `xvfb-run` ayrı ekran sağlar.
