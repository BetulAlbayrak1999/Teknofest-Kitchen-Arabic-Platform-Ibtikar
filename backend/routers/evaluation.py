"""
مسارات التقييم - تقييم الإداريين وتقييم AI
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import Evaluation, ProjectSubmission, Admin, Team
from schemas import (
    EvaluationCreate, EvaluationResponse, AIEvaluationRequest,
    TopTeamResponse
)
from services.auth_service import get_current_admin
from services.ai_evaluation import ai_evaluation_service

router = APIRouter(prefix="/api/evaluation", tags=["التقييم"])


# ==================== تقييم الإداريين ====================

@router.post("/admin", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_evaluation(
    evaluation_data: EvaluationCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    إنشاء تقييم من إداري
    - النقاط من 0 إلى 50
    - يمكن إضافة ملاحظات
    """
    # التحقق من وجود المشروع
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == evaluation_data.project_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    
    # التحقق من عدم وجود تقييم سابق من نفس الإداري
    existing = db.query(Evaluation).filter(
        Evaluation.project_id == evaluation_data.project_id,
        Evaluation.admin_id == current_admin["admin_id"],
        Evaluation.is_ai_evaluation == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="لقد قمت بتقييم هذا المشروع مسبقاً"
        )
    
    # التحقق من النقاط
    if evaluation_data.score < 0 or evaluation_data.score > 50:
        raise HTTPException(
            status_code=400,
            detail="النقاط يجب أن تكون بين 0 و 50"
        )
    
    # إنشاء التقييم
    evaluation = Evaluation(
        project_id=evaluation_data.project_id,
        admin_id=current_admin["admin_id"],
        is_ai_evaluation=False,
        score=evaluation_data.score,
        notes=evaluation_data.notes,
        detailed_scores=evaluation_data.detailed_scores
    )
    
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    
    return evaluation


@router.put("/admin/{evaluation_id}", response_model=EvaluationResponse)
async def update_admin_evaluation(
    evaluation_id: int,
    evaluation_data: EvaluationCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """تحديث تقييم إداري"""
    evaluation = db.query(Evaluation).filter(
        Evaluation.id == evaluation_id,
        Evaluation.admin_id == current_admin["admin_id"],
        Evaluation.is_ai_evaluation == False
    ).first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="التقييم غير موجود أو ليس لديك صلاحية التعديل")

    evaluation.score = evaluation_data.score
    evaluation.notes = evaluation_data.notes
    evaluation.detailed_scores = evaluation_data.detailed_scores

    db.commit()
    db.refresh(evaluation)

    return evaluation


# ==================== تميز المشاريع (للظهور في صفحة أفضل الفرق) ====================

