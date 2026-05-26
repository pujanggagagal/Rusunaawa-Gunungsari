# Changelog - Log Perubahan Rusunawa Gunungsari

Seluruh log perubahan, optimasi sistem, dan perbaikan bug yang diterapkan pada repositori aplikasi Rusunawa Gunungsari.

---

### [1.2.0] - 2026-05-27
#### Added
- **Progressive Web App (PWA) Support**: Menyulap website menjadi aplikasi PWA mandiri (standalone). Koordinator dapat langsung menginstal aplikasi resmi dengan ikon premium "Rusunawa Gunungsari" langsung di layar beranda (home screen) HP Android/iPhone mereka, berjalan layar penuh (full-screen) tanpa navigasi browser.
- **QRCodeRenderer Component**: Membuat modul generator QR Code SVG offline berbasis standar browser (`Blob` dan `URL.createObjectURL`), menghasilkan kode 2D berkualitas tinggi, tajam, dan anti-pecah untuk printer thermal.
- **Auto-Distribution Paginasi**: Sistem secara cerdas membagi cetakan 60 baris hunian secara seimbang pada **tepat 2 halaman A4** (tidak menumpuk di lembar ke-1 dan tidak menyisakan 1 baris kosong di lembar ke-2).

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
