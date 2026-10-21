# ASMR Pribadi — versi Next.js + TypeScript

Frontend pribadi untuk API asmr.one, dibuat ulang dengan **Next.js 16 (App Router)**, **React 19**, dan **TypeScript**. Fitur: daftar karya + pagination, pencarian, **filter tag (sertakan / kecualikan, mode AND atau OR)**, urutan, filter subtitle, detail karya, pohon track, pemutar (seek, kecepatan, timer tidur, lanjut dari posisi terakhir, tombol media di layar kunci HP), favorit, dan blur sampul.

> **Hanya untuk dipakai pribadi di komputermu sendiri. Jangan di-deploy ke hosting publik.**

---

## 1. Menjalankan

1. Pasang **Node.js 20.9 atau lebih baru** (disarankan LTS 22) dari https://nodejs.org.
2. Di folder proyek ini:
   ```
   npm install
   npm run dev
   ```
3. Buka http://localhost:3000. Hentikan dengan `Ctrl + C`.

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Mode pengembangan (halaman otomatis ter-update saat file diedit). Hanya bisa dibuka dari laptop ini. |
| `npm run build` lalu `npm start` | Mode produksi (lebih cepat, dipakai untuk pemakaian harian). |
| `npm run typecheck` | Periksa tipe TypeScript tanpa menjalankan aplikasi. |

> Next.js secara bawaan membuka server ke seluruh jaringan. Karena isinya konten dewasa, perintah `dev` dan `start` di `package.json` sengaja dikunci ke `127.0.0.1` (hanya laptop ini).

Catatan: kode ini **belum pernah dijalankan dengan `next dev` / `next build` sungguhan** (dibuat di lingkungan yang tidak bisa memasang paket npm). Yang sudah diuji: tipe TypeScript (dengan tipe tiruan untuk react/next), route handler dan logika filter/pencarian terhadap server asal tiruan, dan komponen `SearchBar`/`TagPicker` yang dijalankan dengan React asli di browser. Halaman server (`app/page.tsx`) dan audio sungguhan belum diuji. Kalau ada error saat pertama kali jalan, salin pesannya; kemungkinan besar perbaikannya kecil.

---

## 2. Apa yang berbeda dari versi lama?

| Versi lama | Versi ini |
|---|---|
| `server.js` (Express) + `public/` | Satu proyek Next.js. Backend dan frontend ada dalam satu aplikasi. |
| Tiap rute dibuat manual dengan Express | **Route Handlers**: file `route.ts` di dalam `app/` otomatis menjadi endpoint. |
| Semua data diambil dari browser lewat `fetch` | Daftar karya diambil **di server** (Server Component), jadi halaman sudah berisi data saat sampai di browser. |
| JavaScript biasa | TypeScript: kesalahan seperti salah ketik nama field ketahuan di editor. |
| Satu file `app.js` besar | Dipecah menjadi komponen React kecil. |

Proxy untuk daftar karya dan pencarian **tidak diperlukan lagi**: karena dipanggil dari server, tidak ada masalah CORS. Route handler hanya tersisa untuk tiga hal yang memang harus lewat server kita: daftar track, gambar sampul, dan stream audio.

---

## 3. Konsep Next.js yang dipakai (baca sekali)

**App Router.** Struktur folder `app/` = struktur alamat web.
- `app/page.tsx` → halaman `/`
- `app/favorites/page.tsx` → halaman `/favorites`
- `app/layout.tsx` → bungkus semua halaman (header + pemutar ada di sini)
- `app/api/tracks/[id]/route.ts` → endpoint `GET /api/tracks/123` (`[id]` = bagian yang berubah-ubah)

**Server Component vs Client Component.** Ini konsep terpenting.
- Secara default semua komponen adalah **Server Component**: berjalan di server, boleh langsung `await` data, tidak boleh memakai `useState`, `useEffect`, atau event klik. Contoh: `app/page.tsx`, `Pager.tsx`, `Header.tsx`.
- Komponen yang butuh interaksi (klik, state, `localStorage`, `<audio>`) harus diawali `"use client"` di baris pertama. Contoh: `SearchBar`, `WorkGrid`, `WorkDialog`, `PlayerProvider`.
- Aturan praktis: **mulai dengan Server Component; tambahkan `"use client"` hanya kalau memang perlu interaksi.**

