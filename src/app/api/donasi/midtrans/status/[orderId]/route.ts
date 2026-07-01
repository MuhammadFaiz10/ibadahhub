import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getTransactionStatus,
  mapMidtransStatus,
  resolvePaymentChannel,
  getQrisQrCodeUrl,
} from '@/lib/midtrans'
import { sendDonasiSuccessEmail } from '@/lib/email'

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = params

  const donasi = await prisma.donasi.findFirst({
    where: { midtransOrderId: orderId, deletedAt: null },
  })

  if (!donasi) {
    return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })
  }

  // JEMAAH hanya bisa cek status donasinya sendiri
  if (session.user.role === 'JEMAAH' && donasi.userId !== Number(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const notification = await getTransactionStatus(orderId)
  const statusDonasi = mapMidtransStatus(
    notification.transaction_status,
    notification.fraud_status
  )
  const paymentChannel = resolvePaymentChannel(notification)

  // Sinkronisasi ke DB jika status atau paymentChannel berubah
  if (
    donasi.midtransStatus !== notification.transaction_status ||
    donasi.status !== statusDonasi ||
    donasi.paymentChannel !== paymentChannel
  ) {
    const isNewlyConfirmed = statusDonasi === 'DIKONFIRMASI' && donasi.status !== 'DIKONFIRMASI'

    const updatedDonasi = await prisma.donasi.update({
      where: { id: donasi.id },
      data: {
        midtransStatus: notification.transaction_status,
        midtransTransactionId: notification.transaction_id,
        paymentChannel,
        status: statusDonasi,
        ...(isNewlyConfirmed
          ? { dikonfirmasiAt: new Date(), dikonfirmasiOleh: null }
          : {}),
      },
    })

    if (isNewlyConfirmed) {
      await sendDonasiSuccessEmail(
        { ...updatedDonasi, dikonfirmasiAt: updatedDonasi.dikonfirmasiAt },
        paymentChannel
      )
    }
  }

  // For Mandiri Bill / echannel, the Biller Code is returned under biller_code and Bill Key under bill_key
  const billKey = (notification as any).bill_key || null
  const billerCode = (notification as any).biller_code || null

  return NextResponse.json({
    data: {
      orderId,
      transactionStatus: notification.transaction_status,
      statusDonasi,
      paymentChannel,
      paymentType: notification.payment_type,
      grossAmount: notification.gross_amount || String(donasi.nominal),
      vaNumbers: notification.va_numbers || null,
      paymentCode: notification.payment_code || null,
      store: notification.store || null,
      billKey,
      billerCode,
      qrCodeUrl: ['qris', 'gopay', 'shopeepay'].includes(notification.payment_type)
        ? getQrisQrCodeUrl(orderId, notification.payment_type)
        : null,
    },
  })
}
