const crypto = require("crypto");
const AppError = require("../../utils/AppError");
const repository = require("./sso.repository");
const constants = require("./sso.constants");

const base64UrlSha256 = (value) => crypto.createHash("sha256").update(value).digest("base64url");
const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const assertClientConfiguration = () => {
  if (!constants.getClientSecret()) throw new AppError("Report Card SSO is not configured", {
    statusCode: 503,
    code: "SSO_NOT_CONFIGURED",
  });
};

const createAuthorizationRedirect = async (query, user) => {
  assertClientConfiguration();
  if (query.client_id !== constants.REPORTCARD_CLIENT_ID || query.redirect_uri !== constants.REPORTCARD_REDIRECT_URI) {
    throw new AppError("SSO client or redirect URI is not registered", { statusCode: 400, code: "INVALID_SSO_CLIENT" });
  }
  if (!constants.REPORTCARD_ROLE_BY_MIS_ROLE[user.role]) {
    throw new AppError("Your MIS role is not allowed to access Report Card", { statusCode: 403, code: "REPORTCARD_ACCESS_DENIED" });
  }

  const code = crypto.randomBytes(32).toString("base64url");
  await repository.createAuthorizationCode({
    codeHash: hashCode(code),
    clientId: query.client_id,
    employeeCode: user.employeeCode,
    redirectUri: query.redirect_uri,
    codeChallenge: query.code_challenge,
    codeChallengeMethod: "S256",
    expiresAt: new Date(Date.now() + constants.CODE_TTL_SECONDS * 1000),
  });
  repository.deleteExpiredCodes().catch(() => {});

  const redirect = new URL(query.redirect_uri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", query.state);
  return redirect.toString();
};

const exchangeAuthorizationCode = async (input) => {
  assertClientConfiguration();
  if (input.client_id !== constants.REPORTCARD_CLIENT_ID || !safeEqual(input.client_secret, constants.getClientSecret())) {
    throw new AppError("Invalid SSO client credentials", { statusCode: 401, code: "INVALID_CLIENT" });
  }

  const record = await repository.consumeAuthorizationCode({
    codeHash: hashCode(input.code),
    clientId: input.client_id,
    redirectUri: input.redirect_uri,
    codeChallenge: base64UrlSha256(input.code_verifier),
  });
  if (!record) throw new AppError("Authorization code is invalid, expired, or already used", {
    statusCode: 400,
    code: "INVALID_GRANT",
  });
  const user = await repository.findIdentity(record.employeeCode);
  if (!user) throw new AppError("MIS user no longer exists", { statusCode: 400, code: "INVALID_GRANT" });
  const reportcardRole = constants.REPORTCARD_ROLE_BY_MIS_ROLE[user.role];
  if (!reportcardRole) throw new AppError("MIS role is not allowed in Report Card", { statusCode: 403, code: "REPORTCARD_ACCESS_DENIED" });

  return {
    sub: user.employeeCode,
    email: user.email,
    name: user.name,
    misRole: user.role,
    reportcardRole,
    branchId: user.branchId || null,
    branchName: user.branch?.name || null,
    departmentId: user.departmentId || null,
  };
};

module.exports = { createAuthorizationRedirect, exchangeAuthorizationCode, base64UrlSha256 };
