# Changelog - Log Perubahan Rusunawa Gunungsari

Seluruh log perubahan, optimasi sistem, dan perbaikan bug yang diterapkan pada repositori aplikasi Rusunawa Gunungsari.

---

### [1.3.0] - 2026-06-01
#### Added
- **Menu Pembayaran & Catat PDAM (Tab Admin Baru)**:
  - Menyediakan tab khusus **"🚰 Pembayaran & Catat PDAM"** di Dashboard Admin untuk memproses iuran secara terpusat.
  - Memfasilitasi **Pencatatan Backup** angka meteran Mei jika koordinator berhalangan, lengkap dengan kalkulasi kubikasi pemakaian, biaya air PDAM, dan iuran sampah secara real-time.
  - Menyediakan aksi **"Tandai Lunas"** instan untuk pembayaran tunai, yang otomatis memperbarui status listrik warga menjadi menyala dan mencatatkan kas masuk pembukuan keuangan.
- **Koreksi Data Meteran Bulan Lalu (April)**:
  - Menghadirkan form khusus untuk memperbarui/mengoreksi angka meteran April yang salah.
  - Sistem secara cerdas menghitung ulang pemakaian April dan **mengalirkan (propagate)** nilai koreksi April tersebut sebagai angka dasar (prevMeter) pada catatan bulan Mei yang sudah ada, merevisi nominal tagihan Mei secara otomatis agar data historis tetap konsisten dan akurat.

#### Fixed
- **Sinkronisasi Angka Meteran Lalu (Koordinator Dashboard)**:
  - Memperbaiki kutu logika pada fungsi `getPrevMeterAndCurrentMei()` yang sebelumnya mengabaikan `prevMeter` dari catatan Mei yang sudah terekam di database.
  - Memperbaiki bug yang memunculkan data desimal lawas (`23.234` m³ dari data awal) dengan menyortir data historis dan memprioritaskan catatan revisi baru hasil impor CSV (prefix `bill-`).

---

### [1.2.0] - 2026-05-27
#### Added
- **Progressive Web App (PWA) Support**: Menyulap website menjadi aplikasi PWA mandiri (standalone). Koordinator dapat langsung menginstal aplikasi resmi dengan ikon premium "Rusunawa Gunungsari" langsung di layar beranda (home screen) HP Android/iPhone mereka, berjalan layar penuh (full-screen) tanpa navigasi browser.
- **QRCodeRenderer Component**: Membuat modul generator QR Code SVG offline berbasis standar browser (`Blob` dan `URL.createObjectURL`), menghasilkan kode 2D berkualitas tinggi, tajam, dan anti-pecah untuk printer thermal.
- **Auto-Distribution Paginasi**: Sistem secara cerdas membagi cetakan 60 baris hunian secara seimbang pada **tepat 2 halaman A4** (tidak menumpuk di lembar ke-1 dan tidak menyisakan 1 baris kosong di lembar ke-2).
- **Giant Touch-Friendly Scan Button & Floating Action Button (FAB)**:
  - Mengubah tombol scan kartu warga di Form Pencatatan Cepat menjadi widget utama selebar kartu (`w-full`) dengan tinggi tap `py-4.5`, ikon QR besar, warna gradasi premium, dan desain yang sangat taktil untuk memudahkan koordinator saat mencatat sambil berjalan di lapangan.
  - Menambahkan **Floating Action Button (FAB)** QR Code yang melayang di sudut kanan-bawah layar ponsel (`fixed bottom-6 right-6 z-45`) dengan animasi hover memutar dan panel deskripsi instan, sehingga tombol scan selalu berada dalam jangkauan jempol koordinator di bagian mana pun mereka menggulir daftar hunian.

#### Changed
- **Penghapusan Total Asisten Simulasi (Pure Camera UX)**: Menghapus tab simulasi dan dropdown warga dari popup pemindai kartu untuk menghadirkan antarmuka pemindai yang **murni, bersih, dan langsung mengaktifkan kamera fisik** tanpa ada elemen pembantu/dekorasi yang mengganggu fokus koordinator.
- **Early Return Pattern (Print View)**: Komponen `AdminDashboard.tsx` langsung merender area cetak murni di root level ketika mode cetak aktif, melewati rendering dashboard utama. Menghilangkan bug Chrome Print Engine yang memotong halaman akibat modal overlay absolut/scrollable.
- **Desain Stiker Thermal 5x3 cm (QR Code Premium Sampingan)**:
  - Mengubah layout vertikal barcode Code 39 menjadi **desain premium dua kolom (samping-sampingan)**.
  - **Kolom Kiri**: QR Code berukuran 2.8 x 2.8 cm dengan sensitivitas sensor pemindai instan (<0.5 detik).
  - **Kolom Kanan**: Teks identitas **PDAM RUSUN GUNUNGSARI**, keterangan lantai/blok tebal, dan label **UNIT [A-101]** dengan bingkai hitam tebal solid (border-2) untuk keterbacaan tingkat tinggi saat dicetak thermal.
- **Kepadatan Sel Cetak**: Menyesuaikan padding sel cetak (`4.5px 6px`), tinggi baris isian manual (`25px` saat cetak), dan margin kertas A4 (`8mm 10mm`) untuk memaksimalkan kapasitas halaman secara visual.
- **Pengurutan Data Bertingkat (Multi-Level Sorting)**: Mengurutkan data lembar kerja lapangan secara otomatis berdasarkan: **Lantai** (Lantai 1 ➡️ Lantai 2 ➡️ dst) ➡️ **Blok** secara alfabetis (Blok A ➡️ Blok B ➡️ dst) ➡️ **Nomor Unit Hunian** secara alfanumerik alami (A-101 ➡️ A-102 ➡️ dst).
- **Relokasi Tipe Data TypeScript**: Memindahkan paket `@types/qrcode` dari `devDependencies` ke `dependencies` utama pada `package.json` untuk memastikan build produksi pada **Cloudflare Pages / Vercel** lulus kompilasi 100% tanpa galat *missing types*.

#### Fixed
- **Tampilan Kamera Scanner Hitam (Viewport Collapse)**: Mengubah penataan `#qr-reader` menggunakan **`absolute inset-0`** dan override video **`[&_video]:object-cover`** untuk mencegah tinggi viewport pemindai mengkerut (`0px`) di peramban ponsel koordinator.
- **Pembersihan CSS Peretas**: Menghapus aturan CSS override kaku `#admin_dashboard > :not(.print-stage)` karena sudah tidak diperlukan lagi dalam pola rendering pengembalian awal.
- **Penghapusan Tanda Tangan**: Menghapus area tanda tangan bawah pada tabel offline backup untuk efisiensi ruang paginasi lembar A4.
