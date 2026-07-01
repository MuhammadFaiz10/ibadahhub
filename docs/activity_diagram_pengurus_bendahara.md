# Activity Diagram Terpadu - Role: Pengurus Bendahara (Treasurer)

Dokumen ini berisi satu **Activity Diagram Tunggal (Unified)** untuk peran **Pengurus Bendahara (Treasurer)** di sistem IbadahHub. Diagram ini menggabungkan semua fitur dan alur kerja Pengurus Bendahara dalam satu kesatuan diagram alur yang saling terhubung menggunakan format **PlantUML**.

## Diagram Alur Aktivitas Terpadu (Unified)

```plantuml
@startuml
|Pengurus Bendahara|
start
:Buka Halaman Login;
:Masukkan Email & Password Pengurus Bendahara;
:Klik Login;

|Sistem|
if (Akun Terkunci?) then (Ya)
  if (Waktu Kunci > 15 Menit?) then (Ya)
    :Buka Kunci & Reset Percobaan Gagal;
  else (Tidak)
    |Pengurus Bendahara|
    :Tampilkan Pesan: Akun Terkunci 15 Menit;
    stop
  endif
else (Tidak)
endif

|Sistem|
if (Kredensial Cocok?) then (Ya)
  :Reset Percobaan Gagal;
  :Buat Session Token baru;
  :Arahkan ke Dashboard Pengurus (/pengurus);
  
  repeat
    |Pengurus Bendahara|
    :Buka Dashboard & Pilih Menu/Aktivitas;
    if (Menu yang Dipilih?) then (Verifikasi & Pencatatan Donasi)
      if (Jenis Pencatatan?) then (Input Tunai Langsung)
        :Isi Form: Nama Donatur, Nominal, Tanggal, Metode: Tunai;
        :Klik Simpan Donasi;
        |Sistem|
        :Simpan Donasi dengan Status DIKONFIRMASI;
        :Tambahkan Nominal ke Saldo Kas Agama secara real-time;
      else (Verifikasi Transfer Jemaah)
        |Pengurus Bendahara|
        :Buka Halaman Konfirmasi Donasi (Pending);
        :Periksa Bukti Transfer Jemaah;
        if (Apakah Bukti Transfer Valid?) then (Ya)
          |Sistem|
          :Ubah Status Donasi menjadi DIKONFIRMASI;
          :Tambahkan Nominal ke Saldo Kas Agama secara real-time;
        else (Tidak)
          |Sistem|
          :Ubah Status Donasi menjadi DITOLAK;
        endif
        :Kirim Notifikasi Update Donasi ke Jemaah;
      endif
      
    elseif (Pencatatan Pengeluaran Kas)
      |Pengurus Bendahara|
      :Masuk Menu Pengeluaran & Klik Tambah;
      :Isi Form: Keterangan, Kategori, Nominal, Tanggal & Bukti Nota;
      :Klik Simpan Pengeluaran;
      |Sistem|
      :Simpan Pengeluaran & Kurangi Saldo Kas secara real-time;
      :Tampilkan Pesan Berhasil;
      
    elseif (Laporan Keuangan)
      |Pengurus Bendahara|
      :Akses Halaman Laporan Keuangan;
      if (Pilih Aksi?) then (Ekspor Laporan)
        |Sistem|
        :Kalkulasi Saldo: Total Donasi Dikonfirmasi - Total Pengeluaran Aktif;
        :Generate File Laporan Keuangan;
        |Pengurus Bendahara|
        :Unduh File Laporan (PDF/Excel/CSV);
      else (Lihat Visualisasi)
        |Pengurus Bendahara|
        :Lihat Grafik Tren & Detail Kategori;
      endif
      
    else (Logout)
      |Pengurus Bendahara|
      :Klik Logout;
      |Sistem|
      :Hancurkan Session Token;
      stop
    endif
  repeat while (Tetap Login?) is (Ya)
  
else (Tidak)
  |Sistem|
  :Tambah Percobaan Gagal +1;
  if (Percobaan Gagal >= 5?) then (Ya)
    :Kunci Akun 15 Menit & Catat Log;
    |Pengurus Bendahara|
    :Tampilkan Pesan: Akun dikunci sementara;
  else (Tidak)
    |Pengurus Bendahara|
    :Tampilkan Pesan: Email/Password Salah;
  endif
  stop
endif
@enduml
```
