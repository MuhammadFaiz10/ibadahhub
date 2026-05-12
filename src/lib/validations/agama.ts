import { z } from 'zod'

export const agamaCreateSchema = z.object({
  nama: z.string().min(2, 'Nama agama minimal 2 karakter').max(50, 'Nama agama maksimal 50 karakter'),
  deskripsi: z.string().max(500, 'Deskripsi maksimal 500 karakter').optional(),
})

export const agamaUpdateSchema = agamaCreateSchema.partial()

export type AgamaCreateInput = z.infer<typeof agamaCreateSchema>
export type AgamaUpdateInput = z.infer<typeof agamaUpdateSchema>
