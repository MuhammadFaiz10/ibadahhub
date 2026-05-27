-- CreateEnum
CREATE TYPE "KategoriPemasukan" AS ENUM ('DONASI', 'HIBAH', 'USAHA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusTagihanKas" AS ENUM ('BELUM_DIBAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DIBATALKAN');

-- AlterTable
ALTER TABLE "Kegiatan" ADD COLUMN     "pemimpin" TEXT;

-- AlterTable
ALTER TABLE "Pengeluaran" ADD COLUMN     "rekeningId" INTEGER;

-- AlterTable
ALTER TABLE "TempatIbadah" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Pemasukan" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "tempatIbadahId" INTEGER NOT NULL,
    "keterangan" TEXT NOT NULL,
    "nominal" DECIMAL(15,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kategori" "KategoriPemasukan" NOT NULL,
    "bukti" TEXT,
    "rekeningId" INTEGER,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedReason" TEXT,

    CONSTRAINT "Pemasukan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagihanKas" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "tempatIbadahId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "nominal" DECIMAL(15,2) NOT NULL,
    "jatuhTempo" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TagihanKas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagihanKasJemaah" (
    "id" SERIAL NOT NULL,
    "tagihanId" INTEGER NOT NULL,
    "jemaahId" INTEGER NOT NULL,
    "status" "StatusTagihanKas" NOT NULL DEFAULT 'BELUM_DIBAYAR',
    "buktiPembayaran" TEXT,
    "metodePembayaran" "MetodePembayaran",
    "pemasukanId" INTEGER,
    "tanggalBayar" TIMESTAMP(3),
    "dikonfirmasiOleh" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagihanKasJemaah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalIbadah" (
    "id" SERIAL NOT NULL,
    "religionId" INTEGER NOT NULL,
    "tempatIbadahId" INTEGER NOT NULL,
    "namaIbadah" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "waktuMulai" TEXT NOT NULL,
    "waktuSelesai" TEXT,
    "pemimpin" TEXT,
    "pendamping" TEXT,
    "lokasi" TEXT,
    "catatan" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JadwalIbadah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pemasukan_tempatIbadahId_idx" ON "Pemasukan"("tempatIbadahId");

-- CreateIndex
CREATE INDEX "TagihanKas_tempatIbadahId_idx" ON "TagihanKas"("tempatIbadahId");

-- CreateIndex
CREATE UNIQUE INDEX "TagihanKasJemaah_tagihanId_jemaahId_key" ON "TagihanKasJemaah"("tagihanId", "jemaahId");

-- CreateIndex
CREATE INDEX "JadwalIbadah_tempatIbadahId_idx" ON "JadwalIbadah"("tempatIbadahId");

-- CreateIndex
CREATE INDEX "JadwalIbadah_tanggal_idx" ON "JadwalIbadah"("tanggal");

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_rekeningId_fkey" FOREIGN KEY ("rekeningId") REFERENCES "Rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemasukan" ADD CONSTRAINT "Pemasukan_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemasukan" ADD CONSTRAINT "Pemasukan_tempatIbadahId_fkey" FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemasukan" ADD CONSTRAINT "Pemasukan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pemasukan" ADD CONSTRAINT "Pemasukan_rekeningId_fkey" FOREIGN KEY ("rekeningId") REFERENCES "Rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKas" ADD CONSTRAINT "TagihanKas_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKas" ADD CONSTRAINT "TagihanKas_tempatIbadahId_fkey" FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKas" ADD CONSTRAINT "TagihanKas_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKasJemaah" ADD CONSTRAINT "TagihanKasJemaah_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES "TagihanKas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKasJemaah" ADD CONSTRAINT "TagihanKasJemaah_jemaahId_fkey" FOREIGN KEY ("jemaahId") REFERENCES "Jemaah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKasJemaah" ADD CONSTRAINT "TagihanKasJemaah_pemasukanId_fkey" FOREIGN KEY ("pemasukanId") REFERENCES "Pemasukan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagihanKasJemaah" ADD CONSTRAINT "TagihanKasJemaah_dikonfirmasiOleh_fkey" FOREIGN KEY ("dikonfirmasiOleh") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalIbadah" ADD CONSTRAINT "JadwalIbadah_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "Religion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalIbadah" ADD CONSTRAINT "JadwalIbadah_tempatIbadahId_fkey" FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalIbadah" ADD CONSTRAINT "JadwalIbadah_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
