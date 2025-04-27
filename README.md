# KPMG Project

A web application built with React frontend and FastAPI backend for managing project and team evaluations.

## Docker Setup

### Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)

### Steps to Run with Docker

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd kpmgtest
   ```

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000

4. Stop the containers:
   ```bash
   docker-compose down
   ```

### Docker Commands Reference

- Build the images:
  ```bash
  docker-compose build
  ```

- Start the containers:
  ```bash
  docker-compose up -d
  ```

- View logs:
  ```bash
  docker-compose logs -f
  ```

- Stop and remove the containers:
  ```bash
  docker-compose down
  ```

- Rebuild and restart a specific service:
  ```bash
  docker-compose up -d --build frontend
  ```

## Development Setup (Without Docker)

### Backend (FastAPI)

1. Install Python 3.9 or later
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. The app will be available at http://localhost:3000

## Project Structure

- `frontend/` - React application
- `main.py` - FastAPI application entry point
- `models.py` - Database models
- `database.py` - Database connection
- `uploads/` - Directory for uploaded files
- `Dockerfile.backend` - Docker configuration for backend
- `frontend/Dockerfile` - Docker configuration for frontend
- `docker-compose.yml` - Docker Compose configuration 