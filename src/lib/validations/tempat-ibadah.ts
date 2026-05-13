import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const tempatIbadahCreateSchema = z.object({
  religionId: z
    .number({ required_error: 'Agama wajib dipilih' })
    .int()
    .positive('Agama tidak valid'),
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(150),
  slug: z
    .string()
    .min(2, 'Slug minimal 2 karakter')
    .max(120)
    .regex(slugRegex, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'),
  alamat: z.string().max(500).optional().or(z.literal('')),
  kota: z.string().max(100).optional().or(z.literal('')),
  provinsi: z.string().max(100).optional().or(z.literal('')),
  kodePos: z.string().max(20).optional().or(z.literal('')),
  noTelp: z.string().max(30).optional().or(z.literal('')),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  deskripsi: z.string().max(2000).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

export const tempatIbadahUpdateSchema = tempatIbadahCreateSchema.partial()

export type TempatIbadahCreateInput = z.infer<typeof tempatIbadahCreateSchema>
export type TempatIbadahUpdateInput = z.infer<typeof tempatIbadahUpdateSchema>
