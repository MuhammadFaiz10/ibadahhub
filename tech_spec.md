**IbadahHub**

Technical Specification Document

_Next.js 14 + PostgreSQL (Local)_

Versi 1.0 | April 2026 | Untuk Claude Code Agent

# **1\. Overview Stack Teknologi**

Dokumen ini adalah spesifikasi teknis lengkap untuk membangun sistem IbadahHub menggunakan Next.js 14 (App Router) sebagai full-stack framework dan PostgreSQL lokal sebagai database. Dokumen ini ditujukan langsung kepada Claude Code Agent sebagai panduan implementasi.

## **1.1 Ringkasan Stack**

| **Layer**   | **Teknologi**        | **Versi**         | **Keterangan**                         |
| ----------- | -------------------- | ----------------- | -------------------------------------- |
| Framework   | Next.js              | 14.x (App Router) | Full-stack: frontend + API Routes      |
| Language    | TypeScript           | 5.x               | Wajib, strict mode aktif               |
| Styling     | Tailwind CSS         | 3.x               | Utility-first, custom color config     |
| Komponen UI | Shadcn/UI            | Latest            | Headless + styled, di-extend manual    |
| Database    | PostgreSQL           | 16.x (local)      | Relational, soft delete, JSON support  |
| ORM         | Prisma               | 5.x               | Type-safe, migration, schema generator |
| Auth        | Auth.js (NextAuth)   | v5 (beta)         | Session, JWT, role-based               |
| Validasi    | Zod                  | 3.x               | Schema validation server & client      |
| Rich Text   | Tiptap               | 2.x               | Editor pengumuman, output HTML         |
| Chart       | Recharts             | 2.x               | Dashboard grafik donasi/pengeluaran    |
| Ikon        | Lucide React         | Latest            | Satu library ikon, konsisten           |
| Email       | Resend + React Email | Latest            | Verifikasi, reset password, notif      |
| Upload File | Multer / Formidable  | Latest            | File lokal di /public/uploads          |
| Export      | jsPDF + xlsx         | Latest            | Export laporan PDF dan Excel           |
| Toast       | Sonner               | Latest            | Notifikasi toast bottom-right          |
| HTTP Client | Axios                | 1.x               | Client-side API calls                  |
| Date        | date-fns             | 3.x               | Manipulasi tanggal, locale ID          |
| Env         | dotenv / .env.local  | -                 | Konfigurasi environment variable       |

## **1.2 Versi Node.js & Tools**

| **Tool**   | **Versi Minimum** | **Catatan**                                           |
| ---------- | ----------------- | ----------------------------------------------------- |
| Node.js    | 20.x LTS          | Gunakan nvm untuk manajemen versi                     |
| npm        | 10.x              | Package manager utama                                 |
| PostgreSQL | 16.x              | Install lokal via installer resmi atau Homebrew (Mac) |
| psql       | 16.x              | CLI untuk manajemen database                          |
| Git        | 2.x               | Version control wajib                                 |
| VS Code    | Latest            | Editor rekomendasi                                    |

# **2\. Struktur Project**

## **2.1 Inisialisasi Project**

Jalankan perintah berikut untuk membuat project baru:

| npx create-next-app@latest ibadahhub \\ |
| --------------------------------------- |
| \--typescript \\                        |
| \--tailwind \\                          |
| \--eslint \\                            |
| \--app \\                               |
| \--src-dir \\                           |
| \--import-alias '@/\*'                  |

Kemudian install semua dependency:

| \# Core                                                                                      |
| -------------------------------------------------------------------------------------------- |
| npm install prisma @prisma/client                                                            |
| npm install next-auth@beta @auth/prisma-adapter                                              |
| npm install zod axios date-fns                                                               |
|                                                                                              |
| \# UI                                                                                        |
| npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image |
| npm install recharts lucide-react sonner                                                     |
| npm install class-variance-authority clsx tailwind-merge                                     |
|                                                                                              |
| \# Shadcn/UI (jalankan satu per satu sesuai komponen yang dibutuhkan)                        |
| npx shadcn-ui@latest init                                                                    |
| npx shadcn-ui@latest add button input label select table dialog badge                        |
|                                                                                              |
| \# Email                                                                                     |
| npm install resend @react-email/components                                                   |
|                                                                                              |
| \# File & Export                                                                             |
| npm install multer jspdf xlsx                                                                |
| npm install -D @types/multer                                                                 |
|                                                                                              |
| \# Dev tools                                                                                 |
| npm install -D prisma tsx                                                                    |

## **2.2 Folder Structure**

Struktur direktori lengkap yang wajib diikuti:

