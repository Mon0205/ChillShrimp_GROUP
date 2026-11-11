// Browser-side photo check run before upload, so users can retake a bad photo early.
// Mirrors the model-free checks of AI_SERVICE/app/photo_check.py (resolution, blur, exposure);
// keep thresholds and messages in sync with that file. Shrimp head size, confidence and
// max_det need the model's boxes and are only reported after analysis.

// Resolution is an info note only: image size alone does not tell whether shrimp are too small.
export const RECOMMENDED_LONG_SIDE = 1600
export const BLUR_VARIANCE_MIN = 3.0 // Laplacian variance on a copy whose long side is at most 1024 px
export const DARK_MEAN = 60
export const BRIGHT_MEAN = 210
export const ANALYSIS_LONG_SIDE = 1024

// rgba: Uint8ClampedArray from ImageData (4 bytes per pixel).
export function measurePixels(rgba, width, height) {
  const gray = new Float64Array(width * height)
  let sum = 0
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    // Same weights as Pillow's convert('L') (ITU-R 601-2).
    const value = Math.round((rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000)
    gray[p] = value
    sum += value
  }
  const brightness = gray.length ? sum / gray.length : 0

  // 4-neighbour Laplacian (OpenCV's default kernel) over every pixel, with OpenCV's default
  // BORDER_REFLECT_101 at the edges so the value matches cv2.Laplacian(...).var() in photo_check.py.
  const reflect = (i, n) => (n === 1 ? 0 : i < 0 ? -i : i >= n ? 2 * n - 2 - i : i)
  let count = 0, mean = 0, m2 = 0
  for (let y = 0; y < height; y++) {
    const up = reflect(y - 1, height) * width, row = y * width, down = reflect(y + 1, height) * width
    for (let x = 0; x < width; x++) {
      const left = reflect(x - 1, width), right = reflect(x + 1, width)
      const lap = gray[up + x] + gray[down + x] + gray[row + left] + gray[row + right] - 4 * gray[row + x]
      count++
      const delta = lap - mean
      mean += delta / count
      m2 += delta * (lap - mean)
    }
  }
  return { brightness, sharpness: count ? m2 / count : 0 }
}

export function precheckWarnings({ longSide, brightness, sharpness }) {
  const warnings = []
  const add = (code, level, message) => warnings.push({ code, level, message })

  if (longSide < RECOMMENDED_LONG_SIDE) {
    add('small_image', 'info',
      `Ảnh nhỏ (${longSide}px ở cạnh dài). Nếu đây là ảnh chụp cả khay, nên dùng ảnh gốc từ camera ` +
      `(khuyến nghị cạnh dài khoảng ${RECOMMENDED_LONG_SIDE}px) để thấy rõ từng con.`)
  }
  if (sharpness < BLUR_VARIANCE_MIN) {
    add('blurry', 'warning', 'Ảnh có vẻ bị mờ. Hãy lấy nét vào mặt nước và giữ máy cố định.')
  }
  if (brightness < DARK_MEAN) {
    add('too_dark', 'warning', 'Ảnh quá tối. Hãy chụp nơi đủ sáng, ánh sáng đều.')
  } else if (brightness > BRIGHT_MEAN) {
    add('too_bright', 'warning', 'Ảnh quá sáng hoặc cháy sáng. Tránh đèn flash và ánh nắng chiếu thẳng.')
  }
  return warnings
}

// Reads the file in the browser (EXIF rotation applied, like the AI service) and returns warnings.
export async function checkPhotoFile(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const longSide = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, ANALYSIS_LONG_SIDE / longSide)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const metrics = measurePixels(context.getImageData(0, 0, width, height).data, width, height)
    return precheckWarnings({ longSide, ...metrics })
  } finally {
    bitmap.close()
  }
}
