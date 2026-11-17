
# Connect-Ai 🎓
### AI-Powered College Admissions Assistant

Connect-Ai is a full-stack, AI-powered college admissions platform that helps students and parents access admission information through an intelligent chatbot.

Built using **React, FastAPI, LangChain, OpenAI, PostgreSQL, and pgvector**, the platform uses Retrieval-Augmented Generation (RAG) to answer admission queries based on uploaded institutional documents.

The application also provides separate dashboards for students, administrators, and admission support staff.

## 🌐 Live Application

| Service | Link |
|---------|------|
| 🌍 Live Website | [Connect-Ai](https://frontend-navy-five-ma6haxbaua.vercel.app) |
| ⚙️ Backend API | [Render](https://connect-ai-b3b5.onrender.com) |
| 📚 API Documentation | [Swagger UI](https://connect-ai-b3b5.onrender.com/docs) |
| 💻 Source Code | [GitHub](https://github.com/chandu038/Connect-Ai) |

## ✨ Key Features

### 🎓 Student & Parent Portal
- Student registration and secure login
- AI-powered admissions chatbot
- Document-grounded answers using RAG
- Admission-related information and assistance
- Conversation and support workflows
- Voice interaction integration

### 🛡️ Admin Dashboard
- Secure administrator authentication
- College information management
- Admission PDF upload and knowledge management
- Student account management
- Admission support staff management
- Role-based access control

### 👨‍💻 Admission Support Dashboard
- Dedicated support staff access
- Student inquiry handling
- Support ticket management
- Assistance for questions requiring human support

### 🤖 AI & RAG
- OpenAI-powered natural language responses
- LangChain-based AI integration
- PDF document ingestion
- Document chunking and vector embeddings
- Semantic retrieval using PostgreSQL + pgvector
- Source-aware answers based on institutional documents
- Configurable search and voice integrations

## 🏗️ System Architecture

```text
                  STUDENTS / PARENTS
                          |
                          v
                 React + Vite Frontend
                       (Vercel)
                          |
                          | HTTPS / REST API
                          v
                    FastAPI Backend
                       (Render)
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
     Authentication   RAG Pipeline   Admin / Support
          |               |               |
          |        LangChain + OpenAI     |
          |               |               |
          +---------------+---------------+
                          |
                          v
                  Neon PostgreSQL
                     + pgvector
                          |
              Users / Colleges / PDFs
              Embeddings / Support Data
```

## 🛠️ Technology Stack

| Category | Technologies |
|----------|--------------|
| Frontend | React, Vite, JavaScript, Tailwind CSS |
| Backend | Python, FastAPI, REST APIs |
| AI Framework | LangChain |
| LLM | OpenAI API |
| Database | PostgreSQL |
| Vector Database | pgvector |
| Authentication | JWT, pwdlib |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Package Managers | uv, npm |
| Backend Hosting | Render |
| Frontend Hosting | Vercel |
| Cloud Database | Neon |
| Version Control | Git, GitHub |

## 📁 Project Structure

```text
Connect-Ai/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── core/
│   │   ├── database/
│   │   └── main.py
│   │
│   ├── migrations/
│   ├── pyproject.toml
│   ├── uv.lock
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Python 3.14+
- Node.js and npm
- PostgreSQL with pgvector
- uv Python package manager
- OpenAI API key
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/chandu038/Connect-Ai.git
cd Connect-Ai
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
uv sync
```

Create a `.env` file:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET_KEY=your_secure_jwt_secret
DEBUG=false
```

Configure additional environment variables required by the integrations you enable.

Check database migration status:

```bash
uv run alembic current
uv run alembic heads
```

For a database with a compatible initialized schema and migration history, apply outstanding migrations when appropriate:

```bash
uv run alembic upgrade head
```

Start the backend:

```bash
uv run uvicorn app.main:app --reload
```

Backend API:

http://127.0.0.1:8000

Swagger Documentation:

http://127.0.0.1:8000/docs

Health Check:

http://127.0.0.1:8000/health

**Note:** The existing Alembic baseline may not create a completely empty database. Check migration history and database schema before initializing a fresh environment.

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_COLLEGE_CODE=SAHE
```

Start the frontend:

```bash
npm run dev
```

Open:

http://localhost:5173

## 🧠 How the RAG System Works

1. An administrator uploads an approved admission PDF.
2. The backend extracts text from the document.
3. Text is divided into smaller chunks.
4. Embeddings are generated for the chunks.
5. Embeddings are stored in PostgreSQL using pgvector.
6. A student asks an admission-related question.
7. The system retrieves relevant document content.
8. The LLM generates a response using retrieved context.
9. The chatbot returns the answer with source information where available.

## 🔐 Authentication & Authorization

Connect-Ai implements role-based authentication using JWT.

Supported user roles include:

- Student / Applicant
- Parent
- Admission Support
- Administrator

Passwords are securely hashed using `pwdlib`.

Protected backend APIs enforce access based on the authenticated user's role.

## ☁️ Deployment

### Backend — Render

| Setting | Configuration |
|---------|---------------|
| Root Directory | `backend` |
| Runtime | Python |
| Build Command | `uv sync --frozen --no-dev` |
| Start Command | `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/health` |

Backend URL:

https://connect-ai-b3b5.onrender.com

### Frontend — Vercel

| Setting | Configuration |
|---------|---------------|
| Framework | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment variables:

```env
VITE_API_URL=https://connect-ai-b3b5.onrender.com
VITE_COLLEGE_CODE=SAHE
```

Frontend URL:

https://frontend-navy-five-ma6haxbaua.vercel.app

### Database — Neon

The application uses Neon PostgreSQL with pgvector for:

- User authentication data
- College information
- Admission documents
- Document chunks and embeddings
- Support ticket records

## 🔒 Security

- JWT-based authentication
- Secure password hashing
- Role-based authorization
- College-specific access controls
- Restricted CORS origins
- Environment-based secrets
- Parameterized database queries
- Document-grounded AI responses

Never commit `.env` files, database dumps, or API secrets to GitHub.

Original uploaded PDFs should use durable storage for production deployment because hosted application filesystems may be temporary.

## 📌 Project Scope

The current version of Connect-Ai focuses on **college admissions assistance**.

Future improvements may include:

- Additional institutional services
- More advanced admission analytics
- Expanded multilingual assistance
- Improved document management
- Automated admission workflows

## 👨‍💻 Developed By

**Darapaneni Chandu**

GitHub: https://github.com/chandu038

## 📄 License

No license is specified in this README. Refer to the repository for any applicable license terms.

---

**Connect-Ai — Making college admission information easier to access through AI.**
