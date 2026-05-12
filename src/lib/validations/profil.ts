import { z } from 'zod'

export const profilUpdateSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  fotoProfil: z.string().max(500).optional().nullable(),
})

export const passwordChangeSchema = z
  .object({
    passwordLama: z.string().min(1, 'Password lama wajib diisi'),
    passwordBaru: z.string().min(8, 'Password baru minimal 8 karakter'),
    konfirmasiPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.passwordBaru === d.konfirmasiPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['konfirmasiPassword'],
  })

export type ProfilUpdateInput = z.infer<typeof profilUpdateSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
