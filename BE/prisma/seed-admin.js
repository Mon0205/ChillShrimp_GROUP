import 'dotenv/config'
import { createAuthClient } from '@neondatabase/auth'
import { PrismaClient } from '@prisma/client'

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Điền ADMIN_EMAIL và ADMIN_PASSWORD trong BE/.env trước.')
if (!process.env.NEON_AUTH_URL) throw new Error('Thiếu NEON_AUTH_URL trong BE/.env.')

const prisma = new PrismaClient()
const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '')
if (!frontendUrl) throw new Error('Missing FRONTEND_URL in BE/.env.')
const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  console.log(`Admin đã tồn tại: ${email}`)
} else {
  const auth = createAuthClient(process.env.NEON_AUTH_URL, {
    fetchOptions: { headers: { Origin: frontendUrl } },
  })
  const { data, error } = await auth.signUp.email({
    email,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Administrator',
    callbackURL: `${frontendUrl}/login`,
  })
  if (error || !data?.user) throw new Error(error?.message || 'Không thể tạo Neon Auth user.')
  await prisma.user.create({ data: { id: data.user.id, email, displayName: data.user.name || process.env.ADMIN_NAME || 'Administrator' } })
  console.log(`Đã tạo admin: ${email}`)
}
await prisma.$disconnect()