| ibadahhub/                                                      |
| --------------------------------------------------------------- |
| ├── prisma/                                                     |
| │ ├── schema.prisma # Schema database utama                     |
| │ ├── seed.ts # Data seed awal (agama, superadmin)              |
| │ └── migrations/ # Folder migrasi otomatis Prisma              |
| │                                                               |
| ├── src/                                                        |
| │ ├── app/ # Next.js App Router                                 |
| │ │ ├── (public)/ # Route group: halaman publik (tanpa auth)    |
| │ │ │ ├── page.tsx # Beranda publik                             |
| │ │ │ ├── \[agama\]/                                            |
| │ │ │ │ └── page.tsx # Halaman per agama                        |
| │ │ │ ├── login/                                                |
| │ │ │ │ └── page.tsx                                            |
| │ │ │ └── register/                                             |
| │ │ │ └── page.tsx                                              |
| │ │ │                                                           |
| │ │ ├── (dashboard)/ # Route group: semua halaman setelah login |
| │ │ │ ├── layout.tsx # Shell: sidebar + topbar                  |
| │ │ │ ├── dashboard/                                            |
| │ │ │ │ └── page.tsx                                            |
| │ │ │ ├── jemaah/                                               |
| │ │ │ │ ├── page.tsx # List jemaah                              |
| │ │ │ │ ├── \[id\]/                                             |
| │ │ │ │ │ └── page.tsx # Detail jemaah                          |
| │ │ │ │ └── baru/                                               |
| │ │ │ │ └── page.tsx # Form tambah jemaah                       |
| │ │ │ ├── kegiatan/                                             |
| │ │ │ ├── pengumuman/                                           |
| │ │ │ ├── donasi/                                               |
| │ │ │ ├── pengeluaran/                                          |
| │ │ │ ├── laporan/                                              |
| │ │ │ ├── rekening/                                             |
| │ │ │ ├── pengurus/                                             |
| │ │ │ └── profil/                                               |
| │ │ │                                                           |
| │ │ ├── api/ # API Routes (server-side)                         |
| │ │ │ ├── auth/                                                 |
| │ │ │ │ └── \[...nextauth\]/                                    |
| │ │ │ │ └── route.ts                                            |
| │ │ │ ├── jemaah/                                               |
| │ │ │ │ ├── route.ts # GET list, POST create                    |
| │ │ │ │ └── \[id\]/                                             |
| │ │ │ │ └── route.ts # GET, PUT, DELETE (soft)                  |
| │ │ │ ├── kegiatan/                                             |
| │ │ │ ├── pengumuman/                                           |
| │ │ │ ├── donasi/                                               |
| │ │ │ ├── pengeluaran/                                          |
| │ │ │ ├── laporan/                                              |
| │ │ │ ├── rekening/                                             |
| │ │ │ ├── notifikasi/                                           |
| │ │ │ ├── profil/                                               |
| │ │ │ └── upload/                                               |
| │ │ │ └── route.ts # File upload handler                        |
| │ │ │                                                           |
| │ │ ├── layout.tsx # Root layout (font, metadata)               |
| │ │ └── globals.css # Global styles + Tailwind directives       |
| │ │                                                             |
| │ ├── components/                                               |
| │ │ ├── ui/ # Shadcn/UI components (auto-generated)             |
| │ │ ├── layout/                                                 |
| │ │ │ ├── Sidebar.tsx                                           |
| │ │ │ ├── TopBar.tsx                                            |
| │ │ │ └── Breadcrumb.tsx                                        |
| │ │ ├── shared/                                                 |
| │ │ │ ├── DataTable.tsx # Reusable table + pagination           |
| │ │ │ ├── SearchFilter.tsx                                      |
| │ │ │ ├── StatusBadge.tsx                                       |
| │ │ │ ├── ConfirmDialog.tsx                                     |
| │ │ │ ├── EmptyState.tsx                                        |
| │ │ │ ├── FileUpload.tsx                                        |
| │ │ │ └── PageHeader.tsx                                        |
| │ │ ├── dashboard/                                              |
| │ │ │ ├── StatCard.tsx                                          |
| │ │ │ └── DonasiChart.tsx                                       |
| │ │ ├── donasi/                                                 |
| │ │ ├── pengumuman/                                             |
| │ │ │ └── RichTextEditor.tsx                                    |
| │ │ └── notifikasi/                                             |
| │ │ └── NotifikasiPanel.tsx                                     |
| │ │                                                             |
| │ ├── lib/                                                      |
| │ │ ├── prisma.ts # Prisma client singleton                     |
| │ │ ├── auth.ts # Auth.js config                                |
| │ │ ├── utils.ts # cn(), formatRupiah(), dll                    |
| │ │ ├── validations/ # Zod schemas per modul                    |
| │ │ │ ├── jemaah.ts                                             |
| │ │ │ ├── kegiatan.ts                                           |
| │ │ │ ├── donasi.ts                                             |
| │ │ │ └── ...                                                   |
| │ │ └── email/                                                  |
| │ │ ├── resend.ts # Resend client                               |
| │ │ └── templates/ # React Email templates                      |
| │ │                                                             |
| │ ├── hooks/ # Custom React hooks                               |
| │ │ ├── useDebounce.ts                                          |
| │ │ └── useNotifikasi.ts                                        |
| │ │                                                             |
| │ ├── types/ # TypeScript type definitions                      |
| │ │ ├── next-auth.d.ts # Extend session types                   |
| │ │ └── index.ts                                                |
| │ │                                                             |
| │ └── middleware.ts # Route protection                          |
| │                                                               |
| ├── public/                                                     |
| │ └── uploads/ # File uploads disimpan di sini                  |
| │ ├── profil/                                                   |
| │ ├── donasi/                                                   |
| │ ├── pengeluaran/                                              |
| │ └── pengumuman/                                               |
| │                                                               |
| ├── .env.local # Environment variables (TIDAK di-commit)        |
| ├── .env.example # Template env (di-commit)                     |
| ├── tailwind.config.ts                                          |
| ├── next.config.js                                              |
| └── tsconfig.json                                               |

# **3\. Database & Prisma Schema**

## **3.1 Setup PostgreSQL Lokal**

Langkah instalasi dan konfigurasi PostgreSQL di mesin lokal:

| \# 1. Buat database baru via psql                                                   |
| ----------------------------------------------------------------------------------- |
| psql -U postgres -c "CREATE DATABASE ibadahhub;"                                    |
| psql -U postgres -c "CREATE USER ibadahhub_user WITH PASSWORD 'password_aman';"     |
| psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ibadahhub TO ibadahhub_user;" |
|                                                                                     |
| \# 2. Init Prisma                                                                   |
| npx prisma init                                                                     |
|                                                                                     |
| \# 3. Isi .env.local                                                                |
| DATABASE_URL="postgresql://ibadahhub_user:password_aman@localhost:5432/ibadahhub"   |

## **3.2 Prisma Schema Lengkap**

File: prisma/schema.prisma - salin seluruh isi berikut:

