# Functional Specification Document (FSD)
# IbadahHub Web Application (Multi-Religion System)

**Versi:** 3.0  
**Tanggal:** April 2026  
**Status:** Updated — Revisi & Penambahan dari v2.0

---

## 1. Introduction

### 1.1 Purpose

Dokumen ini menjelaskan spesifikasi fungsional sistem IbadahHub, yaitu aplikasi berbasis web untuk digitalisasi pengelolaan kegiatan ibadah lintas agama yang memungkinkan pengurus mengelola aktivitas keagamaan secara terstruktur dan jemaah memperoleh informasi kegiatan secara mudah.

Sistem dirancang menggunakan pendekatan **multi-religion access control**, sehingga setiap admin hanya dapat mengakses data sesuai agama yang dikelola.

### 1.2 Scope

Aplikasi IbadahHub menyediakan fitur:

- Manajemen data pengguna berbasis role & sub-role
- Manajemen data agama (religion-based access)
- Manajemen kegiatan ibadah
- Manajemen pengumuman (dengan rich text & lampiran)
- Manajemen donasi & rekening pembayaran
- Laporan keuangan (pemasukan, pengeluaran & saldo)
- Dashboard monitoring aktivitas
- Notifikasi in-app
- Manajemen profil pengguna
- Halaman publik (tanpa login)
- Search & pagination di seluruh modul
- Soft delete dengan restore data

Sistem digunakan oleh:

- Superadmin
- Pengurus Ketua
- Pengurus Bendahara
- Pengurus Sekretaris
- Jemaah

Aplikasi mendukung minimal 4 agama berbeda dalam satu platform.

### 1.3 Definitions

| Istilah | Deskripsi |
|---|---|
| Superadmin | Pengguna dengan akses global ke seluruh agama |
| Pengurus | Admin yang mengelola satu agama tertentu, terdiri dari sub-role |
| Pengurus Ketua | Sub-role pengurus dengan akses penuh ke seluruh fitur agama |
| Pengurus Bendahara | Sub-role pengurus yang mengelola donasi, pengeluaran & laporan keuangan |
| Pengurus Sekretaris | Sub-role pengurus yang mengelola kegiatan & pengumuman |
| Jemaah | Pengguna yang mengikuti kegiatan sesuai agama |
| Donasi | Kontribusi dana masuk dari jemaah |
| Pengeluaran | Catatan dana keluar dari kas agama |
| Saldo | Selisih total donasi dikonfirmasi dikurangi total pengeluaran |
| Religion | Identitas kategori agama dalam sistem |
| Session | Sesi login pengguna yang memiliki masa berlaku tertentu |
| Status Kegiatan | Kondisi kegiatan: Upcoming, Ongoing, Selesai, Dibatalkan |
| Soft Delete | Penghapusan data secara logis (tidak dihapus dari database, hanya ditandai) |
| Hard Delete | Penghapusan permanen dari database |
| Rich Text | Format teks dengan dukungan bold, italic, list, link, dan gambar |
| Notifikasi In-App | Pemberitahuan yang muncul di dalam aplikasi tanpa email |
| Halaman Publik | Halaman yang dapat diakses tanpa login |

---

## 2. System Overview

IbadahHub adalah aplikasi berbasis web dengan arsitektur **multi-religion management system** yang memungkinkan pemisahan data antar agama dalam satu platform.

Setiap agama memiliki:

- Data kegiatan sendiri
- Data jemaah sendiri
- Data donasi & pengeluaran sendiri
- Data pengumuman sendiri
- Data rekening pembayaran sendiri
- Pengurus dengan sub-role masing-masing

Superadmin memiliki akses global terhadap seluruh agama.

Halaman publik dapat diakses oleh siapapun tanpa perlu login, menampilkan informasi kegiatan dan profil komunitas per agama.

---

## 3. User Roles and Permissions

### 3.1 Superadmin

Hak akses:

- Mengelola data agama
- Mengelola akun pengurus (semua sub-role)
- Mengakses seluruh data kegiatan semua agama
- Mengakses seluruh laporan keuangan (donasi & pengeluaran)
- Monitoring seluruh aktivitas sistem
- Melihat & merestore data yang di-soft delete
- Mengakses audit trail seluruh sistem

### 3.2 Pengurus — Sub-Role

Seluruh pengurus hanya dapat mengakses data agama yang dikelola. **Tidak dapat mengakses data agama lain.**

#### 3.2.1 Pengurus Ketua

Hak akses penuh dalam lingkup agama:

- Semua akses Bendahara dan Sekretaris
- Mengelola akun pengurus lain dalam agama yang sama
- Mengelola data rekening pembayaran agama
- Approve / reject konfirmasi donasi
- Melihat laporan keuangan lengkap (donasi + pengeluaran + saldo)
- Merestore data yang di-soft delete dalam agama yang dikelola

#### 3.2.2 Pengurus Bendahara

Hak akses keuangan:

- Mencatat dan memverifikasi donasi
- Mencatat pengeluaran kas
- Melihat laporan keuangan (donasi + pengeluaran + saldo)
- Mengelola data rekening pembayaran (view only, edit oleh Ketua)
- Melihat data jemaah

#### 3.2.3 Pengurus Sekretaris

Hak akses konten & administrasi:

