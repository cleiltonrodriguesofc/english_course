# English Course System

A Django-based English learning platform featuring interactive lessons, quizzes, and games.

## architecture

The project follows a clean architecture with a core application managing the primary business logic.

- **Frontend**: Django Templates, HTML5, CSS3, JavaScript.
- **Backend**: Django 5.1.5, Python 3.12.
- **Database**: PostgreSQL (Neon) for production, SQLite for local development.
- **Deployment**: Configured for Render.

## Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ (optional if using Docker)

### Running Locally with Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cleiltonrodriguesofc/english_course.git
    cd english_course
    ```

2.  **Create `.env` file:**
    Copy `.env.example` to `.env` and configure your keys.
    ```bash
    cp .env.example .env
    ```

3.  **Build and Run:**
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    Open [http://localhost:8000](http://localhost:8000).

### Database Toggle

The application supports toggling between a local SQLite database and a remote PostgreSQL database via the `.env` file.

- **Local Development (SQLite):**
  ```ini
  USE_LOCAL_DB=True
  SQLITE_URL=sqlite:///db.sqlite3
  ```

- **Production / Remote (Neon):**
  ```ini
  USE_LOCAL_DB=False
  DATABASE_URL=postgresql://...
  ```
