import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'IbadahHub API',
    version: '2.0.0',
    description:
      'REST API untuk sistem manajemen ibadah multi-tenant — donasi, kegiatan, jemaah, pengumuman, dan integrasi Midtrans.\n\n' +
      '## Multi-tenant Scope\n' +
      'Setiap resource operasional terikat pada `tempatIbadahId` (di bawah `religionId`).\n' +
      '- **SUPERADMIN**: lintas tenant. Saat create harus menyertakan `religionId` + `tempatIbadahId`; saat list bisa filter via query `?religionId=&tempatIbadahId=`.\n' +
      '- **PENGURUS / JEMAAH**: `religionId` + `tempatIbadahId` di-derive otomatis dari session, payload `religionId/tempatIbadahId` diabaikan.\n' +
      '- Backend selalu memvalidasi `TempatIbadah.religionId === payload.religionId`.',
  },
  servers: [{ url: APP_URL, description: 'Server aktif' }],
  tags: [
    { name: 'TempatIbadah', description: 'CRUD tempat ibadah (multi-tenant). SUPERADMIN-only untuk write; pengurus/jemaah bisa GET tempat ibadah di agamanya.' },
    { name: 'Donasi', description: 'CRUD donasi & konfirmasi manual' },
    { name: 'Midtrans', description: 'Integrasi payment gateway Midtrans Snap' },
    { name: 'Public', description: 'Endpoint publik tanpa autentikasi (dipakai halaman register)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Session token dari NextAuth (cookie-based, disertakan otomatis oleh browser)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
      TempatIbadah: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          religionId: { type: 'integer' },
          nama: { type: 'string', example: 'Masjid Al-Hikmah' },
          slug: { type: 'string', example: 'masjid-al-hikmah', description: 'URL-friendly, unik' },
          alamat: { type: 'string', nullable: true },
          kota: { type: 'string', nullable: true },
          provinsi: { type: 'string', nullable: true },
          kodePos: { type: 'string', nullable: true },
          noTelp: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          logo: { type: 'string', nullable: true, description: 'URL logo' },
          deskripsi: { type: 'string', nullable: true },
          latitude: { type: 'number', format: 'double', nullable: true },
          longitude: { type: 'number', format: 'double', nullable: true },
          status: { type: 'string', enum: ['AKTIF', 'NONAKTIF'], default: 'AKTIF' },
          createdBy: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          religion: {
            type: 'object',
            nullable: true,
            properties: { id: { type: 'integer' }, nama: { type: 'string' } },
          },
          _count: {
            type: 'object',
            nullable: true,
            properties: {
              users: { type: 'integer' },
              jemaah: { type: 'integer' },
              kegiatan: { type: 'integer' },
              donasi: { type: 'integer' },
            },
          },
        },
      },
      TempatIbadahInput: {
        type: 'object',
        required: ['religionId', 'nama', 'slug'],
        properties: {
          religionId: { type: 'integer' },
          nama: { type: 'string', minLength: 2, maxLength: 150 },
          slug: {
            type: 'string',
            minLength: 2,
            maxLength: 120,
            pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
            description: 'Huruf kecil, angka, dan tanda hubung (-) saja',
          },
          alamat: { type: 'string', maxLength: 500, nullable: true },
          kota: { type: 'string', maxLength: 100, nullable: true },
          provinsi: { type: 'string', maxLength: 100, nullable: true },
          kodePos: { type: 'string', maxLength: 20, nullable: true },
          noTelp: { type: 'string', maxLength: 30, nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          logo: { type: 'string', nullable: true },
          deskripsi: { type: 'string', maxLength: 2000, nullable: true },
          latitude: { type: 'number', minimum: -90, maximum: 90, nullable: true },
          longitude: { type: 'number', minimum: -180, maximum: 180, nullable: true },
          status: { type: 'string', enum: ['AKTIF', 'NONAKTIF'] },
        },
      },
      Donasi: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          religionId: { type: 'integer' },
          tempatIbadahId: { type: 'integer', description: 'Tenant scope. Diabaikan untuk non-SUPERADMIN.' },
          userId: { type: 'integer', nullable: true },
          jemaahId: { type: 'integer', nullable: true },
          rekeningId: { type: 'integer', nullable: true },
          namaDonatur: { type: 'string' },
          nominal: { type: 'string', example: '100000' },
          tanggal: { type: 'string', format: 'date-time' },
          metodePembayaran: {
            type: 'string',
            enum: ['TRANSFER_BANK', 'TUNAI', 'QRIS', 'MIDTRANS'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'DIKONFIRMASI', 'DITOLAK'],
          },
          paymentChannel: {
            type: 'string',
            nullable: true,
            description:
              'Metode pembayaran nyata yang digunakan. Diisi otomatis dari Midtrans (mis. "GoPay", "BCA Virtual Account") atau "manual_paid" jika dikonfirmasi manual oleh pengurus.',
            example: 'GoPay',
          },
          catatan: { type: 'string', nullable: true },
          buktiPembayaran: { type: 'string', nullable: true },
          dikonfirmasiOleh: { type: 'integer', nullable: true },
          dikonfirmasiAt: { type: 'string', format: 'date-time', nullable: true },
          midtransOrderId: { type: 'string', nullable: true },
          midtransToken: { type: 'string', nullable: true },
          midtransPaymentUrl: { type: 'string', nullable: true },
          midtransStatus: {
            type: 'string',
            nullable: true,
            description: 'Status raw dari Midtrans: pending, settlement, capture, deny, cancel, expire',
          },
          midtransTransactionId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MidtransSnapResult: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'Snap token — gunakan dengan Midtrans Snap.js untuk membuka popup pembayaran',
          },
          redirect_url: {
            type: 'string',
            description: 'URL redirect ke halaman pembayaran Midtrans (alternatif popup)',
          },
          clientKey: {
            type: 'string',
            description: 'MIDTRANS_CLIENT_KEY untuk inisialisasi Snap.js di frontend',
          },
        },
      },
      MidtransNotification: {
        type: 'object',
        description: 'Payload yang dikirim Midtrans ke webhook endpoint',
        required: ['order_id', 'transaction_status', 'status_code', 'gross_amount', 'signature_key'],
        properties: {
          order_id: { type: 'string', example: 'IBADAHHUB-42-1715500000000' },
          transaction_id: { type: 'string' },
          transaction_status: {
            type: 'string',
            enum: ['pending', 'capture', 'settlement', 'deny', 'cancel', 'expire', 'failure'],
          },
          fraud_status: { type: 'string', enum: ['accept', 'challenge', 'deny'], nullable: true },
          payment_type: {
            type: 'string',
            enum: [
              'bank_transfer', 'echannel', 'permata', 'credit_card',
              'gopay', 'shopeepay', 'dana', 'linkaja', 'qris',
              'cstore', 'akulaku', 'kredivo',
            ],
          },
          gross_amount: { type: 'string', example: '100000.00' },
          status_code: { type: 'string', example: '200' },
          signature_key: { type: 'string', description: 'SHA512(order_id + status_code + gross_amount + server_key)' },
          va_numbers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bank: { type: 'string', example: 'bca' },
                va_number: { type: 'string' },
              },
            },
            description: 'Ada saat payment_type = bank_transfer',
          },
          bank: { type: 'string', nullable: true, description: 'Nama bank (untuk credit_card)' },
          store: { type: 'string', nullable: true, description: 'Nama minimarket (untuk cstore)' },
          acquirer: { type: 'string', nullable: true, description: 'Penyedia QRIS (untuk qris)' },
        },
      },
      MidtransStatusResult: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          transactionStatus: { type: 'string' },
          statusDonasi: { type: 'string', enum: ['PENDING', 'DIKONFIRMASI', 'DITOLAK'] },
          paymentChannel: { type: 'string', example: 'BCA Virtual Account' },
          paymentType: { type: 'string' },
          grossAmount: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/tempat-ibadah': {
      get: {
        tags: ['TempatIbadah'],
        summary: 'List tempat ibadah',
        description:
          'SUPERADMIN: semua tempat ibadah (opsional filter via `religionId`). Non-SUPERADMIN: hanya tempat ibadah di agamanya.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Cari nama / slug / kota' },
          { name: 'religionId', in: 'query', schema: { type: 'integer' }, description: 'Filter berdasarkan agama (SUPERADMIN)' },
          { name: 'arsip', in: 'query', schema: { type: 'boolean', default: false }, description: 'Tampilkan yang sudah diarsipkan' },
        ],
        responses: {
          200: {
            description: 'Berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/TempatIbadah' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['TempatIbadah'],
        summary: 'Buat tempat ibadah baru (SUPERADMIN only)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TempatIbadahInput' } },
          },
        },
        responses: {
          201: {
            description: 'Berhasil dibuat',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/TempatIbadah' } } },
              },
            },
          },
          400: { description: 'Validasi gagal' },
          403: { description: 'Forbidden (hanya SUPERADMIN)' },
          404: { description: 'Agama tidak ditemukan' },
          409: { description: 'Slug sudah dipakai' },
        },
      },
    },
    '/api/tempat-ibadah/{id}': {
      get: {
        tags: ['TempatIbadah'],
        summary: 'Detail tempat ibadah',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Berhasil',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/TempatIbadah' } } },
              },
            },
          },
          403: { description: 'Bukan tempat ibadah di agama Anda' },
          404: { description: 'Tidak ditemukan' },
        },
      },
      put: {
        tags: ['TempatIbadah'],
        summary: 'Update tempat ibadah (SUPERADMIN only)',
        description:
          'Semua field opsional (partial update). Mengubah `religionId` ditolak jika sudah ada child (user/jemaah/kegiatan/donasi).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TempatIbadahInput' } },
          },
        },
        responses: {
          200: { description: 'Berhasil diupdate' },
          400: { description: 'Validasi gagal / tidak boleh ganti agama karena ada child' },
          403: { description: 'Forbidden (hanya SUPERADMIN)' },
          404: { description: 'Tidak ditemukan' },
          409: { description: 'Slug sudah dipakai' },
        },
      },
      delete: {
        tags: ['TempatIbadah'],
        summary: 'Arsipkan tempat ibadah (soft delete, SUPERADMIN only)',
        description:
          'Hanya bisa diarsipkan jika tidak ada user/jemaah/kegiatan/donasi aktif. Set `deletedAt = now()` dan `status = NONAKTIF`.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Berhasil diarsipkan' },
          400: { description: 'Masih ada child aktif' },
          403: { description: 'Forbidden (hanya SUPERADMIN)' },
          404: { description: 'Tidak ditemukan' },
        },
      },
    },
    '/api/tempat-ibadah/public': {
      get: {
        tags: ['TempatIbadah', 'Public'],
        summary: 'List tempat ibadah aktif (public)',
        description:
          'Endpoint publik tanpa auth. Dipakai halaman register sebagai dropdown setelah user memilih agama.',
        security: [],
        parameters: [
          { name: 'religionId', in: 'query', required: true, schema: { type: 'integer' }, description: 'Wajib; filter agama' },
        ],
        responses: {
          200: {
            description: 'Daftar tempat ibadah aktif',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          nama: { type: 'string' },
                          slug: { type: 'string' },
                          kota: { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: '`religionId` wajib' },
        },
      },
    },
    '/api/donasi': {
      get: {
        tags: ['Donasi'],
        summary: 'List semua donasi',
        description: 'SUPERADMIN: semua agama. PENGURUS (Ketua/Bendahara): agama sendiri. JEMAAH: donasi milik sendiri.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Cari nama donatur atau catatan' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'DIKONFIRMASI', 'DITOLAK'] },
          },
        ],
        responses: {
          200: {
            description: 'Berhasil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Donasi' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalDikonfirmasi: { type: 'string', description: 'Total nominal donasi DIKONFIRMASI (string Decimal)' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden' },
        },
      },
      post: {
        tags: ['Donasi'],
        summary: 'Buat donasi baru',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['namaDonatur', 'nominal', 'tanggal', 'metodePembayaran'],
                properties: {
                  religionId: { type: 'integer', description: 'Wajib jika SUPERADMIN; diabaikan untuk role lain (derive dari session)' },
                  tempatIbadahId: { type: 'integer', description: 'Wajib jika SUPERADMIN; harus konsisten dengan `religionId`. Diabaikan untuk role lain.' },
                  jemaahId: { type: 'integer', nullable: true },
                  rekeningId: { type: 'integer', nullable: true },
                  namaDonatur: { type: 'string', minLength: 2, maxLength: 100 },
                  nominal: { type: 'number', minimum: 1 },
                  tanggal: { type: 'string', format: 'date' },
                  metodePembayaran: {
                    type: 'string',
                    enum: ['TRANSFER_BANK', 'TUNAI', 'QRIS', 'MIDTRANS'],
                  },
                  catatan: { type: 'string', maxLength: 500 },
                  buktiPembayaran: { type: 'string', description: 'URL file bukti transfer' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Donasi berhasil dibuat',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Donasi' } } } } },
          },
          400: { description: 'Validasi gagal' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/donasi/{id}': {
      get: {
        tags: ['Donasi'],
        summary: 'Detail donasi by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Berhasil', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Donasi' } } } } } },
          404: { description: 'Tidak ditemukan' },
        },
      },
      put: {
        tags: ['Donasi'],
        summary: 'Update donasi',
        description: 'Hanya PENGURUS (Ketua/Bendahara) atau SUPERADMIN. Semua field opsional (partial update).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Donasi' },
            },
          },
        },
        responses: {
          200: { description: 'Berhasil diupdate' },
          403: { description: 'Forbidden' },
          404: { description: 'Tidak ditemukan' },
        },
      },
      delete: {
        tags: ['Donasi'],
        summary: 'Soft delete donasi',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['alasan'],
                properties: { alasan: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Berhasil dihapus (soft delete)' },
          400: { description: 'Alasan wajib diisi' },
        },
      },
      patch: {
        tags: ['Donasi'],
        summary: 'Konfirmasi / Tolak / Pulihkan donasi',
        description: '`CONFIRM`: konfirmasi pembayaran, set `paymentChannel = "manual_paid"`, kirim email ke donatur. `REJECT`: tolak donasi. `RESTORE`: pulihkan donasi yang dihapus.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['CONFIRM', 'REJECT', 'RESTORE'] },
                  alasan: { type: 'string', description: 'Alasan penolakan (untuk REJECT)' },
                },
              },
              examples: {
                confirm: { summary: 'Konfirmasi', value: { action: 'CONFIRM' } },
                reject: { summary: 'Tolak', value: { action: 'REJECT', alasan: 'Bukti transfer tidak valid' } },
                restore: { summary: 'Pulihkan', value: { action: 'RESTORE' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Berhasil' },
          400: { description: 'Action tidak valid atau donasi sudah dalam status tersebut' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/donasi/midtrans': {
      post: {
        tags: ['Midtrans'],
        summary: 'Buat Midtrans Snap transaction',
        description:
          'Panggil setelah donasi dengan `metodePembayaran = MIDTRANS` dibuat. Mengembalikan `token` untuk membuka popup Midtrans Snap di frontend.\n\n**Frontend usage:**\n```js\nsnap.pay(token, {\n  onSuccess: (result) => { /* polling status */ },\n  onPending: (result) => { /* tunggu webhook */ },\n  onError: (result) => { /* handle error */ },\n})\n```',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['donasiId'],
                properties: {
                  donasiId: { type: 'integer', description: 'ID donasi yang sudah dibuat dengan metodePembayaran = MIDTRANS' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Snap token berhasil dibuat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/MidtransSnapResult' } },
                },
              },
            },
          },
          400: { description: 'Donasi bukan MIDTRANS atau bukan status PENDING' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Donasi tidak ditemukan' },
        },
      },
    },
    '/api/donasi/midtrans/notification': {
      post: {
        tags: ['Midtrans'],
        summary: 'Webhook handler Midtrans (server-to-server)',
        description:
          'Endpoint ini dipanggil oleh **server Midtrans**, bukan oleh frontend. Daftarkan URL-nya di Midtrans dashboard → Settings → Configuration → Payment Notification URL.\n\nFlow:\n1. Verifikasi signature SHA512\n2. Map `transaction_status` → `StatusDonasi`\n3. Resolve `payment_type` → `paymentChannel` (mis. "GoPay", "BCA Virtual Account")\n4. Update donasi di DB\n5. Kirim email sukses ke donatur jika DIKONFIRMASI',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MidtransNotification' },
            },
          },
        },
        responses: {
          200: {
            description: 'Notifikasi diproses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean' } },
                },
              },
            },
          },
          400: { description: 'JSON tidak valid atau signature tidak cocok' },
        },
        security: [],
      },
    },
    '/api/donasi/midtrans/status/{orderId}': {
      get: {
        tags: ['Midtrans'],
        summary: 'Polling status transaksi Midtrans',
        description:
          'Cek status terkini dari Midtrans API dan sinkronisasi ke DB. Gunakan sebagai fallback jika webhook belum diterima. Jika status berubah menjadi DIKONFIRMASI, email sukses dikirim otomatis.',
        parameters: [
          {
            name: 'orderId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Format: IBADAHHUB-{donasiId}-{timestamp}',
            example: 'IBADAHHUB-42-1715500000000',
          },
        ],
        responses: {
          200: {
            description: 'Status terkini',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/MidtransStatusResult' } },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Order ID tidak ditemukan' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}
