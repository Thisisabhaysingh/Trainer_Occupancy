# MIS Modular Architecture Migration Guide

## 1. Purpose

This document defines how to migrate `mis_task_teamLead` from its current mixed and mostly flat structure to the modular architecture already established in `mis_task_teamLead_Beta_Version`.

The migration must preserve existing behaviour while moving one complete business feature at a time. A feature is considered migrated only when its backend, frontend, permissions, database changes, tests, and integration points follow the target conventions.

Inventory should be the first migrated vertical slice because its beta implementation already uses the target architecture and exercises the shared API, permissions, validation, database, integration, and frontend patterns.

## 2. Migration principles

1. Migrate incrementally; do not rewrite the whole application in one release.
2. Keep existing routes and response contracts working until every consumer is migrated.
3. Move complete vertical slices, not isolated controllers or screens.
4. Separate HTTP handling, business rules, and database access.
5. Use permissions for authorization; roles are only permission bundles.
6. Apply production schema changes through versioned migrations.
7. Keep cross-cutting infrastructure outside business modules.
8. Do not duplicate feature logic in employee, team-lead, manager, or admin dashboards.
9. Add compatibility adapters when old and new code must coexist.
10. Remove legacy code only after tests and production verification confirm that it has no remaining consumers.

## 3. Current structure

The current backend primarily groups code by technical type:

```text
mis_task_teamLead/
├── config/
├── middleware/
├── migrations/
├── models/
├── routes/
├── services/
├── scripts/
├── server.js
└── client/src/
    ├── app/
    ├── assets/
    ├── components/
    ├── features/
    ├── pages/
    ├── styles/
    ├── utils/
    ├── App.jsx
    ├── main.jsx
    └── store.js
```

This makes a business feature span several unrelated folders. Controllers, queries, validation, and business rules can become coupled inside route files, while frontend feature code is distributed across pages and shared components.

## 4. Target structure

```text
mis_task_teamLead/
├── auth/                         # Backend permission definitions
├── config/                       # Application and integration configuration
├── integrations/                 # External-system adapters
│   └── <integration>/
├── middleware/                   # Shared HTTP middleware
├── migrations/                   # Ordered, versioned database migrations
├── modules/                      # Backend business modules
│   └── <feature>/
├── scripts/                      # Maintenance, migration, and verification tools
├── services/                     # Truly cross-feature services only
├── utils/                        # Shared errors and response utilities
├── server.js                     # Application composition root
└── client/src/
    ├── app/                      # Application-level setup
    ├── assets/
    ├── components/               # Reusable, domain-neutral UI
    │   ├── routing/
    │   └── states/
    ├── core/                     # API, authentication, navigation, configuration
    │   ├── api/
    │   ├── auth/
    │   └── navigation/
    ├── modules/                  # Frontend business modules
    │   └── <feature>/
    ├── styles/
    ├── App.jsx
    ├── main.jsx
    └── store.js
```

## 5. Backend module standard

Each backend business module should own its HTTP interface, business rules, persistence access, validation, permissions, and constants.

```text
modules/<feature>/
├── <feature>.models.js
├── <feature>.repository.js
├── <feature>.service.js
├── <feature>.controller.js
├── <feature>.routes.js
├── <feature>.validation.js
├── <feature>.permissions.js
├── <feature>.constants.js
└── __tests__/
```

Small modules may omit files they do not need. Files must not be created merely to satisfy the folder pattern.

### Responsibilities

| Layer | Responsibility | Must not contain |
|---|---|---|
| Routes | Paths, middleware composition, validation, permission checks | Business rules or database queries |
| Controller | Translate HTTP input into service calls and format output | Sequelize queries or workflow decisions |
| Service | Business rules, workflows, transactions, orchestration | Express request or response handling |
| Repository | Sequelize queries and persistence operations | HTTP handling or user-facing response formatting |
| Models | Schema mappings and associations | Request workflows |
| Validation | Parse and validate body, query, and path parameters | Database writes |
| Permissions | Feature permission names and access rules | UI-specific navigation logic |
| Constants | Stable statuses, types, limits, and domain values | Mutable configuration |

