export class ApiError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', status = 0, details = [], cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const normalizeApiError = (error) => {
  if (error instanceof ApiError) return error;
  const payload = error.response?.data;
  const apiError = payload?.error;
  return new ApiError(
    apiError?.message || payload?.message || (typeof payload?.error === 'string' ? payload.error : error.message) || 'Request failed',
    {
      code: apiError?.code || (error.code === 'ERR_CANCELED' ? 'REQUEST_CANCELLED' : 'REQUEST_FAILED'),
      status: error.response?.status || 0,
      details: apiError?.details || [],
      cause: error,
    },
  );
};
