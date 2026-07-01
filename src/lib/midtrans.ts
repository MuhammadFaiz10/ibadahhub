import axios from 'axios'
import crypto from 'crypto'

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? ''
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true'

const SNAP_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1'

const API_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://api.midtrans.com/v2'
  : 'https://api.sandbox.midtrans.com/v2'

function getAuthHeader(): string {
  return Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64')
}

export interface MidtransCustomerDetails {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
}

export interface MidtransItemDetail {
  id: string
  price: number
  quantity: number
  name: string
}

export interface MidtransTransactionParams {
  orderId: string
  amount: number
  customerDetails: MidtransCustomerDetails
  itemDetails?: MidtransItemDetail[]
  enabledPayments?: string[]
}

export interface MidtransSnapResponse {
  token: string
  redirect_url: string
}

export interface MidtransNotification {
  transaction_time: string
  transaction_status: string
  transaction_id: string
  status_message: string
  status_code: string
  signature_key: string
  payment_type: string
  order_id: string
  merchant_id: string
  gross_amount: string
  fraud_status?: string
  currency: string
  // Bank transfer
  va_numbers?: Array<{ bank: string; va_number: string }>
  // Credit card
  bank?: string
  masked_card?: string
  // Convenience store
  store?: string
  payment_code?: string
  // QRIS / e-wallet
  acquirer?: string
}

export type StatusDonasi = 'PENDING' | 'DIKONFIRMASI' | 'DITOLAK'

export function generateOrderId(donasiId: number): string {
  return `IBADAHHUB-${donasiId}-${Date.now()}`
}

export async function createSnapTransaction(
  params: MidtransTransactionParams
): Promise<MidtransSnapResponse> {
  const { orderId, amount, customerDetails, itemDetails, enabledPayments } = params

  const payload: any = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: customerDetails,
    item_details: itemDetails ?? [
      {
        id: 'DONASI',
        price: amount,
        quantity: 1,
        name: 'Donasi IbadahHub',
      },
    ],
  }

  if (enabledPayments) {
    payload.enabled_payments = enabledPayments
  }

  const { data } = await axios.post<MidtransSnapResponse>(
    `${SNAP_BASE_URL}/transactions`,
    payload,
    {
      headers: {
        Authorization: `Basic ${getAuthHeader()}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return data
}

export interface MidtransChargeParams {
  orderId: string
  amount: number
  paymentMethod: string
  customerDetails: MidtransCustomerDetails
  creditCardToken?: string
}

export async function chargeMidtransTransaction(
  params: MidtransChargeParams
): Promise<any> {
  const { orderId, amount, paymentMethod, customerDetails } = params

  let payload: any = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: customerDetails,
  }

  if (paymentMethod === 'bca' || paymentMethod === 'bni' || paymentMethod === 'bri' || paymentMethod === 'bsi') {
    payload.payment_type = 'bank_transfer'
    payload.bank_transfer = {
      bank: paymentMethod,
    }
  } else if (paymentMethod === 'permata') {
    payload.payment_type = 'permata'
  } else if (paymentMethod === 'mandiri') {
    payload.payment_type = 'echannel'
    payload.echannel = {
      bill_info1: 'Donasi IbadahHub',
      bill_info2: 'Pembayaran Online',
    }
  } else if (paymentMethod === 'qris') {
    payload.payment_type = 'qris'
  } else if (paymentMethod === 'gopay') {
    payload.payment_type = 'gopay'
  } else if (paymentMethod === 'shopeepay') {
    payload.payment_type = 'shopeepay'
    payload.shopeepay = {
      callback_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/donasi`,
    }
  } else if (paymentMethod === 'alfamart' || paymentMethod === 'indomaret') {
    payload.payment_type = 'cstore'
    payload.cstore = {
      store: paymentMethod,
      message: 'Donasi IbadahHub',
    }
  } else if (paymentMethod === 'credit_card') {
    if (!params.creditCardToken) {
      throw new Error('Token credit card diperlukan')
    }
    payload.payment_type = 'credit_card'
    payload.credit_card = {
      token_id: params.creditCardToken,
      secure: true,
    }
  } else {
    throw new Error('Metode pembayaran tidak didukung')
  }

  const { data } = await axios.post(
    `${API_BASE_URL}/charge`,
    payload,
    {
      headers: {
        Authorization: `Basic ${getAuthHeader()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  )

  return data
}

export function getQrisQrCodeUrl(orderId: string, paymentType: string = 'qris'): string {
  const type = paymentType === 'gopay' ? 'gopay' : paymentType === 'shopeepay' ? 'shopeepay' : 'qris'
  return `/api/donasi/midtrans/qr-code/${orderId}?type=${type}`
}

export async function fetchMidtransQrCode(orderId: string, paymentType: string): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    // Ambil status transaksi terlebih dahulu untuk mendapatkan transaction_id asli
    const status = await getTransactionStatus(orderId)
    const transactionId = status.transaction_id
    const type = status.payment_type === 'gopay' ? 'gopay' : status.payment_type === 'shopeepay' ? 'shopeepay' : 'qris'

    const response = await axios.get(`${API_BASE_URL}/${type}/${transactionId}/qr-code`, {
      headers: {
        Authorization: `Basic ${getAuthHeader()}`,
      },
      responseType: 'arraybuffer',
    })
    return {
      buffer: Buffer.from(response.data),
      contentType: String(response.headers['content-type'] || 'image/png'),
    }
  } catch (error: any) {
    if (error.response?.data) {
      const errStr = Buffer.from(error.response.data).toString('utf-8')
      console.error('Midtrans QR-Code API error body:', errStr)
    }
    throw error
  }
}

export async function getTransactionStatus(orderId: string): Promise<MidtransNotification> {
  const { data } = await axios.get<MidtransNotification>(
    `${API_BASE_URL}/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Authorization: `Basic ${getAuthHeader()}`,
      },
    }
  )
  return data
}

