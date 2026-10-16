module.exports = (sequelize, DataTypes) => {
    const PMDeadlineExtension = sequelize.define('PMDeadlineExtension', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        entity_type: {
            type: DataTypes.ENUM('project', 'activity', 'task'),
            allowNull: false
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        old_deadline: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        new_deadline: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        requested_by: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        approved_by: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        approved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending'
        }
    }, {
        tableName: 'pm_deadline_extensions',
        timestamps: false,
        underscored: true
    });

    
    return PMDeadlineExtension;
};