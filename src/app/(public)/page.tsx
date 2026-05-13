import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import {
  Users,
  CalendarDays,
  HandCoins,
  Megaphone,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Building2,
  TrendingUp,
  Bell,
  ChevronRight,
} from 'lucide-react'

export const metadata: Metadata = { title: 'IbadahHub — Platform Digital Tempat Ibadah' }

const features = [
  {
    icon: Users,
    title: 'Manajemen Jemaah',
    desc: 'Data lengkap seluruh anggota komunitas. Pencarian, filter, dan histori aktivitas dalam satu tempat.',
  },
  {
    icon: CalendarDays,
    title: 'Jadwal Kegiatan',
    desc: 'Atur jadwal ibadah, kajian, dan acara komunitas. Jemaah bisa daftar secara online.',
  },
  {
    icon: HandCoins,
    title: 'Donasi & Keuangan',
    desc: 'Kelola penerimaan donasi, konfirmasi pembayaran, dan laporan keuangan transparan.',
  },
  {
    icon: Megaphone,
    title: 'Pengumuman',
    desc: 'Sampaikan informasi penting ke seluruh jemaah dengan mudah, lengkap dengan lampiran.',
  },
  {
    icon: ShieldCheck,
    title: 'Akses Berbasis Peran',
    desc: 'Superadmin, Pengurus, dan Jemaah punya akses yang tepat. Data aman dan terkontrol.',
  },
  {
    icon: BarChart3,
    title: 'Laporan & Statistik',
    desc: 'Pantau tren kehadiran, donasi masuk, dan pertumbuhan jemaah secara real-time.',
  },
]

const benefits = [
  'Tidak perlu software terpisah untuk tiap kebutuhan',
  'Data terpusat, selalu sinkron antar pengurus',
  'Jemaah bisa akses informasi kapan saja',
  'Laporan keuangan transparan dan akuntabel',
  'Mendukung multi-agama dalam satu platform',
  'Aman dengan sistem autentikasi berlapis',
]

const stats = [
  { value: '100+', label: 'Komunitas Terdaftar' },
  { value: '10K+', label: 'Jemaah Terkelola' },
  { value: '99.9%', label: 'Uptime Server' },
  { value: 'Gratis', label: 'Untuk Komunitas' },
]