**State di URL.** Pencarian, urutan, dan halaman disimpan di alamat (`/?q=kata&order=release&page=2`). `SearchBar` hanya mengubah URL, lalu Next.js otomatis memuat ulang data. Keuntungannya: bisa di-bookmark dan tombol Back berfungsi.

**Context.** `PlayerProvider` memakai React Context supaya komponen mana pun bisa memanggil `usePlayer().play(...)`. Karena dipasang di `layout.tsx`, musik tidak berhenti saat pindah halaman.

---

## 4. Peta file

```
app/
  layout.tsx                 Bungkus semua halaman (Header + PlayerProvider)
  page.tsx                   Halaman Jelajah (Server Component, ambil data di server)
  favorites/page.tsx         Halaman Favorit
  globals.css                Seluruh tampilan (warna di blok :root paling atas)
  api/tracks/[id]/route.ts   Daftar track satu karya
  api/cover/[file]/route.ts  Gambar sampul
  api/tags/route.ts          Daftar tag situs asli untuk saran (best effort, boleh gagal)
  stream/route.ts            Stream audio (mendukung seek)
components/
  Header.tsx · Pager.tsx            (Server Component)
  SearchBar.tsx · TagPicker.tsx · WorkGrid.tsx · WorkDialog.tsx
  PlayerProvider.tsx · FavoritesView.tsx · BlurToggle.tsx   (Client Component)
lib/
  types.ts        Bentuk data API (tipe TypeScript)
  filters.ts      Aturan filter: URL <-> objek filter <-> teks pencarian API (fungsi murni)
  search.ts       Menjalankan pencarian di server, termasuk menggabungkan hasil untuk mode OR
  tagDict.ts      Kamus tag (nama Mandarin -> label Inggris) untuk saran, disimpan di localStorage
  asmr.ts         Satu-satunya tempat yang memanggil api.asmr.one (hanya di server)
  hosts.ts        Daftar host audio yang boleh diteruskan /stream
  favorites.ts    Favorit di localStorage + hook useFavorites()
  format.ts       Format waktu, nama tag, alamat sampul
  constants.ts    Ukuran halaman, pilihan urutan
```

Alur satu putaran: buka `/` → `page.tsx` (server) memanggil `parseFilters()` lalu `searchWorks()` → kartu tampil → klik kartu → `WorkDialog` memanggil `/api/tracks/ID` → klik track → `PlayerProvider.play()` mengarahkan `<audio>` ke `/stream?url=...`.

---

## 5. TypeScript dalam 5 menit

- **Tipe** ditulis dengan `:`. Contoh: `function fmtTime(sec?: number | null): string` artinya "terima angka (boleh kosong), kembalikan teks". Tanda `?` = boleh tidak ada.
- **`type`** mendefinisikan bentuk data (lihat `lib/types.ts`). Kalau salah ketik `work.titel`, editor langsung menandainya.
- **Union type** (`AudioNode | FolderNode | OtherNode`): sebuah nilai bisa salah satu dari beberapa bentuk. Setelah dicek `if (node.type === "folder")`, TypeScript otomatis tahu bahwa di dalam blok itu `node.children` ada. Itu disebut *narrowing*.
- **Generic** (`upstreamJson<WorksResponse>(...)`): "fungsi ini mengembalikan data berbentuk WorksResponse".
- **Props komponen** juga bertipe (`type Props = { work: Work | null; onClose: () => void }`), jadi salah kirim data antar komponen ketahuan sebelum dijalankan.

Perintah `npm run typecheck` memeriksa semuanya tanpa menjalankan aplikasi.

---

## Filter tag: sertakan, kecualikan, AND / OR

