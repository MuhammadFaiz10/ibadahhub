# Activity Diagram Terpadu - Role: Jemaah (Congregation Member)

Dokumen ini berisi satu **Activity Diagram Tunggal (Unified)** untuk peran **Jemaah (Congregation Member)** di sistem IbadahHub. Diagram ini menggabungkan semua fitur dan alur kerja Jemaah dalam satu kesatuan diagram alur yang saling terhubung menggunakan format **PlantUML**.

## Diagram Alur Aktivitas Terpadu (Unified)

```plantuml
@startuml
|Jemaah|
start
if (Pilih Tindakan Awal?) then (Registrasi Akun Baru)
  :Buka Halaman Registrasi;
  :Input Nama, Email, Password, & Konfirmasi Password;
  :Pilih Agama (religionId);
  |Sistem|
  :Ambil Daftar Tempat Ibadah berdasarkan Agama;
  |Jemaah|
  :Pilih Tempat Ibadah (tempatIbadahId);
  :Input Nomor HP & Alamat;
  :Klik Daftar Sekarang;
  |Sistem|
  :Validasi Form & Cek Keunikan Email;
  if (Valid & Email Unik?) then (Ya)
    :Simpan Jemaah status Nonaktif;
    :Generate Verification Token (Masa Berlaku 24 Jam);
    :Kirim Email Verifikasi;
    |Jemaah|
    :Terima Email & Klik Link Verifikasi;
    |Sistem|
    if (Link Valid & Belum Kedaluwarsa?) then (Ya)
      :Ubah Status Akun Jemaah menjadi Aktif;
      |Jemaah|
      :Tampilkan Pesan Verifikasi Sukses;
    else (Tidak)
      |Jemaah|
      :Tampilkan Error: Link Kedaluwarsa;
      :Klik Kirim Ulang Email Verifikasi;
      |Sistem|
      :Kirim Ulang Email Verifikasi;
      stop
    endif
  else (Tidak)
    |Jemaah|
    :Tampilkan Error Form / Email Sudah Terdaftar;
    stop
  endif
else (Langsung Login)
endif

|Jemaah|
:Buka Halaman Login;
:Masukkan Email & Password Jemaah;
:Klik Login;

|Sistem|
if (Akun Terkunci?) then (Ya)
  if (Waktu Kunci > 15 Menit?) then (Ya)
    :Buka Kunci & Reset Percobaan Gagal;
  else (Tidak)
    |Jemaah|
    :Tampilkan Pesan: Akun Terkunci 15 Menit;
    stop
  endif
else (Tidak)
endif

|Sistem|
if (Kredensial Cocok?) then (Ya)
  :Reset Percobaan Gagal;
  :Buat Session Token baru;
  :Arahkan ke Dashboard Jemaah (/dashboard);
  
  repeat
    |Jemaah|
    :Buka Dashboard & Pilih Menu/Aktivitas;
    if (Menu yang Dipilih?) then (Manajemen Profil Pribadi)
      if (Tindakan Profil?) then (Edit Profil)
        :Edit Data Profil & Upload Foto Baru;
        :Klik Simpan;
        |Sistem|
        if (Ada Foto Baru?) then (Ya)
          :Validasi Foto (Format & Ukuran);
          :Simpan Foto Baru & Hapus Foto Lama;
        else (Tidak)
        endif
        :Update Profil di Database;
      else (Ganti Password)
        |Jemaah|
        :Masukkan Password Lama & Baru;
        :Klik Simpan Password;
        |Sistem|
        if (Password Lama Sesuai & Baru Valid?) then (Ya)
          :Enkripsi Password dengan Bcrypt;
          :Update Password di DB & Kirim Notifikasi;
        else (Tidak)
          |Jemaah|
          :Tampilkan Error Ganti Password;
        endif
      endif
      
    elseif (Pendaftaran Kegiatan Ibadah)
      |Jemaah|
      :Buka Jadwal Kegiatan;
      :Pilih Kegiatan (UPCOMING);
      if (Kapasitas Kegiatan Terbatas?) then (Ya)
        |Sistem|
        if (Kuota Penuh?) then (Ya)
          |Jemaah|
          :Tampilkan Pesan: Pendaftaran Penuh;
        else (Tidak)
          |Jemaah|
          :Isi Catatan & Klik Daftar Kegiatan;
          |Sistem|
          :Simpan record Pendaftaran status TERDAFTAR;
          :Kurangi Sisa Kapasitas Kegiatan;
          :Tampilkan Tiket Pendaftaran;
        endif
      else (Tidak Terbatas)
        |Jemaah|
        :Isi Catatan & Klik Daftar Kegiatan;
        |Sistem|
        :Simpan record Pendaftaran status TERDAFTAR;
        :Tampilkan Tiket Pendaftaran;
      endif
      
    elseif (Donasi)
      |Jemaah|
      if (Pilih Metode Pembayaran?) then (Manual Bank Transfer)
        :Pilih Rekening Agama & Transfer Manual;
        :Isi Form: Nominal, Catatan & Upload Bukti;
        :Klik Kirim Donasi;
        |Sistem|
        :Simpan Donasi dengan Status PENDING;
        :Kirim Notifikasi ke Pengurus Bendahara;
      else (Midtrans Payment Gateway)
        |Jemaah|
        :Input Nominal Donasi & Catatan;
        :Klik Bayar Sekarang;
        |Sistem|
        :Buat Transaksi Donasi status PENDING;
        :Kirim Request Token ke API Midtrans;
        |Midtrans|
        :Generate Token & URL Pembayaran;
        |Sistem|
        :Tampilkan Snap Payment Popup di Browser Jemaah;
        |Jemaah|
        :Lakukan Pembayaran di Portal Midtrans;
        |Midtrans|
        :Proses Pembayaran & Kirim Webhook ke Sistem;
        |Sistem|
        if (Status Webhook?) then (settlement / capture)
          :Ubah Status Donasi menjadi DIKONFIRMASI;
          :Tambahkan Nominal ke Saldo Kas Agama;
        else (expire / cancel / deny)
          :Ubah Status Donasi menjadi DITOLAK;
        endif
      endif
      
    elseif (Pembayaran Tagihan Kas)
      |Jemaah|
      :Buka menu Tagihan Kas;
      :Pilih Tagihan status BELUM_DIBAYAR;
      :Transfer Nominal & Upload Bukti Pembayaran;
      :Klik Konfirmasi;
      |Sistem|
      :Ubah Status Tagihan Jemaah menjadi MENUNGGU_KONFIRMASI;
      :Kirim Notifikasi In-App ke Pengurus Bendahara;
      
    else (Logout)
      |Jemaah|
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
    |Jemaah|
    :Tampilkan Pesan: Akun dikunci sementara;
  else (Tidak)
    |Jemaah|
    :Tampilkan Pesan: Email/Password Salah;
  endif
  stop
endif
@enduml
```