| generator client {                                                                               |
| ------------------------------------------------------------------------------------------------ |
| provider = "prisma-client-js"                                                                    |
| }                                                                                                |
|                                                                                                  |
| datasource db {                                                                                  |
| provider = "postgresql"                                                                          |
| url = env("DATABASE_URL")                                                                        |
| }                                                                                                |
|                                                                                                  |
| // ─── ENUM ─────────────────────────────────────────────                                        |
|                                                                                                  |
| enum Role {                                                                                      |
| SUPERADMIN                                                                                       |
| PENGURUS                                                                                         |
| JEMAAH                                                                                           |
| }                                                                                                |
|                                                                                                  |
| enum SubRole {                                                                                   |
| KETUA                                                                                            |
| BENDAHARA                                                                                        |
| SEKRETARIS                                                                                       |
| }                                                                                                |
|                                                                                                  |
| enum StatusKegiatan {                                                                            |
| UPCOMING                                                                                         |
| ONGOING                                                                                          |
| SELESAI                                                                                          |
| DIBATALKAN                                                                                       |
| }                                                                                                |
|                                                                                                  |
| enum StatusDonasi {                                                                              |
| PENDING                                                                                          |
| DIKONFIRMASI                                                                                     |
| DITOLAK                                                                                          |
| }                                                                                                |
|                                                                                                  |
| enum MetodePembayaran {                                                                          |
| TRANSFER_BANK                                                                                    |
| TUNAI                                                                                            |
| QRIS                                                                                             |
| }                                                                                                |
|                                                                                                  |
| enum StatusPengumuman {                                                                          |
| DRAFT                                                                                            |
| AKTIF                                                                                            |
| KADALUARSA                                                                                       |
| }                                                                                                |
|                                                                                                  |
| enum KategoriPengeluaran {                                                                       |
| OPERASIONAL                                                                                      |
| KEGIATAN                                                                                         |
| SOSIAL                                                                                           |
| LAINNYA                                                                                          |
| }                                                                                                |
|                                                                                                  |
| enum StatusRekening {                                                                            |
| AKTIF                                                                                            |
| NONAKTIF                                                                                         |
| }                                                                                                |
|                                                                                                  |
| // ─── TABEL UTAMA ──────────────────────────────────────                                        |
|                                                                                                  |
| model Religion {                                                                                 |
| id Int @id @default(autoincrement())                                                             |
| nama String @unique                                                                              |
| deskripsi String?                                                                                |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
|                                                                                                  |
| users User\[\]                                                                                   |
| kegiatan Kegiatan\[\]                                                                            |
| pengumuman Pengumuman\[\]                                                                        |
| donasi Donasi\[\]                                                                                |
| pengeluaran Pengeluaran\[\]                                                                      |
| rekening Rekening\[\]                                                                            |
| jemaah Jemaah\[\]                                                                                |
| }                                                                                                |
|                                                                                                  |
| model User {                                                                                     |
| id Int @id @default(autoincrement())                                                             |
| nama String                                                                                      |
| email String @unique                                                                             |
| password String                                                                                  |
| role Role                                                                                        |
| subRole SubRole?                                                                                 |
| religionId Int?                                                                                  |
| fotoProfil String?                                                                               |
| status Boolean @default(true)                                                                    |
| emailVerified DateTime?                                                                          |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
|                                                                                                  |
| religion Religion? @relation(fields: \[religionId\], references: \[id\])                         |
| jemaahProfile Jemaah?                                                                            |
| donasi Donasi\[\] @relation("DonasiByUser")                                                      |
| konfirmasiDonasi Donasi\[\] @relation("KonfirmasiBy")                                            |
| pengeluaran Pengeluaran\[\]                                                                      |
| notifikasi Notifikasi\[\]                                                                        |
| activityLogs ActivityLog\[\]                                                                     |
| sessions Session\[\]                                                                             |
| }                                                                                                |
|                                                                                                  |
| model Session {                                                                                  |
| id String @id @default(cuid())                                                                   |
| sessionToken String @unique                                                                      |
| userId Int                                                                                       |
| expires DateTime                                                                                 |
| user User @relation(fields: \[userId\], references: \[id\], onDelete: Cascade)                   |
| }                                                                                                |
|                                                                                                  |
| model VerificationToken {                                                                        |
| identifier String                                                                                |
| token String @unique                                                                             |
| expires DateTime                                                                                 |
| @@unique(\[identifier, token\])                                                                  |
| }                                                                                                |
|                                                                                                  |
| model Jemaah {                                                                                   |
| id Int @id @default(autoincrement())                                                             |
| userId Int? @unique                                                                              |
| religionId Int                                                                                   |
| nama String                                                                                      |
| email String?                                                                                    |
| noHp String?                                                                                     |
| alamat String?                                                                                   |
| status Boolean @default(true)                                                                    |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
|                                                                                                  |
| user User? @relation(fields: \[userId\], references: \[id\])                                     |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| donasi Donasi\[\]                                                                                |
| }                                                                                                |
|                                                                                                  |
| model Kegiatan {                                                                                 |
| id Int @id @default(autoincrement())                                                             |
| religionId Int                                                                                   |
| namaKegiatan String                                                                              |
| tanggal DateTime                                                                                 |
| waktuMulai String                                                                                |
| waktuSelesai String?                                                                             |
| lokasi String                                                                                    |
| deskripsi String?                                                                                |
| kapasitas Int?                                                                                   |
| status StatusKegiatan @default(UPCOMING)                                                         |
| createdBy Int                                                                                    |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
| deletedReason String?                                                                            |
|                                                                                                  |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| }                                                                                                |
|                                                                                                  |
| model Pengumuman {                                                                               |
| id Int @id @default(autoincrement())                                                             |
| religionId Int                                                                                   |
| judul String                                                                                     |
| isi String @db.Text                                                                              |
| tanggalPublish DateTime @default(now())                                                          |
| expireDate DateTime?                                                                             |
| status StatusPengumuman @default(DRAFT)                                                          |
| createdBy Int                                                                                    |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
| deletedReason String?                                                                            |
|                                                                                                  |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| lampiran PengumumanLampiran\[\]                                                                  |
| }                                                                                                |
|                                                                                                  |
| model PengumumanLampiran {                                                                       |
| id Int @id @default(autoincrement())                                                             |
| pengumumanId Int                                                                                 |
| namaFile String                                                                                  |
| url String                                                                                       |
| ukuran Int                                                                                       |
| createdAt DateTime @default(now())                                                               |
|                                                                                                  |
| pengumuman Pengumuman @relation(fields: \[pengumumanId\], references: \[id\], onDelete: Cascade) |
| }                                                                                                |
|                                                                                                  |
| model Donasi {                                                                                   |
| id Int @id @default(autoincrement())                                                             |
| religionId Int                                                                                   |
| userId Int?                                                                                      |
| jemaahId Int?                                                                                    |
| namaDonatur String                                                                               |
| nominal Decimal @db.Decimal(15, 2)                                                               |
| tanggal DateTime                                                                                 |
| metodePembayaran MetodePembayaran                                                                |
| status StatusDonasi @default(PENDING)                                                            |
| catatan String?                                                                                  |
| buktiPembayaran String?                                                                          |
| dikonfirmasiOleh Int?                                                                            |
| dikonfirmasiAt DateTime?                                                                         |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
| deletedReason String?                                                                            |
|                                                                                                  |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| user User? @relation("DonasiByUser", fields: \[userId\], references: \[id\])                     |
| jemaah Jemaah? @relation(fields: \[jemaahId\], references: \[id\])                               |
| konfirmasiBy User? @relation("KonfirmasiBy", fields: \[dikonfirmasiOleh\], references: \[id\])   |
| }                                                                                                |
|                                                                                                  |
| model Pengeluaran {                                                                              |
| id Int @id @default(autoincrement())                                                             |
| religionId Int                                                                                   |
| keterangan String                                                                                |
| nominal Decimal @db.Decimal(15, 2)                                                               |
| tanggal DateTime                                                                                 |
| kategori KategoriPengeluaran                                                                     |
| bukti String?                                                                                    |
| createdBy Int                                                                                    |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
| deletedAt DateTime?                                                                              |
| deletedReason String?                                                                            |
|                                                                                                  |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| user User @relation(fields: \[createdBy\], references: \[id\])                                   |
| }                                                                                                |
|                                                                                                  |
| model Rekening {                                                                                 |
| id Int @id @default(autoincrement())                                                             |
| religionId Int                                                                                   |
| namaBank String                                                                                  |
| nomorRekening String                                                                             |
| namaPemilik String                                                                               |
| catatan String?                                                                                  |
| status StatusRekening @default(AKTIF)                                                            |
| createdAt DateTime @default(now())                                                               |
| updatedAt DateTime @updatedAt                                                                    |
|                                                                                                  |
| religion Religion @relation(fields: \[religionId\], references: \[id\])                          |
| }                                                                                                |
|                                                                                                  |
| model Notifikasi {                                                                               |
| id Int @id @default(autoincrement())                                                             |
| userId Int                                                                                       |
| judul String                                                                                     |
| isi String                                                                                       |
| urlTujuan String?                                                                                |
| dibaca Boolean @default(false)                                                                   |
| createdAt DateTime @default(now())                                                               |
|                                                                                                  |
| user User @relation(fields: \[userId\], references: \[id\], onDelete: Cascade)                   |
| }                                                                                                |
|                                                                                                  |
| model ActivityLog {                                                                              |
| id Int @id @default(autoincrement())                                                             |
| userId Int                                                                                       |
| aksi String                                                                                      |
| model String                                                                                     |
| recordId Int?                                                                                    |
| detail String? @db.Text                                                                          |
| createdAt DateTime @default(now())                                                               |
|                                                                                                  |
| user User @relation(fields: \[userId\], references: \[id\])                                      |
| }                                                                                                |

