import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const kegiatanCreateSchema = z.object({
  religionId: z
    .number({ required_error: 'Agama wajib dipilih' })
    .int()
    .positive('Agama tidak valid'),
  tempatIbadahId: z
    .number({ required_error: 'Tempat ibadah wajib dipilih' })
    .int()
    .positive('Tempat ibadah tidak valid')
    .optional(),
  namaKegiatan: z.string().min(2, 'Nama kegiatan minimal 2 karakter').max(150),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  waktuMulai: z.string().regex(timeRegex, 'Format waktu HH:MM'),
  waktuSelesai: z.string().regex(timeRegex, 'Format waktu HH:MM').optional().or(z.literal('')),
  lokasi: z.string().min(2, 'Lokasi wajib diisi').max(200),
  deskripsi: z.string().max(2000).optional().or(z.literal('')),
  kapasitas: z.coerce.number().int().min(0).optional().nullable(),
  status: z.enum(['UPCOMING', 'ONGOING', 'SELESAI', 'DIBATALKAN']).optional(),
})

export const kegiatanUpdateSchema = kegiatanCreateSchema.partial()

export type KegiatanCreateInput = z.infer<typeof kegiatanCreateSchema>
export type KegiatanUpdateInput = z.infer<typeof kegiatanUpdateSchema>