### Request flow

```text
HTTP request
  -> authentication middleware
  -> permission middleware
  -> validation middleware
  -> controller
  -> service
  -> repository/model
  -> service result
  -> standard API response
```

### Backend shared foundation

The following beta-style infrastructure should be introduced before or with the first module:

- `auth/permissions.js`
- `middleware/asyncHandler.js`
- `middleware/permissions.js`
- `middleware/validate.js`
- `middleware/errorHandler.js`
- `utils/AppError.js`
- `utils/apiResponse.js`

Expected errors should be thrown as `AppError`. Async controllers should use `asyncHandler`. Successful new endpoints should use a common response helper. Existing endpoints can retain their response shape until their consumers are migrated.

## 6. Frontend module standard

```text
client/src/modules/<feature>/
├── api/                           # Endpoint functions
├── components/                    # Feature-specific reusable UI
├── hooks/                         # React Query and feature hooks
├── pages/                         # Route-level screens
├── routes/                        # Nested feature routes and guards
├── constants/                     # Optional domain constants
└── __tests__/
```

### Frontend responsibilities

- `core/api/apiClient.js` centralizes the API base URL, credentials, authentication expiry, timeouts, cancellation, and error normalization.
- React Query owns server state, caching, loading, mutations, and invalidation.
- Redux is limited to authentication and genuinely global client state.
- Local component state owns temporary form and display state.
- `ProtectedRoute` checks authentication.
- `PermissionGuard` checks authorization.
- `LoadingState`, `ErrorState`, and `EmptyState` provide consistent state presentation.
- `core/navigation/roleNavigation.js` defines navigation without embedding business behaviour in dashboards.

## 7. External integrations

External services must not be implemented inside business controllers. They belong under `integrations/<name>/`.

```text
integrations/<name>/
├── <name>.config.js
├── <name>.adapter.js
├── <name>.controller.js          # Only if proxy endpoints are required
├── <name>.routes.js              # Only if proxy endpoints are required
└── <name>.mapper.js              # Optional normalization layer
```

Adapters translate external data into internal domain data. Configuration and secrets must come from environment variables. Example environment files may document variable names, but real credentials must never be committed.

## 8. Database rules

- Every schema change must have a timestamped migration.
- Migrations must be safe to run exactly once and have a documented rollback or recovery approach.
- Production must not depend on `sequelize.sync({ alter: true })`.
- Foreign keys, unique constraints, and indexes must be intentional.
- Multi-step business operations must use one transaction.
- Schema migrations and seed data must remain separate.
- A migration must be tested against a copy of the current schema before production deployment.
- Modules may define their own Sequelize models, but model registration must happen through one predictable application bootstrap path.

## 9. Mapping legacy code to modules

The initial module map should be:

| Legacy area | Target backend | Target frontend |
|---|---|---|
| Activities | `modules/activities/` | `client/src/modules/activities/` |
| Projects | `modules/projects/` | `client/src/modules/projects/` |
| Employees | `modules/employees/` | `client/src/modules/employees/` |
| Branches | `modules/branches/` | `client/src/modules/branches/` |
| Departments | `modules/departments/` | `client/src/modules/departments/` |
| Tasks | `modules/tasks/` | `client/src/modules/tasks/` |
| Templates | `modules/templates/` | `client/src/modules/templates/` |
| Notifications | `modules/notifications/` | `client/src/modules/notifications/` |
| Analytics | `modules/analytics/` | `client/src/modules/analytics/` |
| Inventory | `modules/inventory/` | `client/src/modules/inventory/` |

Authentication, navigation, application layout, database configuration, email delivery, and generic notifications are shared infrastructure only when they are genuinely used across features.

