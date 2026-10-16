export const REPORTCARD_SSO_START_URL = import.meta.env.VITE_REPORTCARD_SSO_START_URL
  || '/api/sso/reportcard/start';

export const reportcardSsoUrl = (returnTo = '/') => {
  const url = new URL(REPORTCARD_SSO_START_URL, window.location.origin);
  url.searchParams.set('returnTo', returnTo);
  return url.toString();
};
