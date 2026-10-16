module.exports = (sequelize, DataTypes) => {
    const PmPriorityDefinition = sequelize.define('PmPriorityDefinition', {
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
            defaultValue: '#007bff'
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        applies_to: {
            type: DataTypes.ENUM('project', 'task', 'job', 'all'),
            defaultValue: 'all'
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
        tableName: 'pm_priority_definitions',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    
    return PmPriorityDefinition;
};