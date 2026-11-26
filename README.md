# ELKANA JASTIP

Website layanan titip paket dari Surabaya menuju Bajawa, Malanuza, dan Aimere.

## Menjalankan secara lokal

Pastikan Node.js, npm, dan PostgreSQL sudah terpasang. Siapkan database `elkana_jastip` beserta kredensialnya, lalu salin `.env.example` menjadi `.env` dan isi email/kata sandi awal owner dan admin. Kata sandi harus minimal 12 karakter; buat `SESSION_SECRET` dan `BARCODE_SECRET` acak dengan panjang minimal 32 karakter.

```bash
npm install
npm run dev
```

Server API Express berjalan di `127.0.0.1:3001`, React/TanStack di `127.0.0.1:3013`, dan tabel PostgreSQL dibuat otomatis saat API pertama kali dimulai. Buka `http://127.0.0.1:3013/login` untuk masuk. Akun owner/admin dari environment hanya dibuat jika email tersebut belum ada di database.

## Dashboard operasional

Dashboard internal tersedia di `/dashboard` dengan monitor dan pengelolaan paket, antrean input paket, pustaka barcode, pemindai, pembayaran, jadwal pengiriman, informasi owner, moderasi ulasan, dan pengaturan tarif. Admin dapat memasukkan nama, PCS, berat, tujuan, serta keterangan opsional untuk hingga 50 paket lalu menyimpan semuanya sekaligus. Harga mengikuti perhitungan Excel `berat × tarif/kg` (PCS dicatat terpisah), dan setiap paket mendapatkan barcode setelah penyimpanan berhasil. Pustaka di `/dashboard/barcode` menyediakan unduhan PNG dan cetak label; pemindai ada di `/dashboard/scan`. Owner dapat mengubah atau mengarsipkan paket dari monitor; paket yang sudah diproses tidak dapat diedit, sedangkan arsip mempertahankan riwayat pembayaran dan dapat dipulihkan. Owner juga dapat menghapus informasi secara permanen, mengatur jadwal closing/keberangkatan/estimasi tiba agar tampil di beranda, dan melakukan CRUD ulasan termasuk memilih status tayang; admin dapat melihat konten dan statusnya. Tarif awal `Rp8.000/kg` disimpan di PostgreSQL; tarif tiap paket dikunci saat paket dibuat sehingga perubahan harga tidak mengubah tagihan lama.

Website menampilkan titik pengambilan di Bajawa, Malanuza, dan Aimere. Pelanggan dapat mengirim ulasan dengan rating 1–5 bintang; ulasan baru berstatus menunggu hingga disetujui owner. Pengunjung dapat menghubungi owner melalui WhatsApp atau bergabung ke grup komunitas melalui ajakan di beranda dan halaman layanan.

Barcode QR yang dibuat saat input paket yang sama dipakai untuk verifikasi, konfirmasi pembayaran manual, dan pengambilan. Barcode dapat diunduh sebagai PNG, ditampilkan saat owner mengedit paket, dan dipindai melalui kamera atau gambar yang diunggah. Paket harus diverifikasi sebelum pembayaran dicatat, dan harus lunas sebelum pengambilan dikonfirmasi. Kamera memerlukan izin browser dan secure context; alternatif lainnya, tempelkan data hasil scan pada halaman pemindai. Integrasi payment gateway belum diaktifkan.

Halaman tracking publik mencari nomor paket aktif berformat `ELK-` diikuti 12 digit heksadesimal dan menampilkan status serta riwayat yang tercatat oleh admin. Nomor simulasi tidak digunakan untuk hasil tracking.

Owner dapat membuat batch pengiriman dari `/dashboard/batch`, mengunduh template Excel berisi sheet BJW, MLZ, dan AIM, lalu memilih batch tujuan sebelum impor daftar. Input paket juga wajib memilih batch; nama penerima paket operasional ikut muncul di daftar batch. Owner dapat memilih satu batch per tujuan untuk ditampilkan di beranda. Daftar publik memiliki pencarian nama dan paginasi 10 penerima per halaman.

Sebelum menjalankan versi yang menambahkan kolom operasional atau batch di server yang sudah ada, terapkan skema dengan `npm run db push`, lalu build dan restart aplikasi. Perintah migrasi bersifat idempoten.

Variabel yang dibutuhkan tercantum di `.env.example`. Jangan mengganti `BARCODE_SECRET` setelah barcode dibuat karena signature label lama tidak akan berlaku lagi.

Untuk menjalankan hasil build pada satu host, jalankan `npm run build` lalu `npm start`. Perintah ini menyalakan API pada port `3001` dan Vite Preview pada port `3013`; Vite Preview meneruskan request `/api` ke API lokal. Pastikan PostgreSQL, `DATABASE_URL`, kredensial owner/admin, `SESSION_SECRET`, dan `BARCODE_SECRET` sudah dikonfigurasi.

## Perintah

- `npm run dev` menjalankan API Express dan server React untuk pengembangan.
- `npm run dev:api` menjalankan API saja.
- `npm run dev:web` menjalankan frontend saja.
- `npm run db push` menerapkan `api/schema.sql` ke PostgreSQL yang ditentukan oleh `DATABASE_URL`; perintah ini idempoten untuk skema saat ini dan tidak membuat akun owner/admin.
- `npm run build` membuat build produksi frontend.
- `npm run preview` melihat build produksi frontend secara lokal.
- `npm run start:web` menjalankan frontend hasil build.
- `npm test` menjalankan pengujian.
