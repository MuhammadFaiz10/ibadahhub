'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  QrCode,
  CreditCard,
  Building,
  Store,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatRupiah } from '@/lib/utils'

interface DonationDetails {
  id: number
  namaDonatur: string
  nominal: string
  tanggal: string
  status: 'PENDING' | 'DIKONFIRMASI' | 'DITOLAK'
  midtransOrderId: string | null
  paymentChannel: string | null
  midtransStatus: string | null
}

interface PaymentStatus {
  orderId: string
  transactionStatus: string
  statusDonasi: string
  paymentChannel: string
  paymentType: string
  grossAmount: string
  vaNumbers?: Array<{ bank: string; va_number: string }>
  paymentCode?: string
  store?: string
  billKey?: string
  billerCode?: string
  qrCodeUrl?: string
  redirectUrl?: string
}

function loadSnapScript(url: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('midtrans-snap')
    if (existing) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'midtrans-snap'
    script.src = url
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function load3dsScript(snapScriptUrl: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isSandbox = snapScriptUrl.includes('sandbox')
    const url = isSandbox
      ? 'https://api.sandbox.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
      : 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
      
    const existing = document.getElementById('midtrans-3ds')
    if (existing) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'midtrans-3ds'
    script.src = url
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const paymentChannels = [
  {
    category: 'QR Code',
    icon: QrCode,
    methods: [
      { id: 'qris', name: 'QRIS (GoPay, ShopeePay, LinkAja)', type: 'qris' },
      { id: 'gopay', name: 'GoPay', type: 'qris' },
      { id: 'shopeepay', name: 'ShopeePay', type: 'qris' },
    ],
  },
  {
    category: 'Bank Transfer (Virtual Account)',
    icon: CreditCard,
    methods: [
      { id: 'bca', name: 'Bank BCA', type: 'bank' },
      { id: 'bni', name: 'Bank BNI', type: 'bank' },
      { id: 'bri', name: 'Bank BRI', type: 'bank' },
      { id: 'bsi', name: 'Bank Syariah Indonesia (BSI)', type: 'bank' },
      { id: 'mandiri', name: 'Bank Mandiri (Bill Payment)', type: 'bank' },
      { id: 'permata', name: 'Bank Permata', type: 'bank' },
    ],
  },
  {
    category: 'Card Payment',
    icon: CreditCard,
    methods: [
      { id: 'credit_card', name: 'Kartu Kredit / Debit (Visa, Mastercard, JCB)', type: 'card' },
    ],
  },
  {
    category: 'Retail Store',
    icon: Store,
    methods: [
      { id: 'alfamart', name: 'Alfamart', type: 'retail' },
      { id: 'indomaret', name: 'Indomaret', type: 'retail' },
    ],
  },
]

export default function DonasiBayarPage() {
  const router = useRouter()
  const params = useParams()
  const donasiId = params.id ? Number(params.id) : null

  const [loading, setLoading] = useState(true)
  const [charging, setCharging] = useState(false)
  const [polling, setPolling] = useState(false)
  const [donation, setDonation] = useState<DonationDetails | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  
  // Custom checkout state
  const [selectedChannel, setSelectedChannel] = useState<string>('qris')
  const [activeInstructionTab, setActiveInstructionTab] = useState<string>('m-banking')
  const [timeLeft, setTimeLeft] = useState<string>('24:00:00')

  // Credit Card Form State
  const [showCardForm, setShowCardForm] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [show3dsModal, setShow3dsModal] = useState(false)
  const [redirect3dsUrl, setRedirect3dsUrl] = useState('')

  const displayNominal = paymentStatus?.grossAmount || donation?.nominal || '0'

  // Fetch initial donation info and check if there's an active Midtrans transaction
  const fetchDonationInfo = useCallback(async () => {
    if (!donasiId) return
    try {
      setLoading(true)
      const res = await axios.get(`/api/donasi/${donasiId}`)
      const donasiData = res.data.data
      setDonation(donasiData)

      if (donasiData.midtransOrderId) {
        // Fetch status from Midtrans
        const statusRes = await axios.get(`/api/donasi/midtrans/status/${donasiData.midtransOrderId}`)
        const statusData = statusRes.data.data
        if (['expire', 'cancel', 'failure'].includes(statusData.transactionStatus || '')) {
          setPaymentStatus(null)
        } else {
          setPaymentStatus(statusData)
        }
      } else {
        setPaymentStatus(null)
      }
    } catch (err) {
      toast.error('Gagal memuat informasi donasi')
    } finally {
      setLoading(false)
    }
  }, [donasiId])

  useEffect(() => {
    fetchDonationInfo()
  }, [fetchDonationInfo])

  // Poll status while payment is pending
  useEffect(() => {
    if (!paymentStatus || paymentStatus.statusDonasi !== 'PENDING') return

    const interval = setInterval(async () => {
      try {
        setPolling(true)
        const res = await axios.get(`/api/donasi/midtrans/status/${paymentStatus.orderId}`)
        const statusData = res.data.data
        
        if (['expire', 'cancel', 'failure'].includes(statusData.transactionStatus || '')) {
          setPaymentStatus(null)
          const donasiRes = await axios.get(`/api/donasi/${donasiId}`)
          setDonation(donasiRes.data.data)
          toast.warning('Sesi pembayaran telah berakhir atau dibatalkan.')
          clearInterval(interval)
          return
        }

        setPaymentStatus(statusData)
        if (statusData.statusDonasi !== 'PENDING') {
          // Refresh donation to get updated status
          const donasiRes = await axios.get(`/api/donasi/${donasiId}`)
          setDonation(donasiRes.data.data)
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      } finally {
        setPolling(false)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [paymentStatus, donasiId])

  // Simple countdown timer (24 hours from order creation)
  useEffect(() => {
    if (!paymentStatus || paymentStatus.statusDonasi !== 'PENDING') return

    const calculateTimeLeft = () => {
      // Mock countdown 24 hours based on order_id timestamp or date now
      // Usually Midtrans uses 24 hours expiry. Let's make it count down from 24h
      const now = new Date().getTime()
      
      // Parse timestamp from orderId if possible (IBADAHHUB-ID-TIMESTAMP)
      const parts = paymentStatus.orderId.split('-')
      const timestamp = parts.length === 3 ? Number(parts[2]) : Date.now()
      const expiry = timestamp + 24 * 60 * 60 * 1000
      
      const difference = expiry - now
      if (difference <= 0) {
        setTimeLeft('00:00:00')
        return
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      const formatted = [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
      ].join(':')

      setTimeLeft(formatted)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [paymentStatus])

  const handleCharge = async (channelId: string) => {
    if (!donasiId) return
    setCharging(true)
    try {
      const res = await axios.post('/api/donasi/midtrans/charge', {
        donasiId,
        paymentMethod: channelId,
      })
      setPaymentStatus(res.data.data)
      // Refresh donation details to sync orderId
      const donasiRes = await axios.get(`/api/donasi/${donasiId}`)
      setDonation(donasiRes.data.data)
      toast.success('Metode pembayaran berhasil dipilih!')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Gagal membuat invoice pembayaran')
    } finally {
      setCharging(false)
    }
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donasiId) return

    // Validate inputs
    const cleanNumber = cardNumber.replace(/\s+/g, '')
    if (cleanNumber.length < 16) {
      toast.error('Nomor kartu tidak valid')
      return
    }

    const expiryParts = cardExpiry.split('/')
    if (expiryParts.length !== 2) {
      toast.error('Format masa berlaku harus MM/YY')
      return
    }

    const expMonth = (expiryParts[0] ?? '').trim()
    const expYear = (expiryParts[1] ?? '').trim()
    if (expMonth.length !== 2 || expYear.length !== 2) {
      toast.error('Format masa berlaku harus MM/YY')
      return
    }

    if (cardCvv.length < 3) {
      toast.error('CVV tidak valid')
      return
    }

    setCharging(true)
    try {
      // 1. Fetch credentials dynamically from backend
      const snapRes = await axios.post('/api/donasi/midtrans', {
        donasiId,
        paymentMethod: 'credit_card',
      })
      const { snapScriptUrl, clientKey } = snapRes.data.data

      // 2. Load Midtrans 3DS Client script
      await load3dsScript(snapScriptUrl, clientKey)

      // 3. Request card token from Midtrans
      const cardData = {
        card_number: cleanNumber,
        card_exp_month: expMonth,
        card_exp_year: '20' + expYear, // Midtrans requires 4 digit year
        card_cvv: cardCvv,
      }

      const MidtransNew3ds = (window as any).MidtransNew3ds
      if (!MidtransNew3ds) {
        throw new Error('Midtrans library failed to load')
      }

      MidtransNew3ds.getCardToken(cardData, async (response: any) => {
        if (response.status_code === '200') {
          const tokenId = response.token_id

          // 4. Charge token via server
          try {
            const chargeRes = await axios.post('/api/donasi/midtrans/charge', {
              donasiId,
              paymentMethod: 'credit_card',
              creditCardToken: tokenId,
            })

            const chargeData = chargeRes.data.data
            setPaymentStatus(chargeData)

            // Sync donation status
            const donasiRes = await axios.get(`/api/donasi/${donasiId}`)
            setDonation(donasiRes.data.data)

            if (chargeData.redirectUrl) {
              setRedirect3dsUrl(chargeData.redirectUrl)
              setShow3dsModal(true)
            } else {
              toast.success('Pembayaran kartu berhasil diproses!')
            }
          } catch (err: any) {
            toast.error(err.response?.data?.error ?? 'Gagal memproses pembayaran kartu')
          } finally {
            setCharging(false)
          }
        } else {
          toast.error(response.status_message || 'Tokenisasi kartu gagal. Mohon periksa kembali detail kartu.')
          setCharging(false)
        }
      })
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses kartu')
      setCharging(false)
    }
  }

  const handleReset = () => {
    setPaymentStatus(null)
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} berhasil disalin!`)
  }

  const manualCheckStatus = async () => {
    if (!paymentStatus) return
    try {
      setLoading(true)
      const res = await axios.get(`/api/donasi/midtrans/status/${paymentStatus.orderId}`)
      setPaymentStatus(res.data.data)
      const donasiRes = await axios.get(`/api/donasi/${donasiId}`)
      setDonation(donasiRes.data.data)
      toast.success('Status transaksi berhasil diperbarui')
    } catch (err) {
      toast.error('Gagal memperbarui status transaksi')
    } finally {
      setLoading(false)
    }
  }

  // Generate stylized SVGs or badges for bank/e-wallet logos
  const renderPaymentLogo = (id: string) => {
    switch (id) {
      case 'bca':
        return (
          <div className="w-12 h-6 bg-[#005a9c] text-white text-[10px] font-bold rounded flex items-center justify-center tracking-wider">
            BCA
          </div>
        )
      case 'bni':
        return (
          <div className="w-12 h-6 bg-[#e55300] text-white text-[10px] font-bold rounded flex items-center justify-center tracking-wider">
            BNI
          </div>
        )
      case 'bri':
        return (
          <div className="w-12 h-6 bg-[#00529c] text-white text-[10px] font-bold rounded flex items-center justify-center tracking-wider">
            BRI
          </div>
        )
      case 'bsi':
        return (
          <div className="w-12 h-6 bg-[#00918c] text-white text-[10px] font-bold rounded flex items-center justify-center tracking-wider">
            BSI
          </div>
        )
      case 'mandiri':
        return (
          <div className="w-12 h-6 bg-[#1c3f94] text-[#f2b900] text-[9px] font-extrabold rounded flex items-center justify-center tracking-tighter">
            mandiri
          </div>
        )
      case 'permata':
        return (
          <div className="w-12 h-6 bg-[#78b729] text-white text-[9px] font-bold rounded flex items-center justify-center tracking-tight">
            Permata
          </div>
        )
      case 'qris':
        return (
          <div className="w-12 h-6 bg-gray-100 border border-gray-300 text-gray-800 text-[8px] font-extrabold rounded flex items-center justify-center tracking-widest">
            QRIS
          </div>
        )
      case 'alfamart':
        return (
          <div className="w-12 h-6 bg-[#e11921] text-white text-[9px] font-bold rounded flex items-center justify-center">
            Alfamart
          </div>
        )
      case 'indomaret':
        return (
          <div className="w-12 h-6 bg-[#004f9e] text-[#fbc02d] text-[9px] font-bold rounded flex items-center justify-center">
            Indomaret
          </div>
        )
      case 'gopay':
        return (
          <div className="w-12 h-6 bg-[#00aed6] text-white text-[9px] font-bold rounded flex items-center justify-center">
            gopay
          </div>
        )
      case 'shopeepay':
        return (
          <div className="w-12 h-6 bg-[#ee4d2d] text-white text-[8px] font-bold rounded flex items-center justify-center">
            ShopeePay
          </div>
        )
      case 'credit_card':
        return (
          <div className="w-12 h-6 bg-[#1a1f36] text-white text-[8px] font-bold rounded flex items-center justify-center">
            CARD
          </div>
        )
      default:
        return (
          <div className="w-12 h-6 bg-gray-200 text-gray-500 text-[9px] font-bold rounded flex items-center justify-center">
            CARD
          </div>
        )
    }
  }

  // Get specific instructions for payment type
  const getInstructions = () => {
    if (!paymentStatus) return []
    const type = paymentStatus.paymentType
    const code = paymentStatus.paymentCode || ''
    const va = paymentStatus.vaNumbers?.[0]?.va_number || paymentStatus.billKey || ''
    const biller = paymentStatus.billerCode || ''

    if (type === 'bank_transfer' || paymentStatus.paymentChannel?.toLowerCase().includes('virtual account')) {
      const bank = paymentStatus.paymentChannel?.split(' ')[0] || 'Bank'
      const isBsi = bank.toUpperCase() === 'BSI'
      return [
        {
          id: 'm-banking',
          title: 'M-Banking',
          steps: isBsi
            ? [
                'Buka aplikasi BYOND by BSI atau BSI Mobile, lalu login.',
                'Pilih menu Transfer atau menu Bayar > Institusi.',
                'Pilih menu Virtual Account atau masukkan kode institusi.',
                `Masukkan nomor Virtual Account BSI: ${va}.`,
                `Periksa nominal tagihan yang muncul. Pastikan sesuai dengan nominal donasi Rp ${Number(displayNominal).toLocaleString('id-ID')}.`,
                'Masukkan PIN transaksi Anda untuk menyelesaikan pembayaran.',
              ]
            : [
                'Buka aplikasi Mobile Banking pilihan Anda (misalnya BCA Mobile, BNI Mobile, Livin, dll) lalu login.',
                'Pilih menu Transfer atau Bayar.',
                'Pilih menu Virtual Account.',
                `Masukkan nomor Virtual Account: ${va}.`,
                `Periksa nominal tagihan yang muncul. Pastikan sesuai dengan nominal donasi Rp ${Number(displayNominal).toLocaleString('id-ID')}.`,
                'Masukkan PIN transaksi Anda untuk menyelesaikan pembayaran.',
              ],
        },
        {
          id: 'atm',
          title: 'ATM',
          steps: isBsi
            ? [
                'Masukkan kartu ATM BSI dan PIN Anda di mesin ATM.',
                'Pilih menu Pembayaran/Pembelian.',
                'Pilih menu Akademik/Institusi atau menu Virtual Account.',
                `Masukkan nomor Virtual Account BSI Anda: ${va}.`,
                `Konfirmasi data transaksi (nama instansi/donatur dan nominal Rp ${Number(displayNominal).toLocaleString('id-ID')}).`,
                'Pilih Ya atau Setuju untuk memproses transaksi.',
                'Simpan struk ATM sebagai bukti pembayaran Anda.',
              ]
            : [
                'Masukkan kartu ATM dan PIN Anda di mesin ATM terdekat.',
                'Pilih menu Transaksi Lainnya atau Pembayaran.',
                'Pilih menu Transfer > Ke Rekening Virtual Account.',
                `Masukkan nomor Virtual Account ${bank} Anda: ${va}.`,
                `Konfirmasi data transaksi (nama instansi/donatur dan nominal Rp ${Number(displayNominal).toLocaleString('id-ID')}).`,
                'Pilih Ya atau Setuju untuk memproses transaksi.',
                'Simpan struk ATM sebagai bukti pembayaran Anda.',
              ],
        },
      ]
    }

    if (type === 'echannel') { // Mandiri Bill
      return [
        {
          id: 'livin',
          title: 'Livin\' Mandiri',
          steps: [
            'Buka aplikasi Livin\' by Mandiri dan login ke akun Anda.',
            'Pilih menu Bayar > cari instansi pembayaran.',
            `Masukkan Kode Biller: ${biller} (Midtrans).`,
            `Masukkan nomor Bill Key / Kode VA: ${va}.`,
            `Periksa nominal tagihan Rp ${Number(displayNominal).toLocaleString('id-ID')} dan nama Anda di layar konfirmasi.`,
            'Masukkan PIN Livin\' Anda untuk menyelesaikan pembayaran.',
          ],
        },
        {
          id: 'atm',
          title: 'ATM Mandiri',
          steps: [
            'Masukkan kartu ATM Mandiri dan PIN Anda.',
            'Pilih menu Bayar/Beli > Multi Payment.',
            `Masukkan Kode Perusahaan/Biller: ${biller}.`,
            `Masukkan nomor Bill Key / Kode VA: ${va}.`,
            'Masukkan angka 1 untuk memilih tagihan yang sesuai.',
            `Periksa layar konfirmasi, jika sesuai Rp ${Number(displayNominal).toLocaleString('id-ID')}, pilih YA/BENAR.`,
            'Simpan struk ATM sebagai bukti pembayaran.',
          ],
        },
      ]
    }

    if (type === 'qris' || ['gopay', 'shopeepay'].includes(type)) {
      return [
        {
          id: 'scan-qris',
          title: 'Scan QRIS',
          steps: [
            'Gunakan handphone Anda untuk mengunduh atau screenshot kode QR yang tertera.',
            'Buka aplikasi e-wallet atau mobile banking favorit Anda (GoPay, ShopeePay, DANA, OVO, LinkAja, BCA Mobile, dll).',
            'Pilih opsi Scan / Bayar QRIS.',
            'Pilih ikon galeri di pojok atas aplikasi, lalu unggah gambar QR Code yang telah diunduh/screenshot tadi.',
            `Periksa detail pembayaran di layar HP Anda (Nama merchant: IbadahHub / Midtrans, Jumlah: Rp ${Number(displayNominal).toLocaleString('id-ID')}).`,
            'Konfirmasi pembayaran dan masukkan PIN akun Anda.',
          ],
        },
      ]
    }

    if (type === 'cstore') {
      const storeName = paymentStatus.store === 'alfamart' ? 'Alfamart' : 'Indomaret'
      return [
        {
          id: 'retail-step',
          title: `Kasir ${storeName}`,
          steps: [
            `Kunjungi gerai ${storeName} terdekat di daerah Anda.`,
            `Beritahu kasir bahwa Anda ingin melakukan pembayaran belanja online/tagihan Midtrans.`,
            `Tunjukkan Kode Pembayaran kepada kasir: ${code}.`,
            `Kasir akan membacakan detail transaksi donasi. Pastikan nominalnya sesuai yaitu Rp ${Number(displayNominal).toLocaleString('id-ID')}.`,
            'Lakukan pembayaran secara tunai atau debit langsung kepada kasir.',
            'Terima struk fisik pembayaran dari kasir dan simpan sebagai bukti transaksi resmi.',
          ],
        },
      ]
    }

    return []
  }

  if (loading && !polling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-primary mb-3" size={32} />
        <p className="text-sm text-gray-500">Memuat informasi invoice pembayaran...</p>
      </div>
    )
  }

  if (!donation) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <XCircle className="text-red-500 mx-auto mb-3" size={48} />
        <h2 className="text-lg font-semibold text-gray-900">Donasi Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500 mt-1">
          Mohon maaf, data transaksi donasi tidak dapat kami temukan di sistem.
        </p>
        <button
          onClick={() => router.push('/keuangan?tab=donasi')}
          className="mt-4 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  // Handle paid status
  if (donation.status === 'DIKONFIRMASI') {
    return (
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <CheckCircle className="text-emerald-500 mx-auto mb-4" size={56} />
        <h2 className="text-xl font-bold text-gray-900">Pembayaran Berhasil!</h2>
        <p className="text-sm text-gray-600 mt-2">
          Terima kasih atas bantuan Anda. Donasi sebesar{' '}
          <strong className="text-emerald-700 font-semibold">{formatRupiah(donation.nominal)}</strong>{' '}
          telah berhasil kami terima dan dikonfirmasi secara otomatis.
        </p>
        <div className="mt-6 border-t border-gray-100 pt-5 text-left text-xs text-gray-500 space-y-2">
          <div className="flex justify-between">
            <span>Nomor Donasi:</span>
            <span className="font-mono font-medium">#{donation.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Metode:</span>
            <span className="font-medium text-gray-700">{donation.paymentChannel || 'Online (Midtrans)'}</span>
          </div>
          <div className="flex justify-between">
            <span>Donatur:</span>
            <span className="font-medium text-gray-700">{donation.namaDonatur}</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/keuangan?tab=donasi')}
          className="mt-6 w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition"
        >
          Kembali ke Dashboard Donasi
        </button>
      </div>
    )
  }

  // Handle cancelled or failed status
  const isRetryable = ['expire', 'cancel', 'failure'].includes(donation.midtransStatus || '')
  if (donation.status === 'DITOLAK' && !isRetryable) {
    return (
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        <XCircle className="text-red-500 mx-auto mb-4" size={56} />
        <h2 className="text-xl font-bold text-gray-900">Pembayaran Gagal / Dibatalkan</h2>
        <p className="text-sm text-gray-600 mt-2">
          Donasi ini berstatus ditolak atau pembayaran telah kadaluarsa. Silakan membuat donasi baru untuk melakukan pembayaran ulang.
        </p>
        <button
          onClick={() => router.push('/keuangan?tab=donasi')}
          className="mt-6 w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      <div className="mb-6">
        <button
          onClick={() => router.push('/keuangan?tab=donasi')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition"
        >
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </button>
      </div>

      <PageHeader
        title="Pembayaran Online"
        subtitle={`Selesaikan pembayaran donasi untuk order #${donasiId}`}
      />

      {/* Main Grid Checkout Layout */}
      {!paymentStatus ? (
        showCardForm ? (
          // STAGE 1.B: Credit Card Form
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-md mx-auto">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Tagihan</p>
                <h3 className="text-xl font-bold text-primary">{formatRupiah(donation.nominal)}</h3>
              </div>
              <button
                onClick={() => setShowCardForm(false)}
                className="text-xs font-semibold text-gray-500 hover:text-primary transition flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>

            <form onSubmit={handleCardSubmit} className="p-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-800">Detail Kartu Kredit / Debit</h4>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nomor Kartu</label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="1234 5678 1234 5678"
                  value={cardNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
                    setCardNumber(formatted)
                  }}
                  className="w-full px-3 py-2 border border-gray-205 rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Masa Berlaku</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (val.length >= 3) {
                        setCardExpiry(val.slice(0, 2) + '/' + val.slice(2, 4))
                      } else {
                        setCardExpiry(val)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-205 rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength={3}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-gray-205 rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-gray-800"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={charging}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {charging ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Memproses...
                  </>
                ) : (
                  'Bayar Sekarang'
                )}
              </button>
            </form>
          </div>
        ) : (
          // STAGE 1.A: Selection of payment method
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Tagihan</p>
                <h3 className="text-2xl font-bold text-primary">{formatRupiah(donation.nominal)}</h3>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>Donatur: <strong className="text-gray-700">{donation.namaDonatur}</strong></p>
                <p>Tanggal: <strong>{new Date(donation.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong></p>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Pilih Metode Pembayaran Online:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {paymentChannels.map((cat, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <cat.icon className="text-primary" size={18} />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{cat.category}</span>
                    </div>
                    <div className="space-y-2">
                      {cat.methods.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (m.id === 'credit_card') {
                              setShowCardForm(true)
                            } else {
                              handleCharge(m.id)
                            }
                          }}
                          disabled={charging}
                          className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 hover:border-primary rounded-lg transition duration-150 text-left group disabled:opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            {renderPaymentLogo(m.id)}
                            <span className="text-xs font-semibold text-gray-700 group-hover:text-primary transition">
                              {m.name}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-gray-400 group-hover:text-primary transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        // STAGE 2: Display payment code / Virtual Account + step by step instructions
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Info method selected */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="text-center pb-4 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Metode Pembayaran</span>
              <div className="flex items-center justify-center gap-2 mt-2">
                {renderPaymentLogo(paymentStatus.paymentType === 'bank_transfer' ? paymentStatus.paymentChannel?.split(' ')[0]?.toLowerCase() || '' : paymentStatus.paymentType)}
                <span className="text-sm font-bold text-gray-800">
                  {paymentStatus.paymentChannel || 'Online Payment'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Tagihan</p>
                <div className="text-2xl font-extrabold text-primary mt-1">
                  {formatRupiah(displayNominal)}
                </div>
                <div className="mt-1 bg-yellow-50 text-[10px] text-yellow-800 px-2.5 py-1 rounded border border-yellow-100 flex items-center gap-1.5">
                  <Clock size={11} className="flex-shrink-0 animate-pulse text-yellow-600" />
                  <span>Selesaikan dalam <strong className="font-mono text-xs">{timeLeft}</strong></span>
                </div>
              </div>

              {/* QR Code / VA details */}
              {paymentStatus.vaNumbers && paymentStatus.vaNumbers[0] && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Nomor Virtual Account</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold font-mono tracking-wider text-gray-800">
                      {paymentStatus.vaNumbers[0].va_number}
                    </span>
                    <button
                      onClick={() => {
                        const vaNum = paymentStatus.vaNumbers?.[0]?.va_number
                        if (vaNum) handleCopy(vaNum, 'Nomor VA')
                      }}
                      className="p-1.5 text-gray-500 hover:text-primary border border-gray-300 hover:border-primary rounded-lg bg-white transition"
                      title="Salin VA"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}

              {paymentStatus.paymentType === 'echannel' && paymentStatus.billKey && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Kode Perusahaan (Biller)</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-800">
                        {paymentStatus.billerCode}
                      </span>
                      <button
                        onClick={() => handleCopy(paymentStatus.billerCode!, 'Kode Biller')}
                        className="p-1 text-gray-500 hover:text-primary bg-white border border-gray-200 rounded"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Kode VA (Bill Key)</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base font-bold font-mono text-gray-800">
                        {paymentStatus.billKey}
                      </span>
                      <button
                        onClick={() => handleCopy(paymentStatus.billKey!, 'Bill Key')}
                        className="p-1 text-gray-500 hover:text-primary bg-white border border-gray-200 rounded"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus.paymentCode && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Kode Pembayaran Retail</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold font-mono tracking-wider text-gray-800">
                      {paymentStatus.paymentCode}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentStatus.paymentCode!, 'Kode Pembayaran')}
                      className="p-1.5 text-gray-500 hover:text-primary border border-gray-300 hover:border-primary rounded-lg bg-white transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}

              {paymentStatus.qrCodeUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium mb-3">Scan QRIS Code</p>
                  <div className="inline-block p-3 bg-white border border-gray-200 rounded-xl shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentStatus.qrCodeUrl}
                      alt="QRIS Code"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    QRIS ini berlaku untuk semua aplikasi e-wallet & mobile banking Indonesia.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <button
                onClick={manualCheckStatus}
                className="w-full flex items-center justify-center gap-2 py-2 border border-primary text-primary hover:bg-primary-light text-xs font-semibold rounded-lg transition"
              >
                <RefreshCw size={12} className={polling ? 'animate-spin' : ''} />
                Cek Status Pembayaran
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 transition"
              >
                Ganti Metode Pembayaran
              </button>
            </div>
          </div>

          {/* Right panel: Step by step instructions */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Tata Cara Pembayaran
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                Core API Integration
              </span>
            </div>

            {/* Instruction Tabs */}
            <div className="p-6">
              {getInstructions().length > 0 ? (
                <>
                  <div className="flex border-b border-gray-200 mb-6 gap-4">
                    {getInstructions().map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveInstructionTab(tab.id)}
                        className={`pb-3 text-xs font-bold transition ${
                          activeInstructionTab === tab.id
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {tab.title.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {getInstructions().map((tab) => {
                    if (activeInstructionTab !== tab.id && getInstructions().length > 1) return null
                    return (
                      <div key={tab.id} className="space-y-4">
                        {tab.steps.map((step, sIdx) => (
                          <div key={sIdx} className="flex gap-4 items-start">
                            <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-primary-light text-primary font-bold text-xs rounded-full">
                              {sIdx + 1}
                            </span>
                            <p className="text-sm text-gray-700 pt-0.5" dangerouslySetInnerHTML={{ __html: step }} />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Panduan pembayaran otomatis tidak ditemukan. Silakan lakukan pembayaran sesuai dengan channel yang terpilih.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 3D Secure Modal */}
      {show3dsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[550px]">
            <div className="p-4 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">Verifikasi Keamanan Bank (3D Secure)</h3>
              <button
                onClick={() => {
                  setShow3dsModal(false)
                  setRedirect3dsUrl('')
                  fetchDonationInfo()
                }}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 bg-gray-50">
              <iframe
                src={redirect3dsUrl}
                className="w-full h-full border-none"
                title="3D Secure Verification"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
