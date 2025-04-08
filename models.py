from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    nom = Column(String)
    prenom = Column(String)
    departement = Column(String)
    poste = Column(String)
    role = Column(String, default="user") 

    reports = relationship("ReportFile", back_populates="user", cascade="all, delete-orphan")
    skills = relationship("CollaboratorSkill", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="projects")
    collaborateurs = relationship("Collaborateur", back_populates="project", cascade="all, delete-orphan")

class Collaborateur(Base):
    __tablename__ = "collaborateurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    grade = Column(String, nullable=False)
    respect_delais = Column(Float, nullable=False)
    participation = Column(Float, nullable=False)
    resolution_problemes = Column(Float, nullable=False)
    note_finale = Column(Float, nullable=False)

    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="collaborateurs")

class CollaboratorSkill(Base):
    __tablename__ = "collaborator_skills"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    business_unit = Column(String(255), nullable=False)
    skill_parent_category = Column(String(255), nullable=True)
    skill_category = Column(String(255), nullable=False)
    skill = Column(String(255), nullable=False)
    grade_value = Column(Float, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    date_uploaded = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skills")


class ReportFile(Base):
    __tablename__ = "report_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    upload_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    kpis = relationship("KPI", back_populates="report", cascade="all, delete-orphan")

class KPI(Base):
    __tablename__ = "kpis"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("report_files.id"))
    department = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))  # ✅ Ajout de l'ID de l'utilisateur
    date_created = Column(DateTime, default=datetime.utcnow)  # ✅ Date de création

    report = relationship("ReportFile", back_populates="kpis")

class PendingTimesheet(Base):
    __tablename__ = "pending_timesheets"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    report_id = Column(Integer, ForeignKey("report_files.id"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    date_uploaded = Column(DateTime, default=datetime.utcnow)

    report = relationship("ReportFile")
    user = relationship("User")