## **3.3 Migrasi & Seed**

| \# Jalankan migrasi pertama          |
| ------------------------------------ |
| npx prisma migrate dev --name init   |
|                                      |
| \# Generate Prisma Client            |
| npx prisma generate                  |
|                                      |
| \# Jalankan seed data awal           |
| npx tsx prisma/seed.ts               |
|                                      |
| \# Buka Prisma Studio (GUI database) |
| npx prisma studio                    |

### **Contoh seed.ts**

| import { PrismaClient } from '@prisma/client'                               |
| --------------------------------------------------------------------------- |
| import bcrypt from 'bcryptjs'                                               |
|                                                                             |
| const prisma = new PrismaClient()                                           |
|                                                                             |
| async function main() {                                                     |
| // Buat 4 agama default                                                     |
| const islam = await prisma.religion.create({ data: { nama: 'Islam' } })     |
| const kristen = await prisma.religion.create({ data: { nama: 'Kristen' } }) |
| const hindu = await prisma.religion.create({ data: { nama: 'Hindu' } })     |
| const buddha = await prisma.religion.create({ data: { nama: 'Buddha' } })   |
|                                                                             |
| // Buat Superadmin                                                          |
| const hashed = await bcrypt.hash('superadmin123', 12)                       |
| await prisma.user.create({                                                  |
| data: {                                                                     |
| nama: 'Super Admin',                                                        |
| email: '<admin@ibadahhub.com>',                                             |
| password: hashed,                                                           |
| role: 'SUPERADMIN',                                                         |
| }                                                                           |
| })                                                                          |
| console.log('Seed selesai')                                                 |
| }                                                                           |
|                                                                             |
| main().catch(console.error).finally(() => prisma.\$disconnect())            |

# **4\. Autentikasi (Auth.js v5)**

## **4.1 Konfigurasi auth.ts**

| // src/lib/auth.ts                                                      |
| ----------------------------------------------------------------------- |
| import NextAuth from 'next-auth'                                        |
| import Credentials from 'next-auth/providers/credentials'               |
| import { PrismaAdapter } from '@auth/prisma-adapter'                    |
| import { prisma } from './prisma'                                       |
| import bcrypt from 'bcryptjs'                                           |
| import { z } from 'zod'                                                 |
|                                                                         |
| export const { handlers, signIn, signOut, auth } = NextAuth({           |
| adapter: PrismaAdapter(prisma),                                         |
| session: { strategy: 'jwt', maxAge: 8 \* 60 \* 60 }, // 8 jam           |
| providers: \[                                                           |
| Credentials({                                                           |
| async authorize(credentials) {                                          |
| const parsed = z.object({                                               |
| email: z.string().email(),                                              |
| password: z.string().min(1),                                            |
| }).safeParse(credentials)                                               |
|                                                                         |
| if (!parsed.success) return null                                        |
|                                                                         |
| const user = await prisma.user.findUnique({                             |
| where: { email: parsed.data.email, deletedAt: null },                   |
| include: { religion: true }                                             |
| })                                                                      |
|                                                                         |
| if (!user \| !user.status) return null                                  |
|                                                                         |
| const valid = await bcrypt.compare(parsed.data.password, user.password) |
| if (!valid) return null                                                 |
|                                                                         |
| return {                                                                |
| id: String(user.id),                                                    |
| name: user.nama,                                                        |
| email: user.email,                                                      |
| role: user.role,                                                        |
| subRole: user.subRole,                                                  |
| religionId: user.religionId,                                            |
| religionName: user.religion?.nama ?? null,                              |
| }                                                                       |
| }                                                                       |
| })                                                                      |
| \],                                                                     |
| callbacks: {                                                            |
| jwt({ token, user }) {                                                  |
| if (user) {                                                             |
| token.role = user.role                                                  |
| token.subRole = user.subRole                                            |
| token.religionId = user.religionId                                      |
| token.religionName = user.religionName                                  |
| }                                                                       |
| return token                                                            |
| },                                                                      |
| session({ session, token }) {                                           |
| session.user.role = token.role                                          |
| session.user.subRole = token.subRole                                    |
| session.user.religionId = token.religionId                              |
| session.user.religionName = token.religionName                          |
| return session                                                          |
| }                                                                       |
| },                                                                      |
| pages: {                                                                |
| signIn: '/login',                                                       |
| error: '/login',                                                        |
| }                                                                       |
| })                                                                      |

## **4.2 Extend NextAuth Types**

| // src/types/next-auth.d.ts                              |
| -------------------------------------------------------- |
| import { Role, SubRole } from '@prisma/client'           |
| declare module 'next-auth' {                             |
| interface User {                                         |
| role: Role                                               |
| subRole?: SubRole \| null                                |
| religionId?: number \| null                              |
| religionName?: string \| null                            |
| }                                                        |
| interface Session {                                      |
| user: User & { id: string; name: string; email: string } |
| }                                                        |
| }                                                        |
| declare module 'next-auth/jwt' {                         |
| interface JWT {                                          |
| role: Role                                               |
| subRole?: SubRole \| null                                |
| religionId?: number \| null                              |
| religionName?: string \| null                            |
| }                                                        |
| }                                                        |

