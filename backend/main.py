"""
منصة مسابقات تكنوفيست - الملف الرئيسي
FastAPI Backend
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from database import init_db, SessionLocal
from models import Admin
from services.auth_service import get_password_hash
from routers import students_router, projects_router, admin_router, evaluation_router, email_router

load_dotenv()

# إنشاء التطبيق
app = FastAPI(
    title="منصة مسابقات تكنوفيست",
    description="""
    🏆 منصة لإدارة مسابقات تكنوفيست باللغة العربية
    
    ## الميزات:
    - تسجيل الفرق والأفراد (4 سيناريوهات)
    - استبيان المشاريع
    - لوحة تحكم الإداريين
    - تقييم المشاريع (75% إداريين + 25% AI)
    - تصدير PDF
    - إرسال روابط تلغرام
    
    ## السيناريوهات:
    1. فريق لديه فكرة مشروع
    2. فرد لديه فكرة مشروع
    3. فرد بدون فكرة مشروع
    4. فريق بدون فكرة مشروع
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# إعدادات CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج، حدد النطاقات المسموحة
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تسجيل المسارات
app.include_router(students_router)
app.include_router(projects_router)
app.include_router(admin_router)
app.include_router(evaluation_router)
app.include_router(email_router)

# خدمة الملفات الثابتة (الصور والملفات المرفوعة)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    """عند بدء التطبيق"""
    print("🚀 جاري تشغيل منصة تكنوفيست...")
    init_db()
    print("✅ تم تهيئة قاعدة البيانات")

    # إنشاء المدير الأعلى تلقائياً إذا لم يكن موجوداً
    create_super_admin()


def create_super_admin():
    """إنشاء المدير الأعلى إذا لم يكن موجوداً"""
    super_admin_username = os.getenv("SUPER_ADMIN_USERNAME")
    super_admin_password = os.getenv("SUPER_ADMIN_PASSWORD")

    if not super_admin_username or not super_admin_password:
        print("⚠️ لم يتم تحديد بيانات المدير الأعلى في ملف .env")
        return

    db = SessionLocal()
    try:
        # التحقق من وجود المدير الأعلى
        existing = db.query(Admin).filter(Admin.username == super_admin_username).first()
        if existing:
            print(f"✅ المدير الأعلى '{super_admin_username}' موجود مسبقاً")
            return

        # إنشاء المدير الأعلى
        admin = Admin(
            username=super_admin_username,
            email=f"{super_admin_username}@teknofest.local",
            hashed_password=get_password_hash(super_admin_password),
            full_name="المدير الأعلى",
            is_superadmin=True,
            is_active=True,
            evaluation_weight=100.0
        )

        db.add(admin)
        db.commit()
        print(f"✅ تم إنشاء المدير الأعلى '{super_admin_username}' بنجاح")
    except Exception as e:
        print(f"❌ خطأ في إنشاء المدير الأعلى: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/")
async def root():
    """الصفحة الرئيسية"""
    return {
        "message": "مرحباً بك في منصة مسابقات تكنوفيست! 🏆",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "students": "/api/students",
            "projects": "/api/projects",
            "admin": "/api/admin",
            "evaluation": "/api/evaluation",
            "email": "/api/email"
        }
    }


@app.get("/health")
async def health_check():
    """فحص صحة التطبيق"""
    return {"status": "healthy", "message": "التطبيق يعمل بشكل سليم"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
    