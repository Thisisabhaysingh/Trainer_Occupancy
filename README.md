# Employee Activity Management Tool

A comprehensive web application for managing employee activities, tracking time, and monitoring performance across different branches.

## Features

- Role-based access control (Admin, Manager, Employee)
- Activity tracking with time entries
- Punch in/out functionality
- Branch management
- Performance analytics and reporting
- Real-time activity status updates

## Tech Stack

- Frontend: React (Vite) with Material-UI
- Backend: Node.js with Express
- Database: MySQL (Sequelize ORM)
- Authentication: JWT

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd employee-activity-management
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

4. Create a MySQL database:
```sql
CREATE DATABASE mis_db;
```

5. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
DB_DIALECT=mysql
DB_NAME=mis_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your-super-secret-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
```

6. Create a `client/.env` file with:
```
VITE_API_BASE_URL=http://localhost:5000
```

7. Initialize the database with default data:
```bash
npm run init:production
```

8. Start the development servers:

In the root directory:
```bash
# Start backend server
npm run dev

# In a new terminal, start frontend server
cd client
npm run dev
```

Or use the combined command:
```bash
npm run dev:full
```

## Usage

1. Access the application at `http://localhost:5173`
2. Login with default credentials:
   - **Admin**: `admin@omotec.com` / `Admin@123`
   - **Coding Manager**: `coding.manager@omotec.com` / `Manager@123`
   - **Electronics Manager**: `electronics.manager@omotec.com` / `Manager@123`
   - **Mechatronics Manager**: `mechatronics.manager@omotec.com` / `Manager@123`
   - **Employees**: Use their email / `Employee@123`

3. User roles:
   - Admin: Full access to all features
   - Manager: Can create activities and manage employees
   - Employee: Can track time and update activity status

⚠️ **Important**: Change all default passwords after first login!

## API Endpoints

### Authentication
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user

### Activities
- GET /api/activities - Get all activities (Manager/Admin)
- GET /api/activities/employee - Get employee's activities
- POST /api/activities - Create new activity (Manager)
- POST /api/activities/:id/time-entry - Add time entry (Employee)
- PATCH /api/activities/:id/status - Update activity status (Employee)

### Employees
- GET /api/employees - Get all employees (Manager/Admin)
- POST /api/employees - Create new employee (Manager)
- GET /api/employees/performance - Get employee performance (Manager/Admin)

### Branches
- GET /api/branches - Get all branches
- POST /api/branches - Create new branch (Admin)
- GET /api/branches/stats - Get branch statistics (Admin)

### Analytics
- GET /api/analytics - Get overall analytics (Admin)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 