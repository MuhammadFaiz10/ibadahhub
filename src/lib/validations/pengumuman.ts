import { z } from 'zod'

export const pengumumanCreateSchema = z.object({
  religionId: z
    .number({ required_error: 'Agama wajib dipilih' })
    .int()
    .positive('Agama tidak valid'),
  judul: z.string().min(2, 'Judul minimal 2 karakter').max(200),
  isi: z.string().min(10, 'Isi pengumuman minimal 10 karakter'),
  tanggalPublish: z.string().optional(),
  expireDate: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'AKTIF', 'KADALUARSA']).optional(),
})

export const pengumumanUpdateSchema = pengumumanCreateSchema.partial()

export type PengumumanCreateInput = z.infer<typeof pengumumanCreateSchema>
export type PengumumanUpdateInput = z.infer<typeof pengumumanUpdateSchema>
