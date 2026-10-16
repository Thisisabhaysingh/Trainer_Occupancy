const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// One row per trainer per month. Score/rank are derived from logged institute
// sessions and completed manager-assigned school activities.
const TrainerLeaderboard = sequelize.define('TrainerLeaderboard', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.STRING, allowNull: false }, // FK -> users.employeeCode
  periodKey: { type: DataTypes.STRING(7), allowNull: false }, // YYYY-MM
  instituteSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  schoolSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  rank: { type: DataTypes.INTEGER, allowNull: false },
  previousRank: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'trainer_leaderboard',
  indexes: [
    { unique: true, fields: ['userId', 'periodKey'], name: 'trainer_leaderboard_user_period' },
    { fields: ['periodKey', 'rank'], name: 'trainer_leaderboard_period_rank' },
  ],
});

module.exports = TrainerLeaderboard;
