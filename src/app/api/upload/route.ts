import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { auth } from '@/lib/auth'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const MAX_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? 5)
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const UPLOAD_DIR_REL = process.env.UPLOAD_DIR?.trim() || './public/uploads'
const UPLOAD_DIR_ABS = path.resolve(process.cwd(), UPLOAD_DIR_REL.replace(/^\.\//, ''))

function sanitizeName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return base || 'file'
}

// POST /api/upload
// FormData: { file: File, kind?: string }  (kind hanya untuk subfolder organize: 'avatar', 'bukti', 'lampiran')
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Form data tidak valid' }, { status: 400 })
  }

  const file = formData.get('file')
  const kind = String(formData.get('kind') ?? 'misc').replace(/[^a-z]/g, '') || 'misc'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File kosong' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file melebihi ${MAX_SIZE_MB} MB` },
      { status: 413 }
    )
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WebP, GIF, atau PDF.' },
      { status: 400 }
    )
  }

  const dir = path.join(UPLOAD_DIR_ABS, kind)
  await mkdir(dir, { recursive: true })

  const ext = path.extname(file.name) || ''
  const id = crypto.randomBytes(12).toString('hex')
  const baseName = sanitizeName(path.basename(file.name, ext))
  const finalName = `${id}-${baseName}${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, finalName), buffer)

  // URL publik (assume UPLOAD_DIR di bawah public/)
  const url = `/uploads/${kind}/${finalName}`

  return NextResponse.json({
    url,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  })
}
