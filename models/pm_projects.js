// D:\MIS\models\pm_projects.js - WITHOUT associations

module.exports = (sequelize, DataTypes) => {
    const PMProject = sequelize.define('PMProject', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        project_manager: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        priority_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
            defaultValue: 'medium'
        },
        status: {
            type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'),
            defaultValue: 'planning'
        },
        progress: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        created_by: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'pm_projects',
        timestamps: true,
        underscored: true
    });

    // REMOVE the associate method entirely - associations will be in index.js
    return PMProject;
};
