export const PAGE_SIZE = 20;

// Pilihan urutan. `value` = nilai yang dikirim ke API, `label` = teks di layar.
export const ORDER_OPTIONS = [
  { value: "create_date", label: "Terbaru ditambahkan" },
  { value: "release", label: "Tanggal rilis" },
  { value: "dl_count", label: "Terpopuler (unduhan)" },
  { value: "rate_average_2dp", label: "Rating tertinggi" },
  { value: "price", label: "Harga" },
] as const;

export const DEFAULT_ORDER = "create_date";

// ---- batas filter tag ----
// Per daftar (sertakan / kecualikan). Juga menjaga agar alamat URL tidak terlalu panjang.
export const MAX_TAGS_PER_LIST = 10;

// Mode OR tidak didukung langsung oleh API, jadi kita menjalankan 1 pencarian per tag lalu
// menggabungkan hasilnya (lihat lib/search.ts). Supaya tidak membebani situs asli, dibatasi:
export const MAX_OR_TAGS = 6; // paling banyak 6 tag dalam satu pencarian OR
export const MAX_OR_PAGES = 5; // hanya 5 halaman pertama yang bisa dibuka
