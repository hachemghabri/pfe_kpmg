from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from database import get_db
from models import User, ReportFile, KPI, CollaboratorSkill,PendingTimesheet, Project, Collaborateur
from pydantic import BaseModel
import os
import pandas as pd
import re
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from typing import List


app = FastAPI()



# CORS Middleware (Allow React Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Upload folder
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class UserCreate(BaseModel):
    email: str
    password: str
    nom: str
    prenom: str
    departement: str
    poste: str

class UserLogin(BaseModel):
    email: str
    password: str


@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    password_regex = r"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$"

    if not user.email.endswith("@kpmg.com"):
        raise HTTPException(status_code=400, detail="L'email doit être sous la forme 'exemple@kpmg.com'.")
    
    if not re.match(password_regex, user.password):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole.")

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        email=user.email,
        password=hashed_password,
        nom=user.nom,
        prenom=user.prenom,
        departement=user.departement,
        poste=user.poste
    )
    db.add(db_user)
    db.commit()
    
    return {"message": "Inscription réussie!"}


@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not pwd_context.verify(user.password, db_user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")

    return {
        "message": "Connexion réussie!",
        "user": {
            "nom": db_user.nom,
            "prenom": db_user.prenom,
            "email": db_user.email,
            "departement": db_user.departement,
            "poste": db_user.poste,
            "role": db_user.role  # ✅ Now returning role
        }
    }
@app.get("/admin/users")
def get_all_users(user_email: str, db: Session = Depends(get_db)):
    admin_user = db.query(User).filter(User.email == user_email, User.role == "admin").first()
    
    if not admin_user:
        raise HTTPException(status_code=403, detail="Accès refusé. Admin requis.")

    users = db.query(User).all()

    return [{
        "id": u.id, 
        "email": u.email, 
        "nom": u.nom, 
        "prenom": u.prenom, 
        "poste": u.poste,
        "departement": u.departement  # Added department field
    } for u in users]


@app.delete("/admin/delete_user")
def delete_user(admin_email: str, user_email: str, db: Session = Depends(get_db)):
    admin_user = db.query(User).filter(User.email == admin_email, User.role == "admin").first()
    
    if not admin_user:
        raise HTTPException(status_code=403, detail="Accès refusé. Admin requis.")

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    db.delete(user)
    db.commit()
    
    return {"message": f"Utilisateur {user_email} supprimé avec succès."}

@app.post("/admin/create_user")
def create_user(user: UserCreate, admin_email: str, db: Session = Depends(get_db)):
    admin_user = db.query(User).filter(User.email == admin_email, User.role == "admin").first()
    
    if not admin_user:
        raise HTTPException(status_code=403, detail="Accès refusé. Admin requis.")

    password_regex = r"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$"

    if not user.email.endswith("@kpmg.com"):
        raise HTTPException(status_code=400, detail="L'email doit être sous la forme 'exemple@kpmg.com'.")
    
    if not re.match(password_regex, user.password):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole.")

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        email=user.email,
        password=hashed_password,
        nom=user.nom,
        prenom=user.prenom,
        departement=user.departement,
        poste=user.poste
    )
    db.add(db_user)
    db.commit()
    
    return {"message": f"Utilisateur {user.email} créé avec succès!"}


@app.post("/admin/reset_password")
def reset_password(admin_email: str, user_email: str, new_password: str, db: Session = Depends(get_db)):
    admin_user = db.query(User).filter(User.email == admin_email, User.role == "admin").first()
    
    if not admin_user:
        raise HTTPException(status_code=403, detail="Accès refusé. Admin requis.")

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    hashed_password = pwd_context.hash(new_password)
    user.password = hashed_password
    db.commit()

    return {"message": f"Mot de passe de {user_email} réinitialisé avec succès."}

@app.get("/admin/user_insights")
def get_user_insights(admin_email: str, db: Session = Depends(get_db)):
    # Verify if the user is an admin
    admin_user = db.query(User).filter(User.email == admin_email, User.role == "admin").first()
    if not admin_user:
        raise HTTPException(status_code=403, detail="Accès refusé. Admin requis.")

    # Get total users
    total_users = db.query(User).count()

    # Get users by department
    department_counts = (
        db.query(User.departement, func.count(User.id))
        .group_by(User.departement)
        .all()
    )
    department_distribution = {dept: count for dept, count in department_counts}

    # Get users by job position
    position_counts = (
        db.query(User.poste, func.count(User.id))
        .group_by(User.poste)
        .all()
    )
    position_distribution = {poste: count for poste, count in position_counts}

    return {
        "total_users": total_users,
        "department_distribution": department_distribution,
        "position_distribution": position_distribution
    }



