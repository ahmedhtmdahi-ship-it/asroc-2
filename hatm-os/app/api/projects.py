from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import current_user
from app.api.schemas import ProjectIn, SessionIn, TraineeIn
from app.core.errors import NotFound
from app.core.timeutil import to_utc_naive
from app.db import get_db
from app.models.project import Project
from app.models.session import Session as Sess
from app.models.trainee import Trainee

router = APIRouter(dependencies=[Depends(current_user)])


def _project(p: Project) -> dict:
    return {"id": p.id, "name": p.name, "status": p.status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "attendance_rules": p.attendance_rules, "attendance_sheet_id": p.attendance_sheet_id,
            "attendance_sheet_tab": p.attendance_sheet_tab,
            "feedback_form_url": p.feedback_form_url}


@router.get("/projects")
def list_projects(db: DBSession = Depends(get_db)):
    return {"projects": [_project(p) for p in db.query(Project).order_by(Project.id).all()]}


@router.post("/projects", status_code=201)
def create_project(body: ProjectIn, db: DBSession = Depends(get_db)):
    p = Project(name=body.name, start_date=body.start_date.date() if body.start_date else None,
                attendance_rules=body.attendance_rules,
                attendance_sheet_id=body.attendance_sheet_id,
                attendance_sheet_tab=body.attendance_sheet_tab,
                feedback_form_url=body.feedback_form_url)
    db.add(p)
    db.commit()
    return _project(p)


@router.get("/projects/{project_id}/trainees")
def list_trainees(project_id: int, db: DBSession = Depends(get_db)):
    rows = db.query(Trainee).filter_by(project_id=project_id).order_by(Trainee.name_ar).all()
    return {"trainees": [{"id": t.id, "name_ar": t.name_ar, "name_en": t.name_en,
                          "email": t.email, "phone": t.phone, "zoom_aliases": t.zoom_aliases,
                          "status": t.status} for t in rows]}


@router.post("/trainees", status_code=201)
def create_trainee(body: TraineeIn, db: DBSession = Depends(get_db)):
    if not db.get(Project, body.project_id):
        raise NotFound("البرنامج مش موجود")
    t = Trainee(**body.model_dump())
    db.add(t)
    db.commit()
    return {"id": t.id, "name_ar": t.name_ar}


@router.post("/sessions", status_code=201)
def create_session(body: SessionIn, db: DBSession = Depends(get_db)):
    if not db.get(Project, body.project_id):
        raise NotFound("البرنامج مش موجود")
    s = Sess(project_id=body.project_id, title=body.title,
             planned_start=to_utc_naive(body.planned_start),
             planned_end=to_utc_naive(body.planned_end),
             zoom_meeting_id=body.zoom_meeting_id, zoom_meeting_uuid=body.zoom_meeting_uuid)
    db.add(s)
    db.commit()
    return {"id": s.id, "title": s.title, "status": s.status}
