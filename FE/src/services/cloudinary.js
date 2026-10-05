import { api } from './api.js'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

export async function uploadCloudinaryFile(signaturePath, file, { imagesOnly = false } = {}) {
  if (imagesOnly && !IMAGE_TYPES.has(file.type)) throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Chỉ chấp nhận JPG, PNG, WEBP hoặc PDF.')
  if (file.size > MAX_BYTES) throw new Error('Kích thước tệp tối đa là 10 MB.')

  const signed = (await api(signaturePath, { method: 'POST', body: '{}' })).data
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signed.apiKey)
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)
  form.append('asset_folder', signed.folder)
  form.append('public_id', signed.publicId)
  form.append('allowed_formats', signed.params?.allowed_formats || 'jpg,jpeg,png,webp,pdf')

  const resourceType = signed.resourceType === 'image' ? 'image' : 'auto'
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/${resourceType}/upload`, { method: 'POST', body: form })
  const uploaded = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(uploaded.error?.message || 'Không tải được tệp lên Cloudinary.')
  const uploadedPublicId = String(uploaded.public_id || '')
  if (uploadedPublicId !== signed.publicId && !uploadedPublicId.endsWith(`/${signed.publicId}`)) {
    throw new Error('Cloudinary trả về mã tệp không khớp với yêu cầu đã ký.')
  }
  return {
    publicId: signed.publicId,
    resourceType: uploaded.resource_type,
    format: uploaded.format,
    secureUrl: uploaded.secure_url,
    bytes: uploaded.bytes,
    originalFilename: file.name,
  }
}
