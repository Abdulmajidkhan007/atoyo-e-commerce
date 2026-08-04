# Tezkor qidiruv (Typesense)

Kod tayyor: `TYPESENSE_HOST` va `TYPESENSE_API_KEY` qo'yilsa sayt
qidiruvni motordan oladi, qo'yilmasa avvalgidek Firestore'dan qidiradi.
Ya'ni yoqish/o'chirish — bitta env masalasi, kod o'zgarmaydi.

## Kerak bo'ladimi?

Hozircha **yo'q**. Firestore qidiruvi tokenlar bilan ishlaydi va
mahsulot 1000 tagacha bo'lganda sezilarli sekinlashmaydi. Motor
quyidagilar paydo bo'lganda kerak:

- mahsulot 2000+ ga yetdi va qidiruv sekinlashdi;
- mijozlar xato yozganda topilmayapti ("smesitl", "радиатр");
- ahamiyat bo'yicha saralash kerak (eng mos mahsulot birinchi).

## Qayerda ishlatish

| Yo'l | Narx | Izoh |
|---|---|---|
| **Typesense Cloud** | ~20-25 $/oy | 5 daqiqada tayyor, hech narsa boshqarmaysiz |
| **Oracle Cloud (Always Free)** | **0 $** | 4 ARM yadro, 24 GB RAM doimiy bepul; o'zingiz o'rnatasiz |
| Oddiy VPS | 4-6 $/oy | Har qanday provayder, 1 GB RAM yetadi |

Pul cheklangan bo'lsa **Oracle Always Free** — eng to'g'ri variant.

## O'zi hostlangan holda o'rnatish (Docker)

Serverda (Ubuntu):

```bash
# 1) Docker
curl -fsSL https://get.docker.com | sh

# 2) Typesense (parolni O'ZGARTIRING)
docker run -d --name typesense --restart unless-stopped \
  -p 8108:8108 \
  -v /var/lib/typesense:/data \
  typesense/typesense:27.1 \
  --data-dir /data \
  --api-key='BU_YERGA_UZUN_MAXFIY_KALIT' \
  --enable-cors

# 3) Ishlayotganini tekshirish
curl http://localhost:8108/health
# {"ok":true}
```

⚠️ 8108 portini internetga ochiq qoldirmang — oldiga Caddy/Nginx qo'yib
HTTPS bilan yoping (`https://search.atoyo.uz` kabi). Eng qisqa yo'li —
Caddy:

```bash
# /etc/caddy/Caddyfile
search.atoyo.uz {
  reverse_proxy localhost:8108
}
```

## Saytga ulash

`apphosting.yaml` ga:

```yaml
  - variable: TYPESENSE_HOST
    value: search.atoyo.uz          # yoki xxx.a1.typesense.net
    availability: [RUNTIME]
  - variable: TYPESENSE_API_KEY
    secret: TYPESENSE_API_KEY       # Secret Manager orqali
    availability: [RUNTIME]
  - variable: TYPESENSE_COLLECTION  # ixtiyoriy, standart "products"
    value: products
    availability: [RUNTIME]
```

Kalitni sirga qo'yish — `docs/DEPLOY.md` dagi tartib bilan bir xil.

## Indeksni to'ldirish

Deploy tugagach **bir marta**: admin panel → Katalog → **«Qidiruv
indeksini to'ldirish»** (yoki `POST /api/admin/products/search-index`).
Shundan keyin mahsulot yaratilganda/tahrirlanganda indeks o'zi
yangilanadi, o'chirilganda esa indeksdan chiqadi.

Motor javob bermay qolsa sayt jimgina Firestore qidiruviga qaytadi —
mijoz uchun qidiruv baribir ishlayveradi.