- Mengelola kegiatan ibadah
- Mengelola pengumuman
- Mengelola data jemaah (tambah, edit, lihat)
- Melihat laporan donasi (view only, tanpa pengeluaran)

### 3.3 Jemaah

Hak akses:

- Registrasi mandiri sesuai agama
- Melihat jadwal kegiatan sesuai agama
- Melihat pengumuman sesuai agama
- Melakukan donasi
- Melihat riwayat donasi pribadi
- Mengelola profil pribadi
- Menerima notifikasi in-app

---

## 4. Functional Requirements

### 4.1 Religion Management

**Aktor:** Superadmin  
**Deskripsi:** Superadmin dapat mengelola daftar agama dalam sistem.

Fitur:

- Tambah agama
- Edit agama
- Hapus agama — hanya jika tidak ada data aktif terkait (menggunakan soft delete)
- Lihat daftar agama dengan search & pagination

**Search & Pagination:**

- Search berdasarkan nama agama
- Pagination default 10 data per halaman, dapat diubah ke 25 / 50

**Output:** Data agama tersimpan dalam tabel `religions`.

---

### 4.2 Login System

**Deskripsi:** Pengguna dapat masuk ke sistem menggunakan email dan password.  
**Aktor:** Superadmin, Pengurus (semua sub-role), Jemaah

**Input:**

- Email
- Password

**Validasi sistem:**

- Email terdaftar dan aktif
- Password sesuai
- Religion sesuai akses pengguna
- Akun tidak dalam kondisi terkunci

**Output:** Dashboard sesuai role dan agama.

#### 4.2.1 Forgot Password / Reset Password

Alur:

1. Pengguna klik "Lupa Password" di halaman login
2. Sistem mengirimkan email berisi link reset password (berlaku 1 jam)
3. Pengguna membuka link dan mengisi password baru
4. Sistem memperbarui password dan mengarahkan ke halaman login

**Validasi:**

- Link yang sudah kadaluarsa tidak dapat digunakan
- Password baru minimal 8 karakter, kombinasi huruf dan angka

#### 4.2.2 Session Management

- Session login berlaku selama **8 jam** sejak login terakhir
- Jika tidak aktif selama **30 menit**, session akan berakhir otomatis
- Pengguna akan diarahkan ke halaman login saat session habis

#### 4.2.3 Proteksi Login Gagal

- Setelah **5 kali percobaan login gagal**, akun akan dikunci sementara selama **15 menit**
- Sistem mencatat log percobaan login gagal ke tabel `login_logs`

---

### 4.3 Sub-Role Management (Pengurus)

**Aktor:** Superadmin, Pengurus Ketua  
**Deskripsi:** Pengelolaan akun pengurus berdasarkan sub-role dalam satu agama.

**Superadmin dapat:**

- Membuat akun Pengurus Ketua untuk setiap agama
- Melihat seluruh akun pengurus semua agama

**Pengurus Ketua dapat:**

- Membuat akun Pengurus Bendahara dan Sekretaris dalam agama yang dikelola
- Menonaktifkan akun pengurus dalam agama yang dikelola
- Mengubah sub-role pengurus (Bendahara ↔ Sekretaris)

**Field data pengurus:**

- Nama lengkap
- Email
- Sub-role: `Ketua` | `Bendahara` | `Sekretaris`
- Religion
- Status: `Aktif` | `Nonaktif`
- Password (auto-generate, dikirim via email ke pengurus baru)

**Output:** Akun pengurus aktif sesuai sub-role dan agama, notifikasi email dikirim ke pengurus baru.

---

### 4.4 Manajemen Profil Pengguna *(Baru)*

**Aktor:** Semua pengguna (Superadmin, Pengurus, Jemaah)  
**Deskripsi:** Setiap pengguna dapat mengelola data profil pribadi mereka sendiri.

**Fitur:**

- Lihat profil
- Edit data profil
- Ganti password
- Upload / ubah foto profil

**Field yang dapat diedit:**

| Field | Superadmin | Pengurus | Jemaah |
|---|---|---|---|
| Nama lengkap | ✅ | ✅ | ✅ |
| Nomor HP | ✅ | ✅ | ✅ |
| Alamat | — | — | ✅ |
| Foto profil | ✅ | ✅ | ✅ |
| Password | ✅ | ✅ | ✅ |
| Email | ❌ (tidak bisa diubah sendiri) | ❌ | ❌ |
| Religion | ❌ | ❌ | ❌ |

**Aturan ganti password:**

- Wajib memasukkan password lama sebelum mengisi password baru
- Password baru minimal 8 karakter, kombinasi huruf dan angka
- Password baru tidak boleh sama dengan password lama

**Upload foto profil:**

- Format yang diterima: JPG, PNG, WEBP
- Ukuran maksimal: 2 MB
- Foto disimpan di server dengan nama unik (UUID)
- Foto lama dihapus saat foto baru diupload

**Output:** Data profil diperbarui dan foto profil tampil di seluruh halaman aplikasi.

---

### 4.5 Jemaah Management

**Aktor:** Pengurus Ketua, Pengurus Sekretaris  
**Deskripsi:** Pengurus dapat mengelola data jemaah sesuai agama masing-masing.

**Fitur:**

- Tambah jemaah (input manual)
- Edit jemaah
- Soft delete jemaah (data tidak hilang permanen)
- Restore jemaah yang di-soft delete
- Lihat daftar jemaah aktif
- Lihat daftar jemaah yang di-soft delete (arsip)

