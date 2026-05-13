import { z } from 'zod'

export const donasiCreateSchema = z.object({
  religionId: z.number().int().positive().optional(),
  jemaahId: z.coerce.number().int().positive().optional().nullable(),
  rekeningId: z.coerce.number().int().positive().optional().nullable(),
  namaDonatur: z.string().min(2, 'Nama donatur minimal 2 karakter').max(100),
  nominal: z.coerce.number().min(1, 'Nominal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  metodePembayaran: z.enum(['TRANSFER_BANK', 'TUNAI', 'QRIS', 'MIDTRANS'], {
    errorMap: () => ({ message: 'Metode pembayaran tidak valid' }),
  }),
  catatan: z.string().max(500).optional().or(z.literal('')),
  buktiPembayaran: z.string().optional().or(z.literal('')),
})

export const donasiUpdateSchema = donasiCreateSchema.partial()

export const donasiActionSchema = z.object({
  action: z.enum(['CONFIRM', 'REJECT', 'RESTORE']),
  alasan: z.string().optional(),
})

export type DonasiCreateInput = z.infer<typeof donasiCreateSchema>
export type DonasiUpdateInput = z.infer<typeof donasiUpdateSchema>
export type DonasiActionInput = z.infer<typeof donasiActionSchema>
