# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Token-based login/logout
- Role-based access control (`student`, `leader`)
- Student self-service signup and unregister
- Leader dashboard actions for participant management

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## Demo Accounts

- Student: `emma@mergington.edu` / `student123`
- Leader: `leader@mergington.edu` / `leader123`

## API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/login` | Login and get bearer token |
| POST | `/auth/logout` | Logout and invalidate current token |
| GET | `/auth/me` | Get currently authenticated user |
| GET | `/activities` | Get all activities with details and participant count |
| POST | `/activities/{activity_name}/signup` | Authenticated user signs themself up |
| DELETE | `/activities/{activity_name}/unregister` | Authenticated user unregisters themself |
| DELETE | `/management/activities/{activity_name}/participants/{student_email}` | Leader-only participant removal |

## Authentication and Authorization

- Protected endpoints require `Authorization: Bearer <token>`.
- `student` can browse and manage their own enrollment.
- `leader` can access the leader dashboard and run management actions.
- Missing/invalid token returns `401`.
- Role violations return `403`.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data (activities, users, sessions) is stored in memory, which means data will be reset when the server restarts.
