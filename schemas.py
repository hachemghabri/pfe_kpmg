from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str
    nom: str
    prenom: str
    departement: str
    poste: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

