import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Role, SubRole } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Idle timeout: invalidate session jika tidak ada aktivitas dalam 30 menit
const IDLE_TIMEOUT_SECONDS = 30 * 60
// JWT lifetime: maksimal 8 jam sejak login
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    // updateAge: 0 → setiap request memicu jwt callback sehingga lastActivity ter-refresh
    updateAge: 0,
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
          include: { religion: true, tempatIbadah: true },
        })

        if (!user || !user.status) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id: String(user.id),
          name: user.nama,
          email: user.email,
          role: user.role,
          subRole: user.subRole,
          religionId: user.religionId,
          religionName: user.religion?.nama ?? null,
          tempatIbadahId: user.tempatIbadahId,
          tempatIbadahNama: user.tempatIbadah?.nama ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      const nowSec = Math.floor(Date.now() / 1000)

      if (user) {
        // Sign-in: simpan klaim user + inisialisasi lastActivity
        token.role = user.role
        token.subRole = user.subRole
        token.religionId = user.religionId
        token.religionName = user.religionName
        token.tempatIbadahId = user.tempatIbadahId
        token.tempatIbadahNama = user.tempatIbadahNama
        token.lastActivity = nowSec
        return token
      }

      // Cek idle timeout
      const lastActivity = (token.lastActivity as number | undefined) ?? nowSec
      if (nowSec - lastActivity > IDLE_TIMEOUT_SECONDS) {
        // Session expired karena idle — return null memicu logout di sisi NextAuth v5
        return null
      }

      // Refresh aktivitas terakhir
      token.lastActivity = nowSec
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub!
      session.user.role = token.role as Role
      session.user.subRole = token.subRole as SubRole | null | undefined
      session.user.religionId = token.religionId as number | null | undefined
      session.user.religionName = token.religionName as string | null | undefined
      session.user.tempatIbadahId = token.tempatIbadahId as number | null | undefined
      session.user.tempatIbadahNama = token.tempatIbadahNama as string | null | undefined
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
