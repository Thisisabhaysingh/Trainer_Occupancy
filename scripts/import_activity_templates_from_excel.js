const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const XLSX = require('xlsx');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, Department, User } = require('../models');
const { ActivityTemplate } = require('../models/Activity');

const EXCEL_FILE_PATH = path.resolve(__dirname, '..', 'TaskList - Timesheet.xlsx');
const TASK_SHEET_REGEX = /department/i;

const GENERAL_COLUMN_INDEXES = new Set([0, 1, 3]); // Columns 1, 2, 4 apply to all departments

const MANDATORY_ACTIVITIES = ['Total No. of Sessions'];
const AUTO_DEPT_DESCRIPTION = 'Auto-created via activity template import';
const AUTO_DEPT_LOCATION = 'HQ';

const CUSTOM_HEADER_TO_DEPARTMENTS = new Map(
  Object.entries({
    accounts: ['Accounts'],
    'content dept': ['Content Development'],
    'coding dept': ['Coding'],
    'coding dept.': ['Coding'],
    'electronics dept': ['Electronics'],
    'electronics dept.': ['Electronics'],
    'mechatronics dept': ['Mechatronics'],
    'mechatronics dept.': ['Mechatronics'],
    'branch manager': ['Branch'],
    'lms & admin': ['Admin'],
    'school ops': ['Operations'],
    'b2b dept': ['Sales'],
    'research team': ['Research and Innovation'],
    "founder's office": ["Founder's Office"],
    marketing: ['Marketing'],
    'product development gattii': ['Developers', 'Research and Innovation'],
  }).map(([header, departments]) => [normalizeDepartmentName(header), departments])
);

const summary = {
  sheetsProcessed: 0,
  sheetsSkipped: [],
  columnsMapped: [],
  columnsSkipped: [],
  recordsPrepared: 0,
  duplicateSkipped: 0,
  blankRowsSkipped: 0,
  departmentsCreated: [],
  mandatoryActivitiesAdded: 0,
};

const departmentRecords = [];
const seenRecords = new Set();
const departmentLookup = new Map(); // normalized name -> department instance
const departmentIdToName = new Map();
const allDepartmentIds = new Set();
let getCreatorForDepartment = () => null;
const ALL_DEPARTMENTS = Symbol('ALL_DEPARTMENTS');