@router.post("/feature/{project_id}")
async def toggle_project_featured(
    project_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    تبديل حالة تميز المشروع (إظهار/إخفاء في صفحة أفضل الفرق)
    - يمكن لأي إداري تميز المشروع
    """
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")

    # تبديل حالة التميز
    project.is_featured = not project.is_featured
    db.commit()
    db.refresh(project)

    status_text = "تم إضافة المشروع لصفحة أفضل الفرق" if project.is_featured else "تم إزالة المشروع من صفحة أفضل الفرق"

    return {
        "project_id": project_id,
        "is_featured": project.is_featured,
        "message": status_text
    }


@router.get("/featured-projects")
async def get_featured_projects(
    db: Session = Depends(get_db)
):
    """الحصول على قائمة المشاريع المميزة"""
    projects = db.query(ProjectSubmission).filter(
        ProjectSubmission.is_featured == True
    ).all()

    return [
        {
            "id": p.id,
            "title": p.title,
            "team_name": p.team.team_name,
            "field": p.field,
            "is_featured": p.is_featured
        }
        for p in projects
    ]


# ==================== تقييم AI ====================

@router.post("/ai", response_model=EvaluationResponse)
async def create_ai_evaluation(
    request: AIEvaluationRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    طلب تقييم AI لمشروع
    - يستخدم OpenAI API لتقييم المشروع
    - النقاط من 0 إلى 50
    """
    # التحقق من وجود المشروع
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == request.project_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    
    # التحقق من عدم وجود تقييم AI سابق
    existing = db.query(Evaluation).filter(
        Evaluation.project_id == request.project_id,
        Evaluation.is_ai_evaluation == True
    ).first()
    
    if existing:
        # تحديث التقييم الموجود
        result = await ai_evaluation_service.evaluate_project(
            title=project.title,
            problem_statement=project.problem_statement,
            technical_description=project.technical_description,
            scientific_reference=project.scientific_reference,
            field=project.field
        )
        
        existing.score = result["score"]
        existing.notes = result["notes"]
        existing.detailed_scores = result["detailed_scores"]
        
        db.commit()
        db.refresh(existing)
        
        return existing
    
    # تقييم المشروع
    result = await ai_evaluation_service.evaluate_project(
        title=project.title,
        problem_statement=project.problem_statement,
        technical_description=project.technical_description,
        scientific_reference=project.scientific_reference,
        field=project.field
    )
    
    # إنشاء تقييم AI
    evaluation = Evaluation(
        project_id=request.project_id,
        admin_id=None,
        is_ai_evaluation=True,
        score=result["score"],
        notes=result["notes"],
        detailed_scores=result["detailed_scores"]
    )
    
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    
    return evaluation


@router.post("/ai/bulk")
async def create_bulk_ai_evaluations(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """تقييم AI لجميع المشاريع غير المُقيّمة"""
    # جلب المشاريع التي ليس لها تقييم AI
    projects_without_ai = db.query(ProjectSubmission).filter(
        ~ProjectSubmission.id.in_(
            db.query(Evaluation.project_id).filter(
                Evaluation.is_ai_evaluation == True
            )
        )
    ).all()
    
    results = []
    for project in projects_without_ai:
        try:
            result = await ai_evaluation_service.evaluate_project(
                title=project.title,
                problem_statement=project.problem_statement,
                technical_description=project.technical_description,
                scientific_reference=project.scientific_reference,
                field=project.field
            )
            
            evaluation = Evaluation(
                project_id=project.id,
                admin_id=None,
                is_ai_evaluation=True,
                score=result["score"],
                notes=result["notes"],
                detailed_scores=result["detailed_scores"]
            )
            
            db.add(evaluation)
            results.append({
                "project_id": project.id,
                "status": "success",
                "score": result["score"]
            })
        except Exception as e:
            results.append({
                "project_id": project.id,
                "status": "error",
                "message": str(e)
            })
    
    db.commit()
    
    return {
        "total": len(projects_without_ai),
        "evaluated": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "error"]),
        "results": results
    }


# ==================== الحصول على التقييمات ====================

@router.get("/project/{project_id}", response_model=List[EvaluationResponse])
async def get_project_evaluations(
    project_id: int,
    db: Session = Depends(get_db)
):
    """الحصول على جميع تقييمات مشروع"""
    evaluations = db.query(Evaluation).filter(
        Evaluation.project_id == project_id
    ).all()
    
    return evaluations