**Cara pakai.** Di bawah kotak cari ada dua kotak: **Sertakan tag** (hijau) dan **Kecualikan tag** (merah). Ketik nama tag lalu tekan Enter (atau tombol `+`); klik ✕ pada chip untuk menghapus. Contoh yang kamu minta: sertakan a, b, c; kecualikan e, f, g. Di bawah kotak "Sertakan" ada pilihan:
- **Semua tag (AND)**: karya harus punya a **dan** b **dan** c.
- **Salah satu (OR)**: karya cukup punya a **atau** b **atau** c.

Tag yang kamu kecualikan selalu berlaku sebagai "tidak boleh punya satu pun dari ini". Menambahkan sebuah tag ke satu kotak otomatis mencabutnya dari kotak lawannya. Seluruh filter tersimpan di alamat halaman (`/?inc=...&inc=...&exc=...&mode=or`), jadi bisa di-bookmark.

**Nama tag.** Pencarian di API memakai nama tag dalam bahasa Mandarin sederhana persis seperti di asmr.one (`皆大欢喜`, `内射/中出`). Supaya nyaman dibaca, chip dan saran menampilkan nama Inggris bila dikenal. Saran diisi dari tag pada karya yang pernah tampil di layarmu (disimpan di localStorage), jadi **di awal saran masih sedikit dan makin lengkap seiring kamu menjelajah**. Tag yang tidak ada di saran tetap bisa dipakai: ketik nama Mandarinnya.

**Cara kerja di balik layar** (sudah diuji langsung ke API asmr.one):

| Yang kamu mau | Dikirim ke API |
|---|---|
| sertakan a dan b | `/api/search/$tag:a$ $tag:b$` (beberapa `$tag$` = AND) |
| kecualikan e | `$-tag:e$` (boleh dipakai sendirian tanpa tag sertaan) |
| kata kunci | ditulis di luar tanda `$`, boleh digabung dengan tag |
| **OR** | **tidak didukung API** (sintaks tebakan `$or$` memberi 0 hasil) |

Karena API tidak punya OR, `lib/search.ts` membuatnya sendiri: untuk tiap tag sertaan dijalankan satu pencarian terpisah (lengkap dengan pengecualian), hasilnya digabung, duplikat dibuang, diurutkan ulang sesuai pilihan "Urutkan", lalu dipotong per halaman. Konsekuensinya, di mode OR:
- **jumlah total tidak diketahui** (hanya tertulis "Hasil gabungan");
- setiap halaman memicu beberapa permintaan ke situs asli, jadi dibatasi **maksimal 6 tag** dan **5 halaman pertama** (`MAX_OR_TAGS` dan `MAX_OR_PAGES` di `lib/constants.ts`);
- urutan hasil gabungan dihitung ulang oleh kode kita, jadi pada nilai yang kembar bisa sedikit berbeda dari urutan versi API.

Batas lain: maksimal 10 tag per kotak (supaya URL tidak terlalu panjang).

**Belum terkonfirmasi.** Daftar tag lengkap dari situs asli (`/api/tags`) tidak bisa saya cek, jadi route `app/api/tags/route.ts` bersifat *best effort*: kalau gagal, daftarnya kosong dan saran hanya berasal dari karya yang pernah kamu lihat. Kalau mau saran lengkap sejak awal, cari di tab Network (asmr.one, halaman daftar tag) endpoint yang dipakai situs itu, lalu ubah alamat di route tersebut. Nama tag yang mengandung spasi juga belum saya uji.

**Urutan membaca kode fitur ini (untuk belajar):** `lib/filters.ts` (aturan, fungsi murni) → `lib/search.ts` (AND vs OR) → `lib/tagDict.ts` (kamus) → `components/TagPicker.tsx` → `components/SearchBar.tsx` → `app/page.tsx`.

---

## 6. Kalau ada yang tidak jalan

