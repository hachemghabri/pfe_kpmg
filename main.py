from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware
from database import get_db
from models import User, ReportFile, KPI, CollaboratorSkill,PendingTimesheet, Project, Collaborateur, CollaboratorFeedback, Notification
from pydantic import BaseModel
import pandas as pd
import re
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from typing import List, Optional
import json
import numpy as np
from textblob import TextBlob
import nltk
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import asyncio
import yagmail
try:
    nltk.download('punkt', quiet=True)
except Exception as e:
    print(f"Warning: Could not download NLTK 'punkt' model. Tokenization might be less accurate. Error: {e}")


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

class NotificationCreate(BaseModel):
    type: str
    message: str
    collaborator_name: Optional[str] = None
    created_by: str
    department: str

class NotificationResponse(BaseModel):
    id: int
    type: str
    message: str
    collaborator_name: Optional[str] = None
    created_by: str
    is_read: bool
    created_at: datetime
    department: str

    class Config:
        from_attributes = True

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
    kpis = {}

    if report_type == "Rapport de Timesheet":
        # Clean existing pending timesheets for this user and department
        db.query(PendingTimesheet).filter(
            PendingTimesheet.uploaded_by == user.id,
            PendingTimesheet.department == user.departement
        ).delete()

        # Filter collaborators with status "To be completed"
        pending_timesheets = df[df["Timesheet Status"] == "To be completed"]
        # Ensure 'Business Unit' exists before trying to fillna
        if "Business Unit" in pending_timesheets.columns:
            pending_timesheets["Business Unit"] = pending_timesheets["Business Unit"].fillna("")
        else: 
             # Handle case where 'Business Unit' column might be missing in Timesheet report
             # Decide on default behavior - e.g., assign a default department or skip
             print("Warning: 'Business Unit' column missing in Timesheet report.")
             # Example: Assign user's department as default if appropriate
             # pending_timesheets["Business Unit"] = user.departement

        for _, row in pending_timesheets.iterrows():
            # Check if 'Business Unit' is available before accessing
            dept = row["Business Unit"] if "Business Unit" in row else user.departement # Fallback
            pending_entry = PendingTimesheet(
                first_name=row["First Name"],
                last_name=row["Last Name"],
                email=row["Email"],
                department=dept,
                report_id=new_report.id,
                uploaded_by=user.id,
                date_uploaded=datetime.utcnow()
            )
            db.add(pending_entry)
                    # ✅ Calcul du taux d'approbation
        total_users = len(pending_timesheets)
        
        # Check if "Approved by" column exists before using it
        if "Approved by" in df.columns:
            approved_users = df["Approved by"].notnull().sum()
            approval_rate = (approved_users / total_users) * 100 if total_users > 0 else 0.0
        else:
            # If column doesn't exist, set approval rate to 0 or some default value
            approved_users = 0
            approval_rate = 0.0

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
    else:
        # For all other report types, process through extract_kpis
        print(f"Processing {report_type} for user {user_email}")
        kpis = extract_kpis(df, report_type)
        
        # First clean existing KPIs of this report type for this user
        # This prevents confusion with KPIs from previous uploads
        try:
            print(f"Cleaning existing {report_type} KPIs for user {user_email}")
            # For Staffing Individuel, clean all KPIs with matching prefixes
            if report_type == "Staffing Individuel":
                # Delete KPIs for both file formats (availability and staffing rate)
                prefixes = [
                    "Avg Availability -", 
                    "Staffing -", 
                    "Staffed Hours -",
                    "Total des heures staffées",
                    "Error"
                ]
                for prefix in prefixes:
                    db.query(KPI).filter(
                        KPI.uploaded_by == user.id,
                        KPI.metric_name.like(f"{prefix}%")
                    ).delete(synchronize_session=False)
            # For other report types, delete based on the report type's typical KPI prefixes
            elif report_type == "Rapport de Finance":
                # Finance report KPI prefixes
                prefixes = [
                    "Marge Réelle", 
                    "Rentabilité -", 
                    "Budget -",
                    "Margin Planned -",
                    "Margin Real -",
                    "Turnover Planned -",
                    "Turnover Real -",
                    "Cost Planned -",
                    "Cost Real -", 
                    "Daily Cost -"
                ]
                for prefix in prefixes:
                    db.query(KPI).filter(
                        KPI.uploaded_by == user.id,
                        KPI.metric_name.like(f"{prefix}%")
                    ).delete(synchronize_session=False)
            elif report_type == "Staffing Projet":
                # Staffing Projet KPI prefixes
                prefixes = [
                    "Secteur -", 
                    "Billing -", 
                    "Category -",
                    "Advancement -"
                ]
                for prefix in prefixes:
                    db.query(KPI).filter(
                        KPI.uploaded_by == user.id,
                        KPI.metric_name.like(f"{prefix}%")
                    ).delete(synchronize_session=False)
            
            db.commit()
        except Exception as e:
            print(f"Error cleaning existing KPIs: {str(e)}")
            # Continue with the upload even if cleaning fails
            
        # Save the new KPIs
        print(f"Saving {len(kpis)} KPIs for report type '{report_type}'")
        for metric_name, metric_value in kpis.items():
            if pd.isna(metric_value):
                 print(f"Skipping KPI '{metric_name}' due to NaN value.")
                 continue
            
            try:
                numeric_value = float(metric_value)
            except (ValueError, TypeError):
                 print(f"Skipping KPI '{metric_name}' due to non-numeric value: {metric_value}")
                 continue
                 
            if numeric_value != 0.0: 
                kpi_entry = KPI(
                    report_id=new_report.id,
                    department=user.departement, # Store user's department
                    metric_name=metric_name,
                    metric_value=numeric_value,
                    uploaded_by=user.id,
                    date_created=datetime.utcnow()
                )
                db.add(kpi_entry)
        db.commit()

    return {"message": "Fichier téléchargé et traité avec succès."}