@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    report_type: str = Form(...),
    user_email: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    new_report = ReportFile(
        filename=file.filename,
        report_type=report_type,
        uploaded_by=user.id,
        upload_date=datetime.utcnow()
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    df = pd.read_excel(file_path)

    if report_type == "Rapport de Timesheet":
        # Clean existing pending timesheets for this user and department
        db.query(PendingTimesheet).filter(
            PendingTimesheet.uploaded_by == user.id,
            PendingTimesheet.department == user.departement
        ).delete()

        # Filter collaborators with status "To be completed"
        pending_timesheets = df[df["Timesheet Status"] == "To be completed"]
        pending_timesheets["Business Unit"] = pending_timesheets["Business Unit"].fillna("")

        for _, row in pending_timesheets.iterrows():
            pending_entry = PendingTimesheet(
                first_name=row["First Name"],
                last_name=row["Last Name"],
                email=row["Email"],
                department=row["Business Unit"],
                report_id=new_report.id,
                uploaded_by=user.id,
                date_uploaded=datetime.utcnow()
            )
            db.add(pending_entry)
        
        # Calculate approval rate
        total_users = len(pending_timesheets)
        approved_users = df["Approved by"].notnull().sum()
        approval_rate = (approved_users / total_users) * 100 if total_users > 0 else 0.0

        kpi_approval = KPI(
            report_id=new_report.id,
            department=user.departement,
            metric_name="Taux d'approbation (%)",
            metric_value=float(round(approval_rate, 2)),
            uploaded_by=user.id,
            date_created=datetime.utcnow()
        )
        db.add(kpi_approval)
        db.commit()

    # Existing KPI extraction logic here (for other report types)
    if report_type != "Rapport de Timesheet":
        # Your existing extract_kpis logic here
        df["Business Unit"] = df["Business Unit"].str.strip().str.lower()
        user_department = user.departement.strip().lower()
        df_filtered = df[df["Business Unit"] == user_department]

        if df_filtered.empty:
            raise HTTPException(status_code=400, detail="Aucune donnée trouvée pour votre département.")

        kpis = extract_kpis(df_filtered, report_type)

    for metric_name, metric_value in kpis.items():
        if metric_value != 0.0: 
            kpi_entry = KPI(
                report_id=new_report.id,
                department=user.departement,
                metric_name=metric_name,
                metric_value=metric_value,
                uploaded_by=user.id,
                date_created=datetime.utcnow()
            )
            db.add(kpi_entry)
    db.commit()

    return {"message": "Fichier téléchargé et traité avec succès."}



def extract_kpis(df, report_type):
    kpis = {}

    if report_type == "Rapport de Finance":
        # ✅ Marge réelle moyenne
        kpis["Marge Réelle (%)"] = (
            float(df["Margin real"].mean())
            if "Margin real" in df.columns and not pd.isna(df["Margin real"].mean())
            else 0.0
        )

        # ✅ Rentabilité par projet (Profitability by Project)
        if all(col in df.columns for col in ["Project ID", "Margin real", "Cost real"]):
            df["Rentabilité (%)"] = (df["Margin real"] / df["Cost real"]) * 100
            df_rentabilite = df.groupby("Project ID")["Rentabilité (%)"].mean().reset_index()

            for _, row in df_rentabilite.iterrows():
                rentabilite_value = row["Rentabilité (%)"]
                if not pd.isna(rentabilite_value) and rentabilite_value != 0.0:
                    kpis[f"Rentabilité - Projet {int(row['Project ID'])}"] = float(rentabilite_value)

        # ✅ Nouveau: Sold Budget par Projet (Ignoring Duplicates)
        if "Project ID" in df.columns and "Sold budget" in df.columns:
            df_unique_budget = df.drop_duplicates(subset=["Project ID"])[["Project ID", "Sold budget"]]
            df_budget_by_project = df_unique_budget.groupby("Project ID")["Sold budget"].sum().reset_index()

            for _, row in df_budget_by_project.iterrows():
                kpis[f"Budget - Projet {int(row['Project ID'])}"] = float(row["Sold budget"]) 

        # ✅ Budget par client (for Pie Chart)
        if "Client" in df.columns and "Sold budget" in df.columns:
            df_budget = df.drop_duplicates(subset=["Client"])[["Client", "Sold budget"]]
            df_budget_by_client = df_budget.groupby("Client")["Sold budget"].sum().reset_index()

            for _, row in df_budget_by_client.iterrows():
                kpis[f"Budget - Client {row['Client']}"] = float(row["Sold budget"])

        # ✅ Margin Planned vs Real by Project
        if all(col in df.columns for col in ["Project ID", "Margin planned", "Margin real"]):
            df_margin = df.groupby("Project ID")[["Margin planned", "Margin real"]].sum().reset_index()

            for _, row in df_margin.iterrows():
                project_id = int(row["Project ID"])
                kpis[f"Margin Planned - Projet {project_id}"] = float(row["Margin planned"])
                kpis[f"Margin Real - Projet {project_id}"] = float(row["Margin real"])

    if report_type == "Staffing Individuel":
        required_columns = ["First name", "Last name", "Position", "Staffing Rate", "Start date", "End date", "Staffed hours"]
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"Le fichier doit contenir les colonnes: {', '.join(required_columns)}")

        # ✅ Nettoyage des dates avec gestion des avertissements
        df.loc[:, "Start date"] = pd.to_datetime(df["Start date"], dayfirst=True, errors="coerce")
        df.loc[:, "End date"] = pd.to_datetime(df["End date"], dayfirst=True, errors="coerce")
        df = df.dropna(subset=["Start date", "End date"])

        # ✅ Clean "Staffing Rate" column: remove "%" and convert to numeric
        df.loc[:, "Staffing Rate"] = df["Staffing Rate"].str.replace("%", "").astype(float)

        # ✅ Catégoriser les taux de staffing en intervalles
        df.loc[:, "Staffing Category"] = pd.cut(
            df["Staffing Rate"],
            bins=[0, 50, 90, float('inf')],
            labels=["<50%", "50%-90%", ">90%"],
            include_lowest=True
        )

        # ✅ Calcul du staffing par Position et catégorie
        staffing_summary = df.groupby(["Position", "Staffing Category"], observed=True).size().reset_index(name="Count")

        for _, row in staffing_summary.iterrows():
            position = row['Position']
            staffing_category = row['Staffing Category']
            count = int(row['Count'])
            kpis[f"Staffing - {position} - {staffing_category}"] = count

        # ✅ Calcul des heures staffées et non staffées
        total_staffed_hours = df["Staffed hours"].sum()
        total_unstaffed_hours = df[df["Staffing Rate"] < 100].shape[0] * 8  # Hypothèse de 8h par jour non staffé

        kpis["Total des heures staffées"] = float(total_staffed_hours)
        kpis["Total des heures non staffées"] = float(total_unstaffed_hours)

    print(f"✅ KPIs extraits pour {report_type} : {kpis}")
    return kpis




