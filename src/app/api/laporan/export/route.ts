import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { computeLaporanData, bulanLabel } from '@/lib/laporan'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function canViewLaporan(session: { user: { role: string; subRole?: string | null } } | null) {
  if (!session) return false
  if (session.user.role === 'SUPERADMIN') return true
  if (session.user.role !== 'PENGURUS') return false
  return session.user.subRole === 'KETUA' || session.user.subRole === 'BENDAHARA'
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

// GET /api/laporan/export?format=xlsx|pdf&tahun=2026
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewLaporan(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const format = (searchParams.get('format') ?? 'xlsx').toLowerCase()
  const tahun = Number(searchParams.get('tahun')) || new Date().getFullYear()

  const religionId = session.user.role !== 'SUPERADMIN' ? (session.user.religionId ?? -1) : undefined
  const data = await computeLaporanData(tahun, religionId)

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Ringkasan
    const ringkasan = [
      ['Laporan Keuangan'],
      [`Tahun ${tahun}${data.religionName ? ` — ${data.religionName}` : ''}`],
      [],
      ['Item', 'Nilai'],
      ['Total Donasi (DIKONFIRMASI)', data.totalDonasi],
      ['Total Pengeluaran', data.totalPengeluaran],
      ['Saldo', data.saldo],
      ['Jumlah Kegiatan', data.kegiatanCount],
    ]
    const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasan)
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')

    // Sheet 2: Per Bulan
    const perBulanRows = [
      ['Bulan', 'Donasi', 'Pengeluaran', 'Selisih'],
      ...data.perBulan.map((p) => [
        `${bulanLabel[p.bulan]} ${tahun}`,
        p.donasi,
        p.pengeluaran,
        p.donasi - p.pengeluaran,
      ]),
      ['TOTAL', data.totalDonasi, data.totalPengeluaran, data.saldo],
    ]
    const wsBulan = XLSX.utils.aoa_to_sheet(perBulanRows)
    XLSX.utils.book_append_sheet(wb, wsBulan, 'Per Bulan')

    // Sheet 3: Per Kategori Pengeluaran
    const perKategoriRows = [
      ['Kategori', 'Jumlah Transaksi', 'Total Nominal', '% dari Total'],
      ...data.perKategori.map((k) => [
        k.kategori,
        k.count,
        k.total,
        data.totalPengeluaran > 0 ? (k.total / data.totalPengeluaran) * 100 : 0,
      ]),
    ]
    const wsKategori = XLSX.utils.aoa_to_sheet(perKategoriRows)
    XLSX.utils.book_append_sheet(wb, wsKategori, 'Per Kategori')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const body = new Uint8Array(buffer)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-keuangan-${tahun}.xlsx"`,
      },
    })
  }

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Laporan Keuangan', 14, 18)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Tahun ${tahun}${data.religionName ? ` — ${data.religionName}` : ''}`,
      14,
      25
    )
    doc.setTextColor(120)
    doc.setFontSize(8)
    doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, 14, 30)
    doc.setTextColor(0)

    // Ringkasan table
    autoTable(doc, {
      startY: 36,
      head: [['Item', 'Nilai']],
      body: [
        ['Total Donasi (DIKONFIRMASI)', formatRupiah(data.totalDonasi)],
        ['Total Pengeluaran', formatRupiah(data.totalPengeluaran)],
        ['Saldo', formatRupiah(data.saldo)],
        ['Jumlah Kegiatan', String(data.kegiatanCount)],
      ],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    })

    // Per Bulan
    autoTable(doc, {
      head: [['Bulan', 'Donasi', 'Pengeluaran', 'Selisih']],
      body: [
        ...data.perBulan.map((p) => [
          `${bulanLabel[p.bulan]} ${tahun}`,
          formatRupiah(p.donasi),
          formatRupiah(p.pengeluaran),
          formatRupiah(p.donasi - p.pengeluaran),
        ]),
        [
          { content: 'TOTAL', styles: { fontStyle: 'bold' } },
          { content: formatRupiah(data.totalDonasi), styles: { fontStyle: 'bold' } },
          { content: formatRupiah(data.totalPengeluaran), styles: { fontStyle: 'bold' } },
          { content: formatRupiah(data.saldo), styles: { fontStyle: 'bold' } },
        ],
      ],
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    })

    // Per Kategori
    autoTable(doc, {
      head: [['Kategori', 'Transaksi', 'Total', '%']],
      body: data.perKategori.map((k) => [
        k.kategori,
        String(k.count),
        formatRupiah(k.total),
        `${data.totalPengeluaran > 0 ? ((k.total / data.totalPengeluaran) * 100).toFixed(1) : '0'}%`,
      ]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    })

    const pdfBytes = new Uint8Array(doc.output('arraybuffer'))

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-keuangan-${tahun}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: 'Format tidak dikenal. Gunakan xlsx atau pdf.' }, { status: 400 })
}
