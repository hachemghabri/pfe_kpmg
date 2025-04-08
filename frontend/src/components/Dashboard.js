import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome, FaUsers, FaTasks, FaBell, FaChartBar, FaSignOutAlt, FaBars,
  FaChartPie, FaDatabase, FaLightbulb, FaUserCircle, FaCog, FaChevronRight
} from "react-icons/fa";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";
import analysisImg from "../assets/data-analysis.webp";
import staffingImg from "../assets/staff.webp";

function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const handleSectionClick = (section) => {
    setActiveSection(section);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "" : "closed"}`}>
        <div className="sidebar-header">
          {isSidebarOpen && <h2>Navigation</h2>}
          <button className="toggle-btn" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            <FaBars />
          </button>
        </div>

        {/* User Profile Section */}
        {isSidebarOpen && (
          <div className="user-profile">
            <div className="user-avatar-container">
              <FaUserCircle className="user-avatar" />
              <div className="user-status"></div>
            </div>
            <div className="user-info">
              <h3>{user ? `${user.prenom} ${user.nom}` : ""}</h3>
              <p>{user ? user.departement : ""}</p>
            </div>
          </div>
        )}

        <ul className="nav-list">
          <li className={`nav-item ${activeSection === 'home' ? 'active' : ''}`}>
            <Link to="/dashboard" className="nav-link" onClick={() => handleSectionClick('home')}>
              <FaHome /> {isSidebarOpen && <span>Accueil</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className={`nav-item ${activeSection === 'team' ? 'active' : ''}`}>
            <Link to="/equipe" className="nav-link" onClick={() => handleSectionClick('team')}>
              <FaUsers /> {isSidebarOpen && <span>Mon Équipe</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className={`nav-item ${activeSection === 'staffing' ? 'active' : ''}`}>
            <Link to="/choix" className="nav-link" onClick={() => handleSectionClick('staffing')}>
              <FaTasks /> {isSidebarOpen && <span>Choix staffing</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className={`nav-item ${activeSection === 'notifications' ? 'active' : ''}`}>
            <Link to="/notifications" className="nav-link" onClick={() => handleSectionClick('notifications')}>
              <FaBell /> {isSidebarOpen && <span>Notifications</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`}>
            <Link to="/rapports" className="nav-link" onClick={() => handleSectionClick('reports')}>
              <FaChartBar /> {isSidebarOpen && <span>Rapports Dynamiques</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}>
            <Link to="/settings" className="nav-link" onClick={() => handleSectionClick('settings')}>
              <FaCog /> {isSidebarOpen && <span>Paramètres</span>}
              {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
            </Link>
          </li>
          <li className="nav-item logout" onClick={handleLogout}>
            <FaSignOutAlt /> {isSidebarOpen && <span>Déconnexion</span>}
            {isSidebarOpen && <FaChevronRight className="nav-arrow" />}
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header-container">
          <div className="welcome-section text-center py-4">
            <h1 className="fade-in display-4">
              Bienvenue, <span className="user-name fw-bold">{user ? `${user.prenom} ${user.nom}` : ""}</span>
            </h1>
            <p className="welcome-subtitle text-muted">Votre tableau de bord personnel</p>
          </div>
        </div>

        {/* Enhanced Intro Section */}
        <div className="intro-section">
          <div className="intro-content">
            <div className="intro-text">
              <h2 className="mb-4"><FaLightbulb className="icon" /> Transformez vos Données en Décisions</h2>
              <p className="lead">
                Découvrez un outil puissant d'intelligence analytique conçu pour simplifier l'analyse des données et optimiser la prise de décision.
                <br />
                Avec notre plateforme, accédez à des tableaux de bord interactifs, des rapports dynamiques et des insights exploitables en un clin d'œil.
              </p>
            </div>
            <div className="intro-images">
              <div className="image-container">
                <img src={analysisImg} alt="Data Analysis" className="analysis-img" />
                <div className="image-overlay">
                  <span>Analyse de Données</span>
                </div>
              </div>
              <div className="image-container">
                <img src={staffingImg} alt="Staffing Team" className="staffing-img" />
                <div className="image-overlay">
                  <span>Gestion d'Équipe</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Improved Info Cards */}
        <div className="info-cards">
          <div 
            className={`info-card ${hoveredCard === 'team' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCard('team')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-content">
              <div className="card-icon-wrapper">
                <FaUsers className="card-icon" />
              </div>
              <h3 className="card-title">Optimisez Votre Équipe</h3>
              <p className="card-description">Suivez et gérez vos talents avec une efficacité inégalée.</p>
              <Link to="/equipe" className="card-link">
                En savoir plus <FaChevronRight className="link-arrow" />
              </Link>
            </div>
          </div>

          <div 
            className={`info-card ${hoveredCard === 'analysis' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCard('analysis')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-content">
              <div className="card-icon-wrapper">
                <FaChartPie className="card-icon" />
              </div>
              <h3 className="card-title">Analyse Intelligente</h3>
              <p className="card-description">Exploitez vos données comme jamais auparavant.</p>
              <Link to="/rapports" className="card-link">
                Voir les analyses <FaChevronRight className="link-arrow" />
              </Link>
            </div>
          </div>

          <div 
            className={`info-card ${hoveredCard === 'reports' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCard('reports')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-content">
              <div className="card-icon-wrapper">
                <FaDatabase className="card-icon" />
              </div>
              <h3 className="card-title">Rapports Avancés</h3>
              <p className="card-description">Obtenez des insights précis et instantanés.</p>
              <Link to="/rapports" className="card-link">
                Consulter <FaChevronRight className="link-arrow" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
