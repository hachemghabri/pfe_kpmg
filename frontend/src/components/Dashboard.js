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
import kpmgLogo from "../assets/kpmga.png";
import naptaLogo from "../assets/naptar.png";

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
            <h1 className="fade-in display-5">
              Bienvenue, <span className="display-5 fw-bold">{user ? `${user.prenom} ${user.nom}` : ""}</span>
            </h1>
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

        {/* Footer with KPMG and Napta logos - Enhanced modern design */}
        <footer className="dashboard-footer">
          <div className="footer-wave">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120">
              <path fill="#f8fafc" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
            </svg>
          </div>
          
          <div className="footer-content-container">
            <div className="footer-content">
              <div className="footer-top">
                <div className="footer-section footer-logos-section">
                  <h4 className="footer-heading">Nos Partenaires</h4>
                  <div className="footer-logos">
                    <a href="https://kpmg.com/tn/fr/home.html" target="_blank" rel="noopener noreferrer" className="footer-logo-link">
                      <img src={kpmgLogo} alt="KPMG" className="footer-logo kpmg-logo" />
                      <span className="logo-tooltip">Visiter KPMG</span>
                    </a>
                    <a href="https://www.napta.io/en" target="_blank" rel="noopener noreferrer" className="footer-logo-link">
                      <img src={naptaLogo} alt="Napta" className="footer-logo napta-logo" />
                      <span className="logo-tooltip">Visiter Napta</span>
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="footer-divider"></div>
              
              <div className="footer-bottom">
                <div className="footer-copyright">
                  <p>&copy; {new Date().getFullYear()} - Tableau de bord KPMG | Tous droits réservés</p>
                </div>
                <div className="footer-version">
                  <p>Version 1.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