def extract_kpis(df, report_type):
    kpis = {}
    
    # Make an explicit copy to prevent SettingWithCopyWarning
    df = df.copy()

    if report_type == "Rapport de Finance":
        # ✅ Marge réelle moyenne
        kpis["Marge Réelle (%)"] = (
            float(df["Margin real"].mean())
            if "Margin real" in df.columns and not pd.isna(df["Margin real"].mean())
            else 0.0
        )

        # ✅ Rentabilité par projet (Profitability by Project)
        if all(col in df.columns for col in ["Project ID", "Margin real", "Cost real"]):
            # Convert cost to numeric, handling errors and replacing 0 with NaN temporarily for division
            df["Cost real num"] = pd.to_numeric(df["Cost real"], errors='coerce')
            df["Cost real num"] = df["Cost real num"].replace(0, np.nan)
            df["Margin real num"] = pd.to_numeric(df["Margin real"], errors='coerce')
            
            # Calculate profitability only where Cost real is not NaN or zero
            df["Rentabilité (%)"] = np.where(
                df["Cost real num"].notna() & (df["Cost real num"] != 0),
                (df["Margin real num"] / df["Cost real num"]) * 100,
                np.nan # Assign NaN if cost is invalid or zero
            )
            
            # Drop rows with NaN profitability before grouping
            df_rentabilite = df.dropna(subset=["Rentabilité (%)"])
            df_rentabilite = df_rentabilite.groupby("Project ID")["Rentabilité (%)"].mean().reset_index()

            for _, row in df_rentabilite.iterrows():
                rentabilite_value = row["Rentabilité (%)"]
                if not pd.isna(rentabilite_value) and rentabilite_value != 0.0:
                    kpis[f"Rentabilité - Projet {int(row['Project ID'])}"] = float(rentabilite_value)

        # ✅ Nouveau: Sold Budget par Projet (Ignoring Duplicates)
        if "Project ID" in df.columns and "Sold budget" in df.columns:
            df_unique_budget = df.drop_duplicates(subset=["Project ID"])[["Project ID", "Sold budget"]]
            df_budget_by_project = df_unique_budget.groupby("Project ID")["Sold budget"].sum().reset_index()

            for _, row in df_budget_by_project.iterrows():
                 # Ensure Project ID is integer before using in f-string
                try:
                    project_id_int = int(row['Project ID'])
                    kpis[f"Budget - Projet {project_id_int}"] = float(row["Sold budget"])
                except (ValueError, TypeError):
                    print(f"Skipping Budget KPI due to invalid Project ID: {row['Project ID']}")

        # ✅ Budget par client (for Pie Chart)
        if "Client" in df.columns and "Sold budget" in df.columns:
            df_budget = df.drop_duplicates(subset=["Client"])[["Client", "Sold budget"]]
            df_budget_by_client = df_budget.groupby("Client")["Sold budget"].sum().reset_index()

            for _, row in df_budget_by_client.iterrows():
                # Ensure client name is valid string before using in f-string
                client_name = str(row['Client']).strip()
                if client_name:
                     kpis[f"Budget - Client {client_name}"] = float(row["Sold budget"])
                else:
                    print("Skipping Budget KPI due to invalid Client name")

        # ✅ Margin Planned vs Real by Project
        if all(col in df.columns for col in ["Project ID", "Margin planned", "Margin real"]):
            df_margin = df.groupby("Project ID")[["Margin planned", "Margin real"]].sum().reset_index()

            for _, row in df_margin.iterrows():
                try:
                    project_id = int(row["Project ID"])
                    kpis[f"Margin Planned - Projet {project_id}"] = float(row["Margin planned"])
                    kpis[f"Margin Real - Projet {project_id}"] = float(row["Margin real"])
                except (ValueError, TypeError):
                     print(f"Skipping Margin KPI due to invalid Project ID: {row['Project ID']}")
                
        # ✅ Nouveau: Turnover Planned vs Real by Project
        if all(col in df.columns for col in ["Project ID", "Turnover planned", "Turnover real"]):
            df_turnover = df.groupby("Project ID")[["Turnover planned", "Turnover real"]].sum().reset_index()
            
            for _, row in df_turnover.iterrows():
                 try:
                    project_id = int(row["Project ID"])
                    kpis[f"Turnover Planned - Projet {project_id}"] = float(row["Turnover planned"])
                    kpis[f"Turnover Real - Projet {project_id}"] = float(row["Turnover real"])
                 except (ValueError, TypeError):
                     print(f"Skipping Turnover KPI due to invalid Project ID: {row['Project ID']}")
                
        # ✅ Nouveau: Cost Planned vs Real by Project
        if all(col in df.columns for col in ["Project ID", "Cost planned", "Cost real"]):
            df_cost = df.groupby("Project ID")[["Cost planned", "Cost real"]].sum().reset_index()
            
            for _, row in df_cost.iterrows():
                try:
                    project_id = int(row["Project ID"])
                    kpis[f"Cost Planned - Projet {project_id}"] = float(row["Cost planned"])
                    kpis[f"Cost Real - Projet {project_id}"] = float(row["Cost real"])
                except (ValueError, TypeError):
                    print(f"Skipping Cost KPI due to invalid Project ID: {row['Project ID']}")
                
        # ✅ Nouveau: Daily Cost per Project
        if all(col in df.columns for col in ["Project ID", "Cost real", "Project Duration"]):
            df_daily = df.copy()
            # Ensure numerical values for calculations
            df_daily["Cost real"] = pd.to_numeric(df_daily["Cost real"], errors='coerce')
            df_daily["Project Duration"] = pd.to_numeric(df_daily["Project Duration"], errors='coerce')
            
            # Filter out rows with invalid duration to avoid division by zero
            df_daily = df_daily[df_daily["Project Duration"] > 0]
            
            if not df_daily.empty:
                # Calculate daily cost
                df_daily["Daily Cost"] = df_daily["Cost real"] / df_daily["Project Duration"]
                
                # Group by project and calculate average daily cost
                df_daily_cost = df_daily.groupby("Project ID")[["Daily Cost"]].mean().reset_index()
                
                for _, row in df_daily_cost.iterrows():
                     try:
                        project_id = int(row["Project ID"])
                        kpis[f"Daily Cost - Projet {project_id}"] = float(row["Daily Cost"])
                     except (ValueError, TypeError):
                         print(f"Skipping Daily Cost KPI due to invalid Project ID: {row['Project ID']}")

    elif report_type == "Staffing Individuel":
        # --- New Availability Calculation Logic --- 
        print(f"Processing 'Staffing Individuel' report with columns: {df.columns.tolist()}")
        
        # Define common columns used across formats
        people_col = "People"
        bu_pole_col = "BU/Pôle" # Corrected column name
        position_col = "Position"
        
        # First check if this is the "Staffing Rate" format (second file type)
        has_staffing_rate = "Staffing Rate" in df.columns
        has_staffed_hours = "Staffed hours" in df.columns
        has_position = position_col in df.columns
        
        # If we have staffing rate and position but no people column, this is the second format
        if has_staffing_rate and has_position and people_col not in df.columns:
            print("Detected Staffing Rate format (second file type)")
            # Process Staffing Rate Categories
            if has_staffing_rate:
                print("Processing staffing rate categories")
                try:
                    # Ensure clean copy of data for staffing rate processing
                    df_rate = df.copy()
                    # Clean the 'Staffing Rate' column (e.g., '81.0%' -> 81.0)
                    df_rate.loc[:, "Staffing Rate Clean"] = df_rate["Staffing Rate"].astype(str).str.replace("%", "", regex=False)
                    df_rate.loc[:, "Staffing Rate Clean"] = pd.to_numeric(df_rate.loc[:, "Staffing Rate Clean"], errors='coerce').fillna(0)
                    
                    # Create categories, make sure include_lowest is True to catch 0%
                    df_rate.loc[:, "Staffing Category"] = pd.cut(
                        df_rate["Staffing Rate Clean"],
                        bins=[0, 50, 90, float('inf')],
                        labels=["<50%", "50%-90%", ">90%"],
                        include_lowest=True
                    )
                    
                    print(f"Grouping staffing rates by {position_col}")
                    # Group by Position and Staffing Category
                    staffing_summary = df_rate.groupby([position_col, "Staffing Category"], observed=False).size().reset_index(name="Count")
                    
                    # Create KPIs for each position and category
                    for _, row in staffing_summary.iterrows():
                        position = row[position_col]
                        staffing_category = row["Staffing Category"]
                        count = int(row["Count"])
                        
                        # Only create KPIs for valid positions and non-zero counts
                        if pd.notna(position) and str(position).strip() != "" and pd.notna(staffing_category) and count > 0:
                            kpi_name = f"Staffing - {position} - {staffing_category}"
                            kpis[kpi_name] = count
                            print(f"Added KPI: {kpi_name} = {count}")
                except Exception as e:
                    print(f"ERROR processing staffing rate categories: {str(e)}")
            
            # Process Staffed Hours
            if has_staffed_hours:
                print("Processing staffed hours by position")
                try:
                    # Ensure clean copy of data for staffed hours processing
                    df_hours = df.copy()
                    df_hours.loc[:, "Staffed hours num"] = pd.to_numeric(df_hours["Staffed hours"], errors='coerce').fillna(0)
                    
                    # Calculate total staffed hours (for the total KPI)
                    total_staffed_hours = df_hours["Staffed hours num"].sum()
                    kpis["Total des heures staffées"] = float(total_staffed_hours)
                    print(f"Added KPI: Total des heures staffées = {total_staffed_hours}")
                    
                    # Calculate staffed hours by position
                    staffed_hours_by_position = df_hours.groupby(position_col)["Staffed hours num"].sum()
                    for position, hours in staffed_hours_by_position.items():
                        pos_name = str(position).strip()
                        if pd.notna(pos_name) and pos_name != "" and hours > 0:
                            kpi_name = f"Staffed Hours - Position - {pos_name}"
                            kpis[kpi_name] = float(hours)
                            print(f"Added KPI: {kpi_name} = {hours}")
                except Exception as e:
                    print(f"ERROR processing staffed hours: {str(e)}")
            
            print(f"Finished processing 'Staffing Individuel' (second file type), generated {len(kpis)} KPIs")
            return kpis
        
        # If we get here, try the weekly availability approach (first file type)
        print("Attempting to process as weekly availability format (first file type)")
        
        # Check if required columns exist
        required_static_cols = [people_col, bu_pole_col, position_col]
        missing_cols = [col for col in required_static_cols if col not in df.columns]
        if missing_cols:
            print(f"Missing columns for availability calculation: {missing_cols}")
            print(f"Available columns: {df.columns.tolist()}")
            # Continue with available columns, log warning instead of raising exception
            print(f"WARNING: Will continue with partial data. Columns missing: {missing_cols}")
        
        # Identify weekly staffing columns (assuming they start with 'W' followed by digits)
        weekly_cols = [col for col in df.columns if re.match(r'^W\d+\s*-\s*\w{3}\s*\d{2}', col)]
        print(f"Found {len(weekly_cols)} weekly staffing columns: {weekly_cols[:5]}...")
        
        if not weekly_cols:
            print("WARNING: No weekly staffing columns found matching pattern W## - Mon ##")
            # Fallback to columns starting with W as a last resort
            weekly_cols = [col for col in df.columns if col.startswith('W') and not col.startswith('Week')]
            print(f"Fallback found {len(weekly_cols)} columns starting with W: {weekly_cols[:5]}...")
            if not weekly_cols:
                print("ERROR: Could not identify any weekly columns for staffing data")
                kpis["Error"] = 1.0  # Just add a dummy KPI to indicate error
                return kpis
        
        # Clean weekly staffing data
        def clean_percentage(value):
            if pd.isna(value):
                return 0.0
            if isinstance(value, (int, float)):
                return float(value) / 100.0 if value > 1 else float(value)  # Handle both 0.8 and 80% formats
            if isinstance(value, str):
                try:
                    # Remove % sign and convert to float, divide by 100
                    clean_str = value.replace('%', '').strip()
                    parsed_value = float(clean_str) 
                    return parsed_value / 100.0 if parsed_value > 1 else parsed_value  # Handle both 0.8 and 80 formats
                except ValueError:
                    print(f"WARNING: Could not parse staffing value: {value}, treating as 0")
                    return 0.0
            return 0.0

        # Create a copy of df for safety
        df_staff = df.copy()
        
        # Clean the staffing data
        for col in weekly_cols:
            print(f"Cleaning staffing data in column {col}")
            try:
                df_staff[col] = df_staff[col].apply(clean_percentage)
                # Print some stats
                print(f"Column {col}: min={df_staff[col].min()}, max={df_staff[col].max()}, mean={df_staff[col].mean()}")
            except Exception as e:
                print(f"ERROR cleaning column {col}: {str(e)}")
                # Try to convert to string first if possible
                try:
                    df_staff[col] = df_staff[col].astype(str).apply(clean_percentage)
                except:
                    # If all else fails, set to 0
                    print(f"Failed to clean {col}, setting to 0")
                    df_staff[col] = 0.0
        
        # Check if we have the people column for grouping
        if people_col not in df_staff.columns:
            print(f"ERROR: People column '{people_col}' missing, cannot group staffing data")
            kpis["Error"] = 1.0
            return kpis
            
        # Group by Person and sum weekly staffing
        try:
            staffing_sum = df_staff.groupby(people_col)[weekly_cols].sum()
            print(f"Grouped staffing by {people_col}, got {len(staffing_sum)} rows")
        except Exception as e:
            print(f"ERROR grouping staffing data: {str(e)}")
            kpis["Error"] = 1.0
            return kpis
            
        # Calculate weekly availability (100% - staffing %)
        availability_df = 1.0 - staffing_sum
        availability_df = availability_df.clip(lower=0.0) # Availability cannot be negative
        print(f"Calculated availability for {len(availability_df)} people across {len(weekly_cols)} weeks")
        
        # Merge availability back with original data to get BU/Pôle and Position
        # Need to handle potential multiple rows per person in original df
        # We'll take the first occurrence of BU/Pôle and Position for each person
        person_details_cols = [people_col]
        if bu_pole_col in df_staff.columns:
            person_details_cols.append(bu_pole_col)
        if position_col in df_staff.columns:
            person_details_cols.append(position_col)
        
        try:
            person_details = df_staff[person_details_cols].drop_duplicates(subset=[people_col])
            print(f"Extracted person details for {len(person_details)} unique people")
            
            availability_df = availability_df.reset_index().merge(person_details, on=people_col, how='left')
            print(f"Merged availability with person details, final shape: {availability_df.shape}")
        except Exception as e:
            print(f"ERROR merging person details: {str(e)}")
            # If merging fails, continue with just the base availability data
            availability_df = availability_df.reset_index()
            print(f"Continuing with basic availability data without BU/Pôle or Position")

        # 1. Calculate Average Availability per BU/Pôle
        if bu_pole_col in availability_df.columns:
            print(f"Calculating availability by {bu_pole_col}")
            # Calculate the mean availability across all weeks for each BU/Pôle
            # We melt the dataframe first to have weeks as rows
            try:
                # Exclude non-data columns from melting
                melt_id_vars = [col for col in availability_df.columns if col not in weekly_cols]
                availability_melted_bu = availability_df.melt(
                    id_vars=melt_id_vars, 
                    value_vars=weekly_cols, 
                    var_name='Week', 
                    value_name='Availability'
                )
                print(f"Melted availability data for BU calculation, shape: {availability_melted_bu.shape}")
                
                # Group by BU/Pôle
                avg_avail_bu = availability_melted_bu.groupby(bu_pole_col)['Availability'].mean() * 100 # Average percentage
                print(f"Calculated average availability for {len(avg_avail_bu)} BUs")
                
                for bu, avg_avail in avg_avail_bu.items():
                    if pd.notna(bu) and str(bu).strip() != "":
                        kpi_name = f"Avg Availability - BU - {bu}"
                        kpis[kpi_name] = round(avg_avail, 2)
                        print(f"Added KPI: {kpi_name} = {kpis[kpi_name]}")
            except Exception as e:
                print(f"ERROR calculating availability by BU: {str(e)}")
                    
        # 2. Calculate Average Availability Trend per Week
        try:
            avg_avail_trend = availability_df[weekly_cols].mean() * 100 # Average percentage for each week column
            print(f"Calculated trend data for {len(avg_avail_trend)} weeks")
            
            for week, avg_avail in avg_avail_trend.items():
                kpi_name = f"Avg Availability - Trend - {week}"
                kpis[kpi_name] = round(avg_avail, 2)
                print(f"Added KPI: {kpi_name} = {kpis[kpi_name]}")
        except Exception as e:
            print(f"ERROR calculating availability trend: {str(e)}")
            
        # 3. Calculate Average Availability Distribution by Position
        if position_col in availability_df.columns:
            print(f"Calculating availability by {position_col}")
            try:
                # Use the melted dataframe if we created it earlier
                if 'availability_melted_bu' in locals():
                    print("Using previously melted data for Position calculation")
                    avg_avail_pos = availability_melted_bu.groupby(position_col)['Availability'].mean() * 100 # Average percentage
                else:
                    # We need to melt the data first
                    melt_id_vars = [col for col in availability_df.columns if col not in weekly_cols]
                    availability_melted_pos = availability_df.melt(
                        id_vars=melt_id_vars, 
                        value_vars=weekly_cols, 
                        var_name='Week', 
                        value_name='Availability'
                    )
                    avg_avail_pos = availability_melted_pos.groupby(position_col)['Availability'].mean() * 100
                
                print(f"Calculated average availability for {len(avg_avail_pos)} positions")
                
                for position, avg_avail in avg_avail_pos.items():
                    if pd.notna(position) and str(position).strip() != "":
                        kpi_name = f"Avg Availability - Position - {position}"
                        kpis[kpi_name] = round(avg_avail, 2)
                        print(f"Added KPI: {kpi_name} = {kpis[kpi_name]}")
            except Exception as e:
                print(f"ERROR calculating availability by position: {str(e)}")

        # Keep existing Staffing category calculation if needed elsewhere, 
        # but availability is calculated differently now.
        if "Staffing Rate" in df.columns:
            print("Processing staffing rate categories")
            try:
                # Ensure clean copy of data
                df_rate = df.copy()
                # Clean the 'Staffing Rate' column (e.g., '81.0%' -> 81.0)
                df_rate.loc[:, "Staffing Rate Clean"] = df_rate["Staffing Rate"].astype(str).str.replace("%", "", regex=False)
                df_rate.loc[:, "Staffing Rate Clean"] = pd.to_numeric(df_rate.loc[:, "Staffing Rate Clean"], errors='coerce').fillna(0)
                
                # Create categories, make sure include_lowest is True to catch 0%
                df_rate.loc[:, "Staffing Category"] = pd.cut(
                    df_rate["Staffing Rate Clean"],
                    bins=[0, 50, 90, float('inf')],
                    labels=["<50%", "50%-90%", ">90%"],
                    include_lowest=True
                )
                
                # Ensure position column is available
                if position_col in df_rate.columns:
                    print(f"Grouping staffing rates by {position_col}")
                    # Group by Position and Staffing Category with observed=False to include empty categories
                    try:
                        # Use size().reset_index() to get counts in long format
                        staffing_summary = df_rate.groupby([position_col, "Staffing Category"], observed=False).size().reset_index(name="Count")
                        
                        # Create KPIs for each position and category
                        for _, row in staffing_summary.iterrows():
                            position = row[position_col]
                            staffing_category = row["Staffing Category"]
                            count = int(row["Count"])
                            
                            # Only create KPIs for valid positions and non-zero counts
                            if pd.notna(position) and str(position).strip() != "" and pd.notna(staffing_category) and count > 0:
                                kpi_name = f"Staffing - {position} - {staffing_category}"
                                kpis[kpi_name] = count
                                print(f"Added KPI: {kpi_name} = {count}")
                    except Exception as e:
                        print(f"ERROR in groupby for staffing categories: {str(e)}")
                else:
                    print(f"WARNING: Position column '{position_col}' not found, cannot create staffing category KPIs")
            except Exception as e:
                print(f"ERROR processing staffing rate categories: {str(e)}")
                     
        # Keep staffed hours calculation if needed
        if "Staffed hours" in df.columns:
            print("Processing staffed hours")
            try:
                df["Staffed hours num"] = pd.to_numeric(df["Staffed hours"], errors='coerce').fillna(0)
                total_staffed_hours = df["Staffed hours num"].sum()
                kpis["Total des heures staffées"] = float(total_staffed_hours)
                print(f"Added KPI: Total des heures staffées = {total_staffed_hours}")
                
                # Add staffed hours by position calculation for pie chart
                if position_col in df.columns:
                    print("Calculating staffed hours by position")
                    staffed_hours_by_position = df.groupby(position_col)["Staffed hours num"].sum()
                    for position, hours in staffed_hours_by_position.items():
                        if pd.notna(position) and str(position).strip() != "" and hours > 0:
                            kpi_name = f"Staffed Hours - Position - {position}"
                            kpis[kpi_name] = float(hours)
                            print(f"Added KPI: {kpi_name} = {hours}")
            except Exception as e:
                print(f"ERROR processing staffed hours: {str(e)}")
        
        print(f"Finished processing 'Staffing Individuel', generated {len(kpis)} KPIs")
        print(f"KPI keys: {list(kpis.keys())}")
        
        return kpis

    elif report_type == "Staffing Projet":
        # ... (existing Staffing Projet logic) ...
        required_columns = ["Project ID", "Secteur d'activité", "Billing method", "Advancement rate"]
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"Le fichier doit contenir les colonnes: {', '.join(required_columns)}")
        
        # Process Secteur d'activité (activity sector)
        if "Secteur d'activité" in df.columns:
            df_sectors = df.drop_duplicates(subset=["Project ID", "Secteur d'activité"])
            sector_counts = df_sectors["Secteur d'activité"].value_counts()
            
            for sector, count in sector_counts.items():
                sector_name = str(sector).strip()
                if pd.notna(sector_name) and sector_name != "":
                    kpis[f"Secteur - {sector_name}"] = float(count)
        
        # Process Billing method
        if "Billing method" in df.columns:
            df_billing = df.drop_duplicates(subset=["Project ID", "Billing method"])
            billing_counts = df_billing["Billing method"].value_counts()
            
            for method, count in billing_counts.items():
                 method_name = str(method).strip()
                 if pd.notna(method_name) and method_name != "":
                    kpis[f"Billing - {method_name}"] = float(count)
        
        # Process Project Category
        if "Project Category" in df.columns:
            df_categories = df.drop_duplicates(subset=["Project ID", "Project Category"])
            category_counts = df_categories["Project Category"].value_counts()
            
            for category, count in category_counts.items():
                category_name = str(category).strip()
                if pd.notna(category_name) and category_name != "":
                    kpis[f"Category - {category_name}"] = float(count)
        
        # Process Advancement rate by project
        if all(col in df.columns for col in ["Project ID", "Advancement rate"]):
            # Convert to numeric, handling errors
            df["Advancement rate"] = pd.to_numeric(df["Advancement rate"], errors='coerce')
            
            # Group by project and get the average advancement rate
            advancement_by_project = df.groupby("Project ID")["Advancement rate"].mean()
            
            for project_id, rate in advancement_by_project.items():
                if pd.notna(rate):
                    try:
                       project_id_int = int(project_id)
                       kpis[f"Advancement - Projet {project_id_int}"] = float(rate)
                    except (ValueError, TypeError):
                       print(f"Skipping Advancement KPI due to invalid Project ID: {project_id}")

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

    required_columns = [
        "First Name", "Last Name", "Business unit", 
        "Skill Parent-Category", "Skill Category", 
        "Skill", "Grade Value"
    ]
    if not all(col in df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"Le fichier doit contenir les colonnes: {', '.join(required_columns)}")

    # Make an explicit copy to prevent SettingWithCopyWarning
    df = df.copy()
    
    # Nettoyage des données
    df = df.fillna("")
    df.loc[:, "Business unit"] = df["Business unit"].str.strip().str.lower()
    df.loc[:, "Skill Parent-Category"] = df["Skill Parent-Category"].str.strip()
    df.loc[:, "Skill Category"] = df["Skill Category"].str.strip()
    df.loc[:, "Skill"] = df["Skill"].str.strip()

    df.loc[:, "Grade Value"] = pd.to_numeric(df["Grade Value"], errors='coerce')
    df.loc[:, "Grade Value"] = df["Grade Value"].fillna(0)
    df.loc[:, "Grade Value"] = df["Grade Value"].clip(0, 5)
    
    user_department = user.departement.strip().lower()
    df_filtered = df[df["Business unit"] == user_department]

    if df_filtered.empty:
        raise HTTPException(status_code=400, detail="Aucun collaborateur trouvé pour votre département.")

    # Suppression des anciennes compétences uploadées
    db.query(CollaboratorSkill).filter(CollaboratorSkill.uploaded_by == user.id).delete()

    # Ajout des nouvelles compétences
    for _, row in df_filtered.iterrows():
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

    try:
        # Lister les fichiers Excel dans le dossier uploads
        files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith(".xlsx")]
        if not files:
            return {"message": "Aucun fichier de compétences trouvé.", "best_collaborators": []}

        # Récupérer le fichier le plus récent
        latest_file = max(
            [os.path.join(UPLOAD_FOLDER, f) for f in files],
            key=os.path.getctime
        )

        # Lire le fichier Excel
        df = pd.read_excel(latest_file)

        required_columns = [
            "First Name", "Last Name", "Business unit", 
            "Skill Parent-Category", "Skill Category", 
            "Skill", "Grade Value"
        ]
        if not all(col in df.columns for col in required_columns):
            return {"message": "Format de fichier invalide.", "best_collaborators": []}

        # Make an explicit copy to prevent SettingWithCopyWarning
        df = df.copy()
        
        # Filtrer par département de l'utilisateur
        df.loc[:, "Business unit"] = df["Business unit"].str.strip().str.lower()
        user_department = user.departement.strip().lower()
        df_filtered = df[df["Business unit"] == user_department]

        if df_filtered.empty:
            return {"message": "Aucun collaborateur trouvé pour votre département.", "best_collaborators": []}

        # Trouver le meilleur collaborateur par catégorie de compétence
        best_collaborators = (
            df_filtered.loc[
                df_filtered.groupby(["Skill Parent-Category", "Skill Category"])["Grade Value"].idxmax()
            ]
            .sort_values(by="Grade Value", ascending=False)
        )

        result = best_collaborators[
            ["First Name", "Last Name", "Skill Parent-Category", "Skill Category", "Skill", "Grade Value"]
        ].to_dict(orient="records")

        return {"message": "Liste des meilleurs collaborateurs par compétence.", "best_collaborators": result}

    except Exception as e:
        print(f"Error in get_best_collaborators: {str(e)}")  # Pour débogage
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

