import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const jadwalIbadahCreateSchema = z.object({
  religionId: z
    .number({ required_error: 'Agama wajib dipilih' })
    .int()
    .positive('Agama tidak valid'),
  tempatIbadahId: z
    .number({ required_error: 'Tempat ibadah wajib dipilih' })
    .int()
    .positive('Tempat ibadah tidak valid')
    .optional(),
  namaIbadah: z.string().min(2, 'Nama ibadah minimal 2 karakter').max(100),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  waktuMulai: z.string().regex(timeRegex, 'Format waktu HH:MM'),
  waktuSelesai: z.string().regex(timeRegex, 'Format waktu HH:MM').optional().or(z.literal('')),
  pemimpin: z.string().max(100).optional().or(z.literal('')),
  pendamping: z.string().max(100).optional().or(z.literal('')),
  lokasi: z.string().max(200).optional().or(z.literal('')),
  catatan: z.string().max(1000).optional().or(z.literal('')),
})

export const jadwalIbadahUpdateSchema = jadwalIbadahCreateSchema.partial()

export type JadwalIbadahCreateInput = z.infer<typeof jadwalIbadahCreateSchema>
export type JadwalIbadahUpdateInput = z.infer<typeof jadwalIbadahUpdateSchema>