## **4.3 Middleware Route Protection**

| // src/middleware.ts                                                                         |
| -------------------------------------------------------------------------------------------- |
| import { auth } from '@/lib/auth'                                                            |
| import { NextResponse } from 'next/server'                                                   |
|                                                                                              |
| export default auth((req) => {                                                               |
| const { pathname } = req.nextUrl                                                             |
| const isLoggedIn = !!req.auth                                                                |
|                                                                                              |
| // Rute publik yang tidak butuh login                                                        |
| const publicRoutes = \['/', '/login', '/register', '/api/auth'\]                             |
| const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r))                         |
| // Halaman per agama publik                                                                  |
| const isAgamaPublic = /^\\/\[\\w-\]+\$/.test(pathname) && !pathname.startsWith('/dashboard') |
|                                                                                              |
| if (!isLoggedIn && !isPublicRoute && !isAgamaPublic) {                                       |
| return NextResponse.redirect(new URL('/login', req.url))                                     |
| }                                                                                            |
| if (isLoggedIn && pathname === '/login') {                                                   |
| return NextResponse.redirect(new URL('/dashboard', req.url))                                 |
| }                                                                                            |
| return NextResponse.next()                                                                   |
| })                                                                                           |
|                                                                                              |
| export const config = {                                                                      |
| matcher: \['/((?!\_next/static\|\_next/image\|favicon.ico\|public).\*)'\],                   |
| }                                                                                            |

# **5\. Pola API Routes**

## **5.1 Konvensi Penulisan API Route**

Setiap modul memiliki dua file route handler:

- route.ts di folder modul: handle GET (list) dan POST (create)
- route.ts di folder \[id\]: handle GET (detail), PUT (update), DELETE (soft delete)

## **5.2 Contoh API Route - Jemaah**

| // src/app/api/jemaah/route.ts                                                     |
| ---------------------------------------------------------------------------------- |
| import { NextRequest, NextResponse } from 'next/server'                            |
| import { auth } from '@/lib/auth'                                                  |
| import { prisma } from '@/lib/prisma'                                              |
| import { jemaahSchema } from '@/lib/validations/jemaah'                            |
|                                                                                    |
| // GET /api/jemaah?search=ali&page=1&limit=10                                      |
| export async function GET(req: NextRequest) {                                      |
| const session = await auth()                                                       |
| if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) |
|                                                                                    |
| const { searchParams } = req.nextUrl                                               |
| const search = searchParams.get('search') ?? ''                                    |
| const page = Number(searchParams.get('page') ?? 1)                                 |
| const limit = Number(searchParams.get('limit') ?? 10)                              |
| const showDeleted = searchParams.get('arsip') === 'true'                           |
|                                                                                    |
| // Religion isolation: pengurus hanya lihat agama sendiri                          |
| const religionId = session.user.role === 'SUPERADMIN'                              |
| ? undefined                                                                        |
| : session.user.religionId ?? undefined                                             |
|                                                                                    |
| const where = {                                                                    |
| deletedAt: showDeleted ? { not: null } : null,                                     |
| ...(religionId ? { religionId } : {}),                                             |
| ...(search ? {                                                                     |
| OR: \[                                                                             |
| { nama: { contains: search, mode: 'insensitive' as const } },                      |
| { email: { contains: search, mode: 'insensitive' as const } },                     |
| { noHp: { contains: search, mode: 'insensitive' as const } },                      |
| \]                                                                                 |
| } : {}),                                                                           |
| }                                                                                  |
|                                                                                    |
| const \[data, total\] = await Promise.all(\[                                       |
| prisma.jemaah.findMany({                                                           |
| where, skip: (page - 1) \* limit, take: limit,                                     |
| orderBy: { createdAt: 'desc' },                                                    |
| include: { religion: { select: { nama: true } } }                                  |
| }),                                                                                |
| prisma.jemaah.count({ where })                                                     |
| \])                                                                                |
|                                                                                    |
| return NextResponse.json({ data, total, page, limit })                             |
| }                                                                                  |
|                                                                                    |
| // POST /api/jemaah                                                                |
| export async function POST(req: NextRequest) {                                     |
| const session = await auth()                                                       |
| if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) |
|                                                                                    |
| const body = await req.json()                                                      |
| const parsed = jemaahSchema.safeParse(body)                                        |
| if (!parsed.success) {                                                             |
| return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })       |
| }                                                                                  |
|                                                                                    |
| const jemaah = await prisma.jemaah.create({ data: parsed.data })                   |
| return NextResponse.json(jemaah, { status: 201 })                                  |
| }                                                                                  |

## **5.3 Pola Soft Delete**

| // src/app/api/jemaah/\[id\]/route.ts                                                    |
| ---------------------------------------------------------------------------------------- |
|                                                                                          |
| // DELETE /api/jemaah/\[id\] => soft delete                                              |
| export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) { |
| const session = await auth()                                                             |
| if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })       |
|                                                                                          |
| const { alasan } = await req.json()                                                      |
| if (!alasan?.trim()) {                                                                   |
| return NextResponse.json({ error: 'Alasan penghapusan wajib diisi' }, { status: 400 })   |
| }                                                                                        |
|                                                                                          |
| await prisma.jemaah.update({                                                             |
| where: { id: Number(params.id) },                                                        |
| data: { deletedAt: new Date() }                                                          |
| })                                                                                       |
|                                                                                          |
| // Catat activity log                                                                    |
| await prisma.activityLog.create({                                                        |
| data: {                                                                                  |
| userId: Number(session.user.id),                                                         |
| aksi: 'DELETE',                                                                          |
| model: 'Jemaah',                                                                         |
| recordId: Number(params.id),                                                             |
| detail: alasan,                                                                          |
| }                                                                                        |
| })                                                                                       |
|                                                                                          |
| return NextResponse.json({ success: true })                                              |
| }                                                                                        |
|                                                                                          |
| // PATCH /api/jemaah/\[id\]/restore => restore soft delete                               |
| export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {  |
| await prisma.jemaah.update({                                                             |
| where: { id: Number(params.id) },                                                        |
| data: { deletedAt: null }                                                                |
| })                                                                                       |
| return NextResponse.json({ success: true })                                              |
| }                                                                                        |

## **5.4 Pola Permission Check**