export default async function HomePage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  const agamaList = await prisma.religion.findMany({
    where: { deletedAt: null },
    select: { id: true, nama: true },
    orderBy: { nama: 'asc' },
  })

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-bold text-primary-dark">IbadahHub</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-primary-dark transition-colors px-4 py-2 rounded-lg hover:bg-primary-light"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F0FAF5] via-white to-[#FDF8F0] pt-20 pb-24">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-[#D4A373]/15 blur-3xl" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary-text text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                Platform untuk semua komunitas ibadah
              </div>
              <h1 className="font-serif text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Satu Platform,<br />
                <span className="text-primary">Semua Kebutuhan</span><br />
                Tempat Ibadah
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                Kelola jemaah, kegiatan, donasi, keuangan, dan pengumuman dalam satu sistem
                terintegrasi. Dirancang untuk semua agama dan komunitas.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors shadow-md shadow-primary/20"
                >
                  Mulai Gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Masuk ke Dashboard
                </Link>
              </div>
              {/* Mini trust */}
              <p className="text-xs text-gray-400 mt-6">
                Dipercaya oleh masjid, gereja, pura, dan komunitas lintas agama di Indonesia
              </p>
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="relative lg:pl-8">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Mockup topbar */}
                <div className="bg-primary-dark px-5 py-4 flex items-center justify-between">
                  <span className="font-serif text-white font-semibold text-sm">IbadahHub</span>
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-white/70" />
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Jemaah', value: '248', icon: Users, color: 'text-primary', bg: 'bg-primary-light' },
                      { label: 'Donasi Bulan Ini', value: 'Rp 12,4 jt', icon: HandCoins, color: 'text-[#B45309]', bg: 'bg-[#FEF3C7]' },
                      { label: 'Kegiatan Aktif', value: '7', icon: CalendarDays, color: 'text-[#1D4ED8]', bg: 'bg-[#EFF6FF]' },
                      { label: 'Pengumuman', value: '3 baru', icon: Megaphone, color: 'text-[#7C3AED]', bg: 'bg-[#F5F3FF]' },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                        <div className={`${s.bg} rounded-lg p-2`}>
                          <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">{s.label}</p>
                          <p className="text-sm font-bold text-gray-800">{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Activity list */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-3">Aktivitas Terbaru</p>
                    {[
                      { name: 'Budi Santoso', action: 'Konfirmasi donasi Rp 500.000', time: '5 menit lalu', dot: 'bg-primary' },
                      { name: 'Siti Rahayu', action: 'Daftar kegiatan Pengajian Jumat', time: '1 jam lalu', dot: 'bg-[#1D4ED8]' },
                      { name: 'Admin', action: 'Pengumuman baru: Jadwal Ramadan', time: '3 jam lalu', dot: 'bg-[#7C3AED]' },
                    ].map((a) => (
                      <div key={a.name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.dot}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{a.name}</p>
                          <p className="text-xs text-gray-400 truncate">{a.action}</p>
                        </div>
                        <p className="text-[10px] text-gray-300 flex-shrink-0 ml-auto">{a.time}</p>
                      </div>
                    ))}
                  </div>
                  {/* Mini chart bar */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500">Donasi 6 Bulan</p>
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +18%
                      </span>
                    </div>
                    <div className="flex items-end gap-1.5 h-12">
                      {[40, 55, 35, 70, 60, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-primary/20 relative overflow-hidden"
                          style={{ height: `${h}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary rounded-sm"
                            style={{ height: `${i === 5 ? 100 : 50}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {['Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar'].map((m) => (
                        <span key={m} className="text-[9px] text-gray-300">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white shadow-lg rounded-xl px-4 py-3 flex items-center gap-2 border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-status-success flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Donasi Dikonfirmasi</p>
                  <p className="text-[10px] text-gray-400">Email terkirim ke jemaah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="bg-primary-dark py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-4xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-sm text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm mb-2">Fitur Lengkap</p>
            <h2 className="font-serif text-4xl font-bold text-gray-900 mb-4">
              Semua yang Dibutuhkan<br />Tempat Ibadah Modern
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Dari administrasi harian hingga laporan bulanan — semuanya tersedia tanpa perlu
              instalasi atau keahlian teknis khusus.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all bg-white"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ───────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#F0FAF5] to-[#F8FAF7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-primary font-semibold text-sm mb-2">Kenapa IbadahHub?</p>
              <h2 className="font-serif text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Dirancang untuk Kemudahan Pengurus dan Jemaah
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Kami memahami tantangan pengelolaan komunitas ibadah — mulai dari pencatatan
                manual yang rawan salah hingga sulitnya koordinasi antar pengurus.
                IbadahHub hadir sebagai solusi lengkap yang mudah digunakan.
              </p>
              <ul className="space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right side — role cards */}
            <div className="space-y-4">
              {[
                {
                  role: 'Pengurus / Admin',
                  icon: ShieldCheck,
                  color: 'text-primary',
                  bg: 'bg-primary-light',
                  items: ['Kelola data jemaah & kegiatan', 'Konfirmasi donasi masuk', 'Buat & kirim pengumuman', 'Lihat laporan keuangan'],
                },
                {
                  role: 'Jemaah',
                  icon: Users,
                  color: 'text-[#1D4ED8]',
                  bg: 'bg-[#EFF6FF]',
                  items: ['Lihat jadwal kegiatan', 'Daftar kegiatan online', 'Pantau status donasi', 'Baca pengumuman terkini'],
                },
                {
                  role: 'Superadmin',
                  icon: Building2,
                  color: 'text-[#7C3AED]',
                  bg: 'bg-[#F5F3FF]',
                  items: ['Kelola multi-komunitas', 'Pantau seluruh organisasi', 'Atur akses & izin sistem'],
                },
              ].map((card) => (
                <div key={card.role} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${card.bg} rounded-xl p-2.5`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <p className="font-semibold text-gray-900">{card.role}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {card.items.map((item) => (
                      <div key={item} className="flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-500">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Communities ────────────────────────────────── */}
      {agamaList.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-primary font-semibold text-sm mb-2">Komunitas Aktif</p>
              <h2 className="font-serif text-4xl font-bold text-gray-900 mb-4">
                Temukan Komunitas Anda
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Bergabunglah dengan komunitas yang sudah menggunakan IbadahHub untuk
                kegiatan ibadah sehari-hari.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {agamaList.map((agama) => (
                <Link
                  key={agama.id}
                  href={`/${encodeURIComponent(agama.nama)}`}
                  className="group bg-gray-50 hover:bg-primary-light rounded-2xl p-5 text-center border border-gray-100 hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                    <span className="font-serif font-bold text-xl text-primary">
                      {agama.nama[0]}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-800 group-hover:text-primary-dark transition-colors">
                    {agama.nama}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 group-hover:text-primary transition-colors">
                    Buka →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="py-24 bg-primary-dark relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-[#D4A373]/10 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Digitalisasi Tempat Ibadah<br />Dimulai Hari Ini
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Bergabunglah bersama ratusan komunitas yang sudah merasakan kemudahan
            mengelola tempat ibadah secara digital.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-dark font-bold px-8 py-3.5 rounded-xl hover:bg-primary-light transition-colors shadow-lg"
            >
              Daftar Komunitas Gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="bg-gray-950 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif text-white font-bold">IbadahHub</span>
            <p className="text-xs text-gray-500 mt-1">Platform digital pengelolaan tempat ibadah lintas agama</p>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} IbadahHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
