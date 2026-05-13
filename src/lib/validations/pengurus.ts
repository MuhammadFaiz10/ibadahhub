import { z } from 'zod'

export const pengurusCreateSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  subRole: z.enum(['KETUA', 'BENDAHARA', 'SEKRETARIS'], {
    errorMap: () => ({ message: 'Sub role tidak valid' }),
  }),
  religionId: z.number({ required_error: 'Agama wajib dipilih' }).int().positive('Agama tidak valid'),
  tempatIbadahId: z
    .number({ required_error: 'Tempat ibadah wajib dipilih' })
    .int()
    .positive('Tempat ibadah tidak valid')
    .optional(),
})

export const pengurusUpdateSchema = pengurusCreateSchema.partial()

export type PengurusCreateInput = z.infer<typeof pengurusCreateSchema>
export type PengurusUpdateInput = z.infer<typeof pengurusUpdateSchema>