**Search & Pagination:**

- Search berdasarkan: nama, email, nomor HP
- Filter berdasarkan: status akun (Aktif / Nonaktif / Dihapus)
- Sort berdasarkan: nama (A-Z / Z-A), tanggal daftar terbaru
- Pagination default 10 data per halaman, dapat diubah ke 25 / 50

**Field data:**

- Nama lengkap
- Alamat
- Nomor HP
- Email
- Religion
- Status akun: `Aktif` | `Nonaktif`
- Tanggal daftar
- `deleted_at` (timestamp soft delete, NULL jika aktif)

**Aturan soft delete jemaah:**

- Data jemaah yang dihapus tidak hilang dari database, hanya ditandai `deleted_at`
- Riwayat donasi jemaah yang di-soft delete **tetap tersimpan** dan terhitung dalam laporan keuangan
- Hanya Pengurus Ketua dan Superadmin yang dapat merestore jemaah yang dihapus
- Hard delete (hapus permanen) hanya dapat dilakukan oleh Superadmin

**Output:** Data jemaah tersimpan sesuai agama, riwayat donasi tetap aman meskipun jemaah dihapus.

#### 4.5.1 Registrasi Mandiri Jemaah

**Aktor:** Jemaah (publik)

Alur:

1. Jemaah membuka halaman registrasi
2. Mengisi form: Nama, Email, Nomor HP, Alamat, pilih Agama, Password
3. Sistem mengirimkan email verifikasi
4. Jemaah klik link verifikasi untuk mengaktifkan akun
5. Akun aktif dan jemaah dapat login

**Validasi:**

- Email belum terdaftar dalam sistem
- Password minimal 8 karakter
- Agama wajib dipilih saat registrasi
- Link verifikasi berlaku 24 jam

**Output:** Akun jemaah aktif sesuai agama yang dipilih.

---

### 4.6 Activity Management (Kegiatan Ibadah)

**Aktor:** Pengurus Ketua, Pengurus Sekretaris  
**Deskripsi:** Pengurus dapat mengelola kegiatan ibadah berdasarkan agama.

**Fitur:**

- Tambah kegiatan
- Edit kegiatan
- Soft delete kegiatan
- Restore kegiatan yang di-soft delete
- Lihat daftar kegiatan aktif
- Lihat arsip kegiatan yang dihapus

**Search & Pagination:**

- Search berdasarkan: nama kegiatan, lokasi
- Filter berdasarkan: status, rentang tanggal
- Sort berdasarkan: tanggal terdekat, tanggal terbaru ditambahkan
- Pagination default 10 data per halaman, dapat diubah ke 25 / 50

**Field:**

- Nama kegiatan
- Tanggal
- Waktu mulai
- Waktu selesai
- Lokasi
- Deskripsi
- Religion
- Status: `Upcoming` | `Ongoing` | `Selesai` | `Dibatalkan`
- Kapasitas peserta (opsional)
- `deleted_at` (timestamp soft delete)

**Aturan status otomatis:**

- Tanggal & waktu di masa depan → `Upcoming`
- Antara waktu mulai & selesai → `Ongoing`
- Waktu selesai sudah lewat → `Selesai`
- Pengurus dapat mengubah status ke `Dibatalkan` secara manual

**Output:** Kegiatan hanya tampil pada jemaah dengan agama yang sama, difilter berdasarkan status.

---

### 4.7 Announcement Management

**Aktor:** Pengurus Ketua, Pengurus Sekretaris  
**Deskripsi:** Pengurus dapat membuat pengumuman berdasarkan agama dengan format rich text dan lampiran.

**Fitur:**

- Tambah pengumuman
- Edit pengumuman
- Soft delete pengumuman
- Restore pengumuman yang dihapus
- Preview pengumuman sebelum publish
- Lihat daftar pengumuman aktif & arsip

**Search & Pagination:**

- Search berdasarkan: judul, isi pengumuman
- Filter berdasarkan: status, rentang tanggal publikasi
- Pagination default 10 data per halaman

**Field:**

- Judul
- Isi pengumuman *(Rich Text — lihat 4.7.1)*
- Tanggal publikasi
- Tanggal kadaluarsa / Expire Date (opsional)
- Religion
- Status: `Draft` | `Aktif` | `Kadaluarsa`
- Lampiran file *(lihat 4.7.2)*
- `deleted_at` (timestamp soft delete)

**Aturan:**

- Status `Draft` → hanya terlihat oleh pengurus, belum tampil ke jemaah
- Status `Aktif` → tampil ke jemaah sesuai agama
- Status `Kadaluarsa` → otomatis berubah saat expire date terlewati, tidak tampil ke jemaah
- Jika expire date tidak diisi → pengumuman tampil permanen sampai dihapus manual

#### 4.7.1 Rich Text Editor *(Baru)*

Isi pengumuman mendukung format rich text dengan fitur:

| Fitur | Keterangan |
|---|---|
| Bold / Italic / Underline | Format teks dasar |
| Heading (H2, H3) | Judul dalam konten |
| Bullet list & Numbered list | Daftar terurut dan tidak terurut |
| Hyperlink | Tautkan URL eksternal |
| Insert image | Sisipkan gambar dalam konten (max 2 MB per gambar) |
| Blockquote | Format kutipan |
| Horizontal rule | Garis pemisah |

