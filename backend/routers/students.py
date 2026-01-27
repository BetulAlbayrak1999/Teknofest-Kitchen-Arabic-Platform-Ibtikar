"""
مسارات تسجيل الطلاب (الفرق والأفراد)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import Team, TeamMember, Individual, ProgramVersion, RegistrationType
from schemas import (
    TeamCreate, TeamResponse,
    IndividualCreate, IndividualResponse,
    ProjectFieldEnum, RegistrationTypeEnum,
    AssignIndividualsToTeam
)

router = APIRouter(prefix="/api/students", tags=["المشاركون"])


def get_active_program_version(db: Session):
    """الحصول على نسخة البرنامج النشطة"""
    version = db.query(ProgramVersion).filter(ProgramVersion.is_active == True).first()
    if not version:
        # إنشاء نسخة افتراضية إذا لم توجد
        version = ProgramVersion(
            version_number=1,
            version_name="النسخة الأولى",
            is_active=True
        )
        db.add(version)
        db.commit()
        db.refresh(version)
    return version


# ==================== تسجيل الفرق ====================

@router.post("/team", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def register_team(team_data: TeamCreate, db: Session = Depends(get_db)):
    """
    تسجيل فريق جديد
    - سيناريو 1: فريق لديه فكرة مشروع
    - سيناريو 4: فريق بدون فكرة مشروع
    """
    # التحقق من نوع التسجيل
    if team_data.registration_type not in [
        RegistrationTypeEnum.TEAM_WITH_IDEA, 
        RegistrationTypeEnum.TEAM_NO_IDEA
    ]:
        raise HTTPException(
            status_code=400,
            detail="نوع التسجيل غير صحيح للفريق"
        )
    
    # الحصول على نسخة البرنامج
    version = get_active_program_version(db)
    
    # التحقق من عدم تكرار اسم الفريق
    existing = db.query(Team).filter(
        Team.team_name == team_data.team_name,
        Team.program_version_id == version.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="اسم الفريق موجود مسبقاً"
        )
    
    # إنشاء الفريق
    team = Team(
        team_name=team_data.team_name,
        registration_type=RegistrationType(team_data.registration_type.value),
        field=team_data.field.value,
        initial_idea=team_data.initial_idea,
        program_version_id=version.id
    )
    
    db.add(team)
    db.commit()
    db.refresh(team)
    
    # إضافة الأعضاء
    for member_data in team_data.members:
        member = TeamMember(
            team_id=team.id,
            full_name=member_data.full_name,
            email=member_data.email,
            phone=member_data.phone,
            is_leader=member_data.is_leader
        )
        db.add(member)
    
    db.commit()
    db.refresh(team)
    
    return team


@router.get("/teams", response_model=List[TeamResponse])
async def get_all_teams(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """الحصول على جميع الفرق"""
    teams = db.query(Team).filter(
        Team.is_active == True
    ).offset(skip).limit(limit).all()
    return teams


@router.get("/team/{team_id}", response_model=TeamResponse)
async def get_team(team_id: int, db: Session = Depends(get_db)):
    """الحصول على فريق بالمعرف"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")
    return team


# ==================== تسجيل الأفراد ====================

@router.post("/individual", response_model=IndividualResponse, status_code=status.HTTP_201_CREATED)
async def register_individual(
    individual_data: IndividualCreate, 
    db: Session = Depends(get_db)
):
    """
    تسجيل فرد جديد
    - سيناريو 2: فرد لديه فكرة مشروع
    - سيناريو 3: فرد بدون فكرة مشروع
    """
    # التحقق من نوع التسجيل
    if individual_data.registration_type not in [
        RegistrationTypeEnum.INDIVIDUAL_WITH_IDEA,
        RegistrationTypeEnum.INDIVIDUAL_NO_IDEA
    ]:
        raise HTTPException(
            status_code=400,
            detail="نوع التسجيل غير صحيح للفرد"
        )
    
    # الحصول على نسخة البرنامج
    version = get_active_program_version(db)
    
    # التحقق من عدم تكرار البريد الإلكتروني
    existing = db.query(Individual).filter(
        Individual.email == individual_data.email,
        Individual.program_version_id == version.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="البريد الإلكتروني مسجل مسبقاً"
        )
    
    # إنشاء الفرد
    individual = Individual(
        registration_type=RegistrationType(individual_data.registration_type.value),
        full_name=individual_data.full_name,
        email=individual_data.email,
        phone=individual_data.phone,
        technical_skills=individual_data.technical_skills,
        interests=individual_data.interests,
        experience_level=individual_data.experience_level,
        preferred_field=individual_data.preferred_field.value,
        project_idea=individual_data.project_idea,
        program_version_id=version.id
    )
    
    db.add(individual)
    db.commit()
    db.refresh(individual)
    
    return individual


@router.get("/individuals", response_model=List[IndividualResponse])
async def get_all_individuals(
    skip: int = 0,
    limit: int = 100,
    unassigned_only: bool = False,
    db: Session = Depends(get_db)
):
    """الحصول على جميع الأفراد"""
    query = db.query(Individual)
    
    if unassigned_only:
        query = query.filter(Individual.is_assigned == False)
    
    individuals = query.offset(skip).limit(limit).all()
    return individuals


@router.get("/individual/{individual_id}", response_model=IndividualResponse)
async def get_individual(individual_id: int, db: Session = Depends(get_db)):
    """الحصول على فرد بالمعرف"""
    individual = db.query(Individual).filter(Individual.id == individual_id).first()
    if not individual:
        raise HTTPException(status_code=404, detail="الفرد غير موجود")
    return individual


