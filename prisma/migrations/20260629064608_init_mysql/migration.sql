-- CreateTable
CREATE TABLE `Religion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Religion_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TempatIbadah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `alamat` VARCHAR(191) NULL,
    `kota` VARCHAR(191) NULL,
    `provinsi` VARCHAR(191) NULL,
    `kodePos` VARCHAR(191) NULL,
    `noTelp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `deskripsi` TEXT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `TempatIbadah_slug_key`(`slug`),
    INDEX `TempatIbadah_religionId_idx`(`religionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('SUPERADMIN', 'PENGURUS', 'JEMAAH') NOT NULL,
    `subRole` ENUM('KETUA', 'BENDAHARA', 'SEKRETARIS') NULL,
    `religionId` INTEGER NULL,
    `tempatIbadahId` INTEGER NULL,
    `fotoProfil` VARCHAR(191) NULL,
    `noHp` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockoutUntil` DATETIME(3) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kegiatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `namaKegiatan` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `waktuMulai` VARCHAR(191) NOT NULL,
    `waktuSelesai` VARCHAR(191) NULL,
    `lokasi` VARCHAR(191) NOT NULL,
    `pemimpin` VARCHAR(191) NULL,
    `deskripsi` VARCHAR(191) NULL,
    `kapasitas` INTEGER NULL,
    `status` ENUM('UPCOMING', 'ONGOING', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'UPCOMING',
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(191) NULL,

    INDEX `Kegiatan_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KegiatanPendaftaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kegiatanId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `status` ENUM('TERDAFTAR', 'HADIR', 'TIDAK_HADIR', 'BATAL') NOT NULL DEFAULT 'TERDAFTAR',
    `catatan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KegiatanPendaftaran_kegiatanId_userId_key`(`kegiatanId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengumuman` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `isi` TEXT NOT NULL,
    `tanggalPublish` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expireDate` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'AKTIF', 'KADALUARSA') NOT NULL DEFAULT 'DRAFT',
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(191) NULL,

    INDEX `Pengumuman_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengumumanLampiran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengumumanId` INTEGER NOT NULL,
    `namaFile` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `ukuran` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Donasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `rekeningId` INTEGER NULL,
    `namaDonatur` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `metodePembayaran` ENUM('TRANSFER_BANK', 'TUNAI', 'QRIS', 'MIDTRANS') NOT NULL,
    `status` ENUM('PENDING', 'DIKONFIRMASI', 'DITOLAK') NOT NULL DEFAULT 'PENDING',
    `catatan` VARCHAR(191) NULL,
    `buktiPembayaran` VARCHAR(191) NULL,
    `dikonfirmasiOleh` INTEGER NULL,
    `dikonfirmasiAt` DATETIME(3) NULL,
    `midtransOrderId` VARCHAR(191) NULL,
    `midtransToken` VARCHAR(191) NULL,
    `midtransPaymentUrl` VARCHAR(191) NULL,
    `midtransStatus` VARCHAR(191) NULL,
    `midtransTransactionId` VARCHAR(191) NULL,
    `paymentChannel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(191) NULL,

    UNIQUE INDEX `Donasi_midtransOrderId_key`(`midtransOrderId`),
    INDEX `Donasi_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengeluaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `keterangan` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `kategori` ENUM('OPERASIONAL', 'KEGIATAN', 'SOSIAL', 'LAINNYA') NOT NULL,
    `bukti` VARCHAR(191) NULL,
    `rekeningId` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(191) NULL,

    INDEX `Pengeluaran_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pemasukan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `keterangan` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `kategori` ENUM('DONASI', 'HIBAH', 'USAHA', 'LAINNYA') NOT NULL,
    `bukti` VARCHAR(191) NULL,
    `rekeningId` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedReason` VARCHAR(191) NULL,

    INDEX `Pemasukan_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rekening` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `namaBank` VARCHAR(191) NOT NULL,
    `nomorRekening` VARCHAR(191) NOT NULL,
    `namaPemilik` VARCHAR(191) NOT NULL,
    `catatan` VARCHAR(191) NULL,
    `status` ENUM('AKTIF', 'NONAKTIF') NOT NULL DEFAULT 'AKTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Rekening_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notifikasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `isi` VARCHAR(191) NOT NULL,
    `urlTujuan` VARCHAR(191) NULL,
    `dibaca` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `aksi` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `recordId` INTEGER NULL,
    `detail` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TagihanKas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `jatuhTempo` DATETIME(3) NULL,
    `status` ENUM('BELUM_DIBAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DIBATALKAN') NOT NULL DEFAULT 'BELUM_DIBAYAR',
    `buktiPembayaran` VARCHAR(191) NULL,
    `metodePembayaran` ENUM('TRANSFER_BANK', 'TUNAI', 'QRIS', 'MIDTRANS') NULL,
    `pemasukanId` INTEGER NULL,
    `tanggalBayar` DATETIME(3) NULL,
    `dikonfirmasiOleh` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `TagihanKas_tempatIbadahId_idx`(`tempatIbadahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JadwalIbadah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `religionId` INTEGER NOT NULL,
    `tempatIbadahId` INTEGER NOT NULL,
    `namaIbadah` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `waktuMulai` VARCHAR(191) NOT NULL,
    `waktuSelesai` VARCHAR(191) NULL,
    `pemimpin` VARCHAR(191) NULL,
    `pendamping` VARCHAR(191) NULL,
    `lokasi` VARCHAR(191) NULL,
    `catatan` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `JadwalIbadah_tempatIbadahId_idx`(`tempatIbadahId`),
    INDEX `JadwalIbadah_tanggal_idx`(`tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TempatIbadah` ADD CONSTRAINT `TempatIbadah_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kegiatan` ADD CONSTRAINT `Kegiatan_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Kegiatan` ADD CONSTRAINT `Kegiatan_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KegiatanPendaftaran` ADD CONSTRAINT `KegiatanPendaftaran_kegiatanId_fkey` FOREIGN KEY (`kegiatanId`) REFERENCES `Kegiatan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KegiatanPendaftaran` ADD CONSTRAINT `KegiatanPendaftaran_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengumuman` ADD CONSTRAINT `Pengumuman_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengumuman` ADD CONSTRAINT `Pengumuman_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengumumanLampiran` ADD CONSTRAINT `PengumumanLampiran_pengumumanId_fkey` FOREIGN KEY (`pengumumanId`) REFERENCES `Pengumuman`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Donasi` ADD CONSTRAINT `Donasi_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Donasi` ADD CONSTRAINT `Donasi_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Donasi` ADD CONSTRAINT `Donasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Donasi` ADD CONSTRAINT `Donasi_rekeningId_fkey` FOREIGN KEY (`rekeningId`) REFERENCES `Rekening`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Donasi` ADD CONSTRAINT `Donasi_dikonfirmasiOleh_fkey` FOREIGN KEY (`dikonfirmasiOleh`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengeluaran` ADD CONSTRAINT `Pengeluaran_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengeluaran` ADD CONSTRAINT `Pengeluaran_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengeluaran` ADD CONSTRAINT `Pengeluaran_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengeluaran` ADD CONSTRAINT `Pengeluaran_rekeningId_fkey` FOREIGN KEY (`rekeningId`) REFERENCES `Rekening`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pemasukan` ADD CONSTRAINT `Pemasukan_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pemasukan` ADD CONSTRAINT `Pemasukan_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pemasukan` ADD CONSTRAINT `Pemasukan_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pemasukan` ADD CONSTRAINT `Pemasukan_rekeningId_fkey` FOREIGN KEY (`rekeningId`) REFERENCES `Rekening`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rekening` ADD CONSTRAINT `Rekening_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rekening` ADD CONSTRAINT `Rekening_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notifikasi` ADD CONSTRAINT `Notifikasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_pemasukanId_fkey` FOREIGN KEY (`pemasukanId`) REFERENCES `Pemasukan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_dikonfirmasiOleh_fkey` FOREIGN KEY (`dikonfirmasiOleh`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagihanKas` ADD CONSTRAINT `TagihanKas_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalIbadah` ADD CONSTRAINT `JadwalIbadah_religionId_fkey` FOREIGN KEY (`religionId`) REFERENCES `Religion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalIbadah` ADD CONSTRAINT `JadwalIbadah_tempatIbadahId_fkey` FOREIGN KEY (`tempatIbadahId`) REFERENCES `TempatIbadah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalIbadah` ADD CONSTRAINT `JadwalIbadah_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