def send_email_background(recipient_email: str, subject: str, body: str):
    """Send email using yagmail with MailerSend SMTP"""
    try:
        # HARDCODED CREDENTIALS - Using values from screenshot directly
        mailersend_login_user = "MS_Bk8R0O@kpmgreminder.help"
        mailersend_password = "mssp.lyU9MZw.zr6ke4njy9ygon12.WWwvahq" # Ensure this is CURRENT password from MailerSend
        mailersend_host = "smtp.mailersend.net"
        mailersend_port = 587
        # Try setting the sender email to be the same as the login user
        sender_display_email = mailersend_login_user 

        print(f"Attempting to send email via MailerSend from {sender_display_email} (login: {mailersend_login_user}) to {recipient_email}...")

        # Initialize yagmail SMTP connection for MailerSend
        with yagmail.SMTP(
            user=mailersend_login_user, 
            password=mailersend_password, 
            host=mailersend_host,
            port=mailersend_port,
            smtp_ssl=False,
            smtp_starttls=True
        ) as yag:
            # Send the email
            yag.send(
                to=recipient_email,
                subject=subject,
                contents=body,
                # Set the From address that recipients will see
                # Using the login user as sender here too
                headers={'From': f'KPMG Reminder Service <{sender_display_email}>'} 
            )

        print(f"✅ Email successfully sent to: {recipient_email}")

    except smtplib.SMTPConnectError as e:
        print(f"❌ Connection Error: {str(e)}")
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Authentication Error: {str(e)}")
        print(f"   -> Failed authenticating user: {mailersend_login_user}")
        print("   -> Double-check password and ensure user is active in MailerSend.")
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__} - {str(e)}")

