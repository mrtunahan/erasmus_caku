# Dağıtım notları

Bu dosya, canlı sunucuda (`/var/www/erasmus_caku`) dağıtım yaparken
bilinmesi gerekenleri toplar. Her madde, yaşanmış bir aksaklıktan çıktı.

## Sıra

```bash
cd /var/www/erasmus_caku
cp /etc/nginx/sites-enabled/caku-erasmus ~/nginx.yedek        # nginx'e dokunacaksanız
mongodump --db erasmus_caku --out ~/yedek-$(date +%s)         # veri değişecekse

git pull
npm install
npm run build

pm2 restart erasmus_caku      # sunucu kodu değiştiyse
pm2 logs erasmus_caku --lines 30 --nostream
```

## nginx: iki tuzak

**1. `sites-enabled/caku-erasmus` bir SYMLINK DEĞİL, ayrı bir kopyadır.**

```
-rw-r--r--  caku-erasmus                       ← gerçek dosya, CANLI OLAN BU
lrwxrwxrwx  dolcefarniente -> ...              ← (diğer site symlink)
```

`sites-available/` altındakini düzenlemek **hiçbir şey yapmaz**. nginx
`include /etc/nginx/sites-enabled/*;` ile yalnız `sites-enabled` kopyasını
okur. Bir dağıtımda bu iki tur kaybettirdi.

`ssl-setup/nginx-domain.conf` artık canlının **birebir aynası**. Ayrışmayı
kökten bitirmek için `sites-enabled`'ı symlink'e çevirin — ama önce farkın
gerçekten boş olduğunu doğrulayın:

```bash
cp /etc/nginx/sites-enabled/caku-erasmus ~/nginx.yedek
cp /var/www/erasmus_caku/ssl-setup/nginx-domain.conf /etc/nginx/sites-available/caku-erasmus
diff /etc/nginx/sites-available/caku-erasmus /etc/nginx/sites-enabled/caku-erasmus
```

**`diff` çıktısında bir nginx DİREKTİFİ farkı varsa durun** — canlıda repoda
olmayan bir değişiklik var demektir; önce onu repoya taşıyın. Yalnız yorum
satırı farkı çıkması normaldir (repo dosyası kendini açıklayan bir başlık
taşır); yorumlar davranışı etkilemez. Direktifler aynıysa:

```bash
rm /etc/nginx/sites-enabled/caku-erasmus
ln -s /etc/nginx/sites-available/caku-erasmus /etc/nginx/sites-enabled/caku-erasmus
nginx -t && systemctl restart nginx
```

Bundan sonra tek gerçek kaynak repo olur: `git pull` + `cp` + `restart`.

Değişiklik yaptığınızda gerçekten yüklendiğini **ölçerek** doğrulayın:

```bash
nginx -T 2>/dev/null | grep -c "aradığınız-satır"
```

**2. `location` değişikliğinde `reload` yetmeyebilir.**

`systemctl reload nginx` çalıştı, `nginx -T` yeni bloğu gösterdi, ama
istekler eski yapılandırmayla karşılanmaya devam etti. `systemctl restart
nginx` ile düzeldi. `location` ekleyip çıkarırken doğrudan `restart`
kullanın ve ölçerek doğrulayın:

```bash
systemctl restart nginx && sleep 3
curl -s https://offlineasistan.com.tr/ | wc -c
```

## Yol düzeni

- `/` → `dist/tanitim.html` (tanıtım sayfası, React yüklemez, ~18 kB)
- `/panel` → `dist/index.html` (uygulama)
- `/assets/...`, `/logo.png` → statik varlıklar
- `/api/`, `/socket.io/` → Express (127.0.0.1:3001)

İlgili nginx blokları (`location = /`, `location /panel`) artık
`ssl-setup/nginx-domain.conf` içinde tanımlı.

**Uygulama içindeki varlık yolları MUTLAK olmalı** (`/logo.png`,
`/assets/...`). Göreli yol (`logo.png`) kökte çalışır ama `/panel/`
altında `/panel/logo.png`'ye çözülüp 404 verir.

Hash rotaları (`#erasmus`) sunucuya hiç gitmez; nginx onları yönlendiremez.
Eski `/#erasmus` yer imleri `public/tanitim.html` içindeki küçük betikle
`/panel/#erasmus` adresine taşınır.

## tenant_config

Koleksiyon **boş** olabilir; o zaman `window.TENANT` içindeki kod
varsayılanları geçerlidir. Kısmi kayıt güvenlidir — uygulama yalnızca dolu
gelen alanları varsayılanın üstüne yazar:

```bash
mongosh erasmus_caku --eval 'db.tenant_config.updateOne({_docId:"main"},{$set:{
  kvkkAdres:"...", kvkkEposta:"...", kvkkKep:"..."}},{upsert:true})'
```

KVKK aydınlatma metninin başvuru bölümü bu alanlardan doldurulur; boşken
metin `[kurum tarafından doldurulacak]` der ve pencerede uyarı çıkar.

## Doğrulama

```bash
curl -s  https://offlineasistan.com.tr/            | wc -c    # 18265 civarı (tanıtım)
curl -sI https://offlineasistan.com.tr/            | grep -i cache-control   # max-age=300
curl -sI https://offlineasistan.com.tr/panel/      | head -1  # 200
curl -sI https://offlineasistan.com.tr/logo.png    | head -1  # 200
curl -sI https://offlineasistan.com.tr/api/health  | head -1  # 200
```

Kökten dönen boyut ~19.100 ise **uygulamanın index.html'i** geliyordur,
tanıtım değil — nginx bloğu devrede değil demektir.

## Geri alma

```bash
cp ~/nginx.yedek /etc/nginx/sites-enabled/caku-erasmus
nginx -t && systemctl restart nginx
```
