import { z } from 'zod'

export const rekeningCreateSchema = z.object({
  religionId: z.number({ required_error: 'Agama wajib dipilih' }).int().positive(),
  tempatIbadahId: z.number().int().positive('Tempat ibadah tidak valid').optional(),
  namaBank: z.string().min(2, 'Nama bank minimal 2 karakter').max(100),
  nomorRekening: z.string().min(5, 'Nomor rekening minimal 5 karakter').max(50),
  namaPemilik: z.string().min(2, 'Nama pemilik minimal 2 karakter').max(100),
  catatan: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

export const rekeningUpdateSchema = rekeningCreateSchema.partial()

export type RekeningCreateInput = z.infer<typeof rekeningCreateSchema>
export type RekeningUpdateInput = z.infer<typeof rekeningUpdateSchema>
