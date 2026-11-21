# ELKANA JASTIP

Website layanan titip paket dari Surabaya menuju Bajawa, Malanuza, dan Aimere.

## Menjalankan secara lokal

Pastikan Node.js, npm, dan PostgreSQL sudah terpasang. Siapkan database `elkana_jastip` beserta kredensialnya, lalu salin `.env.example` menjadi `.env` dan isi email/kata sandi awal owner dan admin. Kata sandi harus minimal 12 karakter; buat `SESSION_SECRET` dan `BARCODE_SECRET` acak dengan panjang minimal 32 karakter.

```bash
npm install
npm run dev
```

Server API Express berjalan di `127.0.0.1:3001`, React/TanStack di `127.0.0.1:5173`, dan tabel PostgreSQL dibuat otomatis saat API pertama kali dimulai. Buka `http://127.0.0.1:5173/login` untuk masuk. Akun owner/admin dari environment hanya dibuat jika email tersebut belum ada di database.

## Dashboard operasional

Dashboard internal tersedia di `/dashboard` dengan halaman monitor paket, input paket, pemindaian barcode, pembayaran, dan pengaturan tarif. Owner dan admin dapat mengelola paket, memproses scan, serta mengubah tarif. Tarif awal `Rp8.000/kg` disimpan di PostgreSQL; tarif tiap paket dikunci saat paket dibuat sehingga perubahan harga tidak mengubah tagihan lama.

Barcode QR yang dibuat saat input paket yang sama dipakai untuk verifikasi, konfirmasi pembayaran manual, dan pengambilan. Paket harus diverifikasi sebelum pembayaran dicatat, dan harus lunas sebelum pengambilan dikonfirmasi. Kamera memerlukan izin browser dan secure context; alternatifnya, tempelkan data hasil scan pada halaman barcode. Integrasi payment gateway belum diaktifkan.

Variabel yang dibutuhkan tercantum di `.env.example`. Jangan mengganti `BARCODE_SECRET` setelah barcode dibuat karena signature label lama tidak akan berlaku lagi.

## Perintah

- `npm run dev` menjalankan API Express dan server React untuk pengembangan.
- `npm run dev:api` menjalankan API saja.
- `npm run dev:web` menjalankan frontend saja.
- `npm run build` membuat build produksi frontend.
- `npm run preview` melihat build produksi frontend secara lokal.
- `npm run start:web` menjalankan frontend hasil build.
- `npm test` menjalankan pengujian.
