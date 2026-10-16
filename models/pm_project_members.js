module.exports = (sequelize, DataTypes) => {
    const PMProjectMember = sequelize.define('PMProjectMember', {
        project_id: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.STRING(255),
            primaryKey: true
        },
        role: {
            type: DataTypes.ENUM('owner', 'manager', 'member', 'viewer'),
            defaultValue: 'member'
        },
        joined_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'pm_project_members',
        timestamps: false,
        underscored: true
    });

    return PMProjectMember;
};