function normalizeDepartmentName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTrimmedString(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function normalizeTitle(title) {
  return toTrimmedString(title).replace(/\s+/g, ' ');
}

async function prepareDepartmentData() {
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    throw new Error(`Excel file not found at ${EXCEL_FILE_PATH}`);
  }

  console.log('📄 Using Excel file:', EXCEL_FILE_PATH);
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);

  if (!workbook.SheetNames.length) {
    throw new Error('Workbook has no sheets.');
  }

  console.log(`📑 Found ${workbook.SheetNames.length} sheets in workbook.`);

  departmentRecords.length = 0;
  seenRecords.clear();
  departmentLookup.clear();
  departmentIdToName.clear();
  allDepartmentIds.clear();
  summary.sheetsProcessed = 0;
  summary.sheetsSkipped = [];
  summary.columnsMapped = [];
  summary.columnsSkipped = [];
  summary.recordsPrepared = 0;
  summary.duplicateSkipped = 0;
  summary.blankRowsSkipped = 0;
  summary.departmentsCreated = [];
  summary.mandatoryActivitiesAdded = 0;

  const departments = await Department.findAll({ attributes: ['id', 'name', 'location', 'description'] });

  if (!departments.length) {
    throw new Error('No departments found in database. Please seed departments first.');
  }

  departments.forEach((dept) => {
    const normalized = normalizeDepartmentName(dept.name);
    departmentLookup.set(normalized, dept);
    departmentIdToName.set(dept.id, dept.name);
    allDepartmentIds.add(dept.id);
  });

  console.log(`🏢 Loaded ${departments.length} departments from database.`);

  const managers = await User.findAll({
    where: { role: 'manager' },
    attributes: ['employeeCode', 'departmentId'],
    raw: true,
  });

  const managerMap = new Map();
  managers.forEach((manager) => {
    if (!managerMap.has(manager.departmentId)) {
      managerMap.set(manager.departmentId, manager.employeeCode);
    }
  });

  const adminFallback = await User.findOne({
    where: { role: 'admin' },
    attributes: ['employeeCode'],
    order: [['createdAt', 'ASC']],
    raw: true,
  });

  const anyUserFallback = await User.findOne({
    attributes: ['employeeCode'],
    order: [['createdAt', 'ASC']],
    raw: true,
  });

  const defaultCreator = adminFallback?.employeeCode || anyUserFallback?.employeeCode || null;

  if (!defaultCreator) {
    throw new Error('No fallback user found to assign as template creator. Ensure at least one user exists.');
  }

  getCreatorForDepartment = (departmentId) => managerMap.get(departmentId) || defaultCreator;

  async function ensureDepartmentByName(rawName) {
    const trimmed = toTrimmedString(rawName).replace(/[:]+$/, '').trim();
    if (!trimmed) {
      return null;
    }

    const normalized = normalizeDepartmentName(trimmed);
    if (!normalized) {
      return null;
    }

    if (departmentLookup.has(normalized)) {
      return departmentLookup.get(normalized);
    }

    const created = await Department.create({
      name: trimmed,
      description: AUTO_DEPT_DESCRIPTION,
      location: AUTO_DEPT_LOCATION,
    });

    departmentLookup.set(normalized, created);
    departmentIdToName.set(created.id, created.name);
    allDepartmentIds.add(created.id);
    summary.departmentsCreated.push(created.name);
    console.log(`🆕 Created missing department "${created.name}" (ID: ${created.id}).`);
    return created;
  }

  for (const sheetName of workbook.SheetNames) {
    if (!TASK_SHEET_REGEX.test(sheetName)) {
      summary.sheetsSkipped.push({ sheetName, reason: 'Does not match department task pattern' });
      console.log(`ℹ️  Skipping sheet "${sheetName}" (not a department task sheet).`);
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    if (!rows.length) {
      summary.sheetsSkipped.push({ sheetName, reason: 'Empty sheet' });
      console.warn(`⚠️  Sheet "${sheetName}" is empty. Skipping.`);
      continue;
    }

    const headerRow = rows[0].map(toTrimmedString);
    if (!headerRow.length) {
      summary.sheetsSkipped.push({ sheetName, reason: 'Missing header row' });
      console.warn(`⚠️  Sheet "${sheetName}" has no header row. Skipping.`);
      continue;
    }

    console.log(`\n--- Processing sheet: ${sheetName} ---`);

    const columnTargets = new Map();

    for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex += 1) {
      const rawHeader = headerRow[columnIndex];
      const normalizedHeader = normalizeDepartmentName(rawHeader);

      if (GENERAL_COLUMN_INDEXES.has(columnIndex)) {
        columnTargets.set(columnIndex, ALL_DEPARTMENTS);
        summary.columnsMapped.push({ sheetName, header: rawHeader || `Column ${columnIndex + 1}`, departments: 'All departments' });
        continue;
      }

      if (!normalizedHeader) {
        summary.columnsSkipped.push({ sheetName, header: rawHeader || `Column ${columnIndex + 1}`, reason: 'Blank header' });
        continue;
      }

      const manualDepartments = CUSTOM_HEADER_TO_DEPARTMENTS.get(normalizedHeader);
      let resolvedDepartmentIds = [];

      if (manualDepartments) {
        for (const deptName of manualDepartments) {
          const dept = await ensureDepartmentByName(deptName);
          if (dept) {
            resolvedDepartmentIds.push(dept.id);
          } else {
            console.warn(`⚠️  Column "${rawHeader}" mapped to invalid department name "${deptName}".`);
          }
        }
      } else {
        const dept = await ensureDepartmentByName(rawHeader);
        if (dept) {
          resolvedDepartmentIds.push(dept.id);
        }
      }

      if (!resolvedDepartmentIds.length) {
        summary.columnsSkipped.push({ sheetName, header: rawHeader, reason: 'No department mapping' });
        console.warn(`⚠️  No department mapping for column "${rawHeader}". Skipping tasks in this column.`);
        continue;
      }

      columnTargets.set(columnIndex, resolvedDepartmentIds);
      const departmentNames = resolvedDepartmentIds.map((id) => departmentIdToName.get(id)).join(', ');
      summary.columnsMapped.push({ sheetName, header: rawHeader || `Column ${columnIndex + 1}`, departments: departmentNames });
    }

    if (!columnTargets.size) {
      summary.sheetsSkipped.push({ sheetName, reason: 'No mappable columns' });
      console.warn(`⚠️  No usable columns found in sheet "${sheetName}". Skipping.`);
      continue;
    }

    let sheetRecords = 0;

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!Array.isArray(row)) {
        continue;
      }

      let rowProducedRecord = false;

      for (const [columnIndex, targetDepartments] of columnTargets.entries()) {
        const rawValue = toTrimmedString(row[columnIndex]);
        if (!rawValue) {
          continue;
        }

        const title = normalizeTitle(rawValue);
        if (!title) {
          continue;
        }

        const departmentIds = targetDepartments === ALL_DEPARTMENTS
          ? Array.from(allDepartmentIds)
          : targetDepartments;

        for (const departmentId of departmentIds) {
          const creatorId = getCreatorForDepartment(departmentId);
          const dedupeKey = `${departmentId}::${title.toLowerCase()}`;

          if (seenRecords.has(dedupeKey)) {
            summary.duplicateSkipped += 1;
            continue;
          }

          seenRecords.add(dedupeKey);
          departmentRecords.push({
            title,
            departmentId,
            createdById: creatorId,
          });
          sheetRecords += 1;
          summary.recordsPrepared += 1;
          rowProducedRecord = true;
        }
      }

      if (!rowProducedRecord) {
        summary.blankRowsSkipped += 1;
      }
    }

    console.log(`✅ Sheet "${sheetName}" produced ${sheetRecords} template(s).`);
    summary.sheetsProcessed += 1;
  }

  // Ensure mandatory activities exist for every department
  for (const departmentId of allDepartmentIds) {
    for (const mandatoryTitle of MANDATORY_ACTIVITIES) {
      const title = normalizeTitle(mandatoryTitle);
      const dedupeKey = `${departmentId}::${title.toLowerCase()}`;
      if (seenRecords.has(dedupeKey)) {
        continue;
      }

      seenRecords.add(dedupeKey);
      departmentRecords.push({
        title,
        departmentId,
        createdById: getCreatorForDepartment(departmentId),
      });
      summary.recordsPrepared += 1;
      summary.mandatoryActivitiesAdded += 1;
    }
  }
}

