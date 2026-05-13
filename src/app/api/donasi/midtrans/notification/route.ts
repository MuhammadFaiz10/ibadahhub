import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  mapMidtransStatus,
  resolvePaymentChannel,
  type MidtransNotification,
} from '@/lib/midtrans'
import { sendDonasiSuccessEmail } from '@/lib/email'

// Midtrans mengirim POST ke endpoint ini setiap kali status transaksi berubah.
// Daftarkan URL ini di Midtrans dashboard: Settings → Configuration → Payment Notification URL
export async function POST(req: NextRequest) {
  let notification: MidtransNotification

  try {
    notification = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!verifyWebhookSignature(notification)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const donasi = await prisma.donasi.findFirst({
    where: { midtransOrderId: notification.order_id, deletedAt: null },
  })

  if (!donasi) {
    // Return 200 agar Midtrans tidak terus retry — donasi mungkin sudah dihapus
    return NextResponse.json({ ok: true, message: 'Donasi tidak ditemukan' })
  }

  const statusDonasi = mapMidtransStatus(
    notification.transaction_status,
    notification.fraud_status
  )
  const paymentChannel = resolvePaymentChannel(notification)

  const updatedDonasi = await prisma.donasi.update({
    where: { id: donasi.id },
    data: {
      midtransStatus: notification.transaction_status,
      midtransTransactionId: notification.transaction_id,
      paymentChannel,
      status: statusDonasi,
      ...(statusDonasi === 'DIKONFIRMASI'
        ? { dikonfirmasiAt: new Date(), dikonfirmasiOleh: null }
        : {}),
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: donasi.userId ?? 0,
      aksi: 'MIDTRANS_NOTIFICATION',
      model: 'Donasi',
      recordId: donasi.id,
      detail: `Midtrans notification: ${notification.transaction_status} → ${statusDonasi} via ${paymentChannel} (order: ${notification.order_id})`,
    },
  })

  if (statusDonasi === 'DIKONFIRMASI') {
    await sendDonasiSuccessEmail(
      { ...updatedDonasi, dikonfirmasiAt: updatedDonasi.dikonfirmasiAt },
      paymentChannel
    )
  }

  return NextResponse.json({ ok: true })
}
