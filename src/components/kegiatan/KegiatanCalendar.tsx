'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  X,
  Loader2,
  CheckCircle2,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'

interface KegiatanEvent {
  id: number
  namaKegiatan: string
  tanggal: string
  waktuMulai: string
  waktuSelesai: string | null
  lokasi: string
  pemimpin: string | null
  deskripsi: string | null
  kapasitas: number | null
  status: 'UPCOMING' | 'ONGOING' | 'SELESAI' | 'DIBATALKAN'
  religion?: { nama: string } | null
}

const statusStyle: Record<KegiatanEvent['status'], { bg: string; text: string; dot: string; label: string }> = {
  UPCOMING:   { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Akan Datang' },
  ONGOING:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Berlangsung' },
  SELESAI:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Selesai' },
  DIBATALKAN: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Dibatalkan' },
}

const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const dayLabelsShort = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

export function KegiatanCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [events, setEvents] = useState<KegiatanEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KegiatanEvent | null>(null)

  // Hitung rentang grid kalender (Senin–Minggu, termasuk overflow bulan sebelum/sesudah)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      start: calendarStart.toISOString(),
      end: calendarEnd.toISOString(),
      limit: '200',
    })

    axios
      .get(`/api/kegiatan?${params}`)
      .then((r) => {
        if (cancelled) return
        setEvents(r.data.data ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Group events by yyyy-MM-dd
  const eventsByDate = useMemo(() => {
    const map: Record<string, KegiatanEvent[]> = {}
    events.forEach((e) => {
      const key = format(new Date(e.tanggal), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    // Sort by waktuMulai dalam tiap hari
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai)))
    return map
  }, [events])

  const upcomingList = useMemo(() => {
    const now = new Date()
    return events
      .filter((e) => new Date(e.tanggal) >= new Date(now.toDateString()))
      .slice(0, 5)
  }, [events])

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center">
              <CalendarIcon size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
              </h2>
              <p className="text-xs text-gray-500">
                {events.length} kegiatan dalam rentang ini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hari ini
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {dayLabels.map((d, idx) => (
            <div
              key={d + idx}
              className="px-1 sm:px-2 py-2 text-center text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
            >
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{dayLabelsShort[idx]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={22} />
            </div>
          )}
          {days.map((day, i) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDate[dayKey] ?? []
            const inMonth = isSameMonth(day, currentMonth)
            const isWeekendCol = i % 7 === 6 // minggu (kolom 7 dgn weekStartsOn=1)
            const today = isToday(day)

            return (
              <div
                key={dayKey}
                className={`
                  min-h-[72px] sm:min-h-[110px] border-b border-r border-gray-100 p-1 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1
                  ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                  ${i >= days.length - 7 ? 'border-b-0' : ''}
                  ${inMonth ? 'bg-white' : 'bg-gray-50/40'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[11px] sm:text-xs font-medium rounded-full
                      ${today ? 'bg-primary text-white' : inMonth ? 'text-gray-700' : 'text-gray-400'}
                      ${isWeekendCol && !today ? 'text-rose-500' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {dayEvents.length > 2 && (
                    <span className="hidden sm:inline text-[10px] text-gray-400">+{dayEvents.length}</span>
                  )}
                </div>

                {/* Mobile: tap entire cell membuka kegiatan pertama */}
                {dayEvents.length > 0 && (
                  <button
                    onClick={() => setSelected(dayEvents[0] ?? null)}
                    className="sm:hidden flex flex-wrap gap-0.5 -m-0.5 p-0.5"
                    aria-label={`${dayEvents.length} kegiatan`}
                  >
                    {dayEvents.slice(0, 4).map((e) => {
                      const s = statusStyle[e.status]
                      return (
                        <span
                          key={e.id}
                          className={`w-1.5 h-1.5 rounded-full ${s.dot}`}
                        />
                      )
                    })}
                  </button>
                )}

                {/* Desktop: chip dengan judul */}
                <div className="hidden sm:block space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((e) => {
                    const s = statusStyle[e.status]
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className={`w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight ${s.bg} ${s.text} hover:opacity-80 transition-opacity`}
                        title={`${e.namaKegiatan} — ${e.waktuMulai}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                          <span className="font-medium truncate">{e.waktuMulai}</span>
                        </div>
                        <div className="truncate">{e.namaKegiatan}</div>
                      </button>
                    )
                  })}
                  {dayEvents.length > 2 && (
                    <button
                      onClick={() => setSelected(dayEvents[2] ?? null)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-gray-500 hover:bg-gray-100"
                    >
                      Lihat {dayEvents.length - 2} lainnya
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center gap-4">
          {(Object.keys(statusStyle) as KegiatanEvent['status'][]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2 h-2 rounded-full ${statusStyle[s].dot}`} />
              {statusStyle[s].label}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming list */}
      {upcomingList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mt-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Kegiatan Mendatang</h3>
            <p className="text-xs text-gray-500 mt-0.5">5 kegiatan terdekat di bulan ini</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {upcomingList.map((e) => {
              const s = statusStyle[e.status]
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e)}
                    className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-light flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-semibold text-primary-dark">
                        {format(new Date(e.tanggal), 'MMM', { locale: localeId })}
                      </span>
                      <span className="text-base font-bold text-primary-dark leading-none">
                        {format(new Date(e.tanggal), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">{e.namaKegiatan}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${s.bg} ${s.text}`}>
                          <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          {e.waktuMulai}{e.waktuSelesai ? `–${e.waktuSelesai}` : ''}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{e.lokasi}</span>
                        </span>
                        {e.pemimpin && (
                          <span className="flex items-center gap-1 truncate">
                            <Users size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{e.pemimpin}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

interface RsvpInfo {
  me: { status: 'TERDAFTAR' | 'HADIR' | 'TIDAK_HADIR' | 'BATAL' } | null
  terdaftarCount: number
  kapasitas: number | null
  full: boolean
  bisaDaftar: boolean
}

function EventDetailModal({ event, onClose }: { event: KegiatanEvent; onClose: () => void }) {
  const s = statusStyle[event.status]
  const [rsvp, setRsvp] = useState<RsvpInfo | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(true)
  const [rsvpSaving, setRsvpSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRsvpLoading(true)
    axios
      .get(`/api/kegiatan/${event.id}/rsvp`)
      .then((r) => {
        if (cancelled) return
        setRsvp(r.data)
      })
      .catch(() => {
        if (cancelled) return
        setRsvp(null)
      })
      .finally(() => {
        if (!cancelled) setRsvpLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  const isRegistered =
    rsvp?.me?.status === 'TERDAFTAR' || rsvp?.me?.status === 'HADIR'

  async function handleDaftar() {
    setRsvpSaving(true)
    try {
      await axios.post(`/api/kegiatan/${event.id}/rsvp`)
      const r = await axios.get(`/api/kegiatan/${event.id}/rsvp`)
      setRsvp(r.data)
      toast.success('Pendaftaran berhasil')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal mendaftar')
      }
    } finally {
      setRsvpSaving(false)
    }
  }

  const [showBatalConfirm, setShowBatalConfirm] = useState(false)

  async function performBatal() {
    setRsvpSaving(true)
    try {
      await axios.delete(`/api/kegiatan/${event.id}/rsvp`)
      const r = await axios.get(`/api/kegiatan/${event.id}/rsvp`)
      setRsvp(r.data)
      toast.success('Pendaftaran dibatalkan')
      setShowBatalConfirm(false)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Gagal membatalkan')
      }
    } finally {
      setRsvpSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className={`p-5 border-b border-gray-100 ${s.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.text} bg-white/70`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                {isRegistered && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-white/70">
                    <CheckCircle2 size={10} />
                    Terdaftar
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{event.namaKegiatan}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/60 text-gray-600"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex items-start gap-3">
            <CalendarIcon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-gray-700 font-medium capitalize">
                {format(new Date(event.tanggal), 'EEEE, d MMMM yyyy', { locale: localeId })}
              </p>
              <p className="text-xs text-gray-500">
                {event.waktuMulai}{event.waktuSelesai ? ` – ${event.waktuSelesai}` : ''} WIB
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{event.lokasi}</p>
          </div>

          {event.pemimpin && (
            <div className="flex items-start gap-3">
              <Users size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Pemimpin: <span className="font-medium">{event.pemimpin}</span></p>
            </div>
          )}

          {event.kapasitas != null && (
            <div className="flex items-start gap-3">
              <Users size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                {rsvp ? `${rsvp.terdaftarCount} / ${event.kapasitas}` : event.kapasitas} terdaftar
                {rsvp?.full && <span className="ml-2 text-xs text-red-600 font-medium">(penuh)</span>}
              </p>
            </div>
          )}

          {event.deskripsi && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Deskripsi
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.deskripsi}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap justify-end gap-2">
          {!rsvpLoading && rsvp && rsvp.bisaDaftar && (
            isRegistered ? (
              <button
                onClick={() => setShowBatalConfirm(true)}
                disabled={rsvpSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {rsvpSaving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                Batalkan
              </button>
            ) : (
              <button
                onClick={handleDaftar}
                disabled={rsvpSaving || rsvp.full}
                title={rsvp.full ? 'Kuota penuh' : 'Daftar ikut'}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {rsvpSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {rsvp.full ? 'Penuh' : 'Daftar Ikut'}
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      <ConfirmActionDialog
        open={showBatalConfirm}
        onOpenChange={setShowBatalConfirm}
        onConfirm={performBatal}
        title="Batalkan pendaftaran?"
        description={`Anda akan membatalkan pendaftaran ke "${event.namaKegiatan}". Anda bisa mendaftar lagi nanti selama kuota tersedia.`}
        variant="warning"
        confirmLabel="Ya, Batalkan"
        cancelLabel="Tidak"
        isLoading={rsvpSaving}
      />
    </div>
  )
}

