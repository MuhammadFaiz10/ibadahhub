import { prisma } from './prisma'

export async function notifyTempatIbadah(
  tempatIbadahId: number,
  judul: string,
  isi: string,
  urlTujuan?: string
) {
  try {
    const users = await prisma.user.findMany({
      where: { tempatIbadahId, deletedAt: null },
      select: { id: true },
    })

    if (users.length > 0) {
      await prisma.notifikasi.createMany({
        data: users.map((u) => ({
          userId: u.id,
          judul,
          isi,
          urlTujuan,
          dibaca: false,
        })),
      })
    }
  } catch (error) {
    console.error('Failed to send notification to tempat ibadah:', error)
  }
}

export async function checkUpcomingWorshipSchedules(userId: number) {
  try {
    // 1. Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tempatIbadahId: true },
    })

    if (!user || !user.tempatIbadahId) return

    // 2. Query all schedules for this tempatIbadahId that are today or tomorrow
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

    const schedules = await prisma.jadwalIbadah.findMany({
      where: {
        tempatIbadahId: user.tempatIbadahId,
        deletedAt: null,
        tanggal: {
          gte: startOfToday,
          lte: endOfTomorrow,
        },
      },
    })

    // 3. Filter schedules starting in less than 3 hours
    for (const schedule of schedules) {
      if (!schedule.waktuMulai) continue

      const parts = schedule.waktuMulai.split(':')
      const hours = Number(parts[0])
      const minutes = Number(parts[1])
      if (isNaN(hours) || isNaN(minutes)) continue

      const scheduleTime = new Date(schedule.tanggal)
      scheduleTime.setHours(hours, minutes, 0, 0)

      const diffMs = scheduleTime.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      // Only notify if within 3 hours and in the future
      if (diffHours > 0 && diffHours <= 3) {
        const urlTujuan = `/jadwal-ibadah?id=${schedule.id}`

        // Check if already notified
        const existing = await prisma.notifikasi.findFirst({
          where: {
            userId,
            urlTujuan,
          },
        })

        if (!existing) {
          // Create notification
          await prisma.notifikasi.create({
            data: {
              userId,
              judul: `Ibadah Mendekat: ${schedule.namaIbadah}`,
              isi: `Ibadah "${schedule.namaIbadah}" akan segera dimulai pada pukul ${schedule.waktuMulai} di ${schedule.lokasi || 'tempat ibadah'}.`,
              urlTujuan,
              dibaca: false,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Error checking upcoming worship schedules:', error)
  }
}
