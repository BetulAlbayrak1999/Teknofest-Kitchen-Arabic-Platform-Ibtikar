"""
مخططات Pydantic للتحقق من البيانات
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ================== التعدادات ==================

class RegistrationTypeEnum(str, Enum):
    TEAM_WITH_IDEA = "team_with_idea"
    INDIVIDUAL_WITH_IDEA = "individual_with_idea"
    INDIVIDUAL_NO_IDEA = "individual_no_idea"
    TEAM_NO_IDEA = "team_no_idea"


class ProjectFieldEnum(str, Enum):
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

class GenderEnum(str, Enum):
    male = "male"
    female = "female"

# ================== مخططات أعضاء الفريق ==================

class TeamMemberCreate(BaseModel):
    """إنشاء عضو فريق"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    membership_number: Optional[str] = Field(None)  # رقم العضوية إن وجد
    is_leader: bool = False


class TeamMemberResponse(TeamMemberCreate):
    """استجابة عضو الفريق"""
    id: int
    team_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ================== مخططات الفريق ==================

class TeamCreate(BaseModel):
    """إنشاء فريق جديد - سيناريو 1 و 4"""
    team_name: str = Field(..., min_length=2, max_length=100)
    registration_type: RegistrationTypeEnum
    field: ProjectFieldEnum
    initial_idea: Optional[str] = None  # مطلوب للسيناريو 1
    members: List[TeamMemberCreate] = Field(..., min_items=3, max_items=6)
    gender: GenderEnum

    @validator('members')
    def validate_members(cls, v):
        if len(v) < 3 or len(v) > 6:
            raise ValueError('عدد أعضاء الفريق يجب أن يكون بين 3 و 6')
        
        # التأكد من وجود قائد واحد فقط
        leaders = [m for m in v if m.is_leader]
        if len(leaders) != 1:
            raise ValueError('يجب تحديد مشرف واحد فقط للفريق')
        
        return v
    
    @validator('initial_idea')
    def validate_idea(cls, v, values):
        if values.get('registration_type') == RegistrationTypeEnum.TEAM_WITH_IDEA and not v:
            raise ValueError('يجب إدخال فكرة المشروع للفرق التي لديها فكرة')
        return v


class TeamResponse(BaseModel):
    """استجابة الفريق"""
    id: int
    team_name: str
    registration_type: RegistrationTypeEnum
    field: ProjectFieldEnum
    initial_idea: Optional[str]
    telegram_group_link: Optional[str]
    is_active: bool
    created_at: datetime
    members: List[TeamMemberResponse] = []
    gender: GenderEnum
    
    class Config:
        from_attributes = True


# ================== مخططات الأفراد ==================

class IndividualCreate(BaseModel):
    """إنشاء فرد - سيناريو 2 و 3"""
    registration_type: RegistrationTypeEnum
    full_name: str = Field(..., min_length=2, max_length=100)
    membership_number: Optional[str] = Field(None)  # رقم العضوية إن وجد
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    technical_skills: str = Field(..., min_length=10)
    interests: str = Field(..., min_length=10)
    experience_level: str
    preferred_field: ProjectFieldEnum
    project_idea: Optional[str] = None  # مطلوب للسيناريو 2
    gender: GenderEnum
    
    @validator('project_idea')
    def validate_idea(cls, v, values):
        if values.get('registration_type') == RegistrationTypeEnum.INDIVIDUAL_WITH_IDEA and not v:
            raise ValueError('يجب إدخال فكرة المشروع للأفراد الذين لديهم فكرة')
        return v


class IndividualResponse(BaseModel):
    """استجابة الفرد"""
    id: int
    registration_type: RegistrationTypeEnum
    membership_number: Optional[str]
    full_name: str
    email: str
    phone: str
    technical_skills: str
    interests: str
    experience_level: str
    preferred_field: ProjectFieldEnum
    project_idea: Optional[str]
    assigned_team_id: Optional[int]
    is_assigned: bool
    created_at: datetime
    gender: GenderEnum
    
    class Config:
        from_attributes = True


# ================== مخططات المشروع ==================

