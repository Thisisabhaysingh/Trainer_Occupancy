module.exports = (sequelize, DataTypes) => {
    const PmStatusDefinition = sequelize.define('PmStatusDefinition', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        color: {
            type: DataTypes.STRING(7),
            defaultValue: '#6c757d'
        },
        category: {
            type: DataTypes.ENUM('not_started', 'in_progress', 'review', 'completed', 'closed', 'on_hold', 'cancelled'),
            defaultValue: 'not_started'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'pm_status_definitions',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    
    return PmStatusDefinition;
};