# ==================== الإحصائيات ====================

@router.get("/stats")
async def get_registration_stats(db: Session = Depends(get_db)):
    """إحصائيات التسجيل"""
    version = get_active_program_version(db)
    
    # إحصائيات الفرق
    teams_with_idea = db.query(Team).filter(
        Team.registration_type == RegistrationType.TEAM_WITH_IDEA,
        Team.program_version_id == version.id
    ).count()
    
    teams_no_idea = db.query(Team).filter(
        Team.registration_type == RegistrationType.TEAM_NO_IDEA,
        Team.program_version_id == version.id
    ).count()
    
    # إحصائيات الأفراد
    individuals_with_idea = db.query(Individual).filter(
        Individual.registration_type == RegistrationType.INDIVIDUAL_WITH_IDEA,
        Individual.program_version_id == version.id
    ).count()
    
    individuals_no_idea = db.query(Individual).filter(
        Individual.registration_type == RegistrationType.INDIVIDUAL_NO_IDEA,
        Individual.program_version_id == version.id
    ).count()
    
    # الأفراد غير المفرزين
    unassigned = db.query(Individual).filter(
        Individual.is_assigned == False,
        Individual.program_version_id == version.id
    ).count()
    
    # إجمالي الأعضاء
    total_team_members = db.query(TeamMember).join(Team).filter(
        Team.program_version_id == version.id
    ).count()
    
    return {
        "program_version": version.version_name,
        "teams": {
            "with_idea": teams_with_idea,
            "no_idea": teams_no_idea,
            "total": teams_with_idea + teams_no_idea
        },
        "individuals": {
            "with_idea": individuals_with_idea,
            "no_idea": individuals_no_idea,
            "total": individuals_with_idea + individuals_no_idea,
            "unassigned": unassigned
        },
        "total_participants": total_team_members + individuals_with_idea + individuals_no_idea
    }


# ==================== المجالات المتاحة ====================

@router.get("/fields")
async def get_available_fields():
    """الحصول على المجالات المتاحة"""
    return [
        {"value": field.value, "label": field.value}
        for field in ProjectFieldEnum
    ]


# ==================== الفرق المتاحة للإضافة ====================

@router.get("/teams-with-space")
async def get_teams_with_space(db: Session = Depends(get_db)):
    """الحصول على الفرق التي لديها مساحة لأعضاء إضافيين (أقل من 6 أعضاء)"""
    version = get_active_program_version(db)

    # الحصول على الفرق مع عدد أعضائها
    teams = db.query(Team).filter(
        Team.is_active == True,
        Team.program_version_id == version.id
    ).all()

    teams_with_space = []
    for team in teams:
        member_count = len(team.members)
        if member_count < 6:
            teams_with_space.append({
                "id": team.id,
                "team_name": team.team_name,
                "field": team.field,
                "member_count": member_count,
                "available_slots": 6 - member_count,
                "members": [
                    {
                        "id": m.id,
                        "full_name": m.full_name,
                        "email": m.email,
                        "is_leader": m.is_leader
                    }
                    for m in team.members
                ]
            })

    return teams_with_space


@router.post("/assign-individuals")
async def assign_individuals_to_team(
    assignment: AssignIndividualsToTeam,
    db: Session = Depends(get_db)
):
    """فرز أفراد إلى فريق جديد"""
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
    version = get_active_program_version(db)

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
            is_leader=(i == 0)
        )
        db.add(member)

        # تحديث حالة الفرد
        ind.is_assigned = True
        ind.assigned_team_id = team.id

    db.commit()
    db.refresh(team)

    return team


@router.post("/add-to-team/{team_id}")
async def add_individuals_to_existing_team(
    team_id: int,
    individual_ids: List[int] = Body(..., embed=False),
    db: Session = Depends(get_db)
):
    """إضافة أفراد إلى فريق موجود"""
    # التحقق من وجود الفريق
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")

    # التحقق من عدد الأعضاء الحالي
    current_members = len(team.members)
    if current_members >= 6:
        raise HTTPException(
            status_code=400,
            detail="الفريق ممتلئ (6 أعضاء)"
        )

    # التحقق من عدم تجاوز الحد الأقصى
    if current_members + len(individual_ids) > 6:
        raise HTTPException(
            status_code=400,
            detail=f"لا يمكن إضافة {len(individual_ids)} أفراد. المتاح: {6 - current_members} فقط"
        )

    # التحقق من وجود الأفراد
    individuals = db.query(Individual).filter(
        Individual.id.in_(individual_ids),
        Individual.is_assigned == False
    ).all()

    if len(individuals) != len(individual_ids):
        raise HTTPException(
            status_code=400,
            detail="بعض الأفراد غير موجودين أو تم فرزهم مسبقاً"
        )

    # إضافة الأعضاء
    for ind in individuals:
        member = TeamMember(
            team_id=team.id,
            full_name=ind.full_name,
            email=ind.email,
            phone=ind.phone,
            is_leader=False
        )
        db.add(member)

        # تحديث حالة الفرد
        ind.is_assigned = True
        ind.assigned_team_id = team.id

    db.commit()
    db.refresh(team)

    return {
        "message": f"تم إضافة {len(individuals)} أفراد إلى الفريق بنجاح",
        "team_id": team.id,
        "team_name": team.team_name,
        "total_members": len(team.members)
    }
    