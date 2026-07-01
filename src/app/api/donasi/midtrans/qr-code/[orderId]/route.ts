import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchMidtransQrCode } from '@/lib/midtrans'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = params
  const { searchParams } = new URL(req.url)
  const paymentType = searchParams.get('type') || 'qris'

  try {
    const { buffer, contentType } = await fetchMidtransQrCode(orderId, paymentType)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error(`Error proxying Midtrans QR Code for ${orderId}:`, error.message)
    return NextResponse.json(
      { error: 'Gagal mengambil gambar QR Code dari Midtrans' },
      { status: 500 }
    )
  }
}
