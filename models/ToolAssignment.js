const { DataTypes, Op } = require("sequelize");
const sequelize = require("../config/sequelize");

const ToolAssignment = sequelize.define(
  "ToolAssignment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    departmentId: {
      type: DataTypes.INTEGER, // FK -> Department
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("employee", "teamlead", "manager", "admin"),
      allowNull: false,
    },
    workbook: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    reportCard: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "tool_assignments",
    timestamps: true,
    indexes: [
      {
        name: 'tool_assignments_dept_role_unique',
        unique: true,
        fields: ['departmentId', 'role'],  // Composite unique: one record per department-role
      }
    ],
    hooks: {
      afterSync: async (options) => {
        const sequelize = ToolAssignment.sequelize;
        
        // Drop old unique index if it exists (from previous migration)
        try {
          await sequelize.query(
            `ALTER TABLE tool_assignments DROP INDEX tool_assignments_departmentId_unique`
          );
          console.log('🗑️ Dropped old unique index: tool_assignments_departmentId_unique');
        } catch (err) {
          // Index might not exist, that's fine
        }
        
        // Also try to drop any old unique constraints on departmentId alone
        try {
          const [indexes] = await sequelize.query(
            `SHOW INDEX FROM tool_assignments WHERE Key_name LIKE '%departmentId%' AND Non_unique = 0`
          );
          for (const idx of indexes) {
            if (idx.Key_name !== 'tool_assignments_dept_role_unique') {
              try {
                await sequelize.query(
                  `ALTER TABLE tool_assignments DROP INDEX ${idx.Key_name}`
                );
                console.log(`🗑️ Dropped old index: ${idx.Key_name}`);
              } catch (e) {
                // Ignore errors
              }
            }
          }
        } catch (err) {
          // Ignore errors
        }

        // Drop any unique index on role alone (incorrect schema from old migration)
        try {
          const [roleIndexes] = await sequelize.query(
            `SHOW INDEX FROM tool_assignments WHERE Column_name = 'role' AND Non_unique = 0`
          );
          for (const idx of roleIndexes) {
            if (idx.Key_name !== 'tool_assignments_dept_role_unique') {
              try {
                await sequelize.query(
                  `ALTER TABLE tool_assignments DROP INDEX ${idx.Key_name}`
                );
                console.log(`🗑️ Dropped old unique index on role: ${idx.Key_name}`);
              } catch (e) {
                // Ignore errors
              }
            }
          }
        } catch (err) {
          // Ignore errors
        }
        
        // Migrate old department-only records to department-role format
        const oldRecords = await ToolAssignment.findAll({
          where: { role: null }
        });
        
        if (oldRecords.length > 0) {
          console.log(`🔄 Migrating ${oldRecords.length} old tool assignment records to department-role format...`);
          
          const roles = ['employee', 'teamlead', 'manager', 'admin'];
          
          for (const oldRecord of oldRecords) {
            // Create 4 role-based records for each old department record
            for (const role of roles) {
              await ToolAssignment.findOrCreate({
                where: { 
                  departmentId: oldRecord.departmentId,
                  role: role
                },
                defaults: {
                  departmentId: oldRecord.departmentId,
                  role: role,
                  workbook: oldRecord.workbook,
                  reportCard: oldRecord.reportCard
                }
              });
            }
            // Delete old record
            await oldRecord.destroy();
          }
          
          console.log('✅ Migration complete - now using department-role based tool assignments');
        }
      }
    }
  }
);

module.exports = ToolAssignment;
