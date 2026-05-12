import { z } from 'zod'

export const pengeluaranCreateSchema = z.object({
  religionId: z.number({ required_error: 'Agama wajib dipilih' }).int().positive(),
  keterangan: z.string().min(2, 'Keterangan minimal 2 karakter').max(300),
  nominal: z.coerce.number().min(1, 'Nominal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  kategori: z.enum(['OPERASIONAL', 'KEGIATAN', 'SOSIAL', 'LAINNYA'], {
    errorMap: () => ({ message: 'Kategori tidak valid' }),
  }),
  bukti: z.string().optional().or(z.literal('')),
})

export const pengeluaranUpdateSchema = pengeluaranCreateSchema.partial()

export type PengeluaranCreateInput = z.infer<typeof pengeluaranCreateSchema>
export type PengeluaranUpdateInput = z.infer<typeof pengeluaranUpdateSchema>
