const REPORTCARD_CLIENT_ID = process.env.REPORTCARD_SSO_CLIENT_ID || "reportcard";
const REPORTCARD_REDIRECT_URI = process.env.REPORTCARD_SSO_REDIRECT_URI || "https://reports.onmyowntechnology.com/api/sso/mis/callback";
const CODE_TTL_SECONDS = Math.min(Math.max(Number(process.env.REPORTCARD_SSO_CODE_TTL_SECONDS || 60), 30), 300);

const getClientSecret = () => String(process.env.REPORTCARD_SSO_CLIENT_SECRET || "");

const REPORTCARD_ROLE_BY_MIS_ROLE = Object.freeze({
  admin: "admin",
  manager: "manager",
  senior_manager: "manager",
  teamlead: "trainer",
  employee: "trainer",
});

module.exports = {
  REPORTCARD_CLIENT_ID,
  REPORTCARD_REDIRECT_URI,
  CODE_TTL_SECONDS,
  REPORTCARD_ROLE_BY_MIS_ROLE,
  getClientSecret,
};