## 10. Migration phases

### Phase 0: Baseline and safety

1. Record the current build, lint, backend syntax-check, and test results.
2. Document all mounted API routes and frontend routes.
3. Identify current response shapes and consumers.
4. Back up the database and verify restoration.
5. Ensure environment-specific secrets are not copied between projects.
6. Keep unrelated uncommitted changes outside migration commits.

Exit condition: the current application can be built and its known failures are documented.

### Phase 1: Shared modular foundation

1. Add standardized errors, responses, async handling, validation, and permissions.
2. Add the frontend API client, permission helpers, route guards, and state components.
3. Add React Query at the application root.
4. Add navigation configuration under `core/navigation`.
5. Keep all existing legacy routes operational.

Exit condition: new modules can use the foundation without changing legacy behaviour.

### Phase 2: Inventory vertical slice

Move Inventory from the beta project as one complete unit:

- Backend Inventory module
- Central Inventory integration
- Inventory frontend module
- Inventory permissions
- Required shared branch and department hooks
- Inventory route registration
- Inventory navigation entries
- Inventory environment-variable examples
- All Inventory migrations in chronological order

Do not blindly replace `server.js`, `App.jsx`, `main.jsx`, package files, permissions, or navigation files with beta copies. Merge only the required changes into the target versions.

Exit condition: users can browse Inventory, create and track requests, approve according to permissions, and access administration functions appropriate to their assignments.

### Phase 3: Migrate existing features

Migrate one feature per controlled change:

1. Identify its current routes, models, pages, consumers, and tests.
2. Create the backend module and move database access into its repository.
3. Move business rules into its service.
4. Add validation and permission checks at the route boundary.
5. Create the corresponding frontend module.
6. Point current navigation and consumers to the modular route.
7. Verify backward compatibility.
8. Remove the legacy implementation only after confirming there are no imports or route mounts left.

A suggested order after Inventory is Branches, Departments, Projects, Activities, Tasks, Templates, Notifications, Employees, and Analytics. Shared dependencies should be migrated before the larger features that consume them.

### Phase 4: Composition-root cleanup

When most modules are migrated, reduce `server.js` to application composition:

- load configuration;
- initialize Express and common middleware;
- register module routers;
- register integration routers;
- register static assets;
- register not-found and global error handlers;
- initialize the database and start the server.

Frontend `App.jsx` should similarly compose application-level providers and top-level routes without containing feature implementation details.

### Phase 5: Legacy removal

1. Use import searches and route inventories to prove that legacy files are unused.
2. Remove dead routes, models, pages, and duplicate services in small changes.
3. Update deployment, developer, and operational documentation.
4. Run the complete regression suite after every removal batch.

Exit condition: business features exist only in modular locations and all shared code has a clear owner.

## 11. Inventory-specific migration checklist

### Backend

- [ ] Copy `modules/inventory/`.
- [ ] Copy `integrations/centralInventory/`.
- [ ] add the required shared middleware, permissions, errors, and response utilities.
- [ ] Register `/api/inventory` before the global not-found handler.
- [ ] Register `/api/inventory/central` before the global not-found handler.
- [ ] Confirm authentication populates every user field Inventory expects.
- [ ] Confirm branch, department, employee-code, and role mappings.
- [ ] Apply all Inventory migrations in timestamp order.
- [ ] Configure Central Inventory environment variables without copying secrets.

### Frontend

- [ ] Copy `client/src/modules/inventory/`.
- [ ] Add `core/api`, `core/auth`, and `core/navigation` dependencies.
- [ ] Add shared routing and state components.
- [ ] Add branch and department query hooks.
- [ ] Install and configure React Query.
- [ ] Register `/inventory/*` in `App.jsx`.
- [ ] Add Inventory to authorized role navigation.
- [ ] Confirm direct URL loading and browser refresh work.

### Verification

