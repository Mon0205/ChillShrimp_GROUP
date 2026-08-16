export function sendData(res, data, status = 200) {
  return res.status(status).json({ data })
}

export function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}
