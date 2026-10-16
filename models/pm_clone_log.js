module.exports = (sequelize, DataTypes) => {
    const PMCloneLog = sequelize.define('PMCloneLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        original_project_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        cloned_project_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        cloned_by: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'pm_clone_log',
        timestamps: true,
        underscored: true,
        createdAt: 'cloned_at',
        updatedAt: false
    });

    return PMCloneLog;
};