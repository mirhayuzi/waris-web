# Waris – laman web

Laman web aplikasi Waris (waris.com.my) dan **Waris Web**, penonton salasilah untuk iPhone dan komputer.

- `index.html`, `panduan.html`, `soalan-lazim.html`, `privasi.html`: laman utama (BM + EN)
- `web/`: Waris Web. Fail keluarga dibuka dalam pelayar sahaja; tiada apa-apa dimuat naik.
- `src/`: kod sumber Waris Web. Ia menggunakan semula kod salasilah app Waris (`waris-geneology-v2/lib`).

Bina semula `web/viewer.js` (repo app Waris di sebelah folder ini):

```
../waris-geneology-v2/node_modules/.bin/esbuild src/viewer.ts --bundle --minify --format=iife --target=es2019,safari13 --outfile=web/viewer.js
```
