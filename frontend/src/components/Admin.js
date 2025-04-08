import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaUserShield, FaUsers, FaTrash, FaKey, FaSignOutAlt, FaBars, FaUserPlus,
  FaChartLine, FaSearch, FaFilter, FaUserCog
} from "react-icons/fa";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Admin.css";
import logo from "../assets/kpmglogo.png";
import naptaLogo from "../assets/napta.png";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    departement: "",
    poste: ""
  });

  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("user"));

  const showNotification = useCallback((type, message) => {
    alert(message); // Using alert instead of notifications state
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!admin?.email) return;
    try {
      const res = await axios.get(`http://127.0.0.1:8000/admin/users?user_email=${admin.email}`);
      const filteredUsers = res.data.filter((user) => user.email !== admin.email);
      setUsers(filteredUsers);
    } catch (err) {
      showNotification("error", err.response?.data?.detail || "Erreur lors du chargement des utilisateurs");
    }
  }, [admin?.email, showNotification]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = async (userEmail) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    
    try {
      await axios.delete(`http://127.0.0.1:8000/admin/delete_user?admin_email=${admin.email}&user_email=${userEmail}`);
      setUsers(users.filter((u) => u.email !== userEmail));
      showNotification("success", "Utilisateur supprimé avec succès");
    } catch (err) {
      showNotification("error", err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const validatePassword = (password) => {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[@$!%*?&]/.test(password);
    
    if (password.length < minLength) {
      return "Le mot de passe doit contenir au moins 12 caractères";
    }
    if (!hasUpperCase) {
      return "Le mot de passe doit contenir au moins une majuscule";
    }
    if (!hasNumber) {
      return "Le mot de passe doit contenir au moins un chiffre";
    }
    if (!hasSymbol) {
      return "Le mot de passe doit contenir au moins un symbole (@$!%*?&)";
    }
    return null;
  };

  const resetPassword = async (userEmail) => {
    const newPassword = prompt("Entrez le nouveau mot de passe:");
    if (!newPassword) return;

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      showNotification("error", passwordError);
      return;
    }

    try {
      await axios.post(
        "http://127.0.0.1:8000/admin/reset_password",
        null,
        {
          params: {
            admin_email: admin.email,
            user_email: userEmail,
            new_password: newPassword
          }
        }
      );
      showNotification("success", "Mot de passe réinitialisé avec succès!"); 
    } catch (err) {
      showNotification("error", err.response?.data?.detail || "Erreur lors de la réinitialisation");
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.nom || !newUser.prenom || !newUser.departement || !newUser.poste) {
      showNotification("error", "Tous les champs sont obligatoires!");
      return;
    }

    const passwordError = validatePassword(newUser.password);
    if (passwordError) {
      showNotification("error", passwordError);
      return;
    }

    try {
      const userData = {
        email: newUser.email,
        password: newUser.password,
        nom: newUser.nom,
        prenom: newUser.prenom,
        departement: newUser.departement,
        poste: newUser.poste
      };

      const response = await axios.post(
        `http://127.0.0.1:8000/admin/create_user?admin_email=${admin.email}`,
        userData
      );

      if (response.data.message) {
        showNotification("success", response.data.message);
        setUsers([...users, { 
          email: newUser.email,
          nom: newUser.nom,
          prenom: newUser.prenom,
          departement: newUser.departement,
          poste: newUser.poste
        }]);
        setShowModal(false);
        setNewUser({ 
          email: "", 
          password: "", 
          nom: "", 
          prenom: "", 
          departement: "", 
          poste: ""
        });
      }
    } catch (err) {
      console.error("Error creating user:", err);
      const errorMessage = err.response?.data?.detail || "Erreur lors de la création de l'utilisateur";
      showNotification("error", errorMessage);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || user.departement === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departments = [...new Set(users.map(user => user.departement))];

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "" : "closed"}`}>
        <div className="sidebar-header">
          <img src={logo} alt="KPMG Logo" className="logo-sidebar" />
          {isSidebarOpen && <h2>Admin Panel</h2>}
          <button 
            type="button"
            className="toggle-btn" 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <FaBars />
          </button>
        </div>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/adminrap" className="nav-link">
              <FaChartLine /> {isSidebarOpen && <span>Rapports</span>}
            </Link>
          </li>
          <li className="nav-item active">
            <FaUserShield /> {isSidebarOpen && <span>Gérer les utilisateurs</span>}
          </li>
          <li className="nav-item">
            <FaUserCog /> {isSidebarOpen && <span>Paramètres</span>}
          </li>
          <li className="logout" onClick={handleLogout}>
            <FaSignOutAlt /> {isSidebarOpen && <span>Déconnexion</span>}
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div className="admin-header">
          <div className="header-left">
            <img src={naptaLogo} alt="Napta Logo" className="logo-header" />
            <h1>
              Bienvenue, <span className="user-name">{admin ? `${admin.prenom} ${admin.nom}` : ""}</span>
            </h1>
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h2 className="admin-title">
              <FaUsers /> Gestion des utilisateurs
            </h2>
            <button 
              type="button"
              className="btn btn-success" 
              onClick={() => setShowModal(true)}
            >
              <FaUserPlus /> Ajouter un utilisateur
            </button>
          </div>

          {/* Search and Filter */}
          <div className="search-filter-container">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search users"
              />
            </div>
            <div className="filter-box">
              <FaFilter />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                aria-label="Filter by department"
              >
                <option value="">Tous les départements</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Users */}
          <div className="table-responsive admin-table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Poste</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.email}>
                    <td>{user.email}</td>
                    <td>{user.nom}</td>
                    <td>{user.prenom}</td>
                    <td>{user.poste}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          type="button"
                          className="btn btn-info me-2" 
                          onClick={() => resetPassword(user.email)}
                          title="Réinitialiser le mot de passe"
                          aria-label="Réinitialiser le mot de passe"
                        >
                          <FaKey />
                        </button>
                        <button 
                          type="button"
                          className="btn btn-danger" 
                          onClick={() => deleteUser(user.email)}
                          title="Supprimer"
                          aria-label="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Adding User */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Ajouter un utilisateur</h3>
            <div className="form-group">
              <input 
                type="email" 
                placeholder="Email" 
                value={newUser.email} 
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                aria-label="Email"
              />
            </div>
            <div className="form-group">
              <input 
                type="password" 
                placeholder="" 
                value={newUser.password} 
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                aria-label="Mot de passe"
              />
              <small className="password-requirements">
                Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole (@$!%*?&)
              </small>
            </div>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Nom" 
                value={newUser.nom} 
                onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
                aria-label="Nom"
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Prénom" 
                value={newUser.prenom} 
                onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })}
                aria-label="Prénom"
              />
            </div>
            <div className="form-group">
              <select 
                value={newUser.departement} 
                onChange={(e) => setNewUser({ ...newUser, departement: e.target.value })}
                aria-label="Département"
              >
                <option value="">Sélectionnez un département</option>
                <option value="Audit">Audit</option>
                <option value="Audit IFRS">Audit IFRS</option>
                <option value="Strategy & Deal Advisory">Strategy & Deal Advisory</option>
                <option value="IT Risk">IT Risk</option>
                <option value="Technology">Technology</option>
                <option value="Tax">Tax</option>
                <option value="Tax Compliance">Tax Compliance</option>
                <option value="Tax Payroll">Tax Payroll</option>
                <option value="TMC">TMC</option>
                <option value="Legal">Legal</option>
                <option value="Finance">Finance</option>
                <option value="RM">RM</option>
                <option value="RH">RH</option>
                <option value="Management Consulting">Management Consulting</option>
              </select>
            </div>
            <div className="form-group">
              <select 
                value={newUser.poste} 
                onChange={(e) => setNewUser({ ...newUser, poste: e.target.value })}
                aria-label="Poste"
              >
                <option value="">Sélectionnez un poste</option>
                <option value="Assistant Manager 1">Assistant Manager 1</option>
                <option value="Assistant Manager 2">Assistant Manager 2</option>
                <option value="Manager 1">Manager 1</option>
                <option value="Manager 2">Manager 2</option>
                <option value="Manager 3">Manager 3</option>
                <option value="Senior Manager 1">Senior Manager 1</option>
                <option value="Senior Manager 2">Senior Manager 2</option>
                <option value="Senior Manager 3">Senior Manager 3</option>
                <option value="Senior Manager 4">Senior Manager 4</option>
                <option value="Director 1">Director 1</option>
                <option value="Director 2">Director 2</option>
                <option value="Partner">Partner</option>
              </select>
            </div>
            <div className="modal-buttons">
              <button 
                type="button"
                className="btn btn-success" 
                onClick={handleCreateUser}
              >
                Ajouter
              </button>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
