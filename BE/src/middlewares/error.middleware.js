// express.json() rejects a bad body with an English message of its own.
const BODY_ERRORS = {
  'entity.parse.failed': 'Dữ liệu gửi lên không đúng định dạng.',
  'entity.too.large': 'Dữ liệu gửi lên quá lớn.',
  'encoding.unsupported': 'Kiểu mã hóa dữ liệu không được hỗ trợ.',
  'charset.unsupported': 'Bảng mã dữ liệu không được hỗ trợ.',
}

// An id that is not a UUID is only noticed by the database: Prisma reports P2023, raw SQL reports 22P02.
function isMalformedId(error) {
  if (error.code === 'P2023') return /UUID/i.test(error.message)
  return error.code === 'P2010' && error.meta?.code === '22P02' && /uuid/i.test(error.meta.message || error.message)
}

export function notFoundHandler(req, _res, next) {
  const error = new Error(`Không tìm thấy API: ${req.method} ${req.originalUrl}`)
  error.status = 404
  next(error)
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  if (isMalformedId(error)) return res.status(400).json({ message: 'Mã định danh không hợp lệ.' })
  const message = BODY_ERRORS[error.type] || (error.status ? error.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.')
  res.status(error.status || 500).json({ message })
}
