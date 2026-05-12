/**
 * Rate limiter sederhana berbasis Map (in-memory).
 *
 * Catatan:
 * - Reset setiap kali server restart.
 * - Tidak shared antar instance (tidak cocok untuk multi-replica deployment).
 * - Untuk produksi serius, gantikan dengan Redis (mis. @upstash/ratelimit).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Bersihkan bucket kadaluarsa setiap menit
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt < now) buckets.delete(key)
  })
}

export interface RateLimitOptions {
  /** Identifier untuk bucket — biasanya `${endpoint}:${ip}` */
  key: string
  /** Jumlah maksimal request dalam window */
  limit: number
  /** Durasi window dalam milidetik */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  cleanup()
  const now = Date.now()
  const bucket = buckets.get(opts.key)

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + opts.windowMs
    buckets.set(opts.key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt, retryAfterSeconds: 0 }
  }

  if (bucket.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return {
    ok: true,
    remaining: opts.limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  }
}

/** Ambil IP klien dari header — kompatibel dengan reverse proxy */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
