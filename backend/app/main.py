
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Core configuration
from app.core.config import settings

# Existing API routers
from app.api.public import router as public_router
from app.api.admin import router as admin_router

# Authentication
from app.auth.routes import router as auth_router

# Admin - Staff Management
from app.api.support_staff_management import (
    router as support_staff_router,
)

# Admin - Student Management
from app.api.admin_students import (
    router as admin_students_router,
)

# Student AI Chatbot
from app.api.student_chat import (
    router as student_chat_router,
)

# Admission Support Dashboard
from app.api.support_dashboard import (
    router as support_dashboard_router,
)

# Register new database models
from app.database.models.student_question import StudentQuestion
from app.database.models.support_ticket_reply import SupportTicketReply


from app.api import voice



# =====================================================
# FASTAPI APPLICATION
# =====================================================

fastapi_app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered College Admission Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# =====================================================
# REGISTER ROUTERS
# =====================================================

# Public API
fastapi_app.include_router(public_router)

# Authentication
fastapi_app.include_router(auth_router)

# Admin Management and Knowledge Base
fastapi_app.include_router(admin_router)

# Admin - Staff Management
fastapi_app.include_router(support_staff_router)

# Admin - Student Management
fastapi_app.include_router(admin_students_router)

# Student AI Chatbot
fastapi_app.include_router(student_chat_router)

# Admission Support Dashboard
fastapi_app.include_router(support_dashboard_router)
fastapi_app.include_router(voice.router)



# =====================================================
# HOME ENDPOINT
# =====================================================

@fastapi_app.get("/", tags=["System"])
async def home():
    return {
        "application": settings.APP_NAME,
        "message": "Welcome to Connect-Ai",
        "version": "1.0.0",
        "status": "running",
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@fastapi_app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "application": settings.APP_NAME,
        "version": "1.0.0",
    }


# =====================================================
# CORS CONFIGURATION
# =====================================================

origins = [
    "https://frontend-navy-five-ma6haxbaua.vercel.app/",
    "https://connect-ai-b3b5.onrender.com/",
]

# Wrap the entire FastAPI application.
# This also allows CORS headers to be added to
# responses from unhandled server errors.
app = CORSMiddleware(
    app=fastapi_app,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
    ],
)

