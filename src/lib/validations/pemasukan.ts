import { z } from 'zod'

export const pemasukanCreateSchema = z.object({
  religionId: z.number({ required_error: 'Agama wajib dipilih' }).int().positive(),
  tempatIbadahId: z.number().int().positive('Tempat ibadah tidak valid').optional(),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter').max(300),
  nominal: z.coerce.number().min(1, 'Nominal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['DONASI', 'HIBAH', 'USAHA', 'LAINNYA'], {
    errorMap: () => ({ message: 'Kategori tidak valid' }),
  }),
  bukti: z.string().optional().or(z.literal('')),
  rekeningId: z.coerce.number().int().positive('Rekening tidak valid').optional().nullable(),
})

export const pemasukanUpdateSchema = pemasukanCreateSchema.partial()

export type PemasukanCreateInput = z.infer<typeof pemasukanCreateSchema>
export type PemasukanUpdateInput = z.infer<typeof pemasukanUpdateSchema>