class ProjectSubmissionCreate(BaseModel):
    """إنشاء تقديم مشروع - باستخدام البريد الإلكتروني للعثور على الفريق"""
    member_email: EmailStr  # البريد الإلكتروني لعضو الفريق
    title: str = Field(..., min_length=5, max_length=200)
    problem_statement: str = Field(..., min_length=50)
    technical_description: str = Field(..., min_length=1000)  # 1000 حرف على الأقل
    scientific_reference: str = Field(..., min_length=10)
    field: ProjectFieldEnum

    @validator('technical_description')
    def validate_description(cls, v):
        if len(v) < 1000:
            raise ValueError(f'الوصف التقني يجب أن يكون 1000 حرف على الأقل. الحالي: {len(v)} حرف')
        return v


class ProjectSubmissionResponse(BaseModel):
    """استجابة تقديم المشروع"""
    id: int
    team_id: int
    program_version_id: int
    submission_version: int
    title: str
    problem_statement: str
    technical_description: str
    scientific_reference: str
    field: ProjectFieldEnum
    image_path: Optional[str]
    diagram_path: Optional[str]
    design_path: Optional[str]
    has_attachments: bool
    is_complete: bool
    is_featured: bool = False
    character_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectWithTeamResponse(ProjectSubmissionResponse):
    """استجابة المشروع مع بيانات الفريق"""
    team: TeamResponse
    total_score: Optional[float] = None
    admin_score: Optional[float] = None
    ai_score: Optional[float] = None


# ================== مخططات التقييم ==================

class EvaluationCreate(BaseModel):
    """إنشاء تقييم"""
    project_id: int
    score: float = Field(..., ge=0, le=75)  # من 0 إلى 75
    notes: Optional[str] = None
    detailed_scores: Optional[dict] = None


class EvaluationResponse(BaseModel):
    """استجابة التقييم"""
    id: int
    project_id: int
    admin_id: Optional[int]
    is_ai_evaluation: bool
    score: float
    notes: Optional[str]
    detailed_scores: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AIEvaluationRequest(BaseModel):
    """طلب تقييم AI"""
    project_id: int


# ================== مخططات الإداريين ==================

class AdminCreate(BaseModel):
    """إنشاء إداري"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    evaluation_weight: float = Field(default=10.0, ge=0, le=100)
    registration_code: str = Field(..., min_length=1)  # كود التسجيل السري


class AdminResponse(BaseModel):
    """استجابة الإداري"""
    id: int
    username: str
    email: str
    full_name: str
    evaluation_weight: float
    is_active: bool
    is_superadmin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    """تسجيل دخول الإداري"""
    username: str
    password: str


class Token(BaseModel):
    """توكن المصادقة"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """بيانات التوكن"""
    username: Optional[str] = None


# ================== مخططات البريد الإلكتروني ==================

class EmailSend(BaseModel):
    """إرسال بريد إلكتروني"""
    recipient_emails: List[EmailStr]
    subject: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    telegram_link: Optional[str] = None


# ================== مخططات فرز الأفراد ==================

class AssignIndividualsToTeam(BaseModel):
    """فرز أفراد إلى فريق"""
    individual_ids: List[int] = Field(..., min_items=3, max_items=6)
    team_name: str = Field(..., min_length=2, max_length=100)
    field: ProjectFieldEnum
    gender: Optional[GenderEnum] = None


# ================== مخططات أفضل الفرق ==================

class TopTeamResponse(BaseModel):
    """استجابة أفضل الفرق"""
    rank: int
    project_title: str
    project_description: str  # وصف مختصر
    field: ProjectFieldEnum
    team_name: str
    team_members: List[str]
    total_score: float
    admin_score: float
    ai_score: float


# ================== مخططات نسخة البرنامج ==================

class ProgramVersionCreate(BaseModel):
    """إنشاء نسخة برنامج"""
    version_number: int
    version_name: str = Field(..., min_length=2, max_length=100)


class ProgramVersionResponse(BaseModel):
    """استجابة نسخة البرنامج"""
    id: int
    version_number: int
    version_name: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        