- **`next: command not found`**: jalankan `npm install` dulu.
- **Daftar kosong / error 403 atau 429**: situs membatasi sementara. Tunggu beberapa menit dan jangan klik terlalu cepat. Hasil daftar sudah di-cache 5 menit.
- **Audio tidak mau diputar**: buka ulang karyanya (link audio bisa kedaluwarsa), lalu lihat pesan error di terminal tempat `npm run dev` berjalan.
- **Filter tag menghasilkan 0 karya**: pastikan nama tag persis seperti di asmr.one (bahasa Mandarin sederhana, bukan ID angka atau nama Inggris). Kalau sintaks API berubah, buka asmr.one → `F12` → tab **Network** → filter **Fetch/XHR**, lakukan satu pencarian dengan tag, lihat URL request-nya, lalu sesuaikan `buildTerm()` di `lib/filters.ts`.
- **Port 3000 dipakai**: `npm run dev -- -p 3001`.

---

## 7. Batasan pemakaian

- API asmr.one yang dipakai tidak resmi: bisa berubah atau ditutup kapan saja.
- Memakai API tanpa izin biasanya melanggar syarat layanan situs. Untuk pemakaian pribadi di localhost risikonya kecil, tapi jangan dipublikasikan, dibagikan, atau dipakai untuk request massal.
- Konten bersifat dewasa (R18). Blur sampul aktif secara default.

---

## 8. Latihan berikutnya

1. Ubah tampilan di `globals.css` dan komponen, lalu coba **Tailwind CSS** kalau mau mengikuti tren styling.
2. Tambah **playlist** dengan pola yang sama seperti `lib/favorites.ts`.
3. Jadikan tag di kartu bisa diklik untuk langsung memfilter: cukup bungkus tag di `WorkGrid.tsx` dengan elemen `Link` yang alamatnya `/?inc=` diikuti nama tag (di-encode dengan `encodeURIComponent`). Latihan bagus karena kamu hanya perlu memahami bentuk URL filternya.
4. Tambah halaman **riwayat putar** (`app/history/page.tsx`).
5. Simpan favorit ke database (SQLite + Route Handler) supaya tidak hilang saat browser dibersihkan.

## Penyimpanan data (favorit, Tonton nanti, posisi terakhir)

Data pribadi disimpan di server lokal, bukan hanya di browser: file JSON di folder `data/`
(`favs.json`, `watchlater.json`, `positions.json`), lewat route `app/api/store/[key]/route.ts`.
localStorage tetap dipakai sebagai cache. Efeknya:

- Data tidak hilang saat port berubah (3000 → 3001), ganti browser, atau bersihkan data browser.
- Untuk backup, salin folder `data/`. Folder lain bisa dipilih lewat variabel lingkungan `DATA_DIR`.
- Data lama di localStorage otomatis diunggah sekali ke server saat pertama kali dibuka.
- Pengaturan tampilan (blur, bahasa) tetap per-browser.
- Di Vercel sistem file tidak permanen; kalau suatu hari di-deploy, ganti isi `readStore`/`writeStore`
  di route itu dengan database.

## Buka dengan satu klik (Windows)

Server hanya bisa dibuka dari komputer ini (`127.0.0.1`), jadi tidak perlu login.

1. **Sekali saja:** klik dua kali `setup.bat` (memasang paket + membangun aplikasi).
2. **Sekali saja:** klik dua kali `buat-shortcut.bat`. Ikon "ASMR Pribadi" muncul di Desktop.
   Ia juga menawarkan untuk menyalakan server otomatis saat Windows menyala.
3. Sehari-hari: klik ikon itu. Server jalan tanpa jendela hitam, lalu aplikasi terbuka
   (jendela Edge tanpa address bar; kalau tidak ada Edge, di browser bawaan).
4. `berhenti.bat` mematikan server. Setelah mengubah kode, jalankan `setup.bat` lagi supaya
   perubahannya ikut ter-build.

## Di-host online (opsional)

Variabel lingkungan (lihat `.env.example`): `APP_PASSWORD` mengaktifkan login, dan
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` memindahkan penyimpanan data dari
folder `data/` ke Upstash Redis. Di hosting, build dengan `npm install && npm run build`
dan jalankan dengan `npm run start:cloud` (mendengarkan di `0.0.0.0` dan memakai `$PORT`).
Tanpa variabel itu, aplikasi berperilaku seperti biasa di laptop.