**Penyimpanan:** Isi pengumuman disimpan dalam format HTML yang telah disanitasi (mencegah XSS).

#### 4.7.2 Lampiran File *(Baru)*

Pengurus dapat melampirkan file pendukung pada pengumuman.

- Format yang diterima: PDF, JPG, PNG, DOCX
- Ukuran maksimal per file: **5 MB**
- Jumlah lampiran maksimal: **3 file** per pengumuman
- Jemaah dapat mengunduh lampiran langsung dari halaman pengumuman

**Output:** Pengumuman tampil sesuai agama pengguna, hanya yang berstatus aktif dan belum kadaluarsa. Jemaah dapat membaca konten rich text dan mengunduh lampiran.

---

### 4.8 Donation Management

**Aktor:** Pengurus Ketua, Pengurus Bendahara, Jemaah  
**Deskripsi:** Jemaah dapat melakukan donasi dan pengurus dapat memonitor serta memverifikasi donasi.

**Fitur:**

- Input donasi (oleh jemaah mandiri atau pengurus)
- Verifikasi / konfirmasi donasi (oleh Bendahara / Ketua)
- Soft delete donasi dengan alasan
- Lihat riwayat donasi

**Search & Pagination:**

- Search berdasarkan: nama donatur, nominal
- Filter berdasarkan: status, metode pembayaran, rentang tanggal
- Sort berdasarkan: tanggal terbaru, nominal terbesar
- Pagination default 10 data per halaman

**Field:**

- Nama donatur
- Nominal
- Tanggal donasi
- Metode pembayaran: `Transfer Bank` | `Tunai` | `QRIS`
- Status: `Pending` | `Dikonfirmasi` | `Ditolak`
- Catatan / keterangan (opsional)
- Bukti pembayaran (file upload, format JPG/PNG/PDF, max 2 MB)
- Religion
- `deleted_at` (timestamp soft delete)

#### 4.8.1 Alur Donasi Manual

**Alur donasi oleh Jemaah:**

1. Jemaah membuka halaman donasi
2. Jemaah melihat **informasi rekening** tujuan pembayaran agama masing-masing *(lihat 4.9)*
3. Jemaah mengisi form: nominal, metode pembayaran, catatan
4. Donasi tersimpan dengan status `Pending`
5. Jemaah melakukan pembayaran sesuai rekening yang tertera
6. Jemaah upload bukti pembayaran (opsional tapi dianjurkan)
7. Pengurus Bendahara / Ketua memverifikasi → status menjadi `Dikonfirmasi` atau `Ditolak`
8. Notifikasi in-app dikirim ke jemaah setelah status diperbarui

**Alur donasi input oleh Pengurus (donasi tunai langsung):**

1. Pengurus Bendahara / Ketua membuka halaman input donasi
2. Mengisi form: nama donatur, nominal, metode `Tunai`, tanggal
3. Donasi langsung tersimpan dengan status `Dikonfirmasi`

**Aturan soft delete donasi:**

- Donasi yang di-soft delete **tidak terhitung** dalam saldo dan laporan keuangan
- Wajib mengisi alasan penghapusan
- Hanya Pengurus Ketua dan Superadmin yang dapat menghapus donasi
- Restore donasi yang dihapus dapat dilakukan oleh Pengurus Ketua dan Superadmin

**Output:** Riwayat donasi tersimpan berdasarkan agama dengan status yang transparan.

---

### 4.9 Rekening Pembayaran *(Baru)*

**Aktor:** Pengurus Ketua, Superadmin  
**Deskripsi:** Setiap agama memiliki data rekening / info pembayaran yang ditampilkan kepada jemaah saat hendak berdonasi.

**Fitur:**

- Tambah rekening / info pembayaran
- Edit rekening
- Nonaktifkan rekening
- Hapus rekening
- Lihat daftar rekening aktif

**Field:**

- Nama bank / layanan: (contoh: BCA, BRI, BNI, GoPay, QRIS)
- Nomor rekening / ID
- Nama pemilik rekening
- Catatan tambahan (opsional, contoh: "Atas nama Masjid Al-Ikhlas")
- Status: `Aktif` | `Nonaktif`
- Religion

**Aturan:**

- Satu agama dapat memiliki lebih dari satu rekening (misalnya: Transfer BCA + QRIS)
- Hanya rekening berstatus `Aktif` yang ditampilkan ke jemaah
- Rekening yang dinonaktifkan tidak tampil di halaman donasi jemaah

**Output:** Informasi rekening tampil di halaman donasi jemaah sesuai agama, sehingga jemaah mengetahui kemana harus mentransfer.

---

### 4.10 Expense Management (Pengeluaran Kas) *(Baru)*

**Aktor:** Pengurus Ketua, Pengurus Bendahara  
**Deskripsi:** Pengurus mencatat seluruh pengeluaran kas agama agar laporan keuangan lengkap dan saldo dapat dihitung secara akurat.

**Fitur:**

- Tambah pengeluaran
- Edit pengeluaran
- Soft delete pengeluaran dengan alasan
- Restore pengeluaran yang dihapus
- Lihat daftar pengeluaran

**Search & Pagination:**

- Search berdasarkan: keterangan, kategori
- Filter berdasarkan: kategori, rentang tanggal
- Sort berdasarkan: tanggal terbaru, nominal terbesar
- Pagination default 10 data per halaman

