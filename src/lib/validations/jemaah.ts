import { z } from 'zod'

export const jemaahCreateSchema = z.object({
  religionId: z
    .number({ required_error: 'Agama wajib dipilih' })
    .int()
    .positive('Agama tidak valid'),
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  noHp: z.string().max(20).optional().or(z.literal('')),
  alamat: z.string().max(500).optional().or(z.literal('')),
})

export const jemaahUpdateSchema = jemaahCreateSchema.partial()

export type JemaahCreateInput = z.infer<typeof jemaahCreateSchema>
export type JemaahUpdateInput = z.infer<typeof jemaahUpdateSchema>
