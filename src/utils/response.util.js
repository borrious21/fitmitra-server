// src/utils/response.util.js
export default function response(res, status, success, message, data = null) {
  return res.status(status).json({
    success,
    message,
    data,
  });
}
