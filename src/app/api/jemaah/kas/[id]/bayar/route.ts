import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { MetodePembayaran } from '@prisma/client'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEMAAH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { metodePembayaran, buktiPembayaran } = await req.json()
    
    if (!metodePembayaran) {
      return NextResponse.json({ error: 'Metode pembayaran wajib diisi' }, { status: 400 })
    }

    const tagihanJemaahId = Number(params.id)
    
    // Validate ownership
    const jemaah = await prisma.jemaah.findUnique({
      where: { userId: Number(session.user.id) }
    })

    if (!jemaah) {
      return NextResponse.json({ error: 'Profil jemaah tidak ditemukan' }, { status: 404 })
    }

    const existingTagihan = await prisma.tagihanKasJemaah.findUnique({
      where: { id: tagihanJemaahId }
    })

    if (!existingTagihan || existingTagihan.jemaahId !== jemaah.id) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    if (existingTagihan.status !== 'BELUM_DIBAYAR') {
      return NextResponse.json({ error: 'Tagihan sudah dibayar atau sedang diproses' }, { status: 400 })
    }

    // Update status to MENUNGGU_KONFIRMASI
    const updatedTagihan = await prisma.tagihanKasJemaah.update({
      where: { id: tagihanJemaahId },
      data: {
        status: 'MENUNGGU_KONFIRMASI',
        metodePembayaran: metodePembayaran as MetodePembayaran,
        buktiPembayaran,
        tanggalBayar: new Date()
      }
    })

    return NextResponse.json(updatedTagihan)
  } catch (error: any) {
    console.error('POST /api/jemaah/kas/[id]/bayar Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