**Field:**

- Keterangan pengeluaran (contoh: "Konsumsi pengajian bulanan")
- Nominal
- Tanggal pengeluaran
- Kategori: `Operasional` | `Kegiatan` | `Sosial` | `Lainnya`
- Bukti pengeluaran / nota (file upload, format JPG/PNG/PDF, max 2 MB, opsional)
- Dicatat oleh (nama pengurus)
- Religion
- `deleted_at` (timestamp soft delete)

**Output:** Data pengeluaran tersimpan per agama dan digunakan dalam perhitungan saldo kas.

---

### 4.11 Financial Report (Laporan Keuangan)

**Aktor:** Pengurus Ketua, Pengurus Bendahara, Superadmin  
**Deskripsi:** Sistem menampilkan laporan keuangan lengkap meliputi donasi, pengeluaran, dan saldo kas per agama.

**Jenis laporan:**

- **Ringkasan Keuangan** — total donasi, total pengeluaran, dan saldo berjalan
- **Laporan Donasi** — riwayat seluruh donasi yang dikonfirmasi
- **Laporan Pengeluaran** — riwayat seluruh pengeluaran
- **Laporan per Periode** — harian, mingguan, bulanan, tahunan
- **Ringkasan per Metode Pembayaran** — total berdasarkan transfer/tunai/QRIS
- **Laporan per Kategori Pengeluaran**

**Perhitungan Saldo:**

```
Saldo = Total Donasi (status: Dikonfirmasi) - Total Pengeluaran (aktif, tidak dihapus)
```

**Fitur filter laporan:**

- Filter berdasarkan rentang tanggal
- Filter berdasarkan jenis (donasi / pengeluaran / semua)
- Filter berdasarkan status donasi
- Filter berdasarkan metode pembayaran
- Filter berdasarkan kategori pengeluaran
- Filter berdasarkan agama (khusus Superadmin)

**Ekspor laporan:**

- Export ke format **PDF**
- Export ke format **Excel / CSV**

**Output:** Laporan keuangan komprehensif dalam bentuk tabel dan ringkasan, dengan saldo kas yang akurat.

---

### 4.12 Notifikasi In-App *(Baru)*

**Aktor:** Semua role  
**Deskripsi:** Sistem mengirimkan notifikasi di dalam aplikasi kepada pengguna yang relevan saat terjadi aktivitas penting.

**Fitur:**

- Tampil ikon notifikasi dengan badge jumlah notifikasi belum dibaca
- Daftar notifikasi (terbaru di atas)
- Tandai satu notifikasi sebagai sudah dibaca
- Tandai semua notifikasi sebagai sudah dibaca
- Hapus notifikasi
- Klik notifikasi → diarahkan ke halaman terkait

**Daftar Trigger Notifikasi:**

| Event | Penerima Notifikasi |
|---|---|
| Jemaah submit donasi baru | Pengurus Bendahara & Ketua |
| Donasi dikonfirmasi | Jemaah yang bersangkutan |
| Donasi ditolak | Jemaah yang bersangkutan |
| Kegiatan baru dibuat | Seluruh jemaah sesuai agama |
| Pengumuman baru dipublikasikan | Seluruh jemaah sesuai agama |
| Pengumuman mendekati expire (H-1) | Pengurus Sekretaris & Ketua |
| Akun pengurus baru dibuat | Pengurus yang bersangkutan |
| Password berhasil direset | Pengguna yang bersangkutan |

**Field notifikasi:**

- Judul notifikasi
- Isi singkat notifikasi
- Waktu kejadian
- Status: `Belum Dibaca` | `Sudah Dibaca`
- URL tujuan (halaman yang dituju saat notifikasi diklik)
- user_id penerima

**Output:** Notifikasi tampil real-time di header aplikasi. Pengguna dapat mengelola notifikasi secara mandiri.

---

### 4.13 Dashboard System

**Aktor:** Semua role  
**Deskripsi:** Dashboard menampilkan ringkasan informasi sesuai role dan agama dalam bentuk kartu statistik dan grafik visual.

**Superadmin:**

- Total pengguna seluruh agama
- Total kegiatan seluruh agama (per status)
- Total donasi seluruh agama
- Total pengeluaran seluruh agama
- Saldo gabungan seluruh agama
- Grafik tren donasi bulanan seluruh agama
- Tabel perbandingan aktivitas antar agama

**Pengurus Ketua & Bendahara:**

- Total kegiatan agama (per status)
- Total jemaah aktif
- Total donasi bulan ini vs bulan lalu
- Total pengeluaran bulan ini
- Saldo kas saat ini
- Grafik donasi & pengeluaran per bulan (6 bulan terakhir)
- Daftar donasi terbaru yang perlu dikonfirmasi

**Pengurus Sekretaris:**

- Total kegiatan agama (per status)
- Total jemaah aktif
- Daftar kegiatan upcoming terdekat
- Daftar pengumuman yang akan kadaluarsa dalam 7 hari

**Jemaah:**

- Jadwal kegiatan terbaru (status Upcoming & Ongoing)
- Pengumuman terbaru (aktif)
- Riwayat donasi pribadi (5 transaksi terakhir)
- Total donasi pribadi yang telah dikonfirmasi

---

### 4.14 Halaman Publik *(Baru)*

