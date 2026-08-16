export function notFoundHandler(req, _res, next) {
  const error = new Error(`Không tìm thấy API: ${req.method} ${req.originalUrl}`)
  error.status = 404
  next(error)
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.' })
}
