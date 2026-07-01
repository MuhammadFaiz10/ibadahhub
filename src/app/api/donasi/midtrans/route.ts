import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createSnapTransaction,
  generateOrderId,
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_SNAP_SCRIPT_URL,
} from '@/lib/midtrans'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const donasiId = Number(body.donasiId)
  const paymentMethod = body.paymentMethod

  if (!donasiId || isNaN(donasiId)) {
    return NextResponse.json({ error: 'donasiId tidak valid' }, { status: 400 })
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

  // Jika sudah punya token aktif, belum expired, dan tidak meminta paymentMethod khusus, kembalikan token yang lama
  if (donasi.midtransToken && donasi.midtransPaymentUrl && !isExpired && !paymentMethod) {
    return NextResponse.json({
      data: {
        token: donasi.midtransToken,
        redirect_url: donasi.midtransPaymentUrl,
        clientKey: MIDTRANS_CLIENT_KEY,
        snapScriptUrl: MIDTRANS_SNAP_SCRIPT_URL,
      },
    })
  }

  // Batasi akses: JEMAAH hanya bisa buat transaksi untuk donasinya sendiri
  if (
    session.user.role === 'JEMAAH' &&
    donasi.userId !== Number(session.user.id)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orderId = generateOrderId(donasi.id)

  const snap = await createSnapTransaction({
    orderId,
    amount: Number(donasi.nominal),
    customerDetails: {
      first_name: donasi.namaDonatur,
      email: donasi.user?.email ?? undefined,
    },
    itemDetails: [
      {
        id: `DONASI-${donasi.id}`,
        price: Number(donasi.nominal),
        quantity: 1,
        name: `Donasi - ${donasi.namaDonatur}`,
      },
    ],
    enabledPayments: paymentMethod ? [paymentMethod] : undefined,
  })

  await prisma.donasi.update({
    where: { id: donasi.id },
    data: {
      midtransOrderId: orderId,
      midtransToken: snap.token,
      midtransPaymentUrl: snap.redirect_url,
      midtransStatus: 'pending',
      status: 'PENDING',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: Number(session.user.id),
      aksi: 'MIDTRANS_INIT',
      model: 'Donasi',
      recordId: donasi.id,
      detail: `Inisiasi pembayaran Midtrans untuk donasi #${donasi.id} (order: ${orderId})`,
    },
  })

  return NextResponse.json({
    data: {
      token: snap.token,
      redirect_url: snap.redirect_url,
      clientKey: MIDTRANS_CLIENT_KEY,
      snapScriptUrl: MIDTRANS_SNAP_SCRIPT_URL,
    },
  })
}
