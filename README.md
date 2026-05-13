# IbadahHub

Platform manajemen masjid berbasis web — kelola jemaah, keuangan, pengumuman, dan ibadah dalam satu sistem.

**Stack:** Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · Auth.js v5 · Tailwind CSS

---

## Prasyarat

Pastikan sudah terinstall:

- [Node.js](https://nodejs.org/) **v20 LTS** atau lebih baru
- [PostgreSQL](https://www.postgresql.org/download/) **v16** atau lebih baru
- npm v10+

---

## Cara Clone dan Jalankan

### 1. Clone repository

```bash
git clone https://github.com/MuhammadFaiz10/ibadahhub.git
cd ibadahhub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Salin file contoh lalu isi nilainya:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan sesuaikan:

```env
# Database PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ibadahhub"

# Auth.js — generate secret dengan: openssl rand -base64 32
AUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Resend (untuk kirim email)
RESEND_API_KEY="re_your_key"
EMAIL_FROM="noreply@ibadahhub.com"

# Upload file
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE_MB=5

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="IbadahHub"

# Midtrans (payment gateway) — ambil dari dashboard.midtrans.com
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxx"
MIDTRANS_IS_PRODUCTION="false"
```

### 4. Buat database PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE ibadahhub;"
psql -U postgres -c "CREATE USER ibadahhub_user WITH PASSWORD 'password_aman';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ibadahhub TO ibadahhub_user;"
```

> Sesuaikan `USER`, `PASSWORD`, dan nama database dengan nilai di `DATABASE_URL` milikmu.

### 5. Jalankan migrasi dan seed database

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

### 6. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan production server |
| `npm run lint` | Cek linting |
| `npm run db:migrate` | Jalankan migrasi database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Isi data awal (seed) |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |
| `npm run db:reset` | Reset database (hapus semua data) |

---

## Struktur Project

```
src/
├── app/          # Next.js App Router (pages & API routes)
├── components/   # Komponen UI reusable
├── lib/          # Utilities, auth config, prisma client
└── types/        # TypeScript types
prisma/
├── schema.prisma # Database schema
├── migrations/   # History migrasi
└── seed.ts       # Data awal
```
