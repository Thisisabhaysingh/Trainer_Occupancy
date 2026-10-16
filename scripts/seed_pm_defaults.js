const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const {
  sequelize,
  PmPriorityDefinition,
  PmStatusDefinition,
} = require("../models");

const priorities = [
  { name: "Low", color: "#12B76A", level: 1, applies_to: "all", sort_order: 1 },
  { name: "Medium", color: "#F79009", level: 2, applies_to: "all", sort_order: 2 },
  { name: "High", color: "#F04438", level: 3, applies_to: "all", sort_order: 3 },
  { name: "Urgent", color: "#B42318", level: 4, applies_to: "all", sort_order: 4 },
];

const statuses = [
  { name: "Planning", color: "#17a2b8", category: "not_started", sort_order: 1 },
  { name: "In Progress", color: "#007bff", category: "in_progress", sort_order: 2 },
  { name: "Review", color: "#7c3aed", category: "review", sort_order: 3 },
  { name: "Completed", color: "#28a745", category: "completed", sort_order: 4 },
  { name: "On Hold", color: "#ffc107", category: "on_hold", sort_order: 5 },
  { name: "Cancelled", color: "#dc3545", category: "cancelled", sort_order: 6 },
];

async function upsertByName(Model, rows, label) {
  for (const row of rows) {
    const [record, created] = await Model.findOrCreate({
      where: { name: row.name },
      defaults: { ...row, is_active: true },
    });

    if (!created) {
      await record.update({ ...row, is_active: true });
    }

    console.log(`${created ? "Created" : "Updated"} ${label}: ${row.name}`);
  }
}

async function main() {
  const shouldSync = process.argv.includes("--sync") || process.env.PM_SEED_SYNC === "true";

  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    if (shouldSync) {
      console.log("Syncing models before seeding...");
      await sequelize.sync({ alter: true });
      console.log("Database models synced");
    }

    await upsertByName(PmPriorityDefinition, priorities, "priority");
    await upsertByName(PmStatusDefinition, statuses, "status");

    console.log("PM defaults seeded successfully");
  } catch (error) {
    console.error("PM default seeding failed:", error.message);
    if (!shouldSync) {
      console.error("If PM tables do not exist yet, run: npm run db:setup:pm");
    }
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
