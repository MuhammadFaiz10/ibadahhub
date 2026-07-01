import { PrismaClient, Role, SubRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Memulai seed data...')

  // 1) Agama
  const agamaList = [
    { nama: 'Islam', deskripsi: 'Komunitas Muslim' },
    { nama: 'Kristen', deskripsi: 'Komunitas Kristen' },
    { nama: 'Hindu', deskripsi: 'Komunitas Hindu' },
    { nama: 'Buddha', deskripsi: 'Komunitas Buddha' },
  ]

  for (const agama of agamaList) {
    await prisma.religion.upsert({
      where: { nama: agama.nama },
      create: agama,
      update: {},
    })
    console.log(`  ✓ Agama: ${agama.nama}`)
  }

  const religions = await prisma.religion.findMany({ where: { deletedAt: null } })
  const byNama = Object.fromEntries(religions.map((r) => [r.nama, r]))

  // 1b) TempatIbadah default per agama (idempotent berdasarkan slug)
  const tempatIbadahTemplate: Record<string, { nama: string; slug: string; kota: string }> = {
    Islam:   { nama: 'Masjid Al-Hikmah',     slug: 'masjid-al-hikmah',     kota: 'Jakarta' },
    Kristen: { nama: 'Gereja St. Maria',      slug: 'gereja-st-maria',      kota: 'Surabaya' },
    Hindu:   { nama: 'Pura Agung Jagatnatha', slug: 'pura-agung-jagatnatha',kota: 'Denpasar' },
    Buddha:  { nama: 'Vihara Dharma Bakti',   slug: 'vihara-dharma-bakti',  kota: 'Jakarta' },
  }

  const tempatIbadahByReligionId: Record<number, { id: number; nama: string }> = {}
  for (const agama of agamaList) {
    const religion = byNama[agama.nama]
    if (!religion) throw new Error(`Religion ${agama.nama} tidak ditemukan setelah upsert`)
    const tpl = tempatIbadahTemplate[agama.nama]
    if (!tpl) continue
    const ti = await prisma.tempatIbadah.upsert({
      where: { slug: tpl.slug },
      create: {
        religionId: religion.id,
        nama: tpl.nama,
        slug: tpl.slug,
        kota: tpl.kota,
        status: 'AKTIF',
        deskripsi: `Tempat ibadah ${tpl.nama} (seed)`,
      },
      update: {},
    })
    tempatIbadahByReligionId[religion.id] = { id: ti.id, nama: ti.nama }
    console.log(`  ✓ TempatIbadah: ${tpl.nama} (${agama.nama})`)
  }

  // Helper upsert user (idempotent berdasarkan email)
  async function upsertUser(opts: {
    nama: string
    email: string
    password: string
    role: Role
    subRole?: SubRole
    religionId?: number
    tempatIbadahId?: number
  }) {
    const hashed = await bcrypt.hash(opts.password, 12)
    return prisma.user.upsert({
      where: { email: opts.email },
      create: {
        nama: opts.nama,
        email: opts.email,
        password: hashed,
        role: opts.role,
        subRole: opts.subRole,
        religionId: opts.religionId,
        tempatIbadahId: opts.tempatIbadahId,
        status: true,
      },
      update: {
        tempatIbadahId: opts.tempatIbadahId,
      },
    })
  }

  // Helper jemaah standalone (idempotent berdasarkan religionId+nama+userId=null)
  async function ensureJemaahStandalone(opts: {
    religionId: number
    tempatIbadahId: number
    nama: string
    email?: string | null
    noHp?: string | null
    alamat?: string | null
  }) {
    const existing = await prisma.user.findFirst({
      where: { religionId: opts.religionId, nama: opts.nama, role: 'JEMAAH', password: null },
    })
    if (existing) return existing
    return prisma.user.create({
      data: {
        religionId: opts.religionId,
        tempatIbadahId: opts.tempatIbadahId,
        nama: opts.nama,
        email: opts.email ?? null,
        noHp: opts.noHp ?? null,
        alamat: opts.alamat ?? null,
        role: 'JEMAAH',
        status: true,
      },
    })
  }

  // 2) Superadmin
  await upsertUser({
    nama: 'Super Admin',
    email: 'admin@ibadahhub.com',
    password: 'superadmin123',
    role: 'SUPERADMIN',
  })
  console.log('  ✓ Superadmin: admin@ibadahhub.com')

  // 3) Pengurus per agama (KETUA, BENDAHARA, SEKRETARIS)
  const pengurusTemplate: { sub: SubRole; password: string; namaPrefix: string }[] = [
    { sub: 'KETUA', password: 'ketua123', namaPrefix: 'Ketua' },
    { sub: 'BENDAHARA', password: 'bendahara123', namaPrefix: 'Bendahara' },
    { sub: 'SEKRETARIS', password: 'sekretaris123', namaPrefix: 'Sekretaris' },
  ]

  for (const agama of agamaList) {
    const religion = byNama[agama.nama]
    if (!religion) throw new Error(`Religion ${agama.nama} tidak ditemukan setelah upsert`)
    const slug = agama.nama.toLowerCase()
    for (const t of pengurusTemplate) {
      const email = `${t.sub.toLowerCase()}.${slug}@ibadahhub.com`
      await upsertUser({
        nama: `${t.namaPrefix} ${agama.nama}`,
        email,
        password: t.password,
        role: 'PENGURUS',
        subRole: t.sub,
        religionId: religion.id,
        tempatIbadahId: tempatIbadahByReligionId[religion.id]?.id,
      })
      console.log(`  ✓ Pengurus ${t.sub} ${agama.nama}: ${email}`)
    }
  }

  // 4) Jemaah dengan akun login (2 user per agama) + profil Jemaah linked
  for (const agama of agamaList) {
    const religion = byNama[agama.nama]
    if (!religion) throw new Error(`Religion ${agama.nama} tidak ditemukan setelah upsert`)
    const slug = agama.nama.toLowerCase()
    for (let i = 1; i <= 2; i++) {
      const email = `jemaah${i}.${slug}@ibadahhub.com`
      const tiId = tempatIbadahByReligionId[religion.id]?.id
      await upsertUser({
        nama: `Jemaah ${i} ${agama.nama}`,
        email,
        password: 'jemaah123',
        role: 'JEMAAH',
        religionId: religion.id,
        tempatIbadahId: tiId,
      })
      console.log(`  ✓ Jemaah (akun) ${agama.nama}: ${email}`)
    }
  }

  // 5) Jemaah standalone (tanpa akun login) — data jemaah yang dicatat pengurus
  const jemaahStandaloneByAgama: Record<string, Array<{ nama: string; email?: string; noHp?: string; alamat?: string }>> = {
    Islam: [
      { nama: 'Andi Saputra', email: 'andi.saputra@example.com', noHp: '081234567801', alamat: 'Jl. Mawar No. 12, Jakarta' },
      { nama: 'Siti Aminah', noHp: '081234567802', alamat: 'Jl. Melati No. 5, Bandung' },
      { nama: 'Budi Santoso' },
    ],
    Kristen: [
      { nama: 'Daniel Pratama', email: 'daniel.p@example.com', noHp: '081234567811' },
      { nama: 'Maria Stefani', noHp: '081234567812', alamat: 'Jl. Anggrek No. 8, Surabaya' },
      { nama: 'Yosua Wijaya' },
    ],
    Hindu: [
      { nama: 'I Made Surya', noHp: '081234567821', alamat: 'Jl. Raya Ubud No. 3, Bali' },
      { nama: 'Ni Kadek Ayu', email: 'kadek.ayu@example.com' },
      { nama: 'I Putu Wira' },
    ],
    // jajajajaj
    Buddha: [
      { nama: 'Andre Wijaya', email: 'andre.w@example.com', noHp: '081234567831' },
      { nama: 'Lina Suryani', alamat: 'Jl. Pluit Raya No. 22, Jakarta' },
      { nama: 'Hendra Tanaka' },
    ],
  }

  for (const agama of agamaList) {
    const religion = byNama[agama.nama]
    if (!religion) throw new Error(`Religion ${agama.nama} tidak ditemukan setelah upsert`)
    const list = jemaahStandaloneByAgama[agama.nama] ?? []
    for (const j of list) {
      await ensureJemaahStandalone({
        religionId: religion.id,
        tempatIbadahId: tempatIbadahByReligionId[religion.id]!.id,
        nama: j.nama,
        email: j.email,
        noHp: j.noHp,
        alamat: j.alamat,
      })
      console.log(`  ✓ Jemaah standalone ${agama.nama}: ${j.nama}`)
    }
  }

  console.log('\n✅ Seed selesai!')
  console.log('\n📋 Akun login:')
  console.log('  Superadmin')
  console.log('    admin@ibadahhub.com / superadmin123')
  console.log('  Pengurus  (subRole.agama@ibadahhub.com)')
  console.log('    ketua.{islam|kristen|hindu|buddha}@ibadahhub.com       / ketua123')
  console.log('    bendahara.{islam|kristen|hindu|buddha}@ibadahhub.com   / bendahara123')
  console.log('    sekretaris.{islam|kristen|hindu|buddha}@ibadahhub.com  / sekretaris123')
  console.log('  Jemaah (dengan akun login)')
  console.log('    jemaah{1|2}.{islam|kristen|hindu|buddha}@ibadahhub.com / jemaah123')
  console.log('\n📋 Data Jemaah standalone (tanpa akun): 3 orang per agama')
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