**Aktor:** Pengunjung umum (tanpa login)  
**Deskripsi:** Halaman yang dapat diakses oleh siapapun tanpa perlu membuat akun, berfungsi sebagai wajah publik platform IbadahHub.

**Halaman yang tersedia:**

#### 4.14.1 Beranda Publik

- Deskripsi singkat platform IbadahHub
- Daftar agama yang terdaftar dalam platform (nama + ikon)
- Tombol: **Daftar sebagai Jemaah** | **Login**

#### 4.14.2 Halaman Per Agama (Publik)

Setiap agama memiliki halaman publik tersendiri yang dapat diakses via URL:  
`/publik/{nama-agama}`

Konten yang ditampilkan:

- Nama & deskripsi komunitas agama
- **Jadwal kegiatan publik** — kegiatan dengan status `Upcoming` dan `Ongoing`
- **Pengumuman publik** — pengumuman aktif (bukan draft)
- Tombol: **Bergabung sebagai Jemaah** | **Login**

**Aturan:**

- Kegiatan dan pengumuman berstatus `Draft` tidak tampil di halaman publik
- Detail lengkap kegiatan (kapasitas, deskripsi penuh) hanya tampil setelah login sebagai jemaah
- Informasi rekening donasi tidak ditampilkan di halaman publik (hanya setelah login)

#### 4.14.3 Halaman Registrasi & Login

- Halaman registrasi jemaah baru (lihat 4.5.1)
- Halaman login untuk semua pengguna
- Halaman lupa password

**Output:** Pengunjung dapat melihat informasi publik agama dan mendaftar menjadi jemaah tanpa hambatan.

---

### 4.15 Soft Delete & Data Restore *(Baru)*

**Aktor:** Pengurus Ketua, Superadmin  
**Deskripsi:** Seluruh penghapusan data di sistem menggunakan mekanisme soft delete untuk menjaga integritas data, terutama data keuangan.

**Modul yang menggunakan Soft Delete:**

| Modul | Soft Delete | Restore | Hard Delete |
|---|---|---|---|
| Jemaah | ✅ | ✅ (Ketua, Superadmin) | ✅ (Superadmin only) |
| Kegiatan | ✅ | ✅ (Ketua, Superadmin) | ✅ (Superadmin only) |
| Pengumuman | ✅ | ✅ (Ketua, Superadmin) | ✅ (Superadmin only) |
| Donasi | ✅ | ✅ (Ketua, Superadmin) | ❌ (tidak bisa dihapus permanen) |
| Pengeluaran | ✅ | ✅ (Ketua, Superadmin) | ❌ (tidak bisa dihapus permanen) |
| Pengumuman | ✅ | ✅ (Ketua, Superadmin) | ✅ (Superadmin only) |
| Agama | ✅ | ✅ (Superadmin) | ❌ (tidak bisa dihapus jika ada data) |

**Mekanisme:**

- Soft delete menambahkan timestamp ke kolom `deleted_at`
- Data yang di-soft delete tidak tampil di halaman utama (list aktif)
- Data yang di-soft delete tetap tampil di halaman **Arsip / Recycle Bin**
- Saat melakukan soft delete, pengguna wajib mengisi alasan penghapusan yang disimpan ke `activity_logs`
- Restore menghapus nilai `deleted_at` (set kembali ke NULL)

**Dampak Soft Delete terhadap Laporan Keuangan:**

- Donasi yang di-soft delete → **tidak terhitung** dalam saldo dan laporan
- Pengeluaran yang di-soft delete → **tidak terhitung** dalam saldo dan laporan
- Riwayat donasi jemaah yang di-soft delete → **tetap terhitung** selama donasi tidak ikut dihapus

---

## 5. Non-Functional Requirements

### 5.1 Security

- Password dienkripsi menggunakan algoritma **bcrypt**
- Role-based access control (Superadmin, Ketua, Bendahara, Sekretaris, Jemaah)
- Sub-role permission matrix diterapkan per endpoint API
- Religion-based data isolation
- Session management dengan timeout otomatis (30 menit idle, 8 jam maksimal)
- Proteksi brute force login: akun dikunci 15 menit setelah 5 kali percobaan gagal
- HTTPS wajib: seluruh komunikasi menggunakan protokol HTTPS
- Input sanitization: seluruh input divalidasi untuk mencegah SQL Injection dan XSS
- Konten rich text disanitasi sebelum disimpan (strip tag berbahaya)
- File upload divalidasi tipe MIME, bukan hanya ekstensi

### 5.2 Performance

- Waktu loading halaman < 3 detik
- Mendukung minimal 100 pengguna aktif secara bersamaan
- Uptime target: minimal 99% per bulan
- Response time API: < 1 detik untuk operasi CRUD standar
- Pencarian (search) mengembalikan hasil dalam < 2 detik untuk dataset hingga 10.000 record

### 5.3 Reliability & Backup

- Backup database dilakukan setiap **24 jam** secara otomatis
- Data backup disimpan selama minimal **30 hari**
- Recovery Time Objective (RTO): sistem pulih < 1 jam setelah kegagalan
- Data keuangan (donasi & pengeluaran) tidak dapat dihapus permanen tanpa otorisasi Superadmin

### 5.4 Usability

