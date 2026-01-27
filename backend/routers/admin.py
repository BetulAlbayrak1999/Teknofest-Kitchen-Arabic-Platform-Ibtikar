"""
مسارات الإداريين - تسجيل الدخول وإدارة النظام
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import timedelta
from dotenv import load_dotenv
from database import get_db
from models import (
    Admin, Team, TeamMember, Individual, ProjectSubmission,
    ProgramVersion, RegistrationType, Evaluation
)
from schemas import (
    AdminCreate, AdminResponse, AdminLogin, Token,
    TeamResponse, IndividualResponse, AssignIndividualsToTeam,
    EmailSend, ProgramVersionCreate, ProgramVersionResponse
)
from services.auth_service import (
    verify_password, get_password_hash, create_access_token,
    get_current_admin, ACCESS_TOKEN_EXPIRE_MINUTES
)
from services.email_service import email_service
from services.pdf_generator import pdf_service

# تحميل متغيرات البيئة
load_dotenv()
ADMIN_REGISTRATION_CODE = os.getenv("ADMIN_REGISTRATION_CODE", "")
SUPER_ADMIN_USERNAME = os.getenv("SUPER_ADMIN_USERNAME", "")
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "")

router = APIRouter(prefix="/api/admin", tags=["الإداريون"])


# ==================== المصادقة ====================

@router.post("/register", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def register_admin(admin_data: AdminCreate, db: Session = Depends(get_db)):
    """تسجيل إداري جديد - يتطلب كود التسجيل السري"""
    # التحقق من كود التسجيل
    if admin_data.registration_code != ADMIN_REGISTRATION_CODE:
        raise HTTPException(
            status_code=403,
            detail="كود التسجيل غير صحيح"
        )

    # التحقق من عدم وجود إداري بنفس البيانات
    existing = db.query(Admin).filter(
        (Admin.username == admin_data.username) |
        (Admin.email == admin_data.email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="اسم المستخدم أو البريد الإلكتروني موجود مسبقاً"
        )

    # إنشاء الإداري
    admin = Admin(
        username=admin_data.username,
        email=admin_data.email,
        hashed_password=get_password_hash(admin_data.password),
        full_name=admin_data.full_name,
        evaluation_weight=admin_data.evaluation_weight
    )

    # أول إداري يكون مدير عام
    admin_count = db.query(Admin).count()
    if admin_count == 0:
        admin.is_superadmin = True

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """تسجيل دخول الإداري"""
    admin = db.query(Admin).filter(Admin.username == form_data.username).first()
    
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="الحساب غير مفعّل"
        )
    
    access_token = create_access_token(
        data={"sub": admin.username, "admin_id": admin.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """الحصول على معلومات الإداري الحالي"""
    admin = db.query(Admin).filter(Admin.id == current_admin["admin_id"]).first()
    if not admin:
        raise HTTPException(status_code=404, detail="الإداري غير موجود")
    return admin


# ==================== إدارة الإداريين ====================

@router.get("/admins", response_model=List[AdminResponse])
async def get_all_admins(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """الحصول على جميع الإداريين"""
    admins = db.query(Admin).all()
    return admins


@router.put("/admins/{admin_id}/weight")
async def update_admin_weight(
    admin_id: int,
    weight: float,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    تحديث وزن صوت الإداري
    - فقط المدير الأعلى (super admin) يمكنه تعديل أوزان الإداريين
    """
    # التحقق من أن المستخدم الحالي هو المدير الأعلى
    requesting_admin = db.query(Admin).filter(
        Admin.id == current_admin["admin_id"]
    ).first()

    if not requesting_admin or requesting_admin.username != SUPER_ADMIN_USERNAME:
        raise HTTPException(
            status_code=403,
            detail="فقط المدير الأعلى يمكنه تعديل أوزان الإداريين"
        )

    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="الإداري غير موجود")

    if weight < 0 or weight > 100:
        raise HTTPException(status_code=400, detail="الوزن يجب أن يكون بين 0 و 100")

    admin.evaluation_weight = weight
    db.commit()

    return {"message": f"تم تحديث وزن الإداري إلى {weight}%"}


