export const endpoints = Object.freeze({
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  employees: '/employees',
  branches: { list: '/branches', stats: '/branches/stats' },
  departments: {
    list: '/departments',
    byId: (id) => `/departments/${id}`,
    details: (id) => `/departments/${id}/details`,
  },
  health: '/health',
});