@router.get("/project/{project_id}/score")
async def get_project_final_score(
    project_id: int,
    db: Session = Depends(get_db)
):
    """حساب النتيجة النهائية لمشروع"""
    project = db.query(ProjectSubmission).filter(
        ProjectSubmission.id == project_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    
    # جلب التقييمات
    evaluations = db.query(Evaluation).filter(
        Evaluation.project_id == project_id
    ).all()
    
    # تقييم AI
    ai_evaluation = next((e for e in evaluations if e.is_ai_evaluation), None)
    ai_score = ai_evaluation.score if ai_evaluation else 0
    
    # تقييمات الإداريين
    admin_evaluations = [e for e in evaluations if not e.is_ai_evaluation]
    
    # حساب متوسط تقييم الإداريين مع الأوزان
    if admin_evaluations:
        admin_scores_weighted = []
        for eval in admin_evaluations:
            admin = db.query(Admin).filter(Admin.id == eval.admin_id).first()
            weight = admin.evaluation_weight if admin else 10
            admin_scores_weighted.append({
                "score": eval.score,
                "weight": weight
            })
        
        total_weight = sum(a["weight"] for a in admin_scores_weighted)
        weighted_admin_score = sum(
            a["score"] * a["weight"] for a in admin_scores_weighted
        ) / total_weight if total_weight > 0 else 0
    else:
        weighted_admin_score = 0
    
    # النتيجة النهائية: 75% إداريين + 25% AI
    final_score = (weighted_admin_score * 0.75) + (ai_score * 0.25)
    
    return {
        "project_id": project_id,
        "project_title": project.title,
        "admin_score": round(weighted_admin_score, 2),
        "ai_score": ai_score,
        "final_score": round(final_score, 2),
        "admin_evaluations_count": len(admin_evaluations),
        "has_ai_evaluation": ai_evaluation is not None
    }


# ==================== أفضل 5 فرق ====================

@router.get("/top-teams", response_model=List[TopTeamResponse])
async def get_top_teams(
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    الحصول على أفضل الفرق
    - يعرض فقط الفرق المميزة من قبل الإداريين
    - مرتبة بناءً على التقييم النهائي
    """
    # جلب المشاريع المميزة فقط
    projects = db.query(ProjectSubmission).filter(
        ProjectSubmission.is_featured == True
    ).all()
    
    scored_projects = []
    
    for project in projects:
        evaluations = db.query(Evaluation).filter(
            Evaluation.project_id == project.id
        ).all()
        
        # تقييم AI
        ai_eval = next((e for e in evaluations if e.is_ai_evaluation), None)
        ai_score = ai_eval.score if ai_eval else 0
        
        # تقييمات الإداريين
        admin_evals = [e for e in evaluations if not e.is_ai_evaluation]
        
        if admin_evals:
            admin_scores_weighted = []
            for eval in admin_evals:
                admin = db.query(Admin).filter(Admin.id == eval.admin_id).first()
                weight = admin.evaluation_weight if admin else 10
                admin_scores_weighted.append({
                    "score": eval.score,
                    "weight": weight
                })
            
            total_weight = sum(a["weight"] for a in admin_scores_weighted)
            weighted_admin_score = sum(
                a["score"] * a["weight"] for a in admin_scores_weighted
            ) / total_weight if total_weight > 0 else 0
        else:
            weighted_admin_score = 0
        
        final_score = (weighted_admin_score * 0.75) + (ai_score * 0.25)
        
        scored_projects.append({
            "project": project,
            "admin_score": weighted_admin_score,
            "ai_score": ai_score,
            "final_score": final_score
        })
    
    # ترتيب حسب النتيجة النهائية
    scored_projects.sort(key=lambda x: x["final_score"], reverse=True)
    
    # أخذ أفضل N
    top_projects = scored_projects[:limit]
    
    result = []
    for rank, item in enumerate(top_projects, 1):
        project = item["project"]
        team = project.team
        
        result.append(TopTeamResponse(
            rank=rank,
            project_title=project.title,
            project_description=project.problem_statement[:200] + "..." if len(project.problem_statement) > 200 else project.problem_statement,
            field=project.field,
            team_name=team.team_name,
            team_members=[m.full_name for m in team.members],
            total_score=round(item["final_score"], 2),
            admin_score=round(item["admin_score"], 2),
            ai_score=item["ai_score"]
        ))
    
    return result


# ==================== إحصائيات التقييم ====================

@router.get("/stats")
async def get_evaluation_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """إحصائيات التقييم"""
    total_projects = db.query(ProjectSubmission).count()
    
    # مشاريع لها تقييم AI
    projects_with_ai = db.query(Evaluation).filter(
        Evaluation.is_ai_evaluation == True
    ).distinct(Evaluation.project_id).count()
    
    # مشاريع لها تقييم إداري
    projects_with_admin = db.query(Evaluation).filter(
        Evaluation.is_ai_evaluation == False
    ).distinct(Evaluation.project_id).count()
    
    # إجمالي التقييمات
    total_evaluations = db.query(Evaluation).count()
    ai_evaluations = db.query(Evaluation).filter(
        Evaluation.is_ai_evaluation == True
    ).count()
    admin_evaluations = total_evaluations - ai_evaluations
    
    # متوسط النقاط
    avg_ai_score = db.query(func.avg(Evaluation.score)).filter(
        Evaluation.is_ai_evaluation == True
    ).scalar() or 0
    
    avg_admin_score = db.query(func.avg(Evaluation.score)).filter(
        Evaluation.is_ai_evaluation == False
    ).scalar() or 0
    
    return {
        "total_projects": total_projects,
        "projects_with_ai_evaluation": projects_with_ai,
        "projects_with_admin_evaluation": projects_with_admin,
        "projects_without_evaluation": total_projects - max(projects_with_ai, projects_with_admin),
        "total_evaluations": total_evaluations,
        "ai_evaluations": ai_evaluations,
        "admin_evaluations": admin_evaluations,
        "average_ai_score": round(avg_ai_score, 2),
        "average_admin_score": round(avg_admin_score, 2)
    }
    