- Interface sederhana dan intuitif
- Mudah digunakan semua kelompok umur
- Tampilan responsif untuk perangkat desktop, tablet, dan mobile
- Pesan error menggunakan bahasa Indonesia yang mudah dipahami
- Konfirmasi dialog ditampilkan sebelum aksi penghapusan data

### 5.5 Compatibility

Browser yang didukung:

- Chrome (versi terbaru)
- Firefox (versi terbaru)
- Edge (versi terbaru)

### 5.6 File Upload — Ketentuan Global

| Jenis File | Format Diterima | Ukuran Maks | Keterangan |
|---|---|---|---|
| Foto profil | JPG, PNG, WEBP | 2 MB | Disimpan dengan nama UUID |
| Bukti donasi | JPG, PNG, PDF | 2 MB | Dilampirkan ke record donasi |
| Nota pengeluaran | JPG, PNG, PDF | 2 MB | Dilampirkan ke record pengeluaran |
| Lampiran pengumuman | PDF, JPG, PNG, DOCX | 5 MB | Maks 3 file per pengumuman |
| Gambar dalam rich text | JPG, PNG, WEBP | 2 MB | Sisipan gambar di konten pengumuman |

Seluruh file disimpan di server dengan nama unik (UUID) untuk menghindari konflik dan mencegah direct access URL yang mudah ditebak.

### 5.7 Error Handling & Logging

- Setiap error dicatat dalam sistem log dengan timestamp, user_id, dan detail error
- Pengguna menerima pesan error yang informatif dalam bahasa Indonesia
- Log aktivitas (`activity_logs`) disimpan minimal 90 hari untuk audit trail
- Log login (`login_logs`) disimpan minimal 30 hari

---

## 6. Database Overview (Conceptual)

### 6.1 Tabel Utama

| Tabel | Deskripsi |
|---|---|
| `religions` | Data agama yang terdaftar |
| `users` | Data semua pengguna (Superadmin, Pengurus, Jemaah) |
| `pengurus_roles` | Sub-role pengurus per agama (Ketua/Bendahara/Sekretaris) |
| `jemaah` | Data detail jemaah |
| `kegiatan` | Data kegiatan ibadah |
| `pengumuman` | Data pengumuman per agama |
| `pengumuman_lampiran` | Data lampiran file per pengumuman |
| `donasi` | Data transaksi donasi |
| `pengeluaran` | Data pengeluaran kas per agama |
| `rekening` | Data rekening / info pembayaran per agama |
| `notifikasi` | Data notifikasi in-app per pengguna |
| `laporan_view` | View agregasi untuk laporan keuangan |
| `login_logs` | Log percobaan login |
| `activity_logs` | Log seluruh aktivitas pengguna (termasuk alasan soft delete) |

### 6.2 Relasi Utama

- Setiap `users` memiliki `religion_id` → relasi ke `religions`
- Setiap `users` memiliki `sub_role` yang merujuk ke tabel `pengurus_roles`
- Setiap `kegiatan` memiliki `religion_id` → relasi ke `religions`
- Setiap `pengumuman` memiliki `religion_id` → relasi ke `religions`
- Setiap `pengumuman_lampiran` memiliki `pengumuman_id` → relasi ke `pengumuman`
- Setiap `donasi` memiliki `religion_id` dan `user_id`
- Setiap `pengeluaran` memiliki `religion_id` dan `created_by` (user_id)
- Setiap `rekening` memiliki `religion_id`
- Setiap `notifikasi` memiliki `user_id` penerima

### 6.3 Atribut Kunci Tabel

**Tabel `users`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| religion_id | INT (FK) | Referensi ke religions |
| nama | VARCHAR | Nama lengkap |
| email | VARCHAR (UNIQUE) | Email pengguna |
| password | VARCHAR | Password terenkripsi (bcrypt) |
| role | ENUM | superadmin / pengurus / jemaah |
| sub_role | ENUM | ketua / bendahara / sekretaris / NULL |
| foto_profil | VARCHAR | Path file foto profil |
| status | ENUM | aktif / nonaktif |
| created_at | TIMESTAMP | Waktu dibuat |
| deleted_at | TIMESTAMP | Soft delete timestamp (NULL = aktif) |

**Tabel `kegiatan`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| religion_id | INT (FK) | Referensi ke religions |
| nama_kegiatan | VARCHAR | Nama kegiatan |
| tanggal | DATE | Tanggal kegiatan |
| waktu_mulai | TIME | Waktu mulai |
| waktu_selesai | TIME | Waktu selesai |
| lokasi | VARCHAR | Lokasi kegiatan |
| deskripsi | TEXT | Deskripsi kegiatan |
| kapasitas | INT | Kapasitas peserta (NULL = tidak terbatas) |
| status | ENUM | upcoming / ongoing / selesai / dibatalkan |
| created_by | INT (FK) | user_id pengurus yang membuat |
| created_at | TIMESTAMP | Waktu dibuat |
| deleted_at | TIMESTAMP | Soft delete timestamp |

