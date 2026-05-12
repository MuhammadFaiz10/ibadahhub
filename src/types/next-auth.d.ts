import { Role, SubRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    subRole?: SubRole | null
    religionId?: number | null
    religionName?: string | null
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      subRole?: SubRole | null
      religionId?: number | null
      religionName?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    subRole?: SubRole | null
    religionId?: number | null
    religionName?: string | null
    lastActivity?: number
  }
}
