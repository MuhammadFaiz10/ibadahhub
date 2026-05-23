import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'JEMAAH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'tagihan'

    // Get Jemaah profile
    const jemaah = await prisma.jemaah.findUnique({
      where: { userId: Number(session.user.id) }
    })

    if (!jemaah) {
      return NextResponse.json({ error: 'Profil jemaah tidak ditemukan' }, { status: 404 })
    }

    if (type === 'tagihan') {
      const tagihan = await prisma.tagihanKasJemaah.findMany({
        where: {
          jemaahId: jemaah.id,
          status: 'BELUM_DIBAYAR'
        },
        include: {
          tagihan: true
        },
        orderBy: {
          tagihan: {
            jatuhTempo: 'asc'
          }
        }
      })
      return NextResponse.json({ data: tagihan, total: tagihan.length })
    } 
    
    if (type === 'riwayat') {
      const riwayat = await prisma.tagihanKasJemaah.findMany({
        where: {
          jemaahId: jemaah.id,
          status: {
            in: ['LUNAS', 'MENUNGGU_KONFIRMASI']
          }
        },
        include: {
          tagihan: true
        },
        orderBy: {
          tanggalBayar: 'desc'
        }
      })
      return NextResponse.json({ data: riwayat, total: riwayat.length })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error: any) {
    console.error('GET /api/jemaah/kas Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
