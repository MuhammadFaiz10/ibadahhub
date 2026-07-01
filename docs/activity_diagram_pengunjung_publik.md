# Activity Diagram - Role: Pengunjung Publik (Tanpa Login)

Dokumen ini berisi kumpulan **Activity Diagram** untuk peran **Pengunjung Publik (Tanpa Login)** di sistem IbadahHub. Diagram digambarkan menggunakan format **PlantUML**.

## Daftar Alur Kerja (Flows)
1. [Akses Halaman Publik Tempat Ibadah](#1-akses-halaman-publik-tempat-ibadah)

---

## 1. Akses Halaman Publik Tempat Ibadah
Pengunjung publik dapat melihat profil umum komunitas keagamaan dan agenda kegiatan tanpa harus memiliki akun terlebih dahulu.

```plantuml
@startuml
|Pengunjung Publik|
start
:Akses URL Halaman Publik (/publik/{nama-agama});
|Sistem|
:Ambil data Kegiatan status UPCOMING & ONGOING;
:Ambil data Pengumuman status AKTIF & belum kadaluarsa;
:Generate halaman profil komunitas agama;
|Pengunjung Publik|
:Tampilkan Halaman Publik Agama;
if (Pilih Tindakan selanjutnya?) then (Bergabung sebagai Jemaah)
  :Klik tombol "Bergabung sebagai Jemaah";
  :Arahkan ke Halaman Registrasi;
else (Login)
  :Klik tombol "Login";
  :Arahkan ke Halaman Login;
endif
stop
@enduml
```
