-- CreateEnum
CREATE TYPE "StatusPendaftaran" AS ENUM ('TERDAFTAR', 'HADIR', 'TIDAK_HADIR', 'BATAL');

-- AlterTable
ALTER TABLE "Donasi" ADD COLUMN     "rekeningId" INTEGER;

-- CreateTable
CREATE TABLE "KegiatanPendaftaran" (
    "id" SERIAL NOT NULL,
    "kegiatanId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "StatusPendaftaran" NOT NULL DEFAULT 'TERDAFTAR',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KegiatanPendaftaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KegiatanPendaftaran_kegiatanId_userId_key" ON "KegiatanPendaftaran"("kegiatanId", "userId");

-- AddForeignKey
ALTER TABLE "KegiatanPendaftaran" ADD CONSTRAINT "KegiatanPendaftaran_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KegiatanPendaftaran" ADD CONSTRAINT "KegiatanPendaftaran_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donasi" ADD CONSTRAINT "Donasi_rekeningId_fkey" FOREIGN KEY ("rekeningId") REFERENCES "Rekening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
