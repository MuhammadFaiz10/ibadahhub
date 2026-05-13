-- ============================================================
-- Migration: Add TempatIbadah (multi-tenant per place of worship)
-- ============================================================
-- Strategy:
--   1. Create StatusTempatIbadah enum & TempatIbadah table
--   2. For each existing Religion, create 1 default TempatIbadah ("<Nama> Pusat")
--   3. Add tempatIbadahId column (nullable) on dependent tables
--   4. Backfill tempatIbadahId from the default TempatIbadah of each row's religionId
--   5. Set NOT NULL where required & add foreign keys + indexes
-- ============================================================

-- 1) Enum
CREATE TYPE "StatusTempatIbadah" AS ENUM ('AKTIF', 'NONAKTIF');

-- 2) TempatIbadah table
CREATE TABLE "TempatIbadah" (
    "id"         SERIAL PRIMARY KEY,
    "religionId" INTEGER NOT NULL,
    "nama"       TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "alamat"     TEXT,
    "kota"       TEXT,
    "provinsi"   TEXT,
    "kodePos"    TEXT,
    "noTelp"     TEXT,
    "email"      TEXT,
    "logo"       TEXT,
    "deskripsi"  TEXT,
    "latitude"   DECIMAL(10,7),
    "longitude"  DECIMAL(10,7),
    "status"     "StatusTempatIbadah" NOT NULL DEFAULT 'AKTIF',
    "createdBy"  INTEGER,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"  TIMESTAMP(3)
);

CREATE UNIQUE INDEX "TempatIbadah_slug_key" ON "TempatIbadah"("slug");
CREATE INDEX "TempatIbadah_religionId_idx" ON "TempatIbadah"("religionId");

ALTER TABLE "TempatIbadah"
  ADD CONSTRAINT "TempatIbadah_religionId_fkey"
  FOREIGN KEY ("religionId") REFERENCES "Religion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Seed 1 default TempatIbadah per Religion (slug = lower(nama) + '-pusat')
INSERT INTO "TempatIbadah" ("religionId", "nama", "slug", "deskripsi", "status")
SELECT
    r."id",
    r."nama" || ' Pusat',
    lower(regexp_replace(r."nama", '[^a-zA-Z0-9]+', '-', 'g')) || '-pusat',
    'Tempat ibadah default (auto-generated saat migrasi multi-tenant)',
    'AKTIF'
FROM "Religion" r
WHERE r."deletedAt" IS NULL;

-- ============================================================
-- 4) Add tempatIbadahId columns + backfill + constraints
-- ============================================================

-- ---------- User (nullable: SUPERADMIN tidak punya tempatIbadah) ----------
ALTER TABLE "User" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "User" u
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE u."religionId" IS NOT NULL
  AND ti."religionId" = u."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "User"
  ADD CONSTRAINT "User_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- Jemaah (NOT NULL) ----------
ALTER TABLE "Jemaah" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Jemaah" j
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = j."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Jemaah" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Jemaah"
  ADD CONSTRAINT "Jemaah_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Jemaah_tempatIbadahId_idx" ON "Jemaah"("tempatIbadahId");

-- ---------- Kegiatan (NOT NULL) ----------
ALTER TABLE "Kegiatan" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Kegiatan" k
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = k."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Kegiatan" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Kegiatan"
  ADD CONSTRAINT "Kegiatan_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Kegiatan_tempatIbadahId_idx" ON "Kegiatan"("tempatIbadahId");

-- ---------- Pengumuman (NOT NULL) ----------
ALTER TABLE "Pengumuman" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Pengumuman" p
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = p."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Pengumuman" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Pengumuman"
  ADD CONSTRAINT "Pengumuman_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Pengumuman_tempatIbadahId_idx" ON "Pengumuman"("tempatIbadahId");

-- ---------- Donasi (NOT NULL) ----------
ALTER TABLE "Donasi" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Donasi" d
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = d."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Donasi" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Donasi"
  ADD CONSTRAINT "Donasi_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Donasi_tempatIbadahId_idx" ON "Donasi"("tempatIbadahId");

-- ---------- Pengeluaran (NOT NULL) ----------
ALTER TABLE "Pengeluaran" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Pengeluaran" pe
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = pe."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Pengeluaran" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Pengeluaran"
  ADD CONSTRAINT "Pengeluaran_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Pengeluaran_tempatIbadahId_idx" ON "Pengeluaran"("tempatIbadahId");

-- ---------- Rekening (NOT NULL) ----------
ALTER TABLE "Rekening" ADD COLUMN "tempatIbadahId" INTEGER;

UPDATE "Rekening" rk
SET "tempatIbadahId" = ti."id"
FROM "TempatIbadah" ti
WHERE ti."religionId" = rk."religionId"
  AND ti."slug" LIKE '%-pusat';

ALTER TABLE "Rekening" ALTER COLUMN "tempatIbadahId" SET NOT NULL;
ALTER TABLE "Rekening"
  ADD CONSTRAINT "Rekening_tempatIbadahId_fkey"
  FOREIGN KEY ("tempatIbadahId") REFERENCES "TempatIbadah"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Rekening_tempatIbadahId_idx" ON "Rekening"("tempatIbadahId");