@router.get("/is-super-admin")
async def check_super_admin(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """التحقق مما إذا كان المستخدم الحالي هو المدير الأعلى"""
    admin = db.query(Admin).filter(Admin.id == current_admin["admin_id"]).first()
    is_super = admin and admin.username == SUPER_ADMIN_USERNAME
    return {"is_super_admin": is_super}


# ==================== فرز الأفراد إلى فرق ====================

@router.get("/unassigned-individuals", response_model=List[IndividualResponse])
async def get_unassigned_individuals(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """الحصول على الأفراد غير المفرزين"""
    individuals = db.query(Individual).filter(
        Individual.is_assigned == False
    ).all()
    return individuals


@router.post("/assign-team")
async def assign_individuals_to_team(
    assignment: AssignIndividualsToTeam,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    فرز مجموعة أفراد إلى فريق جديد
    - يجب أن يكون عدد الأفراد بين 3 و 6
    """
    if len(assignment.individual_ids) < 3 or len(assignment.individual_ids) > 6:
        raise HTTPException(
            status_code=400,
            detail="عدد الأفراد في الفريق يجب أن يكون بين 3 و 6"
        )
    
    # التحقق من وجود الأفراد
    individuals = db.query(Individual).filter(
        Individual.id.in_(assignment.individual_ids),
        Individual.is_assigned == False
    ).all()
    
    if len(individuals) != len(assignment.individual_ids):
        raise HTTPException(
            status_code=400,
            detail="بعض الأفراد غير موجودين أو تم فرزهم مسبقاً"
        )
    
    # الحصول على نسخة البرنامج
    version = db.query(ProgramVersion).filter(ProgramVersion.is_active == True).first()
    
    # إنشاء فريق جديد
    team = Team(
        team_name=assignment.team_name,
        registration_type=RegistrationType.TEAM_NO_IDEA,
        field=assignment.field.value,
        program_version_id=version.id
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    
    # إضافة الأعضاء
    for i, ind in enumerate(individuals):
        member = TeamMember(
            team_id=team.id,
            full_name=ind.full_name,
            email=ind.email,
            phone=ind.phone,
            is_leader=(i == 0)  # أول عضو يكون القائد
        )
        db.add(member)
        
        # تحديث حالة الفرد
        ind.is_assigned = True
        ind.assigned_team_id = team.id
    
    db.commit()
    
    return {
        "message": "تم إنشاء الفريق بنجاح",
        "team_id": team.id,
        "team_name": team.team_name,
        "members_count": len(individuals)
    }


# ==================== إرسال روابط تلغرام ====================

@router.post("/send-telegram-links/{team_id}")
async def send_telegram_link_to_team(
    team_id: int,
    telegram_link: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """إرسال رابط تلغرام لأعضاء فريق"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")
    
    # تحديث رابط التلغرام
    team.telegram_group_link = telegram_link
    db.commit()
    
    # إعداد قائمة المستلمين
    recipients = [
        {
            "email": member.email,
            "name": member.full_name,
            "team_name": team.team_name
        }
        for member in team.members
    ]
    
    # إرسال البريد
    result = await email_service.send_telegram_invites(recipients, telegram_link)
    
    return result


@router.post("/send-bulk-telegram")
async def send_telegram_links_bulk(
    email_data: EmailSend,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """إرسال روابط تلغرام لمجموعة من البريد الإلكتروني"""
    recipients = [
        {"email": email, "name": "المشارك", "team_name": ""}
        for email in email_data.recipient_emails
    ]
    
    result = await email_service.send_telegram_invites(
        recipients, 
        email_data.telegram_link or ""
    )
    
    return result


# ==================== تصدير PDF ====================

@router.get("/export/project/{project_id}/pdf")
async def export_project_pdf(
    project_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """تصدير مشروع كـ PDF"""
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    
    # حساب التقييم
    evaluations = db.query(Evaluation).filter(
        Evaluation.project_id == project_id
    ).all()

    # تقييم AI (من 25)
    ai_evaluation = next((e for e in evaluations if e.is_ai_evaluation), None)
    ai_score = ai_evaluation.score if ai_evaluation else 0

    # تقييمات الإداريين (من 75) - حساب المتوسط المرجح
    admin_evaluations = [e for e in evaluations if not e.is_ai_evaluation]
    if admin_evaluations:
        admin_scores_weighted = []
        for evaluation in admin_evaluations:
            admin = db.query(Admin).filter(Admin.id == evaluation.admin_id).first()
            weight = admin.evaluation_weight if admin else 100
            admin_scores_weighted.append({
                "score": evaluation.score,
                "weight": weight
            })

        total_weight = sum(a["weight"] for a in admin_scores_weighted)
        admin_score = sum(
            a["score"] * a["weight"] for a in admin_scores_weighted
        ) / total_weight if total_weight > 0 else 0
    else:
        admin_score = 0

    # النتيجة النهائية: تقييم الإداريين (من 75) + تقييم AI (من 25) = من 100
    total_score = (admin_score + ai_score) if evaluations else None

    project_data = {
        "title": project.title,
        "team_name": project.team.team_name,
        "field": project.field,
        "problem_statement": project.problem_statement,
        "technical_description": project.technical_description,
        "scientific_reference": project.scientific_reference,
        "total_score": total_score,
        "admin_score": admin_score,
        "ai_score": ai_score
    }

    pdf_bytes = pdf_service.generate_project_pdf(project_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=project_{project_id}.pdf"
        }
    )


@router.get("/export/projects/pdf")
async def export_all_projects_pdf(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """تصدير جميع المشاريع كتقرير PDF"""
    projects = db.query(ProjectSubmission).all()

    projects_data = []
    for project in projects:
        evaluations = db.query(Evaluation).filter(
            Evaluation.project_id == project.id
        ).all()

        # تقييم AI (من 25)
        ai_evaluation = next((e for e in evaluations if e.is_ai_evaluation), None)
        ai_score = ai_evaluation.score if ai_evaluation else 0

        # تقييمات الإداريين (من 75) - حساب المتوسط المرجح
        admin_evaluations = [e for e in evaluations if not e.is_ai_evaluation]
        if admin_evaluations:
            admin_scores_weighted = []
            for evaluation in admin_evaluations:
                admin = db.query(Admin).filter(Admin.id == evaluation.admin_id).first()
                weight = admin.evaluation_weight if admin else 100
                admin_scores_weighted.append({
                    "score": evaluation.score,
                    "weight": weight
                })

            total_weight = sum(a["weight"] for a in admin_scores_weighted)
            admin_score = sum(
                a["score"] * a["weight"] for a in admin_scores_weighted
            ) / total_weight if total_weight > 0 else 0
        else:
            admin_score = 0

        # النتيجة النهائية: تقييم الإداريين (من 75) + تقييم AI (من 25) = من 100
        total_score = (admin_score + ai_score) if evaluations else None

        projects_data.append({
            "title": project.title,
            "team_name": project.team.team_name,
            "field": project.field,
            "total_score": total_score
        })
    
    # ترتيب حسب النتيجة
    projects_data.sort(key=lambda x: x.get("total_score") or 0, reverse=True)
    
    pdf_bytes = pdf_service.generate_projects_report_pdf(projects_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=projects_report.pdf"
        }
    )


@router.get("/export/team/{team_id}/pdf")
async def export_team_pdf(
    team_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """تصدير معلومات فريق كـ PDF"""
    team = db.query(Team).filter(Team.id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")
    
    team_data = {
        "team_name": team.team_name,
        "field": team.field,
        "registration_type": team.registration_type.value,
        "initial_idea": team.initial_idea,
        "members": [
            {
                "full_name": m.full_name,
                "email": m.email,
                "phone": m.phone,
                "is_leader": m.is_leader
            }
            for m in team.members
        ]
    }
    
    pdf_bytes = pdf_service.generate_team_pdf(team_data)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=team_{team_id}.pdf"
        }
    )


# ==================== نسخ البرنامج ====================

@router.post("/program-version", response_model=ProgramVersionResponse)
async def create_program_version(
    version_data: ProgramVersionCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """إنشاء نسخة برنامج جديدة"""
    # إلغاء تفعيل النسخ السابقة
    db.query(ProgramVersion).update({ProgramVersion.is_active: False})
    
    version = ProgramVersion(
        version_number=version_data.version_number,
        version_name=version_data.version_name,
        is_active=True
    )
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return version


@router.get("/program-versions", response_model=List[ProgramVersionResponse])
async def get_program_versions(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """الحصول على جميع نسخ البرنامج"""
    versions = db.query(ProgramVersion).order_by(
        ProgramVersion.version_number.desc()
    ).all()
    return versions
    