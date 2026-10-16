const models = require("./inventory.models");
const sequelize = require("../../config/sequelize");
module.exports = { ...models, transaction: (work) => sequelize.transaction(work) };
