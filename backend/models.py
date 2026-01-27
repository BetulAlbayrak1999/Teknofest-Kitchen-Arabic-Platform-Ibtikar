"""
نماذج قاعدة البيانات - جميع الجداول
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, 
    DateTime, ForeignKey, Enum, JSON, LargeBinary
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ================== التعدادات ==================

class RegistrationType(enum.Enum):
    """أنواع التسجيل الأربعة"""
    TEAM_WITH_IDEA = "team_with_idea"           # فريق لديه فكرة
    INDIVIDUAL_WITH_IDEA = "individual_with_idea"  # فرد لديه فكرة
    INDIVIDUAL_NO_IDEA = "individual_no_idea"      # فرد بدون فكرة
    TEAM_NO_IDEA = "team_no_idea"                  # فريق بدون فكرة


class ProjectField(enum.Enum):
    """مسابقات تكنوفست"""
    SMART_MOBILITY = "مسابقة التنقل الذكي"
    BIOTECHNOLOGY = "مسابقة ابتكار التكنولوجيا الحيوية"
    ENVIRONMENT_ENERGY = "مسابقة تقنيات البيئة والطاقة"
    EDUCATION_TECH = "مسابقة تقنيات التعليم"
    BARRIER_FREE_LIVING = "مسابقة تقنيات المعيشة الخالية من العوائق"
    FINTECH = "مسابقة أفكار التكنولوجيا المالية"
    TECH_FOR_HUMANITY = "مسابقة التكنولوجيا لصالح البشرية"
    PSYCHOLOGY_TECH = "مسابقة تطبيقات التكنولوجيا في علم النفس"
    AI_HEALTHCARE = "مسابقة الذكاء الاصطناعي في الصحة"
    INDUSTRIAL_DIGITAL = "مسابقة التقنيات الصناعية"
    AGRICULTURAL_TECH = "مسابقة التكنولوجيا الزراعية"
    TRAVEL_HACKATHON = "مسابقة هاكاثون السفر"
    TOURISM_TECH = "مسابقة تقنيات السياحة"
    TURKISH_NLP = "مسابقة معالجة اللغة التركية"
    AI_TRANSPORTATION = "مسابقة الذكاء الاصطناعي في النقل"
    LLM_APPLICATIONS = "مسابقة تطبيقات نماذج اللغة الضخمة"
    AIR_DEFENSE = "مسابقة تقنيات أنظمة الدفاع الجويّة"


# ================== نموذج نسخة البرنامج ==================

class ProgramVersion(Base):
    """نسخ البرنامج/المسابقة"""
    __tablename__ = "program_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_number = Column(Integer, unique=True, nullable=False)  # رقم النسخة
    version_name = Column(String(100))  # اسم النسخة (مثل: النسخة الأولى 2024)
    is_active = Column(Boolean, default=True)  # هل النسخة نشطة؟
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # العلاقات
    teams = relationship("Team", back_populates="program_version")
    project_submissions = relationship("ProjectSubmission", back_populates="program_version")


# ================== نموذج الإداريين ==================

class Admin(Base):
    """الإداريون - لديهم تسجيل دخول"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    
    # وزن صوت الإداري في التقييم (من 0 إلى 100)
    evaluation_weight = Column(Float, default=10.0)  # مثال: 10% أو 40%
    
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)  # مدير عام
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # العلاقات
    evaluations = relationship("Evaluation", back_populates="admin")


# ================== نموذج الفريق ==================

class Team(Base):
    """الفرق - سيناريو 1 و 4"""
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    team_name = Column(String(100), nullable=False)
    registration_type = Column(Enum(RegistrationType), nullable=False)
    field = Column(String(100), nullable=False)  # المجال المختار - استخدام String بدلاً من Enum
    
    # معلومات فكرة المشروع (للفرق التي لديها فكرة)
    initial_idea = Column(Text)  # وصف أولي للفكرة
    
    # نسخة البرنامج
    program_version_id = Column(Integer, ForeignKey("program_versions.id"))
    program_version = relationship("ProgramVersion", back_populates="teams")
    
    # رابط مجموعة تلغرام
    telegram_group_link = Column(String(255))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # العلاقات
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    project_submissions = relationship("ProjectSubmission", back_populates="team")