**Tabel `donasi`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| religion_id | INT (FK) | Referensi ke religions |
| user_id | INT (FK) | Referensi ke users (jemaah) |
| nama_donatur | VARCHAR | Nama donatur |
| nominal | DECIMAL(15,2) | Jumlah donasi |
| tanggal | DATE | Tanggal donasi |
| metode_pembayaran | ENUM | transfer_bank / tunai / qris |
| status | ENUM | pending / dikonfirmasi / ditolak |
| catatan | TEXT | Keterangan tambahan |
| bukti_pembayaran | VARCHAR | Path file bukti bayar |
| dikonfirmasi_oleh | INT (FK) | user_id pengurus yang konfirmasi |
| created_at | TIMESTAMP | Waktu input |
| deleted_at | TIMESTAMP | Soft delete timestamp |
| deleted_reason | TEXT | Alasan penghapusan |

**Tabel `pengeluaran`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| religion_id | INT (FK) | Referensi ke religions |
| keterangan | VARCHAR | Deskripsi pengeluaran |
| nominal | DECIMAL(15,2) | Jumlah pengeluaran |
| tanggal | DATE | Tanggal pengeluaran |
| kategori | ENUM | operasional / kegiatan / sosial / lainnya |
| bukti | VARCHAR | Path file nota / bukti |
| created_by | INT (FK) | user_id yang mencatat |
| created_at | TIMESTAMP | Waktu input |
| deleted_at | TIMESTAMP | Soft delete timestamp |
| deleted_reason | TEXT | Alasan penghapusan |

**Tabel `rekening`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| religion_id | INT (FK) | Referensi ke religions |
| nama_bank | VARCHAR | Nama bank / layanan |
| nomor_rekening | VARCHAR | Nomor rekening / ID |
| nama_pemilik | VARCHAR | Nama pemilik rekening |
| catatan | TEXT | Keterangan tambahan |
| status | ENUM | aktif / nonaktif |
| created_at | TIMESTAMP | Waktu dibuat |

**Tabel `notifikasi`:**

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INT (PK) | Primary key |
| user_id | INT (FK) | Referensi ke users (penerima) |
| judul | VARCHAR | Judul notifikasi |
| isi | TEXT | Isi notifikasi |
| url_tujuan | VARCHAR | Halaman yang dituju saat diklik |
| status | ENUM | belum_dibaca / sudah_dibaca |
| created_at | TIMESTAMP | Waktu notifikasi dibuat |

---

## 7. User Flow Diagram (Ringkas)

### Alur Login

```
Pengguna → Input Email + Password → Validasi Role & Religion
    → Berhasil → Dashboard sesuai role & sub-role
    → Gagal (< 5x) → Pesan error
    → Gagal (≥ 5x) → Akun terkunci 15 menit
```

### Alur Registrasi Jemaah

```
Jemaah → Halaman Publik → Klik "Daftar"
    → Isi Form Registrasi → Validasi Email Unik
    → Sistem kirim email verifikasi
    → Jemaah klik link verifikasi → Akun aktif → Login
```

### Alur Donasi

```
Jemaah Login → Halaman Donasi → Lihat Info Rekening Agama
    → Isi Form Donasi (nominal, metode) → Status: Pending
    → Jemaah transfer ke rekening yang tertera
    → Upload bukti pembayaran (opsional)
    → Bendahara / Ketua verifikasi
        → Dikonfirmasi → Notifikasi in-app ke jemaah → Saldo bertambah
        → Ditolak → Notifikasi in-app ke jemaah
```

### Alur Soft Delete & Restore

```
Pengurus / Superadmin → Pilih data → Klik Hapus
    → Dialog konfirmasi + isi alasan → Soft delete tersimpan
    → Data pindah ke Arsip (Recycle Bin)
    → Pengurus Ketua / Superadmin → Arsip → Pilih data → Restore
    → Data kembali aktif
```

### Alur Pengumuman Rich Text

```
Sekretaris / Ketua → Buat Pengumuman
    → Isi judul + konten (rich text editor)
    → Upload lampiran (opsional, maks 3 file)
    → Set expire date (opsional)
    → Simpan sebagai Draft atau langsung Publish
    → Jika Publish → Notifikasi in-app ke seluruh jemaah agama
```

---

## 8. Future Development

Pengembangan lanjutan yang direncanakan:

- Notifikasi WhatsApp per agama (integrasi WhatsApp Business API)
- Integrasi payment gateway donasi (Midtrans / Xendit) menggantikan alur manual
- Aplikasi mobile (Android & iOS)
- Multi-tempat ibadah dalam satu agama (multi-branch)
- Fitur absensi kegiatan untuk jemaah
- Donasi rutin / berlangganan (recurring donation)
- Laporan keuangan dengan grafik lebih lengkap (chart export)
- Multi-bahasa (Bahasa Indonesia & Bahasa Inggris)

---

## 9. Revision History

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | — | Draft awal |
| 2.0 | April 2026 | Tambah: forgot password, session management, proteksi brute force, registrasi mandiri jemaah, status kegiatan, expire date pengumuman, alur donasi manual, filter & export laporan, spesifikasi dashboard, atribut database, user flow, reliability & backup, error handling |
| 3.0 | April 2026 | Tambah: sub-role pengurus (Ketua/Bendahara/Sekretaris), manajemen profil pengguna, soft delete & restore seluruh modul, info rekening pembayaran, pengeluaran kas & laporan saldo, rich text editor & lampiran pengumuman, notifikasi in-app, halaman publik, search & pagination seluruh modul, ketentuan file upload global, tabel database lengkap |

---

*Dokumen ini menjadi acuan utama dalam proses analisis dan pengembangan sistem IbadahHub berbasis web dengan arsitektur multi-religion management system.*
