
# Connect-Ai Frontend 🎓

### AI-Powered College Admissions Platform

The Connect-Ai frontend is a modern, responsive web application built with **React, Vite, and Tailwind CSS**.

It provides an interactive interface for students, parents, administrators, and admission support staff to access the Connect-Ai platform.

The frontend communicates with the FastAPI backend deployed on Render.

## 🌐 Live Application

🚀 **Website:**

https://frontend-navy-five-ma6haxbaua.vercel.app

⚙️ **Backend API:**

https://connect-ai-b3b5.onrender.com

📚 **API Documentation:**

https://connect-ai-b3b5.onrender.com/docs

## ✨ Features

### 🎓 Student Portal
- Student registration and login
- AI-powered admissions chatbot
- Admission information retrieval
- PDF-based RAG responses
- Admission assistance workflows
- Voice integration where configured

### 🛡️ Administrator Portal
- Secure admin login
- Admission document management
- Student management
- Support staff management
- College admissions knowledge management

### 👨‍💻 Admission Support Portal
- Dedicated support dashboard
- Student inquiry management
- Ticket-related workflows
- Admission assistance

### 🎨 User Interface
- Responsive design
- Modern dashboard layouts
- Reusable React components
- Role-based navigation
- Interactive forms
- Toast notifications
- Mobile-friendly experience

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| React 19 | Frontend UI |
| Vite 8 | Development and build tool |
| JavaScript | Application logic |
| Tailwind CSS 4 | Styling |
| React Router | Navigation |
| Lucide React | Icons |
| Sonner | Toast notifications |
| Fetch API | Backend communication |
| Vercel | Frontend hosting |

## 📁 Frontend Structure

```text
frontend/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── auth/
│   │   ├── student/
│   │   └── ui/
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── ...
│
├── package.json
├── index.html
├── vite.config.js
└── README.md
```

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/chandu038/Connect-Ai.git
cd Connect-Ai/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local` inside the frontend directory.

For local development:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_COLLEGE_CODE=SAHE
```

For the deployed Render backend:

```env
VITE_API_URL=https://connect-ai-b3b5.onrender.com
VITE_COLLEGE_CODE=SAHE
```

**Important:**

- `VITE_API_URL` must point to the FastAPI backend.
- `VITE_COLLEGE_CODE` must match the database college code.
- Never place secret API keys in `VITE_*` variables.

### 4. Start Development Server

```bash
npm run dev
```

Open:

http://localhost:5173

## 📜 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code with ESLint |

## 🔗 Backend Integration

The frontend communicates with the FastAPI backend through HTTP requests.

### Request Flow

```text
User
 |
 v
React Interface
 |
 v
API Request
 |
 v
FastAPI Backend (Render)
 |
 v
Neon PostgreSQL + pgvector
 |
 v
API Response
 |
 v
React Interface
```

Authentication is handled using JWT tokens.

The backend is responsible for validating authentication, enforcing role permissions, and accessing college admission data.

## 🔐 Authentication

The frontend provides login and registration interfaces for supported users.

User roles include:

- Student / Applicant
- Parent
- Administrator
- Admission Support

The backend verifies credentials and controls access to protected routes.

## ☁️ Deployment on Vercel

### Step 1: Import Repository

Go to:

https://vercel.com/new

Import:

https://github.com/chandu038/Connect-Ai

### Step 2: Configure Project

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Step 3: Environment Variables

Add the following in Vercel Project Settings:

```env
VITE_API_URL=https://connect-ai-b3b5.onrender.com
VITE_COLLEGE_CODE=SAHE
```

### Step 4: Deploy

Click **Deploy**.

Redeploy whenever you change Vercel environment variables so that Vite includes their updated values in the production build.

## 🌍 CORS Configuration

The FastAPI backend must allow requests from the deployed frontend.

Example allowed origins:

```python
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-navy-five-ma6haxbaua.vercel.app",
]
```

The frontend URL must not have a trailing slash in the CORS origins list.

## 🧪 Troubleshooting

### CORS Error

If requests are blocked by CORS:

- Check the allowed origins in the backend.
- Confirm the Vercel URL matches exactly.
- Push the backend CORS changes to GitHub.
- Redeploy Render.

### Login Returns 401 Unauthorized

Check:

- User email and password
- User account status
- College code
- Backend authentication response

### Frontend Calls Localhost in Production

Make sure Vercel has:

```env
VITE_API_URL=https://connect-ai-b3b5.onrender.com
```

Redeploy the frontend after updating it.

### Chatbot Responses Are Missing

Verify:

- Render backend availability
- Neon database connection
- Uploaded admission documents
- Document embeddings
- RAG retrieval and API responses

## 🔒 Security Notes

- Do not store backend secrets in frontend environment variables.
- Use HTTPS for deployed API requests.
- Keep authentication and authorization checks on the backend.
- Never commit private credentials.

## 🔮 Future Improvements

- Advanced student dashboard features
- Enhanced multilingual interaction
- Improved accessibility
- Better support communication
- Additional admin analytics

## 👨‍💻 Developer

**Darapaneni Chandu**

GitHub: https://github.com/chandu038

---

**Connect-Ai Frontend — A modern interface for AI-powered college admission assistance.**