class TeamMember(Base):
    """أعضاء الفريق (3-6 أعضاء)"""
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    is_leader = Column(Boolean, default=False)  # مشرف الفريق
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # العلاقات
    team = relationship("Team", back_populates="members")


# ================== نموذج الأفراد ==================

class Individual(Base):
    """الأفراد - سيناريو 2 و 3"""
    __tablename__ = "individuals"
    
    id = Column(Integer, primary_key=True, index=True)
    registration_type = Column(Enum(RegistrationType), nullable=False)
    
    # البيانات الشخصية
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    
    # الخبرات والمهارات
    technical_skills = Column(Text)  # المهارات التقنية
    interests = Column(Text)  # الاهتمامات
    experience_level = Column(String(50))  # مستوى الخبرة
    
    # المجال المرغوب
    preferred_field = Column(String(100), nullable=False)  # استخدام String بدلاً من Enum
    
    # وصف فكرة المشروع (للأفراد الذين لديهم فكرة - سيناريو 2)
    project_idea = Column(Text)
    
    # الفريق المُعيَّن (للأفراد بدون فكرة بعد الفرز)
    assigned_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    # نسخة البرنامج
    program_version_id = Column(Integer, ForeignKey("program_versions.id"))
    
    is_assigned = Column(Boolean, default=False)  # هل تم فرزه لفريق؟
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ================== نموذج المشروع ==================

class ProjectSubmission(Base):
    """تقديمات المشاريع - الاستبيان الثاني"""
    __tablename__ = "project_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # ربط بالفريق ونسخة البرنامج
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    program_version_id = Column(Integer, ForeignKey("program_versions.id"), nullable=False)
    
    # رقم النسخة للمشروع (يمكن تقديم أكثر من نسخة)
    submission_version = Column(Integer, default=1)
    
    # بيانات المشروع
    title = Column(String(200), nullable=False)  # عنوان المشروع
    problem_statement = Column(Text, nullable=False)  # المشكلة التي يحلها
    technical_description = Column(Text, nullable=False)  # الوصف التقني (1000+ حرف)
    scientific_reference = Column(Text, nullable=False)  # المرجع العلمي
    
    # المجال
    field = Column(String(100), nullable=False)  # استخدام String بدلاً من Enum
    
    # الملفات المرفقة
    image_path = Column(String(255))  # مسار الصورة
    diagram_path = Column(String(255))  # مسار المخطط
    design_path = Column(String(255))  # مسار التصميم المبدئي
    has_attachments = Column(Boolean, default=False)  # نقاط إضافية
    
    # حالة المشروع
    is_complete = Column(Boolean, default=False)  # هل مكتمل؟
    character_count = Column(Integer, default=0)  # عدد الأحرف
    is_featured = Column(Boolean, default=False)  # هل يظهر في صفحة أفضل الفرق؟
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # العلاقات
    team = relationship("Team", back_populates="project_submissions")
    program_version = relationship("ProgramVersion", back_populates="project_submissions")
    evaluations = relationship("Evaluation", back_populates="project")


# ================== نموذج التقييم ==================

class Evaluation(Base):
    """تقييمات المشاريع"""
    __tablename__ = "evaluations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    project_id = Column(Integer, ForeignKey("project_submissions.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)  # null للتقييم الآلي
    
    # نوع التقييم
    is_ai_evaluation = Column(Boolean, default=False)  # تقييم AI أم إداري
    
    # النقاط (من 50 للإداريين، من 50 لل AI)
    score = Column(Float, nullable=False)
    
    # الملاحظات
    notes = Column(Text)
    
    # النقاط التفصيلية (JSON)
    detailed_scores = Column(JSON)  # {"creativity": 10, "feasibility": 15, ...}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # العلاقات
    project = relationship("ProjectSubmission", back_populates="evaluations")
    admin = relationship("Admin", back_populates="evaluations")


# ================== نموذج سجل الإيميلات ==================

class EmailLog(Base):
    """سجل الإيميلات المرسلة"""
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text)
    status = Column(String(20), default="pending")  # pending, sent, failed
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
    