@app.delete("/kpis")
def delete_kpis(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    db.query(KPI).filter(KPI.department == user.departement).delete()
    db.commit()
    
    return {"message": "Tous les KPIs de votre département ont été supprimés."}


@app.get("/kpis")
def get_kpis(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    kpis = db.query(KPI).filter(KPI.uploaded_by == user.id).all()

    result = [
        {
            "metric_name": k.metric_name,
            "metric_value": k.metric_value,
            "date_created": k.date_created.strftime("%Y-%m-%d %H:%M:%S")
        }
        for k in kpis
    ]

    print("✅ KPIs envoyés au frontend:", result)  # Debugging ✅
    return result



@app.post("/upload_skills")
async def upload_skills(
    file: UploadFile = File(...),
    user_email: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    df = pd.read_excel(file_path)

    required_columns = ["First Name", "Last Name", "Business unit", "Skill Parent-Category", "Skill Category", "Skill", "Grade Value"]
    if not all(col in df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"Le fichier doit contenir les colonnes: {', '.join(required_columns)}")

    # Clean and validate data
    df = df.fillna("")  # Replace NaN with empty string for text fields
    df["Business unit"] = df["Business unit"].str.strip().str.lower()
    df["Skill Parent-Category"] = df["Skill Parent-Category"].str.strip()
    df["Skill Category"] = df["Skill Category"].str.strip()
    df["Skill"] = df["Skill"].str.strip()
    
    # Handle Grade Value - ensure it's numeric and between 0 and 5
    df["Grade Value"] = pd.to_numeric(df["Grade Value"], errors='coerce')
    df["Grade Value"] = df["Grade Value"].fillna(0)  # Replace NaN with 0
    df["Grade Value"] = df["Grade Value"].clip(0, 5)  # Ensure values are between 0 and 5
    
    user_department = user.departement.strip().lower()
    df_filtered = df[df["Business unit"] == user_department]

    if df_filtered.empty:
        raise HTTPException(status_code=400, detail="Aucun collaborateur trouvé pour votre département.")

    # Clear existing skills uploaded by the user before adding new ones
    db.query(CollaboratorSkill).filter(CollaboratorSkill.uploaded_by == user.id).delete()

    # Add collaborator skills to database
    for _, row in df_filtered.iterrows():
        # Ensure grade_value is a valid float
        grade_value = float(row["Grade Value"])
        if pd.isna(grade_value):
            grade_value = 0.0
            
        skill_entry = CollaboratorSkill(
            first_name=row["First Name"].strip(),
            last_name=row["Last Name"].strip(),
            business_unit=row["Business unit"],
            skill_parent_category=row["Skill Parent-Category"],
            skill_category=row["Skill Category"],
            skill=row["Skill"],
            grade_value=grade_value,
            uploaded_by=user.id,
            date_uploaded=datetime.utcnow()
        )
        db.add(skill_entry)

    try:
        db.commit()
        return {"message": "Fichier traité avec succès et données sauvegardées."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde des données: {str(e)}")


@app.get("/best_collaborators")
def get_best_collaborators(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    # Find the latest uploaded skills file
    try:
        files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(".xlsx")]
        if not files:
            return {"message": "Aucun fichier de compétences trouvé.", "best_collaborators": []}

        latest_file = max([os.path.join(UPLOAD_FOLDER, f) for f in files], key=os.path.getctime)

        # Read the latest Excel file
        df = pd.read_excel(latest_file)

        required_columns = ["First Name", "Last Name", "Business unit", "Skill Parent-Category", "Skill Category", "Skill", "Grade Value"]
        if not all(col in df.columns for col in required_columns):
            return {"message": "Format de fichier invalide.", "best_collaborators": []}

        # Filter by user's department
        df["Business unit"] = df["Business unit"].str.strip().str.lower()
        user_department = user.departement.strip().lower()
        df_filtered = df[df["Business unit"] == user_department]

        if df_filtered.empty:
            return {"message": "Aucun collaborateur trouvé pour votre département.", "best_collaborators": []}

        # Get best collaborator per skill category
        best_collaborators = (
            df_filtered.loc[df_filtered.groupby(["Skill Parent-Category", "Skill Category"])["Grade Value"].idxmax()]
            .sort_values(by="Grade Value", ascending=False)
        )

        result = best_collaborators[["First Name", "Last Name", "Skill Parent-Category", "Skill Category", "Skill", "Grade Value"]].to_dict(orient="records")
        return {"message": "Liste des meilleurs collaborateurs par compétence.", "best_collaborators": result}

    except Exception as e:
        print(f"Error in get_best_collaborators: {str(e)}")  # For debugging
        return {"message": "Erreur lors de la lecture du fichier.", "best_collaborators": []}
    

@app.get("/get_saved_collaborators")
def get_saved_collaborators(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    skills = db.query(CollaboratorSkill).filter(CollaboratorSkill.uploaded_by == user.id).all()

    collaborators = {}
    for skill in skills:
        key = f"{skill.first_name} {skill.last_name}"
        if key not in collaborators:
            collaborators[key] = {
                "First Name": skill.first_name,
                "Last Name": skill.last_name,
                "skills": []
            }
        collaborators[key]["skills"].append({
            "Skill Parent-Category": skill.skill_parent_category,
            "Skill Category": skill.skill_category,
            "Skill": skill.skill,
            "Grade Value": skill.grade_value
        })

    return {"collaborators": list(collaborators.values())}

@app.get("/pending_timesheets")
def get_pending_timesheets(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")

    pending = db.query(PendingTimesheet).filter(
        PendingTimesheet.uploaded_by == user.id
    ).all()

    return [
        {
            "first_name": p.first_name,
            "last_name": p.last_name,
            "email": p.email,
            "department": p.department
        }
        for p in pending
    ]

class CollaborateurSchema(BaseModel):
    nom: str
    prenom: str
    grade: str
    respect_delais: float
    participation: float
    resolution_problemes: float
    note_finale: float

    class Config:
        from_attributes = True

class ProjectSchema(BaseModel):
    nom: str
    start_date: datetime
    end_date: datetime
    collaborateurs: List[CollaborateurSchema]

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    nom: str
    start_date: datetime
    end_date: datetime
    collaborateurs: List[CollaborateurSchema]

    class Config:
        from_attributes = True

@app.post("/save_projects")
def save_projects(user_email: str, projects: List[ProjectSchema], db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    try:
        # First delete existing projects and their collaborators
        existing_projects = db.query(Project).filter(Project.user_id == user.id).all()
        for project in existing_projects:
            # Delete collaborators first
            db.query(Collaborateur).filter(Collaborateur.project_id == project.id).delete()
        # Then delete projects
        db.query(Project).filter(Project.user_id == user.id).delete()
        db.commit()

        # Now add new projects and collaborators
        for proj in projects:
            new_proj = Project(
                nom=proj.nom,
                start_date=proj.start_date,
                end_date=proj.end_date,
                user_id=user.id
            )
            db.add(new_proj)
            db.flush()  # Get project ID

            for collab in proj.collaborateurs:
                new_collab = Collaborateur(
                    nom=collab.nom,
                    prenom=collab.prenom,
                    grade=collab.grade,
                    respect_delais=collab.respect_delais,
                    participation=collab.participation,
                    resolution_problemes=collab.resolution_problemes,
                    note_finale=collab.note_finale,
                    project_id=new_proj.id
                )
                db.add(new_collab)

        db.commit()
        return {"message": "Projets sauvegardés avec succès."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")

@app.get("/get_projects")
def get_projects(user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    projects = db.query(Project).filter(Project.user_id == user.id).all()
    
    # Convert to response format
    response = []
    for project in projects:
        project_data = {
            "id": project.id,
            "nom": project.nom,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "collaborateurs": [
                {
                    "nom": c.nom,
                    "prenom": c.prenom,
                    "grade": c.grade,
                    "respect_delais": float(c.respect_delais),
                    "participation": float(c.participation),
                    "resolution_problemes": float(c.resolution_problemes),
                    "note_finale": float(c.note_finale)
                }
                for c in project.collaborateurs
            ]
        }
        response.append(project_data)
    
    return response

@app.delete("/delete_project_collaborators/{project_id}")
def delete_project_collaborators(project_id: int, user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete all collaborators for this project
    db.query(Collaborateur).filter(Collaborateur.project_id == project_id).delete()
    db.commit()
    return {"message": "Collaborators deleted successfully"}

@app.delete("/delete_project/{project_id}")
def delete_project(project_id: int, user_email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # First delete all collaborators
    db.query(Collaborateur).filter(Collaborateur.project_id == project_id).delete()
    
    # Then delete the project
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}

# Add these new model classes after the existing model classes
class UserProfileUpdate(BaseModel):
    email: str
    prenom: str
    nom: str
    departement: str
    poste: str

class PasswordChange(BaseModel):
    email: str
    current_password: str
    new_password: str


# Add these new endpoints after the existing endpoints

@app.post("/update_profile")
def update_profile(user_data: UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    
    # Update user fields
    user.prenom = user_data.prenom
    user.nom = user_data.nom
    user.departement = user_data.departement
    user.poste = user_data.poste
    
    try:
        db.commit()
        return {"message": "Profil mis à jour avec succès!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")


@app.post("/change_password")
def change_password(password_data: PasswordChange, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == password_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    
    # Verify current password
    if not pwd_context.verify(password_data.current_password, user.password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")
    
    # Validate new password
    password_regex = r"^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$"
    if not re.match(password_regex, password_data.new_password):
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole.")
    
    # Update password
    hashed_password = pwd_context.hash(password_data.new_password)
    user.password = hashed_password
    
    try:
        db.commit()
        return {"message": "Mot de passe modifié avec succès!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors du changement de mot de passe: {str(e)}")



