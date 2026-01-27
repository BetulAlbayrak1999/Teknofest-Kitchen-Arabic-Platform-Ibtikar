"""
مسارات المشاريع - استبيان المشروع
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import ProjectSubmission, Team, TeamMember, ProgramVersion, Evaluation
from schemas import (
    ProjectSubmissionCreate, ProjectSubmissionResponse,
    ProjectWithTeamResponse, ProjectFieldEnum
)
from services.pdf_generator import pdf_service

router = APIRouter(prefix="/api/projects", tags=["المشاريع"])

# مجلد رفع الملفات
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_active_program_version(db: Session):
    """الحصول على نسخة البرنامج النشطة"""
    version = db.query(ProgramVersion).filter(ProgramVersion.is_active == True).first()
    if not version:
        version = ProgramVersion(version_number=1, version_name="النسخة الأولى", is_active=True)
        db.add(version)
        db.commit()
        db.refresh(version)
    return version


@router.post("/submit", response_model=ProjectSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_project(
    project_data: ProjectSubmissionCreate,
    db: Session = Depends(get_db)
):
    """
    تقديم مشروع جديد (استبيان المشروع)
    - يتم البحث عن الفريق باستخدام البريد الإلكتروني لأحد الأعضاء
    - يجب ألا يقل الوصف التقني عن 1000 حرف
    - يجب وجود مرجع علمي واحد على الأقل
    """
    # البحث عن عضو الفريق بالبريد الإلكتروني
    team_member = db.query(TeamMember).filter(
        TeamMember.email == project_data.member_email
    ).first()

    if not team_member:
        raise HTTPException(
            status_code=404,
            detail="البريد الإلكتروني غير مسجل لعضو في فريق. تأكد من استخدام نفس البريد المستخدم عند التسجيل "
        )

    # الحصول على الفريق من خلال العضو
    team = db.query(Team).filter(Team.id == team_member.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")
    
    # الحصول على نسخة البرنامج
    version = get_active_program_version(db)
    
    # حساب رقم نسخة التقديم للفريق
    existing_submissions = db.query(ProjectSubmission).filter(
        ProjectSubmission.team_id == team.id,
        ProjectSubmission.program_version_id == version.id
    ).count()
    
    submission_version = existing_submissions + 1
    
    # التحقق من طول الوصف التقني
    if len(project_data.technical_description) < 1000:
        raise HTTPException(
            status_code=400,
            detail=f"الوصف التقني يجب أن يكون 1000 حرف على الأقل. الحالي: {len(project_data.technical_description)} حرف"
        )
    
    # إنشاء تقديم المشروع
    submission = ProjectSubmission(
        team_id=team.id,
        program_version_id=version.id,
        submission_version=submission_version,
        title=project_data.title,
        problem_statement=project_data.problem_statement,
        technical_description=project_data.technical_description,
        scientific_reference=project_data.scientific_reference,
        field=project_data.field.value,
        character_count=len(project_data.technical_description),
        is_complete=True
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.post("/submit-with-files", response_model=ProjectSubmissionResponse)
async def submit_project_with_files(
    member_email: str = Form(...),
    title: str = Form(...),
    problem_statement: str = Form(...),
    technical_description: str = Form(...),
    scientific_reference: str = Form(...),
    field: str = Form(...),
    image: Optional[UploadFile] = File(None),
    diagram: Optional[UploadFile] = File(None),
    design: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    تقديم مشروع مع ملفات مرفقة
    - يتم البحث عن الفريق باستخدام البريد الإلكتروني
    - صورة (اختياري) - نقاط إضافية
    - مخطط (اختياري) - نقاط إضافية
    - تصميم مبدئي (اختياري) - نقاط إضافية
    """
    # البحث عن عضو الفريق بالبريد الإلكتروني
    team_member = db.query(TeamMember).filter(
        TeamMember.email == member_email
    ).first()

    if not team_member:
        raise HTTPException(
            status_code=404,
            detail="البريد الإلكتروني غير مسجل. تأكد من استخدام نفس البريد المستخدم عند التسجيل "
        )

    # الحصول على الفريق
    team = db.query(Team).filter(Team.id == team_member.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")

    team_id = team.id
    
    # التحقق من طول الوصف
    if len(technical_description) < 1000:
        raise HTTPException(
            status_code=400,
            detail=f"الوصف التقني يجب أن يكون 1000 حرف على الأقل. الحالي: {len(technical_description)} حرف"
        )
    
    version = get_active_program_version(db)
    
    # حساب رقم نسخة التقديم
    existing = db.query(ProjectSubmission).filter(
        ProjectSubmission.team_id == team_id,
        ProjectSubmission.program_version_id == version.id
    ).count()
    
    submission_version = existing + 1
    
    # حفظ الملفات
    image_path = None
    diagram_path = None
    design_path = None
    has_attachments = False
    
    async def save_file(file: UploadFile, prefix: str) -> str:
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"{prefix}_{team_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        content = await file.read()
        with open(filepath, 'wb') as f:
            f.write(content)
        
        return filename
    
    if image:
        image_path = await save_file(image, "image")
        has_attachments = True
    
    if diagram:
        diagram_path = await save_file(diagram, "diagram")
        has_attachments = True
    
    if design:
        design_path = await save_file(design, "design")
        has_attachments = True
    
    # إنشاء التقديم
    submission = ProjectSubmission(
        team_id=team_id,
        program_version_id=version.id,
        submission_version=submission_version,
        title=title,
        problem_statement=problem_statement,
        technical_description=technical_description,
        scientific_reference=scientific_reference,
        field=field,
        image_path=image_path,
        diagram_path=diagram_path,
        design_path=design_path,
        has_attachments=has_attachments,
        character_count=len(technical_description),
        is_complete=True
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


# الأنواع المسموح بها للملفات
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'zip'}


def validate_file_extension(filename: str) -> bool:
    """التحقق من امتداد الملف"""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@router.post("/{project_id}/attachments", response_model=ProjectSubmissionResponse)
async def upload_attachments(
    project_id: int,
    image: Optional[UploadFile] = File(None),
    diagram: Optional[UploadFile] = File(None),
    design: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    رفع مرفقات لمشروع موجود
    - الأنواع المسموح بها: png, jpg, jpeg, pdf, zip
    - صورة المشروع (اختياري)
    - المخطط (اختياري)
    - التصميم المبدئي (اختياري)
    """
    # التحقق من وجود المشروع
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")

    # التحقق من امتدادات الملفات
    for file, name in [(image, "الصورة"), (diagram, "المخطط"), (design, "التصميم")]:
        if file and not validate_file_extension(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"{name}: نوع الملف غير مسموح. الأنواع المسموحة: png, jpg, jpeg, pdf, zip"
            )

    async def save_file(file: UploadFile, prefix: str) -> str:
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'png'
        filename = f"{prefix}_{project.team_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        content = await file.read()
        with open(filepath, 'wb') as f:
            f.write(content)

        return filename

    has_attachments = False

    if image:
        project.image_path = await save_file(image, "image")
        has_attachments = True

    if diagram:
        project.diagram_path = await save_file(diagram, "diagram")
        has_attachments = True

    if design:
        project.design_path = await save_file(design, "design")
        has_attachments = True

    if has_attachments:
        project.has_attachments = True
        db.commit()
        db.refresh(project)

    return project


@router.get("/", response_model=List[ProjectSubmissionResponse])
async def get_all_projects(
    skip: int = 0,
    limit: int = 100,
    field: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """الحصول على جميع المشاريع"""
    query = db.query(ProjectSubmission)
    
    if field:
        query = query.filter(ProjectSubmission.field == field)
    
    projects = query.order_by(
        ProjectSubmission.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return projects


@router.get("/team/{team_id}", response_model=List[ProjectSubmissionResponse])
async def get_team_projects(team_id: int, db: Session = Depends(get_db)):
    """الحصول على مشاريع فريق معين (جميع النسخ)"""
    projects = db.query(ProjectSubmission).filter(
        ProjectSubmission.team_id == team_id
    ).order_by(ProjectSubmission.submission_version.desc()).all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectWithTeamResponse)
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """الحصول على مشروع بالمعرف مع بيانات الفريق والتقييم"""
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    
    # حساب التقييمات
    evaluations = db.query(Evaluation).filter(
        Evaluation.project_id == project_id
    ).all()
    
    admin_score = 0
    ai_score = 0
    
    for eval in evaluations:
        if eval.is_ai_evaluation:
            ai_score = eval.score
        else:
            admin_score += eval.score
    
    total_score = (admin_score * 0.5) + (ai_score * 0.5) if evaluations else None
    
    response = ProjectWithTeamResponse(
        id=project.id,
        team_id=project.team_id,
        program_version_id=project.program_version_id,
        submission_version=project.submission_version,
        title=project.title,
        problem_statement=project.problem_statement,
        technical_description=project.technical_description,
        scientific_reference=project.scientific_reference,
        field=project.field,
        image_path=project.image_path,
        diagram_path=project.diagram_path,
        design_path=project.design_path,
        has_attachments=project.has_attachments,
        is_complete=project.is_complete,
        character_count=project.character_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
        team=project.team,
        total_score=total_score,
        admin_score=admin_score,
        ai_score=ai_score
    )
    
    return response


@router.get("/search/{team_name}")
async def search_by_team_name(team_name: str, db: Session = Depends(get_db)):
    """البحث عن مشاريع باسم الفريق"""
    teams = db.query(Team).filter(
        Team.team_name.ilike(f"%{team_name}%")
    ).all()
    
    team_ids = [t.id for t in teams]
    
    projects = db.query(ProjectSubmission).filter(
        ProjectSubmission.team_id.in_(team_ids)
    ).all()
    
    return projects


@router.get("/stats/summary")
async def get_projects_stats(db: Session = Depends(get_db)):
    """إحصائيات المشاريع"""
    version = get_active_program_version(db)

    total = db.query(ProjectSubmission).filter(
        ProjectSubmission.program_version_id == version.id
    ).count()

    with_attachments = db.query(ProjectSubmission).filter(
        ProjectSubmission.program_version_id == version.id,
        ProjectSubmission.has_attachments == True
    ).count()

    # توزيع حسب المجال
    field_distribution = db.query(
        ProjectSubmission.field,
        func.count(ProjectSubmission.id)
    ).filter(
        ProjectSubmission.program_version_id == version.id
    ).group_by(ProjectSubmission.field).all()

    return {
        "total_projects": total,
        "with_attachments": with_attachments,
        "without_attachments": total - with_attachments,
        "field_distribution": {
            field: count for field, count in field_distribution
        }
    }


# ==================== تصدير PDF ====================

@router.get("/{project_id}/pdf")
async def export_project_pdf(project_id: int, db: Session = Depends(get_db)):
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

    admin_score = sum(e.score for e in evaluations if not e.is_ai_evaluation)
    ai_score = sum(e.score for e in evaluations if e.is_ai_evaluation)
    total_score = (admin_score * 0.5) + (ai_score * 0.5) if evaluations else None

    project_data = {
        "title": project.title,
        "team_name": project.team.team_name if project.team else "غير محدد",
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


# ==================== خدمة الملفات المرفقة ====================

@router.get("/attachment/{filename}")
async def get_attachment(filename: str):
    """الحصول على ملف مرفق"""
    filepath = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    # تحديد نوع الملف
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    media_types = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'pdf': 'application/pdf',
        'zip': 'application/zip'
    }
    media_type = media_types.get(ext, 'application/octet-stream')

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename
    )


@router.get("/{project_id}/attachments")
async def get_project_attachments(project_id: int, db: Session = Depends(get_db)):
    """الحصول على قائمة المرفقات لمشروع"""
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")

    attachments = []

    if project.image_path:
        attachments.append({
            "type": "image",
            "label": "صورة المشروع",
            "filename": project.image_path,
            "url": f"/api/projects/attachment/{project.image_path}"
        })

    if project.diagram_path:
        attachments.append({
            "type": "diagram",
            "label": "المخطط",
            "filename": project.diagram_path,
            "url": f"/api/projects/attachment/{project.diagram_path}"
        })

    if project.design_path:
        attachments.append({
            "type": "design",
            "label": "التصميم المبدئي",
            "filename": project.design_path,
            "url": f"/api/projects/attachment/{project.design_path}"
        })

    return {
        "project_id": project_id,
        "has_attachments": project.has_attachments,
        "attachments": attachments
    }
    