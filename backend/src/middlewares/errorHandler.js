// errorHandler.js
// Custom Error Class
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.name}: ${err.message}`, err.stack);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      details: err.details
    });
  }

  // Handle Multer Errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      code: 400,
      message: 'Lỗi tải lên file',
      details: err.message
    });
  }

  // Generic Server Error
  res.status(500).json({
    code: 500,
    message: 'Lỗi server nội bộ',
    details: process.env.NODE_ENV === 'development' ? err.message : null
  });
};

module.exports = {
  ApiError,
  errorHandler
};
