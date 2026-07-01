import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  chargeMidtransTransaction,
  generateOrderId,
  getQrisQrCodeUrl,
  resolvePaymentChannel,
} from '@/lib/midtrans'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const donasiId = Number(body.donasiId)
  const paymentMethod = body.paymentMethod // 'bca' | 'bni' | 'bri' | 'bsi' | 'permata' | 'mandiri' | 'qris' | 'alfamart' | 'indomaret' | 'gopay' | 'shopeepay' | 'credit_card'
  const creditCardToken = body.creditCardToken

  if (!donasiId || isNaN(donasiId)) {
    return NextResponse.json({ error: 'donasiId tidak valid' }, { status: 400 })
  }

  if (!paymentMethod) {
    return NextResponse.json({ error: 'paymentMethod harus diisi' }, { status: 400 })
  }

  const donasi = await prisma.donasi.findUnique({
    where: { id: donasiId, deletedAt: null },
    include: { user: { select: { nama: true, email: true } } },
  })

  if (!donasi) {
    return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })
  }

  if (donasi.metodePembayaran !== 'MIDTRANS') {
    return NextResponse.json(
      { error: 'Donasi ini tidak menggunakan metode Midtrans' },
      { status: 400 }
    )
  }

  const isExpired = ['expire', 'cancel', 'failure'].includes(donasi.midtransStatus || '')
  if (donasi.status !== 'PENDING' && !isExpired) {
    return NextResponse.json(
      { error: 'Transaksi Midtrans hanya bisa dibuat untuk donasi berstatus PENDING' },
      { status: 400 }
    )
  }

  // Batasi akses: JEMAAH hanya bisa buat transaksi untuk donasinya sendiri
  if (
    session.user.role === 'JEMAAH' &&
    donasi.userId !== Number(session.user.id)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orderId = generateOrderId(donasi.id)

  try {
    const chargeResult = await chargeMidtransTransaction({
      orderId,
      amount: Number(donasi.nominal),
      paymentMethod,
      customerDetails: {
        first_name: donasi.namaDonatur,
        email: donasi.user?.email ?? undefined,
      },
      creditCardToken,
    })

    const paymentChannel = resolvePaymentChannel(chargeResult)

    await prisma.donasi.update({
      where: { id: donasi.id },
      data: {
        midtransOrderId: orderId,
        midtransStatus: chargeResult.transaction_status || 'pending',
        midtransTransactionId: chargeResult.transaction_id || null,
        paymentChannel,
        status: 'PENDING',
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: Number(session.user.id),
        aksi: 'MIDTRANS_CHARGE',
        model: 'Donasi',
        recordId: donasi.id,
        detail: `Charge pembayaran Midtrans Core API (${paymentMethod}) untuk donasi #${donasi.id} (order: ${orderId})`,
      },
    })

    return NextResponse.json({
      data: {
        orderId,
        transactionStatus: chargeResult.transaction_status || 'pending',
        paymentType: chargeResult.payment_type,
        paymentChannel,
        grossAmount: chargeResult.gross_amount || String(donasi.nominal),
        vaNumbers: chargeResult.va_numbers || null,
        paymentCode: chargeResult.payment_code || null,
        store: chargeResult.store || null,
        billKey: chargeResult.bill_key || null,
        billerCode: chargeResult.biller_code || null,
        redirectUrl: chargeResult.redirect_url || null,
        qrCodeUrl: ['qris', 'gopay', 'shopeepay'].includes(chargeResult.payment_type)
          ? getQrisQrCodeUrl(orderId, chargeResult.payment_type)
          : null,
      },
    })
  } catch (error: any) {
    console.error('Midtrans Core API charge error:', error)
    return NextResponse.json(
      { error: error.response?.data?.status_message || error.message || 'Gagal menghubungi payment gateway' },
      { status: 500 }
    )
  }
}
