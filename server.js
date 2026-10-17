 const dotenv = require("dotenv");
 const path = require("path");
 dotenv.config({ path: path.join(__dirname, ".env") });
 const express = require("express");
 const cors = require("cors");
 const cookieParser = require("cookie-parser");
 const fs = require("fs");

// Import routes
const authRoutes = require("./modules/auth/auth.routes");
const employeeRoutes = require("./modules/employees/employees.routes");
const activityRoutes = require("./modules/activities/activities.routes");
const branchRoutes = require("./modules/branches/branch.routes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const departmentRoutes = require("./modules/departments/department.routes");
const workdayRoutes = require("./modules/workday/workday.routes");
const managerRoutes = require("./modules/management/management.routes");
const teamleadRoutes = require("./modules/teamlead/teamlead.routes");
const holidaysRoutes = require("./modules/holidays/holidays.routes");
const toolAssignmentsRoutes = require("./modules/tool-assignments/tool-assignments.routes");
const trainerOccupancyRoutes = require("./modules/trainer-occupancy/trainer-occupancy.routes");
const schoolCurriculumRoutes = require("./modules/school-curriculum/school-curriculum.routes");
const trainerLeaderboardRoutes = require("./modules/trainer-leaderboard/trainer-leaderboard.routes");
const schoolActivityMailRoutes = require("./modules/school-activity-mail/school-activity-mail.routes");
const schoolReportRoutes = require("./modules/school-report/school-report.routes");
const managerAssignmentRoutes = require("./modules/manager-assignments/manager-assignments.routes");
const schoolManagementRoutes = require("./modules/school-management/school-management.routes");
require("./services/schoolClassSync"); // keeps School Management classes in step with timetables
const { startSchoolActivityMailScheduler } = require("./services/schoolActivityMailService");
const projectRoutes = require("./modules/projects/projects.routes");
const jobRoutes = require("./modules/jobs/jobs.routes");
const taskRoutes = require("./modules/tasks/tasks.routes");
const templateRoutes = require("./modules/templates/templates.routes");
const employeeProjectRoutes = require("./modules/employee-projects/employee-projects.routes");
const priorityRoutes = require("./modules/priorities/priorities.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const inventoryRoutes = require("./modules/inventory/inventory.routes");
const centralInventoryRoutes = require("./integrations/centralInventory/centralInventory.routes");
const ssoRoutes = require("./modules/sso/sso.routes");
const reportcardSyncRoutes = require("./integrations/reportcard/reportcardSync.routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

// Sequelize models (instead of mongoose)
const { sequelize } = require("./models"); // index.js inside models folder
const { applySafeSchemaSeedPatch } = require("./scripts/apply_safe_schema_seed_patch");

const originalSequelizeAuthenticate = sequelize.authenticate.bind(sequelize);
let safeSchemaSeedApplied = false;
sequelize.authenticate = async (...args) => {
  const result = await originalSequelizeAuthenticate(...args);

  if (!safeSchemaSeedApplied) {
    safeSchemaSeedApplied = true;
    if (process.env.AUTO_SCHEMA_SEED !== 'false') {
      console.log("Applying safe schema/seed patch...");
      const patchResult = await applySafeSchemaSeedPatch();
      console.log(`Safe schema/seed patch applied (${patchResult.statementCount} statements)`);
    } else {
      console.log("Safe schema/seed patch skipped (AUTO_SCHEMA_SEED=false)");
    }
  }

  return result;
};

 // env already loaded above

  const app = express();

  // Middleware
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:3000"
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === origin) {
          return callback(null, true);
        }
        // In production, check FRONTEND_URL
        if (process.env.NODE_ENV === 'production' && origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow all in development for debugging
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );
  app.use(express.json());
  app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "mis-backend", time: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", analyticsRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/workday", workdayRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/teamlead", teamleadRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/admin/tool-assignments", toolAssignmentsRoutes);
app.use("/api/trainer-occupancy", trainerOccupancyRoutes);
app.use("/api/school-curriculum", schoolCurriculumRoutes);
app.use("/api/trainer-leaderboard", trainerLeaderboardRoutes);
app.use("/api/school-activity-mail", schoolActivityMailRoutes);
app.use("/api/school-report", schoolReportRoutes);
app.use("/api/manager-assignments", managerAssignmentRoutes);
app.use("/api/school-management", schoolManagementRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/employee", employeeProjectRoutes);
app.use("/api", priorityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inventory/central", centralInventoryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sso", ssoRoutes);
app.use("/api/integrations/reportcard", reportcardSyncRoutes);

app.use(notFoundHandler);

// Serve static files from built client (if present)
const clientDistPath = path.join(__dirname, "client", "dist");
if (fs.existsSync(clientDistPath)) {
  console.log(`✅ Serving static files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0', // Cache static assets for 1 day in production
    etag: true
  }));
  // Fallback for SPA routes to client index.html (but not API routes)
  app.get("*", (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  console.warn(`⚠️ Client build not found at ${clientDistPath}. Backend API will still work, but frontend won't be served.`);
  if (process.env.NODE_ENV === 'production') {
    console.log('💡 Run "npm run build" to build the frontend before starting the server.');
  }
}

app.use(errorHandler);

  // ✅ Sequelize connection
  sequelize
    .authenticate()
    .then(() => {
      console.log("✅ MySQL connected successfully");

      // Keep existing databases read-safe by default. Schema sync can ALTER tables,
      // so only run it when explicitly requested.
      const allowUnsafeSync = process.env.ENABLE_DB_SYNC === 'true' && process.env.ALLOW_UNSAFE_DB_SYNC === 'true';
      if (!allowUnsafeSync) {
        console.log("Database sync skipped (set ENABLE_DB_SYNC=true and ALLOW_UNSAFE_DB_SYNC=true to alter/sync models)");
        return Promise.resolve();
      }

      console.log("🔄 Syncing database models...");
      return sequelize.sync({ alter: true });
    })
    .then(() => {
      if (process.env.ENABLE_DB_SYNC === 'true' && process.env.ALLOW_UNSAFE_DB_SYNC === 'true') {
        console.log("✅ Database models synced");
      }
      const PORT = process.env.PORT || 5001;
      app.listen(PORT, () => {
        console.log(`✅ Server running successfully on port ${PORT}`);
        startSchoolActivityMailScheduler();
        if (process.env.NODE_ENV === 'production') {
          console.log(`🚀 Production mode: Server is ready to handle requests`);
        } else {
          console.log(`🔧 Development mode: Server is ready for development`);
        }
      });
    })
    .catch((err) => {
      console.error("❌ Unable to connect to MySQL:", err);
      process.exit(1); // Exit process on database connection failure
    });
