// express.json() rejects a bad body with an English message of its own.
const BODY_ERRORS = {
  'entity.parse.failed': 'Dữ liệu gửi lên không đúng định dạng.',
  'entity.too.large': 'Dữ liệu gửi lên quá lớn.',
  'encoding.unsupported': 'Kiểu mã hóa dữ liệu không được hỗ trợ.',
  'charset.unsupported': 'Bảng mã dữ liệu không được hỗ trợ.',
}

export function notFoundHandler(req, _res, next) {
  const error = new Error(`Không tìm thấy API: ${req.method} ${req.originalUrl}`)
  error.status = 404
  next(error)
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  const message = BODY_ERRORS[error.type] || (error.status ? error.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.')
  res.status(error.status || 500).json({ message })
}
