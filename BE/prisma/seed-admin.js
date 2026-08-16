import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('Điền ADMIN_EMAIL và ADMIN_PASSWORD trong BE/.env trước.')
const prisma = new PrismaClient()
const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
await prisma.user.upsert({ where: { email }, update: { passwordHash }, create: { email, displayName: process.env.ADMIN_NAME || 'Administrator', passwordHash } })
console.log(`Đã tạo/cập nhật admin: ${email}`)
await prisma.$disconnect()
