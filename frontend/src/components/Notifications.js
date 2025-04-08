import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaEnvelope, FaCheckCircle, FaArrowLeft, FaUserCircle, FaExclamationTriangle, FaSearch, FaFilter, FaSort } from "react-icons/fa";
import "../styles/Notifications.css";
import axios from "axios";
import imagef from "../assets/kpmglogo.png";
import imagen from "../assets/napta.png";

function Notifications() {
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" or "department"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userEmail = user ? user.email : null;
  
    axios.get(`http://localhost:8000/pending_timesheets?user_email=${userEmail}`)
      .then(response => {
        setCollaborateurs(response.data.map((collab, index) => ({
          id: index + 1,
          name: `${collab.first_name} ${collab.last_name}`,
          email: collab.email,
          department: collab.department,
        })));
        setLoading(false);
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des collaborateurs :", error);
        setLoading(false);
      });
  }, []);
  

  // Filter and sort collaborators
  const filteredAndSortedCollaborateurs = collaborateurs
    .filter(collab => 
      collab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") {
        return order * a.name.localeCompare(b.name);
      } else {
        return order * a.department.localeCompare(b.department);
      }
    });

  // ✅ Envoyer un rappel par mail (Simulé)
  const sendReminder = (email) => {
    // Add loading state for the specific button
    const button = document.querySelector(`button[data-email="${email}"]`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<FaCheckCircle /> Envoyé';
    }
    
    // Simulate API call
    setTimeout(() => {
      setCollaborateurs(collaborateurs.filter((collab) => collab.email !== email));
    }, 1500);
  };

  // ✅ Envoyer un rappel à tous les collaborateurs
  const sendReminderToAll = () => {
    const button = document.querySelector('.send-all-btn');
    if (button) {
      button.disabled = true;
      button.innerHTML = '<FaCheckCircle /> Envoi en cours...';
    }
    
    // Simulate API call
    setTimeout(() => {
      setCollaborateurs([]);
    }, 2000);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div className="header-logos">
          <img src={imagef} alt="KPMG Logo" className="logo-left" />
          <img src={imagen} alt="Napta Logo" className="logo-right" />
        </div>
        <div className="header-content">
          <h1>
            <FaBell className="header-icon" />
            Notifications
          </h1>
          <p className="header-subtitle">Gérez les rappels de timesheet de vos collaborateurs</p>
        </div>

        <div className="header-stats">
          <div className="stat-card">
            <FaUserCircle className="stat-icon" />
            <div className="stat-info">
              <span className="stat-value">{collaborateurs.length}</span>
              <span className="stat-label">Collaborateurs en attente</span>
            </div>
          </div>
          <div className="stat-card">
            <FaExclamationTriangle className="stat-icon" />
            <div className="stat-info">
              <span className="stat-value">{collaborateurs.length > 0 ? "⚠️" : "✅"}</span>
              <span className="stat-label">Statut</span>
            </div>
          </div>
        </div>
      </div>

      <div className="notifications-content">
        {/* Search and Sort Section */}
        <div className="search-sort-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom ou département..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="sort-options">
            <button 
              className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
              onClick={() => setSortBy("name")}
            >
              <FaSort /> Nom
            </button>
            <button 
              className={`sort-btn ${sortBy === "department" ? "active" : ""}`}
              onClick={() => setSortBy("department")}
            >
              <FaFilter /> Département
            </button>
            <button 
              className="sort-btn"
              onClick={toggleSortOrder}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="notifications-list">
          {loading ? (
            <div className="loading-state">Chargement des notifications...</div>
          ) : filteredAndSortedCollaborateurs.length > 0 ? (
            <>
              {filteredAndSortedCollaborateurs.map((collab) => (
                <div key={collab.id} className="notification-card">
                  <div className="notification-info">
                    <div className="collaborator-info">
                      <FaUserCircle className="user-icon" />
                      <div className="user-details">
                        <h3>{collab.name}</h3>
                        <p className="department">{collab.department}</p>
                      </div>
                    </div>
                    <p className="notification-text">Timesheet non rempli</p>
                  </div>
                  <button 
                    className="send-mail-btn"
                    onClick={() => sendReminder(collab.email)}
                    data-email={collab.email}
                  >
                    <FaEnvelope /> Envoyer un rappel
                  </button>
                </div>
              ))}
              <button 
                className="send-all-btn"
                onClick={sendReminderToAll}
                disabled={collaborateurs.length === 0}
              >
                <FaCheckCircle /> Envoyer un rappel à tous
              </button>
            </>
          ) : (
            <div className="no-notifications">
              <FaCheckCircle className="success-icon" />
              <h3>Tous les collaborateurs ont rempli leur timesheet</h3>
              <p>Vous êtes à jour avec les notifications</p>
            </div>
          )}
        </div>
      </div>

      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        <FaArrowLeft /> Retour au Dashboard
      </button>
    </div>
  );
}

export default Notifications;
