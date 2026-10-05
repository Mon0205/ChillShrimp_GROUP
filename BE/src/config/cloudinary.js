import { createHash } from 'node:crypto'

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,pdf'

function config() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env
  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.')
    error.status = 503
    throw error
  }
  return { cloudName, apiKey, apiSecret }
}

export function createUploadSignature({ folder, publicId, allowedFormats = ALLOWED_FORMATS }) {
  const { cloudName, apiKey, apiSecret } = config()
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { allowed_formats: allowedFormats, asset_folder: folder, public_id: publicId, timestamp }
  const serialized = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&')
  const signature = createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex')
  return { cloudName, apiKey, timestamp, signature, params }
}

export async function getOwnedCloudinaryAsset({ resourceType, publicId, expectedFolder, allowedFormats = ALLOWED_FORMATS.split(',') }) {
  const { cloudName, apiKey, apiSecret } = config()
  if (!['image', 'raw'].includes(resourceType)) return null
  const encodedPublicId = encodeURIComponent(publicId)
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/${resourceType}/upload/${encodedPublicId}`
  const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const response = await fetch(url, { headers: { Authorization: `Basic ${authorization}` } })
  if (response.status === 404) return null
  if (!response.ok) {
    const error = new Error('Could not verify the uploaded Cloudinary asset.')
    error.status = response.status === 401 || response.status === 403 ? 503 : 502
    throw error
  }
  const asset = await response.json()
  const format = String(asset.format || '').toLowerCase()
  if (asset.asset_folder !== expectedFolder || !allowedFormats.includes(format) || asset.bytes > 10 * 1024 * 1024) return null
  if (asset.resource_type !== resourceType || !asset.secure_url?.startsWith('https://res.cloudinary.com/')) return null
  return { publicId: asset.public_id, secureUrl: asset.secure_url, resourceType: asset.resource_type, format, bytes: asset.bytes }
}

export { ALLOWED_FORMATS }