@app.post("/send_timesheet_reminder")
def send_timesheet_reminder(
    user_email: str, 
    collaborator_email: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send a reminder to a specific collaborator"""
    # Validate the user
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")
    
    # Find the collaborator in pending timesheets
    pending = db.query(PendingTimesheet).filter(
        PendingTimesheet.uploaded_by == user.id,
        PendingTimesheet.email == collaborator_email
    ).first()
    
    if not pending:
        raise HTTPException(status_code=404, detail="Collaborateur non trouvé dans la liste des timesheets en attente.")
    
    # Prepare email content
    subject = "Rappel: Timesheet à compléter"
    body = f"""
    Bonjour {pending.first_name} {pending.last_name},
    
    Ce message est un rappel pour compléter votre timesheet pour la semaine en cours.
    Veuillez accéder au système et remplir votre timesheet dès que possible.
    
    Cordialement,
    {user.prenom} {user.nom}
    {user.departement} - KPMG
    """
    
    # Send email in background to avoid blocking the request
    background_tasks.add_task(send_email_background, collaborator_email, subject, body)
    
    # After sending the reminder, remove the entry from pending timesheets
    try:
        db.delete(pending)
        db.commit()
        print(f"✅ Deleted pending timesheet entry for {collaborator_email}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting pending timesheet entry: {e}")
        # Continue without failing the request
    
    return {"message": f"Rappel envoyé à {pending.first_name} {pending.last_name} ({collaborator_email})."}

@app.post("/send_timesheet_reminder_all")
def send_timesheet_reminder_all(
    user_email: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send reminders to all collaborators with pending timesheets"""
    # Validate the user
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur non trouvé.")
    
    # Find all collaborators with pending timesheets for this user
    pending_list = db.query(PendingTimesheet).filter(
        PendingTimesheet.uploaded_by == user.id
    ).all()
    
    if not pending_list:
        raise HTTPException(status_code=404, detail="Aucun collaborateur trouvé avec des timesheets en attente.")
    
    # Send reminders to all collaborators
    recipient_count = 0
    for pending in pending_list:
        subject = "Rappel: Timesheet à compléter"
        body = f"""
        Bonjour {pending.first_name} {pending.last_name},
        
        Ce message est un rappel pour compléter votre timesheet pour la semaine en cours.
        Veuillez accéder au système et remplir votre timesheet dès que possible.
        
        Cordialement,
        {user.prenom} {user.nom}
        {user.departement} - KPMG
        """
        
        # Send email in background
        background_tasks.add_task(send_email_background, pending.email, subject, body)
        recipient_count += 1
    
    # After sending all reminders, remove all pending timesheet entries for this user
    try:
        db.query(PendingTimesheet).filter(
            PendingTimesheet.uploaded_by == user.id
        ).delete()
        db.commit()
        print(f"✅ Deleted all pending timesheet entries for user {user_email}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting pending timesheet entries: {e}")
        # Continue without failing the request
    
    return {"message": f"Rappels envoyés à {recipient_count} collaborateurs."}

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

@app.delete("/delete_collaborator/{project_id}/{collaborateur_id}")
def delete_collaborator(project_id: int, collaborateur_id: str, user_email: str, db: Session = Depends(get_db)):
    print(f"[Server Delete] Attempting to delete Collaborateur ID: {collaborateur_id} from Project ID: {project_id} for User: {user_email}")
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"[Server Delete Error] User not found: {user_email}")
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    # Verify the project belongs to the user
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        print(f"[Server Delete Error] Project {project_id} not found or does not belong to user {user_email}")
        raise HTTPException(status_code=404, detail="Projet introuvable ou accès non autorisé.")

    try:
        # Find the specific collaborator to delete
        # We query by project_id first, then iterate to match the string ID
        collaborators = db.query(Collaborateur).filter(Collaborateur.project_id == project_id).all()
        collaborator_to_delete = None
        for collab in collaborators:
            if str(collab.id) == collaborateur_id:
                collaborator_to_delete = collab
                break
        
        if not collaborator_to_delete:
            print(f"[Server Delete Error] Collaborator {collaborateur_id} not found in Project {project_id}")
            raise HTTPException(status_code=404, detail="Collaborateur introuvable.")

        # Delete the found collaborator
        print(f"[Server Delete] Found collaborator: ID {collaborator_to_delete.id}, Name: {collaborator_to_delete.prenom} {collaborator_to_delete.nom}. Deleting now.")
        db.delete(collaborator_to_delete)
        db.commit()
        
        print(f"[Server Delete] Successfully deleted Collaborateur ID: {collaborateur_id} from Project ID: {project_id}")
        return {"message": "Collaborateur supprimé avec succès."}

    except Exception as e:
        db.rollback()
        print(f"[Server Delete Error] Error during deletion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du collaborateur: {str(e)}")

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

