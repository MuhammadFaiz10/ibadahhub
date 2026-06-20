import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MetodePembayaran } from '@prisma/client'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'JEMAAH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { metodePembayaran, buktiPembayaran } = await req.json()
    
    if (!metodePembayaran) {
      return NextResponse.json({ error: 'Metode pembayaran wajib diisi' }, { status: 400 })
    }

    const userId = Number(session.user.id)
    const tagihanId = Number(params.id)

    const existingTagihan = await prisma.tagihanKas.findUnique({
      where: { id: tagihanId }
    })

    if (!existingTagihan || existingTagihan.userId !== userId) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    if (existingTagihan.status !== 'BELUM_DIBAYAR') {
      return NextResponse.json({ error: 'Tagihan sudah dibayar atau sedang diproses' }, { status: 400 })
    }

    // Update status to MENUNGGU_KONFIRMASI
    const updatedTagihan = await prisma.tagihanKas.update({
      where: { id: tagihanId },
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