| // src/lib/utils.ts - helper permission                                    |
| -------------------------------------------------------------------------- |
| import { Session } from 'next-auth'                                        |
|                                                                            |
| export function canManageKeuangan(session: Session) {                      |
| const { role, subRole } = session.user                                     |
| return role === 'SUPERADMIN' \|                                            |
| (role === 'PENGURUS' && (subRole === 'KETUA' \| subRole === 'BENDAHARA'))  |
| }                                                                          |
|                                                                            |
| export function canManageKonten(session: Session) {                        |
| const { role, subRole } = session.user                                     |
| return role === 'SUPERADMIN' \|                                            |
| (role === 'PENGURUS' && (subRole === 'KETUA' \| subRole === 'SEKRETARIS')) |
| }                                                                          |
|                                                                            |
| export function isSameReligion(session: Session, religionId: number) {     |
| if (session.user.role === 'SUPERADMIN') return true                        |
| return session.user.religionId === religionId                              |
| }                                                                          |

# **6\. Environment Variables**

## **6.1 File .env.local (tidak di-commit)**

| \# Database                                                                       |
| --------------------------------------------------------------------------------- |
| DATABASE_URL="postgresql://ibadahhub_user:password_aman@localhost:5432/ibadahhub" |
|                                                                                   |
| \# Auth.js                                                                        |
| AUTH_SECRET="generate-dengan-perintah-openssl-rand-base64-32"                     |
| NEXTAUTH_URL="<http://localhost:3000>"                                            |
|                                                                                   |
| \# Resend (email)                                                                 |
| RESEND_API_KEY="re_xxxxxxxxxxxx"                                                  |
| EMAIL_FROM="<noreply@ibadahhub.com>"                                              |
|                                                                                   |
| \# Upload                                                                         |
| UPLOAD_DIR="./public/uploads"                                                     |
| MAX_FILE_SIZE_MB=5                                                                |
|                                                                                   |
| \# App                                                                            |
| NEXT_PUBLIC_APP_URL="<http://localhost:3000>"                                     |
| NEXT_PUBLIC_APP_NAME="IbadahHub"                                                  |

## **6.2 File .env.example (di-commit ke repo)**

| DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ibadahhub" |
| ------------------------------------------------------------------ |
| AUTH_SECRET="your-secret-here"                                     |
| NEXTAUTH_URL="<http://localhost:3000>"                             |
| RESEND_API_KEY="re_your_key"                                       |
| EMAIL_FROM="<noreply@yourdomain.com>"                              |
| NEXT_PUBLIC_APP_URL="<http://localhost:3000>"                      |
| NEXT_PUBLIC_APP_NAME="IbadahHub"                                   |

## **6.3 Tailwind Config - Warna Custom**

| // tailwind.config.ts                        |
| -------------------------------------------- |
| import type { Config } from 'tailwindcss'    |
|                                              |
| const config: Config = {                     |
| darkMode: \['class'\],                       |
| content: \['./src/\*\*/\*.{ts,tsx}'\],       |
| theme: {                                     |
| extend: {                                    |
| colors: {                                    |
| primary: {                                   |
| DEFAULT: '#1D9E75',                          |
| dark: '#0F6E56',                             |
| light: '#EAF3DE',                            |
| text: '#27500A',                             |
| },                                           |
| status: {                                    |
| upcoming: '#FAEEDA',                         |
| upcomingText: '#854F0B',                     |
| ongoing: '#E6F1FB',                          |
| ongoingText: '#185FA5',                      |
| done: '#F3F4F6',                             |
| doneText: '#6B7280',                         |
| danger: '#FCEBEB',                           |
| dangerText: '#A32D2D',                       |
| success: '#EAF3DE',                          |
| successText: '#27500A',                      |
| pending: '#FAEEDA',                          |
| pendingText: '#854F0B',                      |
| }                                            |
| },                                           |
| fontFamily: {                                |
| sans: \['DM Sans', 'sans-serif'\],           |
| serif: \['Playfair Display', 'serif'\],      |
| },                                           |
| borderRadius: {                              |
| DEFAULT: '8px',                              |
| lg: '12px',                                  |
| xl: '16px',                                  |
| },                                           |
| }                                            |
| },                                           |
| plugins: \[require('tailwindcss-animate')\], |
| }                                            |
| export default config                        |

# **7\. Komponen Kunci**

## **7.1 Prisma Client Singleton**

| // src/lib/prisma.ts                                                              |
| --------------------------------------------------------------------------------- |
| import { PrismaClient } from '@prisma/client'                                     |
|                                                                                   |
| const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }         |
|                                                                                   |
| export const prisma = globalForPrisma.prisma ?? new PrismaClient({                |
| log: process.env.NODE_ENV === 'development' ? \['query', 'error'\] : \['error'\], |
| })                                                                                |
|                                                                                   |
| if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma        |

## **7.2 Utility Functions**

| // src/lib/utils.ts                                                           |
| ----------------------------------------------------------------------------- |
| import { clsx, type ClassValue } from 'clsx'                                  |
| import { twMerge } from 'tailwind-merge'                                      |
|                                                                               |
| // Gabung Tailwind class dengan aman                                          |
| export function cn(...inputs: ClassValue\[\]) {                               |
| return twMerge(clsx(inputs))                                                  |
| }                                                                             |
|                                                                               |
| // Format angka ke Rupiah                                                     |
| export function formatRupiah(amount: number \| string) {                      |
| return new Intl.NumberFormat('id-ID', {                                       |
| style: 'currency', currency: 'IDR', minimumFractionDigits: 0                  |
| }).format(Number(amount))                                                     |
| }                                                                             |
|                                                                               |
| // Format tanggal ke locale Indonesia                                         |
| export function formatTanggal(date: Date \| string, format = 'dd MMM yyyy') { |
| return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })              |
| .format(new Date(date))                                                       |
| }                                                                             |
|                                                                               |
| // Generate inisial dari nama                                                 |
| export function getInisial(nama: string) {                                    |
| return nama.split(' ').slice(0, 2).map(n => n\[0\]).join('').toUpperCase()    |
| }                                                                             |
|                                                                               |
| // Kirim notifikasi ke user                                                   |
| export async function createNotifikasi(                                       |
| userId: number, judul: string, isi: string, urlTujuan?: string                |
| ) {                                                                           |
| const { prisma } = await import('./prisma')                                   |
| return prisma.notifikasi.create({                                             |
| data: { userId, judul, isi, urlTujuan }                                       |
| })                                                                            |
| }                                                                             |

## **7.3 Upload File Handler**

