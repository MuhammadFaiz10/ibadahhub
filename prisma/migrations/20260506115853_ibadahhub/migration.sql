-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'PENGURUS', 'JEMAAH');

-- CreateEnum
CREATE TYPE "SubRole" AS ENUM ('KETUA', 'BENDAHARA', 'SEKRETARIS');

-- CreateEnum
CREATE TYPE "StatusKegiatan" AS ENUM ('UPCOMING', 'ONGOING', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusDonasi" AS ENUM ('PENDING', 'DIKONFIRMASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('TRANSFER_BANK', 'TUNAI', 'QRIS');

-- CreateEnum
CREATE TYPE "StatusPengumuman" AS ENUM ('DRAFT', 'AKTIF', 'KADALUARSA');

-- CreateEnum
CREATE TYPE "KategoriPengeluaran" AS ENUM ('OPERASIONAL', 'KEGIATAN', 'SOSIAL', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusRekening" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateTable
CREATE TABLE "Religion" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Religion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "subRole" "SubRole",
    "religionId" INTEGER,
    "fotoProfil" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Jemaah" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "religionId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "noHp" TEXT,
    "alamat" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Jemaah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktuMulai" TEXT NOT NULL,
    "waktuSelesai" TEXT,
    "lokasi" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kapasitas" INTEGER,
    "status" "StatusKegiatan" NOT NULL DEFAULT 'UPCOMING',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengumuman" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "tanggalPublish" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireDate" TIMESTAMP(3),
    "status" "StatusPengumuman" NOT NULL DEFAULT 'DRAFT',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,

    CONSTRAINT "Pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengumumanLampiran" (
    "id" SERIAL NOT NULL,
    "pengumumanId" INTEGER NOT NULL,
    "namaFile" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PengumumanLampiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donasi" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "userId" INTEGER,
    "jemaahId" INTEGER,
    "namaDonatur" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "metodePembayaran" "MetodePembayaran" NOT NULL,
    "status" "StatusDonasi" NOT NULL DEFAULT 'PENDING',
    "catatan" TEXT,
    "buktiPembayaran" TEXT,
    "dikonfirmasiOleh" INTEGER,
    "dikonfirmasiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,

    CONSTRAINT "Donasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengeluaran" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kategori" "KategoriPengeluaran" NOT NULL,
    "bukti" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,

    CONSTRAINT "Pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rekening" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "namaBank" TEXT NOT NULL,
    "nomorRekening" TEXT NOT NULL,
    "namaPemilik" TEXT NOT NULL,
    "catatan" TEXT,
    "status" "StatusRekening" NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rekening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "urlTujuan" TEXT,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "aksi" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" INTEGER,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Religion_nama_key" ON "Religion"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Jemaah_userId_key" ON "Jemaah"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jemaah" ADD CONSTRAINT "Jemaah_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jemaah" ADD CONSTRAINT "Jemaah_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengumuman" ADD CONSTRAINT "Pengumuman_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengumumanLampiran" ADD CONSTRAINT "PengumumanLampiran_pengumumanId_fkey" FOREIGN KEY ("pengumumanId") REFERENCES "Pengumuman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_jemaahId_fkey" FOREIGN KEY ("jemaahId") REFERENCES "Jemaah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_dikonfirmasiOleh_fkey" FOREIGN KEY ("dikonfirmasiOleh") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rekening" ADD CONSTRAINT "Rekening_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
