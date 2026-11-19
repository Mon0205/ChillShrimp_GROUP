import { Capacitor } from '@capacitor/core'

// Error codes of @capacitor/camera 8 (OutSystems camera library).
const CAPTURE_CANCELLED = 'OS-PLUG-CAMR-0006'
const CAMERA_ACCESS_DENIED = 'OS-PLUG-CAMR-0003'
const PERMISSION_DENIED = 'Ứng dụng chưa được cấp quyền camera. Hãy bật quyền camera trong Cài đặt của điện thoại.'
// Long side kept for camera photos: small larvae stay countable and the file stays well under
// the 10 MB upload limit. Above RECOMMENDED_LONG_SIDE in utils/photo-precheck.js, so no info note.
export const MAX_PHOTO_SIDE = 2048
const JPEG_QUALITY = 0.85

/** True inside the Android app built with Capacitor. */
export const canUseNativeCamera = () => Capacitor.isNativePlatform()

/** A phone or tablet browser, where <input capture> opens the camera directly. */
export const canCaptureOnWeb = () => !canUseNativeCamera() && window.matchMedia('(pointer: coarse)').matches

const photoName = () => `mau-tom-${Date.now()}.jpg`

/** Opens the device camera in the Android app. Resolves to a JPEG File, or null when the user cancels. */
export async function capturePhoto() {
  // Loaded on demand: the plugin is only needed in the app, not in the web bundle's first load.
  const { Camera, EncodingType } = await import('@capacitor/camera')
  const { camera } = await Camera.requestPermissions({ permissions: ['camera'] })
  if (camera !== 'granted' && camera !== 'limited') throw new Error(PERMISSION_DENIED)

  let photo
  try {
    photo = await Camera.takePhoto({
      quality: Math.round(JPEG_QUALITY * 100),
      targetWidth: MAX_PHOTO_SIDE,
      targetHeight: MAX_PHOTO_SIDE,
      correctOrientation: true,
      encodingType: EncodingType.JPEG,
    })
  } catch (error) {
    if (error?.code === CAPTURE_CANCELLED) return null
    if (error?.code === CAMERA_ACCESS_DENIED) throw new Error(PERMISSION_DENIED)
    throw error
  }

  const response = await fetch(photo.webPath)
  if (!response.ok) throw new Error('Không đọc được ảnh vừa chụp.')
  return new File([await response.blob()], photoName(), { type: 'image/jpeg' })
}

/** Browser cameras return full-size photos; shrink them to the same size as the app's capture. */
export async function resizePhoto(file) {
  // imageOrientation applies the EXIF rotation, so a portrait photo is not stored sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Không xử lý được ảnh vừa chụp.')
  return new File([blob], photoName(), { type: 'image/jpeg' })
}
