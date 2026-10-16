const service = require("./sso.service");
const constants = require("./sso.constants");
const { sendSuccess } = require("../../utils/apiResponse");
const authConstants = require("../auth/auth.constants");

const authorizeReportcard = async (req, res) => res.redirect(302, await service.createAuthorizationRedirect(req.query, req.user));

const exchangeReportcardToken = async (req, res) => sendSuccess(res, {
  data: await service.exchangeAuthorizationCode(req.body),
  message: "Authorization code exchanged successfully",
});

const startReportcardLogin = (req, res) => {
  const requestedPath = String(req.query.returnTo || "/").trim();
  const returnTo = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/";
  const destination = new URL(constants.REPORTCARD_REDIRECT_URI);
  destination.pathname = "/api/sso/mis/start";
  destination.search = "";
  destination.searchParams.set("returnTo", returnTo);
  return res.redirect(302, destination.toString());
};

const logout = (req, res) => {
  res.clearCookie(authConstants.TOKEN_COOKIE_NAME, authConstants.getAuthCookieOptions());
  const frontendUrl = process.env.MIS_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  const destination = new URL("/login", frontendUrl);
  destination.searchParams.set("loggedOut", "true");
  return res.redirect(302, destination.toString());
};

module.exports = { authorizeReportcard, exchangeReportcardToken, startReportcardLogin, logout };
