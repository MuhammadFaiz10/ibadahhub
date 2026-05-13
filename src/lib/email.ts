import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY?.trim() ?? ''
const from = process.env.EMAIL_FROM?.trim() || 'IbadahHub <onboarding@resend.dev>'
const isConfigured = apiKey.length > 0 && !apiKey.includes('xxxxxxxx')

const resend = isConfigured ? new Resend(apiKey) : null

export const emailIsConfigured = isConfigured
export const isDevMode = process.env.NODE_ENV !== 'production'

interface SendOpts {
  to: string
  subject: string
  html: string
}

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; id?: string; reason?: string }> {
  if (!resend) {
    // Logging eksplisit di terminal supaya dev bisa lihat content-nya
    console.warn(
      '\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `📧 [EMAIL DI-SKIP — RESEND_API_KEY belum dikonfigurasi]\n` +
      `   To:      ${opts.to}\n` +
      `   Subject: ${opts.subject}\n`
    )

    // Coba ekstrak URL dari HTML supaya admin/dev bisa langsung copy-paste link verifikasi/reset
    const urlMatch = opts.html.match(/https?:\/\/[^\s"'<>]+\/(verify-email|reset-password)\?token=[A-Za-z0-9]+/)
    if (urlMatch) {
      console.warn(`   🔗 LINK: ${urlMatch[0]}`)
    }
    // Coba ekstrak password sementara dari template
    const codeMatch = opts.html.match(/codeStyle[^>]*>([a-f0-9]{16,})</)
    if (codeMatch) {
      console.warn(`   🔑 PASSWORD: ${codeMatch[1]}`)
    }
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return { ok: false, reason: 'not-configured' }
  }

  try {
    const result = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    if (result.error) {
      console.error('[email send error]', result.error)
      return { ok: false, reason: 'send-failed' }
    }
    return { ok: true, id: result.data?.id }
  } catch (err) {
    console.error('[email send failed]', err)
    return { ok: false, reason: 'send-failed' }
  }
}

// ── Templates ─────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f9fafb; padding: 24px; margin: 0;
`
const cardStyle = `
  max-width: 560px; margin: 0 auto; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;
`
const buttonStyle = `
  display: inline-block; padding: 12px 24px; background: #4f46e5;
  color: #fff !important; text-decoration: none; border-radius: 8px;
  font-weight: 600; font-size: 14px;
`
const codeStyle = `
  display: inline-block; padding: 8px 12px; background: #f3f4f6;
  border: 1px solid #e5e7eb; border-radius: 6px;
  font-family: monospace; font-size: 14px; color: #111827;
  letter-spacing: 0.5px;
`

function wrap(content: string): string {
  return `<!DOCTYPE html><html><body style="${baseStyle}"><div style="${cardStyle}">
    <h1 style="font-family: serif; color: #4338ca; margin: 0 0 24px 0; font-size: 24px;">IbadahHub</h1>
    ${content}
    <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
      Email otomatis — mohon jangan dibalas. Hubungi pengurus komunitas Anda untuk pertanyaan.
    </p>
  </div></body></html>`
}

export function welcomePengurusEmail(opts: {
  nama: string
  email: string
  password: string
  subRole: string
  loginUrl: string
}): string {
  return wrap(`
    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">Selamat datang, ${escapeHtml(opts.nama)}!</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Akun Pengurus Anda dengan sub-role <strong>${escapeHtml(opts.subRole)}</strong> telah dibuat.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">Berikut detail login Anda:</p>
    <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Email:</td><td><strong>${escapeHtml(opts.email)}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Password:</td><td><span style="${codeStyle}">${escapeHtml(opts.password)}</span></td></tr>
    </table>
    <p style="color: #4b5563; line-height: 1.6;">
      <a href="${opts.loginUrl}" style="${buttonStyle}">Login ke IbadahHub</a>
    </p>
    <p style="color: #b45309; background: #fffbeb; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 24px;">
      ⚠️ Demi keamanan, segera ganti password Anda setelah login pertama via halaman Profil.
    </p>
  `)
}

export function adminPasswordResetEmail(opts: {
  nama: string
  password: string
  loginUrl: string
}): string {
  return wrap(`
    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">Password Anda Direset</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Hai ${escapeHtml(opts.nama)}, password akun Anda baru saja direset oleh administrator.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">Password baru Anda:</p>
    <p><span style="${codeStyle}">${escapeHtml(opts.password)}</span></p>
    <p style="color: #4b5563; line-height: 1.6;">
      <a href="${opts.loginUrl}" style="${buttonStyle}">Login dengan Password Baru</a>
    </p>
    <p style="color: #b45309; background: #fffbeb; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 24px;">
      ⚠️ Segera ganti password ini setelah login. Jika Anda tidak meminta reset, hubungi administrator.
    </p>
  `)
}

export function forgotPasswordEmail(opts: {
  nama: string
  resetUrl: string
}): string {
  return wrap(`
    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">Permintaan Reset Password</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Hai ${escapeHtml(opts.nama)}, kami menerima permintaan untuk mereset password akun Anda.
    </p>
    <p style="color: #4b5563; line-height: 1.6;">
      Klik tombol di bawah untuk menetapkan password baru. Link berlaku selama <strong>1 jam</strong>.
    </p>
    <p style="margin: 24px 0;">
      <a href="${opts.resetUrl}" style="${buttonStyle}">Reset Password</a>
    </p>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
      Atau salin link ini ke browser:<br>
      <span style="word-break: break-all; color: #4f46e5;">${opts.resetUrl}</span>
    </p>
    <p style="color: #b45309; background: #fffbeb; padding: 12px; border-radius: 6px; font-size: 13px; margin-top: 24px;">
      Jika Anda tidak meminta reset password, abaikan email ini — password Anda tetap aman.
    </p>
  `)
}

export function verifyEmailEmail(opts: {
  nama: string
  verifyUrl: string
}): string {
  return wrap(`
    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">Verifikasi Email Anda</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Hai ${escapeHtml(opts.nama)}, terima kasih telah mendaftar di IbadahHub. Klik tombol di bawah
      untuk memverifikasi alamat email Anda.
    </p>
    <p style="margin: 24px 0;">
      <a href="${opts.verifyUrl}" style="${buttonStyle}">Verifikasi Email</a>
    </p>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
      Link berlaku selama <strong>24 jam</strong>. Jika Anda tidak mendaftar di IbadahHub, abaikan email ini.
    </p>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
      Atau salin link ini ke browser:<br>
      <span style="word-break: break-all; color: #4f46e5;">${opts.verifyUrl}</span>
    </p>
  `)
}

export function donasiSuccessEmail(opts: {
  namaDonatur: string
  nominal: string
  paymentChannel: string
  tanggal: string
  appUrl: string
}): string {
  const isManual = opts.paymentChannel === 'manual_paid'
  const channelLabel = isManual ? 'Dikonfirmasi Manual oleh Pengurus' : opts.paymentChannel

  return wrap(`
    <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">Donasi Anda Berhasil Dikonfirmasi ✓</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      Assalamu'alaikum, <strong>${escapeHtml(opts.namaDonatur)}</strong>.<br>
      Terima kasih atas donasi Anda. Pembayaran telah kami terima dan dikonfirmasi.
    </p>
    <table style="width: 100%; margin: 20px 0; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; width: 40%;">Nama Donatur</td>
        <td style="padding: 12px 16px; color: #111827; font-weight: 600;">${escapeHtml(opts.namaDonatur)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Nominal</td>
        <td style="padding: 12px 16px; color: #059669; font-weight: 700; font-size: 18px;">${escapeHtml(opts.nominal)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Metode Pembayaran</td>
        <td style="padding: 12px 16px; color: #111827;">${escapeHtml(channelLabel)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Tanggal Dikonfirmasi</td>
        <td style="padding: 12px 16px; color: #111827;">${escapeHtml(opts.tanggal)}</td>
      </tr>
    </table>
    <p style="color: #4b5563; line-height: 1.6;">
      Semoga donasi Anda menjadi amal jariyah yang bermanfaat. Jazakallahu khairan.
    </p>
    <p style="margin: 24px 0;">
      <a href="${opts.appUrl}" style="${buttonStyle}">Lihat Riwayat Donasi</a>
    </p>
  `)
}

export async function sendDonasiSuccessEmail(
  donasi: {
    id: number
    namaDonatur: string
    nominal: { toString(): string } | number
    userId: number | null
    jemaahId: number | null
    dikonfirmasiAt?: Date | null
  },
  paymentChannel: string
): Promise<void> {
  const { prisma } = await import('./prisma')

  let toEmail: string | null = null
  let toName = donasi.namaDonatur

  if (donasi.userId) {
    const user = await prisma.user.findUnique({
      where: { id: donasi.userId },
      select: { email: true, nama: true },
    })
    if (user?.email) {
      toEmail = user.email
      toName = user.nama
    }
  }

  if (!toEmail && donasi.jemaahId) {
    const jemaah = await prisma.jemaah.findUnique({
      where: { id: donasi.jemaahId },
      select: { email: true, nama: true },
    })
    if (jemaah?.email) {
      toEmail = jemaah.email
      toName = jemaah.nama
    }
  }

  if (!toEmail) return

  const nominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(donasi.nominal.toString()))

  const tanggal = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(donasi.dikonfirmasiAt ?? new Date())

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  await sendEmail({
    to: toEmail,
    subject: `Donasi Dikonfirmasi — ${nominal} | IbadahHub`,
    html: donasiSuccessEmail({
      namaDonatur: toName,
      nominal,
      paymentChannel,
      tanggal,
      appUrl,
    }),
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