class FeedbackSchema(BaseModel):
    collaborator_name: str
    feedback: str
    user_email: str
    department: str

@app.post("/add_feedback")
def add_feedback(feedback: FeedbackSchema, db: Session = Depends(get_db)):
    print(f"Adding feedback for collaborator: {feedback.collaborator_name} by user email: {feedback.user_email}")
    
    user = db.query(User).filter(User.email == feedback.user_email).first()
    if not user:
        print(f"User not found: {feedback.user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"User found: ID={user.id}, Name={user.prenom} {user.nom}, Dept={user.departement}, Poste={user.poste}")
    
    # Perform French sentiment analysis using TextBlob-fr with negation override
    try:
        # 1. Decode and clean the input text
        try:
            feedback_text = feedback.feedback.encode('utf-8').decode('utf-8')
        except UnicodeDecodeError:
            feedback_text = feedback.feedback
            print("Warning: Could not decode feedback text as UTF-8, using original.")

        cleaned_text = " ".join(feedback_text.lower().split())
        print(f"Cleaned feedback text for analysis: '{cleaned_text}'")

        # 2. Initialize default sentiment
        sentiment_polarity = 0.0
        is_recommended = False
        analysis_successful = False
        negation_found = False

        # 3. Explicit Negation/Negative Keyword Check (PRIORITY)
        negation_patterns = [
            "ne recommande pas", "ne le recommande pas", "pas recommandé",
            "ne recommande plus", "déconseille", "pas bien", "pas bon",
            "n'est pas", "n'est pas bon", "n'est pas bien", "n'est pas recommandé",
            "mauvais", "horrible", "terrible", "décevant", "médiocre", "incompétent",
            "ajouté rien", "n'a rien ajouté", "ne fait rien", "pas utile","incompétente","ne respecte pas",
        ]
        for pattern in negation_patterns:
            if pattern in cleaned_text:
                print(f"Explicit negation/negative pattern found: '{pattern}'. Forcing negative recommendation.")
                negation_found = True
                is_recommended = False
                sentiment_polarity = -0.5 # Force a clear negative score
                break # Stop checking once a negative pattern is found

        # 4. Analyze sentiment using TextBlob-fr ONLY IF no negation was found
        if not negation_found:
            try:
                try:
                    from textblob_fr import PatternTagger, PatternAnalyzer
                except ImportError:
                    print("Error: textblob-fr library not found. Please run 'pip install textblob-fr'")
                    raise
                # Removed NLTK download check as requested

                # Perform the analysis
                tb_fr = TextBlob(cleaned_text, pos_tagger=PatternTagger(), analyzer=PatternAnalyzer())
                calculated_polarity = tb_fr.sentiment[0]
                print(f"TextBlob-Fr raw analysis: polarity={calculated_polarity:.2f}")
                analysis_successful = True

                # Determine recommendation based on polarity (threshold > 0.0)
                is_recommended = calculated_polarity > 0.0
                sentiment_polarity = calculated_polarity # Use the calculated score

            except Exception as analysis_error:
                print(f"Error during TextBlob-fr analysis: {analysis_error}")
                # Fallback to neutral if TextBlob-fr fails AND no negation was found
                sentiment_polarity = 0.0
                is_recommended = False
                analysis_successful = False
        else:
             # If negation was found earlier, skip TextBlob-fr analysis entirely for sentiment
             print("Skipping TextBlob-fr analysis due to prior negation detection.")
             analysis_successful = False # Mark as unsuccessful because we relied on pattern

        print(f"Final French sentiment: polarity={sentiment_polarity:.2f}, is_recommended={is_recommended}, negation_found={negation_found}, analysis_success={analysis_successful}")

    except Exception as e:
        # 5. General fallback if anything unexpected happens
        print(f"General error in sentiment analysis pipeline: {str(e)}")
        sentiment_polarity = 0.0 # Default to neutral
        is_recommended = False # Default to not recommended

    new_feedback = CollaboratorFeedback(
        collaborator_name=feedback.collaborator_name,
        feedback=feedback.feedback,
        department=feedback.department,
        created_by=user.id,
        is_recommended=is_recommended # Use the result from TextBlob
    )
    
    db.add(new_feedback)
    
    # Create notifications for all users in the same department except the creator
    department_users = db.query(User).filter(
        User.departement == feedback.department,
        User.id != user.id
    ).all()
    
    print(f"Creating notifications for {len(department_users)} users in department {feedback.department}")
    
    feedback_creator = f"{user.prenom} {user.nom}"
    
    for dept_user in department_users:
        print(f"  - Creating notification for user: {dept_user.id} ({dept_user.prenom} {dept_user.nom})")
        notification = Notification(
            user_id=dept_user.id,
            type="feedback",
            message=f"L'utilisateur {feedback_creator} a ajouté un nouveau feedback pour {feedback.collaborator_name}. Consultez la section Choix.",
            collaborator_name=feedback.collaborator_name,
            created_by=feedback_creator,
            department=feedback.department,
            is_read=False
        )
        db.add(notification)
    
    db.commit()
    db.refresh(new_feedback)
    
    print(f"Feedback added successfully, ID: {new_feedback.id}")
    
    return {"status": "success", "message": "Feedback added successfully", "is_recommended": is_recommended, "score": sentiment_polarity}

@app.get("/get_feedbacks")
def get_feedbacks(user_email: str, department: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    feedbacks = db.query(CollaboratorFeedback).filter(
        CollaboratorFeedback.department == department
    ).all()
    
    result = []
    for feedback in feedbacks:
        feedback_user = db.query(User).filter(User.id == feedback.created_by).first()
        
        # Only include recommendation status for managers from the same department
        include_recommendation = user.departement == department and user.poste.lower().find("manager") != -1
        
        feedback_data = {
            "collaborator_name": feedback.collaborator_name,
            "feedback": feedback.feedback,
            "created_by": f"{feedback_user.prenom} {feedback_user.nom}",
            "created_at": feedback.created_at.isoformat()
        }
        
        # Only include recommendation info for managers from the same department
        if include_recommendation:
            feedback_data["is_recommended"] = feedback.is_recommended
        
        result.append(feedback_data)
    
    return result

@app.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(user_email: str, db: Session = Depends(get_db)):
    print(f"Getting notifications for user email: {user_email}")
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"User not found for email: {user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"User found: ID={user.id}, Name={user.prenom} {user.nom}, Dept={user.departement}")
    
    notifications = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    
    print(f"Found {len(notifications)} unread notifications for user {user_email}")
    for notif in notifications:
        print(f"  - ID: {notif.id}, Type: {notif.type}, Created by: {notif.created_by}, Message: {notif.message[:50]}...")
    
    return notifications

@app.put("/mark_notification_read/{notification_id}")
def mark_notification_read(notification_id: int, user_email: str, db: Session = Depends(get_db)):
    print(f"Marking notification {notification_id} as read for user {user_email}")
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"User not found: {user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user.id
    ).first()
    
    if not notification:
        print(f"Notification {notification_id} not found for user {user.id}")
        raise HTTPException(status_code=404, detail="Notification not found")
    
    print(f"Found notification: {notification.id} - {notification.message[:50]}...")
    notification.is_read = True
    db.commit()
    print(f"Notification {notification_id} marked as read")
    
    return {"status": "success", "message": "Notification marked as read"}

@app.put("/mark_all_notifications_read")
def mark_all_notifications_read(user_email: str, db: Session = Depends(get_db)):
    print(f"Marking all notifications as read for user {user_email}")
    
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"User not found: {user_email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    unread_count = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).count()
    
    print(f"Found {unread_count} unread notifications for user {user.id}")
    
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True})
    
    db.commit()
    print(f"All {unread_count} notifications marked as read for user {user.id}")
    
    return {"status": "success", "message": "All notifications marked as read"}

