import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'JEMAAH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'tagihan'

    const userId = Number(session.user.id)

    if (type === 'tagihan') {
      const tagihan = await prisma.tagihanKas.findMany({
        where: {
          userId,
          status: 'BELUM_DIBAYAR'
        },
        orderBy: {
          jatuhTempo: 'asc'
        }
      })
      
      const mappedData = tagihan.map(t => ({
        id: t.id,
        status: t.status,
        metodePembayaran: t.metodePembayaran,
        buktiPembayaran: t.buktiPembayaran,
        tanggalBayar: t.tanggalBayar,
        tagihan: {
          id: t.id,
          nama: t.nama,
          deskripsi: t.deskripsi,
          nominal: t.nominal,
          jatuhTempo: t.jatuhTempo,
        }
      }))

      return NextResponse.json({ data: mappedData, total: tagihan.length })
    } 
    
    if (type === 'riwayat') {
      const riwayat = await prisma.tagihanKas.findMany({
        where: {
          userId,
          status: {
            in: ['LUNAS', 'MENUNGGU_KONFIRMASI']
          }
        },
        orderBy: {
          tanggalBayar: 'desc'
        }
      })

      const mappedData = riwayat.map(t => ({
        id: t.id,
        status: t.status,
        metodePembayaran: t.metodePembayaran,
        buktiPembayaran: t.buktiPembayaran,
        tanggalBayar: t.tanggalBayar,
        tagihan: {
          id: t.id,
          nama: t.nama,
          deskripsi: t.deskripsi,
          nominal: t.nominal,
          jatuhTempo: t.jatuhTempo,
        }
      }))

      return NextResponse.json({ data: mappedData, total: riwayat.length })
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
