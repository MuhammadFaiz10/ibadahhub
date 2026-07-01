# Kumpulan Activity Diagram - IbadahHub

Dokumen ini adalah indeks utama untuk **Activity Diagram** di sistem IbadahHub. Untuk memudahkan pemeliharaan dan keterbacaan, diagram alur sistem sekarang dipisah ke dalam berkas tersendiri berdasarkan peran (Role) pengguna secara lengkap (mencakup seluruh alur fungsional, tidak hanya satu *flow*).

Setiap diagram digambarkan menggunakan layout **Swimlane** dalam format **PlantUML**.

---

## Daftar Berkas Activity Diagram per Peran (Role)

### 1. [Role: Superadmin](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_superadmin.md)
Mengelola data lintas agama, monitoring audit trail global, serta pendaftaran & pengelolaan akun pengurus utama.
* **Alur Utama:** Login & Brute Force Protection, CRUD Agama (Religion), Kelola Akun Pengurus Lintas Agama, Dashboard Global, Log Audit Trail, Global Recycle Bin (Restore & Hard Delete).
* **Tautan Berkas:** [activity_diagram_superadmin.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_superadmin.md)

### 2. [Role: Pengurus Ketua (Head Admin)](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_ketua.md)
Penanggung jawab penuh di tingkat tempat ibadah / tenant.
* **Alur Utama:** Login & Brute Force Protection, Kelola Akun Pengurus Bendahara & Sekretaris, Kelola Rekening Pembayaran Resmi, Siklus Hapus Logis (Soft Delete) & Pemulihan (Restore) lokal.
* **Tautan Berkas:** [activity_diagram_pengurus_ketua.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_ketua.md)

### 3. [Role: Pengurus Bendahara (Treasurer)](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_bendahara.md)
Fokus pada sirkulasi finansial tempat ibadah.
* **Alur Utama:** Login & Brute Force Protection, Pencatatan Donasi Tunai, Verifikasi Transfer Donasi Jemaah, Pencatatan Pengeluaran Kas (Expenses), Visualisasi & Ekspor Laporan Keuangan (PDF/Excel/CSV).
* **Tautan Berkas:** [activity_diagram_pengurus_bendahara.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_bendahara.md)

### 4. [Role: Pengurus Sekretaris (Secretary)](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_sekretaris.md)
Fokus pada administrasi jemaah, penjadwalan, kegiatan, absensi, dan pengumuman.
* **Alur Utama:** Login & Brute Force Protection, CRUD Jemaah Manual, CRUD Kegiatan Ibadah, Absensi Pendaftaran Kegiatan, Manajemen Pengumuman (Rich Text & Lampiran), Manajemen Jadwal Ibadah.
* **Tautan Berkas:** [activity_diagram_pengurus_sekretaris.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengurus_sekretaris.md)

### 5. [Role: Jemaah (Congregation Member)](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_jemaah.md)
Anggota terdaftar tempat ibadah.
* **Alur Utama:** Login & Brute Force Protection, Registrasi Mandiri & Verifikasi Email Akun, Edit Profil & Ganti Kata Sandi, Pendaftaran Kegiatan Ibadah, Donasi Manual & Otomatis (Midtrans Snap Gateway), Konfirmasi Pembayaran Tagihan Kas.
* **Tautan Berkas:** [activity_diagram_jemaah.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_jemaah.md)

### 6. [Role: Pengunjung Publik (Tanpa Login)](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengunjung_publik.md)
Masyarakat umum yang mengakses profil masjid/tempat ibadah.
* **Alur Utama:** Akses Halaman Informasi Publik (Kegiatan & Pengumuman Aktif), Navigasi ke Registrasi Jemaah / Halaman Login.
* **Tautan Berkas:** [activity_diagram_pengunjung_publik.md](file:///home/faiz/Repository/ibadahhub/docs/activity_diagram_pengunjung_publik.md)
