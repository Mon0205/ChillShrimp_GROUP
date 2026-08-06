import 'dotenv/config'

const requiredVariables = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingVariables = requiredVariables.filter((name) => !process.env[name])

if (missingVariables.length > 0) {
  throw new Error(`Missing environment variables: ${missingVariables.join(', ')}`)
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
})