@app.post("/update_project")
def update_project(user_email: str, project: dict, db: Session = Depends(get_db)):
    print(f"Updating project: {project.get('project_id')} for user: {user_email}")
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    try:
        # Find the project to update
        project_id = project.get("project_id")
        if not project_id:
            raise HTTPException(status_code=400, detail="ID du projet manquant.")
        
        # Convert project_id to int if needed
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            print(f"[Server] Warning: Could not convert project_id '{project_id}' to int, using as is.")
            # Keep as is if not convertible to int
            pass
        
        db_project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
        if not db_project:
            print(f"[Server] Error: Project {project_id} not found for user {user_email}")
            raise HTTPException(status_code=404, detail="Projet introuvable.")
        
        # Update basic project info
        db_project.nom = project.get("nom", db_project.nom)
        
        # Safely parse dates with error handling
        try:
            if "start_date" in project:
                db_project.start_date = datetime.fromisoformat(project.get("start_date").replace('Z', '+00:00'))
        except (ValueError, AttributeError, TypeError) as e:
            print(f"[Server] Warning: Error parsing start_date: {str(e)}")
            
        try:
            if "end_date" in project:
                db_project.end_date = datetime.fromisoformat(project.get("end_date").replace('Z', '+00:00'))
        except (ValueError, AttributeError, TypeError) as e:
            print(f"[Server] Warning: Error parsing end_date: {str(e)}")
            
        # Get current collaborators and format their IDs as strings for comparison
        current_collabs = db.query(Collaborateur).filter(Collaborateur.project_id == project_id).all()
        current_collab_ids = [str(c.id) for c in current_collabs]
        print(f"[Server] Current collaborator IDs in database: {current_collab_ids}")
        
        # Get the list of collaborator IDs from the request as strings
        new_collab_ids = []
        for collab in project.get("collaborateurs", []):
            if "id" in collab:
                new_collab_ids.append(str(collab["id"]))
        print(f"[Server] New collaborator IDs from frontend: {new_collab_ids}")
        
        # Find IDs to delete (in current but not in new)
        ids_to_delete = set(current_collab_ids) - set(new_collab_ids)
        print(f"[Server] Collaborator IDs to be deleted: {ids_to_delete}")
        
        # Delete only the specific collaborators that were removed
        if ids_to_delete:
            for collab_id in ids_to_delete:
                # Find collaborator with matching string ID
                for collab in current_collabs:
                    if str(collab.id) == collab_id:
                        print(f"[Server] Deleting collaborator with ID {collab.id}")
                        db.delete(collab)
                        break
        
        # Add new collaborators (not in current)
        for collab_data in project.get("collaborateurs", []):
            collab_id = str(collab_data.get("id", ""))
            
            # Skip existing collaborators - don't update them
            if collab_id and collab_id in current_collab_ids:
                print(f"[Server] Skipping existing collaborator with ID {collab_id}")
                continue
                
            # This is a new collaborator - add it
            print(f"[Server] Adding new collaborator: {collab_data.get('prenom')} {collab_data.get('nom')}")
            
            # Handle non-evaluated state (null values or "Non évalué" string)
            respect_delais = collab_data.get("respect_delais", 0)
            if respect_delais is None or respect_delais == "Non évalué":
                respect_delais = 0
                
            participation = collab_data.get("participation", 0)
            if participation is None or participation == "Non évalué":
                participation = 0
                
            resolution_problemes = collab_data.get("resolution_problemes", 0)
            if resolution_problemes is None or resolution_problemes == "Non évalué":
                resolution_problemes = 0
                
            note_finale = collab_data.get("note_finale", 0)
            if note_finale is None or note_finale == "Non évalué":
                note_finale = 0
            
            # If any of these are strings, convert them
            try:
                respect_delais = float(respect_delais)
            except (ValueError, TypeError):
                respect_delais = 0
                
            try:
                participation = float(participation)
            except (ValueError, TypeError):
                participation = 0
                
            try:
                resolution_problemes = float(resolution_problemes)
            except (ValueError, TypeError):
                resolution_problemes = 0
                
            try:
                note_finale = float(note_finale)
            except (ValueError, TypeError):
                note_finale = 0
            
            new_collab = Collaborateur(
                nom=collab_data.get("nom"),
                prenom=collab_data.get("prenom"),
                grade=collab_data.get("grade"),
                respect_delais=respect_delais,
                participation=participation,
                resolution_problemes=resolution_problemes,
                note_finale=note_finale,
                project_id=project_id
            )
            db.add(new_collab)
        
        db.commit()
        print(f"[Server] Project {project_id} updated successfully")
        return {"message": "Projet mis à jour avec succès."}
    except Exception as e:
        db.rollback()
        print(f"[Server] Error updating project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@app.get("/get_active_projects")
def get_active_projects(user_email: str, db: Session = Depends(get_db)):
    """
    Get all active projects (projects with end_date in the future) for the current user
    """
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        
    # Get current date
    current_date = datetime.utcnow()
    
    # Query projects where end_date is in the future
    projects = db.query(Project).filter(
        Project.user_id == user.id,
        Project.end_date > current_date
    ).all()
    
    # Convert to response format
    response = []
    for project in projects:
        project_data = {
            "id": project.id,
            "nom": project.nom,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "collaborateurs_count": len(project.collaborateurs)
        }
        response.append(project_data)
    
    return response

@app.post("/add_collaborator_to_project")
def add_collaborator_to_project(user_email: str, data: dict, db: Session = Depends(get_db)):
    """
    Add a collaborator to a project
    """
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    
    project_id = data.get("project_id")
    collaborator_data = data.get("collaborateur")
    
    if not project_id or not collaborator_data:
        raise HTTPException(status_code=400, detail="Données incomplètes. L'ID du projet et les données du collaborateur sont requis.")
    
    # Verify the project belongs to the user
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable ou accès non autorisé.")
        
    # Check if a collaborator with the same name and first name already exists in this project
    existing_collaborator = db.query(Collaborateur).filter(
        Collaborateur.project_id == project_id,
        Collaborateur.nom == collaborator_data.get("nom"),
        Collaborateur.prenom == collaborator_data.get("prenom")
    ).first()
    
    if existing_collaborator:
        raise HTTPException(status_code=400, detail="Un collaborateur avec ce nom existe déjà dans ce projet.")
    
    # Create new collaborator - ensure note_finale is numeric for database storage
    try:
        # For non-evaluated collaborators, store 0 in the database but display "Non évalué" in frontend
        # The frontend will interpret the 0 value as "Non évalué" for display purposes
        new_collaborator = Collaborateur(
            nom=collaborator_data.get("nom"),
            prenom=collaborator_data.get("prenom"),
            grade=collaborator_data.get("grade", "junior1"),  # Default to junior1 if not provided
            respect_delais=0,  # Store as 0 instead of None
            participation=0,   # Store as 0 instead of None
            resolution_problemes=0, # Store as 0 instead of None
            note_finale=0,  # Store as 0 in the database instead of "Non évalué"
            project_id=project_id
        )
        
        db.add(new_collaborator)
        db.commit()
        db.refresh(new_collaborator)
        return {"message": "Collaborateur ajouté au projet avec succès.", "id": new_collaborator.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout du collaborateur: {str(e)}")