// Verifikasi signature SHA512: orderId + statusCode + grossAmount + serverKey
export function verifyWebhookSignature(notification: MidtransNotification): boolean {
  const { order_id, status_code, gross_amount, signature_key } = notification
  const expected = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
    .digest('hex')
  return expected === signature_key
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): StatusDonasi {
  if (transactionStatus === 'capture') {
    return fraudStatus === 'accept' ? 'DIKONFIRMASI' : 'DITOLAK'
  }
  if (transactionStatus === 'settlement') return 'DIKONFIRMASI'
  if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) return 'DITOLAK'
  return 'PENDING'
}

// Resolve payment_type dari Midtrans notification ke label yang readable
export function resolvePaymentChannel(notification: MidtransNotification): string {
  const { payment_type, va_numbers, bank, store, acquirer } = notification

  switch (payment_type) {
    case 'bank_transfer': {
      const bankName = va_numbers?.[0]?.bank?.toUpperCase() ?? 'BANK'
      return `${bankName} Virtual Account`
    }
    case 'echannel':
      return 'Mandiri Bill Payment'
    case 'permata':
      return 'Permata Virtual Account'
    case 'credit_card':
      return `Kartu Kredit${bank ? ` (${bank.toUpperCase()})` : ''}`
    case 'gopay':
      return 'GoPay'
    case 'shopeepay':
      return 'ShopeePay'
    case 'dana':
      return 'DANA'
    case 'linkaja':
      return 'LinkAja'
    case 'qris':
      return acquirer ? `QRIS (${acquirer})` : 'QRIS'
    case 'cstore':
      return store
        ? store.charAt(0).toUpperCase() + store.slice(1)
        : 'Minimarket'
    case 'akulaku':
      return 'Akulaku'
    case 'kredivo':
      return 'Kredivo'
    default:
      return payment_type ?? 'Midtrans'
  }
}

export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? ''

export const MIDTRANS_SNAP_SCRIPT_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js'