async function importTemplates() {
  console.log('🔐 Database credentials:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '3306',
    database: process.env.DB_NAME || 'mis_database',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? 'set' : 'missing',
  });

  await sequelize.authenticate();
  console.log('✅ Database connection established successfully.');

  await prepareDepartmentData();

  if (departmentRecords.length === 0) {
    throw new Error('No records prepared for import. Please verify the Excel sheets.');
  }

  console.log(`🧹 Clearing existing activity templates (records to insert: ${departmentRecords.length}).`);

  const transaction = await sequelize.transaction();

  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });
    await ActivityTemplate.destroy({
      where: {},
      truncate: true,
      cascade: true,
      restartIdentity: true,
      transaction,
    });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });

    await ActivityTemplate.bulkCreate(departmentRecords, {
      transaction,
      validate: true,
      returning: false,
    });

    await transaction.commit();
    console.log('🎉 Activity templates imported successfully.');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function main() {
  try {
    await importTemplates();

    console.log('\n📊 Import Summary');
    console.log('-----------------');
    console.log(`Sheets processed: ${summary.sheetsProcessed}`);
    console.log(`Sheets skipped: ${summary.sheetsSkipped.length}`);
    summary.sheetsSkipped.forEach(({ sheetName, reason }) => {
      console.log(`  • ${sheetName}: ${reason}`);
    });
    console.log(`Columns mapped: ${summary.columnsMapped.length}`);
    summary.columnsMapped.forEach(({ sheetName, header, departments }) => {
      console.log(`  • [${sheetName}] ${header} → ${departments}`);
    });
    console.log(`Columns skipped: ${summary.columnsSkipped.length}`);
    summary.columnsSkipped.forEach(({ sheetName, header, reason }) => {
      console.log(`  • [${sheetName}] ${header}: ${reason}`);
    });
    console.log(`Records prepared for insert: ${summary.recordsPrepared}`);
    console.log(`Duplicate titles skipped: ${summary.duplicateSkipped}`);
    console.log(`Blank/unused rows skipped: ${summary.blankRowsSkipped}`);
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch((err) => {
      console.error('⚠️  Failed to close database connection cleanly:', err.message);
    });
  }
}

main();