| // src/app/api/upload/route.ts                                                         |
| -------------------------------------------------------------------------------------- |
| import { NextRequest, NextResponse } from 'next/server'                                |
| import { writeFile, mkdir } from 'fs/promises'                                         |
| import path from 'path'                                                                |
| import { v4 as uuidv4 } from 'uuid'                                                    |
|                                                                                        |
| const ALLOWED_TYPES = \['image/jpeg','image/png','image/webp','application/pdf',       |
| 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'\]            |
| const MAX_SIZE = 5 \* 1024 \* 1024 // 5MB                                              |
|                                                                                        |
| export async function POST(req: NextRequest) {                                         |
| const formData = await req.formData()                                                  |
| const file = formData.get('file') as File                                              |
| const folder = (formData.get('folder') as string) ?? 'misc'                            |
|                                                                                        |
| if (!file) return NextResponse.json({ error: 'File tidak ada' }, { status: 400 })      |
| if (!ALLOWED_TYPES.includes(file.type)) {                                              |
| return NextResponse.json({ error: 'Format file tidak didukung' }, { status: 400 })     |
| }                                                                                      |
| if (file.size > MAX_SIZE) {                                                            |
| return NextResponse.json({ error: 'Ukuran file melebihi 5MB' }, { status: 400 })       |
| }                                                                                      |
|                                                                                        |
| const ext = file.name.split('.').pop()                                                 |
| const filename = \`\${uuidv4()}.\${ext}\`                                              |
| const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)                |
|                                                                                        |
| await mkdir(uploadDir, { recursive: true })                                            |
| await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer())) |
|                                                                                        |
| return NextResponse.json({ url: \`/uploads/\${folder}/\${filename}\` })                |
| }                                                                                      |

## **7.4 Contoh Zod Schema Validasi**

| // src/lib/validations/donasi.ts                                |
| --------------------------------------------------------------- |
| import { z } from 'zod'                                         |
|                                                                 |
| export const donasiSchema = z.object({                          |
| religionId: z.number().int().positive(),                        |
| namaDonatur: z.string().min(2, 'Nama minimal 2 karakter'),      |
| nominal: z.number().positive('Nominal harus lebih dari 0'),     |
| tanggal: z.string().datetime(),                                 |
| metodePembayaran: z.enum(\['TRANSFER_BANK', 'TUNAI', 'QRIS'\]), |
| catatan: z.string().optional(),                                 |
| buktiPembayaran: z.string().optional(),                         |
| jemaahId: z.number().int().optional(),                          |
| })                                                              |
|                                                                 |
| export type DonasiInput = z.infer&lt;typeof donasiSchema&gt;    |

# **8\. Laporan Keuangan & Kalkulasi Saldo**

## **8.1 Query Saldo per Agama**

| // src/app/api/laporan/saldo/route.ts                          |
| -------------------------------------------------------------- |
| export async function GET(req: NextRequest) {                  |
| const session = await auth()                                   |
| const religionId = session?.user.religionId                    |
|                                                                |
| const \[totalDonasi, totalPengeluaran\] = await Promise.all(\[ |
| prisma.donasi.aggregate({                                      |
| where: {                                                       |
| religionId: religionId ?? undefined,                           |
| status: 'DIKONFIRMASI',                                        |
| deletedAt: null                                                |
| },                                                             |
| \_sum: { nominal: true }                                       |
| }),                                                            |
| prisma.pengeluaran.aggregate({                                 |
| where: {                                                       |
| religionId: religionId ?? undefined,                           |
| deletedAt: null                                                |
| },                                                             |
| \_sum: { nominal: true }                                       |
| })                                                             |
| \])                                                            |
|                                                                |
| const masuk = Number(totalDonasi.\_sum.nominal ?? 0)           |
| const keluar = Number(totalPengeluaran.\_sum.nominal ?? 0)     |
| const saldo = masuk - keluar                                   |
|                                                                |
| return NextResponse.json({ masuk, keluar, saldo })             |
| }                                                              |

## **8.2 Query Tren Bulanan**

| // Tren donasi 6 bulan terakhir                    |
| -------------------------------------------------- |
| const sixMonthsAgo = new Date()                    |
| sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6) |
|                                                    |
| const trenDonasi = await prisma.\$queryRaw\`       |
| SELECT                                             |
| TO_CHAR(tanggal, 'Mon YYYY') as bulan,             |
| DATE_TRUNC('month', tanggal) as bulan_sort,        |
| SUM(nominal) as total                              |
| FROM "Donasi"                                      |
| WHERE status = 'DIKONFIRMASI'                      |
| AND deleted_at IS NULL                             |
| AND tanggal >= \${sixMonthsAgo}                    |
| AND religion_id = \${religionId}                   |
| GROUP BY bulan, bulan_sort                         |
| ORDER BY bulan_sort ASC                            |
| \`                                                 |

## **8.3 Export PDF**

| // src/app/api/laporan/export/pdf/route.ts                              |
| ----------------------------------------------------------------------- |
| import jsPDF from 'jspdf'                                               |
| import autoTable from 'jspdf-autotable'                                 |
|                                                                         |
| export async function GET(req: NextRequest) {                           |
| const donasi = await prisma.donasi.findMany({                           |
| where: { status: 'DIKONFIRMASI', deletedAt: null },                     |
| include: { religion: true }                                             |
| })                                                                      |
|                                                                         |
| const doc = new jsPDF()                                                 |
| doc.setFontSize(16)                                                     |
| doc.text('Laporan Donasi IbadahHub', 14, 20)                            |
|                                                                         |
| autoTable(doc, {                                                        |
| startY: 30,                                                             |
| head: \[\['No','Nama Donatur','Agama','Nominal','Tanggal','Metode'\]\], |
| body: donasi.map((d, i) => \[                                           |
| i + 1,                                                                  |
| d.namaDonatur,                                                          |
| d.religion.nama,                                                        |
| formatRupiah(Number(d.nominal)),                                        |
| formatTanggal(d.tanggal),                                               |
| d.metodePembayaran,                                                     |
| \])                                                                     |
| })                                                                      |
|                                                                         |
| const buffer = Buffer.from(doc.output('arraybuffer'))                   |
| return new NextResponse(buffer, {                                       |
| headers: {                                                              |
| 'Content-Type': 'application/pdf',                                      |
| 'Content-Disposition': 'attachment; filename=laporan-donasi.pdf'        |
| }                                                                       |
| })                                                                      |
| }                                                                       |

# **9\. Sistem Notifikasi In-App**

## **9.1 Trigger Notifikasi**

Notifikasi dibuat di server setiap kali aksi penting terjadi. Pattern: setelah aksi utama berhasil, panggil createNotifikasi().

| // Contoh: saat donasi di-submit jemaah                                           |
| --------------------------------------------------------------------------------- |
| // Di POST /api/donasi                                                            |
|                                                                                   |
| const donasi = await prisma.donasi.create({ data: parsed.data })                  |
|                                                                                   |
| // Cari semua Bendahara & Ketua agama terkait                                     |
| const pengurus = await prisma.user.findMany({                                     |
| where: {                                                                          |
| religionId: parsed.data.religionId,                                               |
| role: 'PENGURUS',                                                                 |
| subRole: { in: \['KETUA', 'BENDAHARA'\] },                                        |
| deletedAt: null                                                                   |
| }                                                                                 |
| })                                                                                |
|                                                                                   |
| // Kirim notifikasi ke semua pengurus relevan                                     |
| await Promise.all(pengurus.map(p =>                                               |
| createNotifikasi(                                                                 |
| p.id,                                                                             |
| 'Donasi Baru Masuk',                                                              |
| \`\${donasi.namaDonatur} mengajukan donasi Rp \${formatRupiah(donasi.nominal)}\`, |
| \`/donasi/\${donasi.id}\`                                                         |
| )                                                                                 |
| ))                                                                                |

## **9.2 API Notifikasi**

| // GET /api/notifikasi - ambil notifikasi user aktif      |
| --------------------------------------------------------- |
| // GET /api/notifikasi/unread - hitung badge              |
| // PATCH /api/notifikasi/\[id\] - tandai dibaca           |
| // PATCH /api/notifikasi/read-all - tandai semua dibaca   |
| // DELETE /api/notifikasi/\[id\] - hapus notifikasi       |
|                                                           |
| // Contoh GET unread count:                               |
| const count = await prisma.notifikasi.count({             |
| where: { userId: Number(session.user.id), dibaca: false } |
| })                                                        |
| return NextResponse.json({ count })                       |

## **9.3 Hook useNotifikasi**

| // src/hooks/useNotifikasi.ts                         |
| ----------------------------------------------------- |
| import useSWR from 'swr'                              |
| import axios from 'axios'                             |
|                                                       |
| export function useNotifikasiCount() {                |
| const { data } = useSWR('/api/notifikasi/unread',     |
| url => axios.get(url).then(r => r.data),              |
| { refreshInterval: 30000 } // polling setiap 30 detik |
| )                                                     |
| return data?.count ?? 0                               |
| }                                                     |

# **10\. Setup Lokal & Menjalankan Project**

## **10.1 Langkah Setup dari Awal**

- Clone atau buat project baru dengan create-next-app
- Install semua dependency (lihat Section 2.1)
- Buat database PostgreSQL lokal (lihat Section 3.1)
- Copy .env.example ke .env.local dan isi nilainya
- Jalankan migrasi Prisma: npx prisma migrate dev --name init
- Jalankan seed: npx tsx prisma/seed.ts
- Jalankan development server: npm run dev
- Buka <http://localhost:3000>

## **10.2 Scripts package.json**

| "scripts": {                        |
| ----------------------------------- |
| "dev": "next dev",                  |
| "build": "next build",              |
| "start": "next start",              |
| "lint": "next lint",                |
| "db:migrate": "prisma migrate dev", |
| "db:generate": "prisma generate",   |
| "db:seed": "tsx prisma/seed.ts",    |
| "db:studio": "prisma studio",       |
| "db:reset": "prisma migrate reset"  |
| }                                   |

## **10.3 Urutan Development per Modul**

| **Urutan** | **Yang Dibuat**                            | **File Utama**                                |
| ---------- | ------------------------------------------ | --------------------------------------------- |
| 1          | Prisma Schema + Migrasi                    | prisma/schema.prisma                          |
| 2          | Zod Validation Schema                      | src/lib/validations/\*.ts                     |
| 3          | API Route (CRUD)                           | src/app/api/\[modul\]/route.ts                |
| 4          | Server Actions (opsional)                  | src/app/(dashboard)/\[modul\]/actions.ts      |
| 5          | Halaman List (tabel + search + pagination) | src/app/(dashboard)/\[modul\]/page.tsx        |
| 6          | Halaman Form (tambah/edit)                 | src/app/(dashboard)/\[modul\]/baru/page.tsx   |
| 7          | Halaman Detail                             | src/app/(dashboard)/\[modul\]/\[id\]/page.tsx |
| 8          | Komponen spesifik modul                    | src/components/\[modul\]/\*.tsx               |

# **11\. Rules & Konvensi Kode**

## **11.1 TypeScript**

- strict: true wajib aktif di tsconfig.json
- Tidak boleh menggunakan any - gunakan unknown lalu narrow type
- Semua props komponen wajib di-type dengan interface atau type alias
- Gunakan type dari Prisma client (@prisma/client) untuk model database
- Gunakan z.infer&lt;typeof schema&gt; dari Zod untuk tipe form input

## **11.2 Penamaan**

| **Elemen**        | **Konvensi** | **Contoh**                        |
| ----------------- | ------------ | --------------------------------- |
| Komponen React    | PascalCase   | DataTable.tsx, StatusBadge.tsx    |
| Fungsi / variable | camelCase    | formatRupiah(), getTotalDonasi()  |
| File non-komponen | kebab-case   | use-debounce.ts, prisma-client.ts |
| Konstanta global  | UPPER_SNAKE  | MAX_FILE_SIZE, DEFAULT_PAGE_LIMIT |
| Tabel Prisma      | PascalCase   | User, Donasi, Pengeluaran         |
| Kolom Prisma      | camelCase    | deletedAt, religionId, createdBy  |
| API endpoint      | kebab-case   | /api/kegiatan, /api/laporan/saldo |
| Route folder      | kebab-case   | buat-baru/, laporan-keuangan/     |

## **11.3 Aturan Wajib untuk Claude Code**

|     | **WAJIB DIIKUTI**<br><br>Berikut adalah aturan yang tidak boleh dilanggar saat mengimplementasi: |
| --- | ------------------------------------------------------------------------------------------------ |

- Setiap API route WAJIB dimulai dengan pengecekan session: const session = await auth()
- Setiap query database WAJIB menggunakan filter deletedAt: null (kecuali halaman arsip)
- Pengurus WAJIB di-filter berdasarkan religionId mereka sendiri pada setiap query
- Soft delete WAJIB menyimpan alasan ke ActivityLog
- Konfirmasi donasi WAJIB mencatat dikonfirmasiOleh dan dikonfirmasiAt
- Upload file WAJIB divalidasi tipe MIME dan ukuran sebelum disimpan
- Semua input form WAJIB divalidasi dengan Zod di sisi server (API route)
- Saldo = SUM(donasi DIKONFIRMASI) - SUM(pengeluaran aktif) - JANGAN hitung donasi PENDING
- Notifikasi WAJIB dikirim untuk: donasi baru, donasi dikonfirmasi/ditolak, pengumuman baru

_IbadahHub Technical Specification v1.0 - April 2026_

Next.js 14 (App Router) | PostgreSQL Local | Prisma ORM | Auth.js v5
