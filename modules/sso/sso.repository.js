const { Op } = require("sequelize");
const sequelize = require("../../config/sequelize");
const { User, Branch } = require("../../models");
const SsoAuthorizationCode = require("./sso.model");

const createAuthorizationCode = (values) => SsoAuthorizationCode.create(values);

const consumeAuthorizationCode = async ({ codeHash, clientId, redirectUri, codeChallenge }) => sequelize.transaction(async (transaction) => {
  const record = await SsoAuthorizationCode.findOne({
    where: {
      codeHash,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod: "S256",
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!record) return null;
  record.usedAt = new Date();
  await record.save({ transaction });
  return record;
});

const findIdentity = (employeeCode) => User.findByPk(employeeCode, {
  attributes: ["employeeCode", "name", "email", "role", "branchId", "departmentId"],
  include: [{ model: Branch, as: "branch", attributes: ["name"], required: false }],
});

const deleteExpiredCodes = () => SsoAuthorizationCode.destroy({
  where: { expiresAt: { [Op.lt]: new Date(Date.now() - 5 * 60 * 1000) } },
});

module.exports = { createAuthorizationCode, consumeAuthorizationCode, findIdentity, deleteExpiredCodes };