- [ ] Backend files pass syntax checks.
- [ ] Frontend lint passes for all touched files.
- [ ] Production frontend build succeeds.
- [ ] Unauthorized API calls return `401` or `403` consistently.
- [ ] Missing Inventory schema produces an actionable error.
- [ ] Employee request workflow succeeds.
- [ ] Three-level approval workflow succeeds.
- [ ] Inventory Head category scoping succeeds.
- [ ] Admin overview and configuration access succeed.
- [ ] Central Inventory outage does not break local Inventory pages.

## 12. Compatibility strategy

During migration, legacy and modular routes may coexist. Use one of these patterns:

1. Mount the new router at the existing public path when its response contract is compatible.
2. Mount it temporarily at a versioned or internal path when compatibility work remains.
3. Add a thin adapter that maps the legacy request and response format to the new service.

Do not maintain two independent implementations of the same business rule. Compatibility layers should delegate to the modular service and have a planned removal point.

## 13. Testing gates for every module

Every module migration must pass:

1. Backend syntax and startup checks.
2. Repository tests using a test database.
3. Service tests for business rules and transaction rollback.
4. API tests for authentication, authorization, validation, success, and expected failure responses.
5. Frontend component or hook tests for important states.
6. Frontend lint and production build.
7. Manual smoke tests for all supported roles.
8. Regression checks for unchanged legacy features.

No migration is complete merely because the application compiles.

## 14. Deployment and rollback

For each release:

1. Back up the production database.
2. Deploy backward-compatible database changes first.
3. Run migration verification queries.
4. Deploy the backend.
5. Run API health and authorization smoke tests.
6. Deploy the frontend.
7. Monitor application errors, database errors, and integration failures.

Rollback must distinguish application rollback from database rollback. When a migration cannot be safely reversed, use a forward-fix migration and retain backward-compatible columns until the older application version is no longer needed.

## 15. Definition of done

A feature is fully modular only when:

- its backend code is under `modules/<feature>`;
- its frontend code is under `client/src/modules/<feature>`;
- external systems are accessed through adapters;
- routes contain no business rules or database queries;
- controllers contain no direct persistence logic;
- services own workflows and transactions;
- repositories own database access;
- validation and permissions are enforced at boundaries;
- schema changes use tested migrations;
- tests cover critical success and failure paths;
- legacy duplicates and unused imports are removed;
- deployment and operational configuration are documented.

## 16. Immediate next step

Implement Phase 1 and Phase 2 together as a focused Inventory migration. Use the beta files as the source implementation, but merge integration points into the current project instead of replacing whole target files. Once Inventory passes all verification gates, use it as the reference module for migrating the remaining features.

## 17. Migration implementation status

The modular conversion was implemented on 30 August 2026 with the following compatibility boundary:

- `server.js` mounts all active business routers from `modules/*`; it no longer imports routers from `routes/*`.
- Authentication, branches, departments, notifications, and Inventory use the layered beta module implementations.
- Inventory and the Central Inventory adapter are installed as a complete vertical slice.
- All nine Inventory migrations are present in chronological order.
- Remaining established endpoint groups are module-owned routers under `modules/*` and preserve their existing URL and response contracts.
- The shared backend permission, validation, error, async-handler, and API-response foundation is installed.
- Frontend authentication, dashboards, branches, departments, activities, projects, notifications, and Inventory have module entry points under `client/src/modules/*`.
- The shared frontend API client, React Query provider, authorization helpers, navigation, layout, and loading/error/empty states are installed.
- `App.jsx` and the Redux store import authentication and dashboards through their module paths.
- Legacy `routes/`, `models/`, `pages/`, and feature-specific component files remain as compatibility sources during the transition. They must not receive new business logic. Remove them only after regression coverage proves that no scripts, tests, or operational tooling import them directly.

The compatibility files do not change the public API. All new work must use `modules/*`, `client/src/modules/*`, `client/src/core/*`, and the shared boundary utilities described above.
