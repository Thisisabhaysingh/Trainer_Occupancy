const sendSuccess = (res, { data = null, meta = {}, message = "Request completed successfully", statusCode = 200 } = {}) => {
  return res.status(statusCode).json({ success: true, data, meta, message });
};

module.exports = { sendSuccess };
