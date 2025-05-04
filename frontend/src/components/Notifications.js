import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaBell, 
  FaEnvelope, 
  FaCheckCircle, 
  FaArrowLeft, 
  FaExclamationTriangle, 
  FaSearch, 
  FaFilter, 
  FaSort, 
  FaChartLine,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
  FaPaperPlane,
  FaClock,
  FaTimes,
  FaUser,
  FaComment,
  FaCheck
} from "react-icons/fa";
import "../styles/Notifications.css";
import axios from "axios";
import { Link } from "react-router-dom";

function Notifications() {
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" or "department"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const [sendingReminders, setSendingReminders] = useState({});
  const [sentToAll, setSentToAll] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [feedbackNotifications, setFeedbackNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const navigate = useNavigate();

  // Get current user info
    const user = JSON.parse(localStorage.getItem("user"));
    const userEmail = user ? user.email : null;

  // Get unique departments for filtering
  const departments = ['all', ...new Set(collaborateurs.map(collab => collab.department))].filter(Boolean);

  // Fetch Timesheet data
  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
  
    axios.get(`http://localhost:8000/pending_timesheets?user_email=${userEmail}`)
      .then(response => {
        setCollaborateurs(response.data.map((collab, index) => ({
          id: index + 1,
          name: `${collab.first_name} ${collab.last_name}`,
          email: collab.email,
          department: collab.department,
          lastActive: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString(), // Mock data
          daysOverdue: Math.floor(Math.random() * 10) + 1 // Mock data for demo
        })));
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des collaborateurs pour timesheet:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userEmail]);
      
  // Fetch Feedback Notifications
  useEffect(() => {
    const fetchAndMarkNotifications = async () => {
      if (!userEmail) {
        setLoadingNotifications(false);
        return;
      }
      
      setLoadingNotifications(true);
      try {
        console.log("[Notifications] Fetching notifications for user:", userEmail);
        const response = await axios.get(`http://localhost:8000/notifications?user_email=${userEmail}`);
        console.log("[Notifications] Raw response:", response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Filter for only feedback notifications
          const feedbacks = response.data.filter(notif => notif.type === 'feedback');
          console.log("[Notifications] Setting feedback notifications:", feedbacks);
          setFeedbackNotifications(feedbacks);
          
          // If notifications were fetched, mark them as read on the backend
          if (feedbacks.length > 0) {
            try {
              console.log("[Notifications] Marking all notifications as read for user:", userEmail);
              await axios.put(`http://localhost:8000/mark_all_notifications_read?user_email=${userEmail}`);
              console.log("[Notifications] Successfully marked notifications as read.");
            } catch (markError) {
              console.error("[Notifications] Error marking notifications as read:", markError);
            }
          }
        } else {
          console.log("[Notifications] No notification data received or invalid format.");
          setFeedbackNotifications([]); // Ensure it's an empty array
        }
      } catch (fetchError) {
        console.error("[Notifications] Erreur lors de la récupération des notifications:", fetchError);
        setFeedbackNotifications([]); // Clear on error
      } finally {
        setLoadingNotifications(false);
      }
    };
    
    fetchAndMarkNotifications();
  }, [userEmail]); // Rerun when userEmail changes
  

  // Filter and sort collaborators
  const filteredAndSortedCollaborateurs = collaborateurs
    .filter(collab => 
      (collab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       collab.department.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterDepartment === 'all' || collab.department === filterDepartment)
    )
    .sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") {
        return order * a.name.localeCompare(b.name);
      } else if (sortBy === "department") {
        return order * a.department.localeCompare(b.department);
      } else if (sortBy === "overdue") {
        return order * (a.daysOverdue - b.daysOverdue);
      }
      return 0;
    });

  // ✅ Envoyer un rappel par mail (Simulé)
  const sendReminder = (email) => {
    setSendingReminders(prev => ({ ...prev, [email]: true }));
    
    // Call the actual API endpoint
    axios.post('http://localhost:8000/send_timesheet_reminder', null, {
      params: {
        user_email: userEmail,
        collaborator_email: email
      }
    })
    .then(response => {
      console.log("Reminder sent successfully:", response.data);
      // Remove the collaborator from the list after successful reminder
      setCollaborateurs(collaborateurs.filter((collab) => collab.email !== email));
    })
    .catch(error => {
      console.error("Error sending reminder:", error);
      alert("Erreur lors de l'envoi du rappel. Veuillez réessayer.");
    })
    .finally(() => {
      setSendingReminders(prev => ({ ...prev, [email]: false }));
    });
  };

  // ✅ Envoyer un rappel à tous les collaborateurs
  const sendReminderToAll = () => {
    if (filteredAndSortedCollaborateurs.length === 0) return;
    
    setSentToAll(true);
    
    // Call the actual API endpoint
    axios.post('http://localhost:8000/send_timesheet_reminder_all', null, {
      params: {
        user_email: userEmail
      }
    })
    .then(response => {
      console.log("Reminders sent to all successfully:", response.data);
      // Remove all collaborators after successful reminders
      setCollaborateurs(collaborateurs.filter(collab => 
        !filteredAndSortedCollaborateurs.some(filtered => filtered.id === collab.id)
      ));
    })
    .catch(error => {
      console.error("Error sending reminders to all:", error);
      alert("Erreur lors de l'envoi des rappels. Veuillez réessayer.");
    })
    .finally(() => {
      setSentToAll(false);
    });
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Get status indicator class based on days overdue
  const getStatusClass = (daysOverdue) => {
    if (daysOverdue <= 3) return "status-normal";
    if (daysOverdue <= 7) return "status-warning";
    return "status-danger";
  };
  
  // Mark a notification as read
  const dismissNotification = async (notificationId) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.email) return;
    
    try {
      await axios.put(`http://localhost:8000/mark_notification_read/${notificationId}?user_email=${user.email}`);
      setFeedbackNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="notifications-container">
      {/* Header Section */}
      <div className="notifications-header">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <FaArrowLeft className="back-icon" /> 
          <span>Retour au Dashboard</span>
        </button>
        <h2 className="notifications-title">
          <FaBell className="header-icon" /> Gestion des Notifications
        </h2>
      </div>
      
      {/* Feedback Notifications Section */}
      <div className="feedback-section-container">
        {loadingNotifications ? (
          <div className="loading-notifications">
            <div className="spinner"></div>
            <p>Chargement des notifications...</p>
        </div>
        ) : feedbackNotifications.length > 0 ? (
          <div className="feedback-notifications-section">
            <div className="feedback-notifications-header">
              <FaComment className="feedback-icon" />
              <h3 className="feedback-title">Nouveaux Feedbacks</h3>
        </div>

            <div className="feedback-cards">
              {feedbackNotifications.map((notification) => (
                <div key={notification.id} className="feedback-notification-card">
                  <div className="notification-content">
                    <div className="notification-avatar">
                      {notification.created_by.split(' ').map(name => name[0]).join('')}
                    </div>
                    <div className="notification-details">
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      <div className="notification-time">
                        <FaClock className="time-icon" />
                        <span>{formatDate(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="notification-actions">
                    <Link to="/choix" className="view-button">
                      <FaComment className="view-icon" />
                      <span>Voir les feedbacks</span>
                    </Link>
                    <button 
                      className="dismiss-button"
                      onClick={() => dismissNotification(notification.id)}
                      title="Marquer comme lu"
                    >
                      <FaCheck />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-feedback-notifications">
            <div className="empty-state-icon">
              <FaComment />
            </div>
            <h3>Aucune notification de feedback</h3>
            <p>Vous n'avez pas de nouvelles notifications de feedback pour le moment.</p>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Left Sidebar - Stats and Filters */}
        <div className="left-sidebar">
          {/* Dashboard Stats */}
          <div className="panel stats-panel">
            <h3 className="panel-title">
              <FaChartLine className="panel-icon" /> Tableau de Bord
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon pending-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{collaborateurs.length}</div>
                  <div className="stat-label">
                    En attente
                  </div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon department-icon">
                  <FaBuilding />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{departments.length - 1}</div>
                  <div className="stat-label">
                    Départements
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filters Panel */}
          <div className="panel filters-panel">
            <h3 className="panel-title">
              <FaFilter className="panel-icon" /> Filtres
            </h3>
            
            <div className="filter-content">
              {/* Search Box */}
              <div className="search-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom ou département..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
                  {searchTerm && (
                    <button className="clear-search" onClick={() => setSearchTerm("")}>
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {/* Department Filter */}
              <div className="filter-group">
                <label className="filter-label">Département</label>
                <div className="select-wrapper">
                  <select 
                    className="filter-select" 
                    value={filterDepartment} 
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <option value="all">Tous les départements</option>
                    {departments.filter(d => d !== 'all').map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
          </div>

              {/* Sort Controls */}
              <div className="sort-controls">
                <div className="sort-group">
                  <label className="sort-label">Trier par</label>
          <div className="sort-options">
            <button 
              className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
              onClick={() => setSortBy("name")}
            >
                      <FaUser className="sort-icon" /> Nom
            </button>
            <button 
              className={`sort-btn ${sortBy === "department" ? "active" : ""}`}
              onClick={() => setSortBy("department")}
            >
                      <FaBuilding className="sort-icon" /> Département
            </button>
            <button 
                      className={`sort-btn ${sortBy === "overdue" ? "active" : ""}`}
                      onClick={() => setSortBy("overdue")}
                    >
                      <FaClock className="sort-icon" /> Retard
                    </button>
                  </div>
                </div>
                
                <button 
                  className="order-btn"
              onClick={toggleSortOrder}
                  title={sortOrder === "asc" ? "Ordre croissant" : "Ordre décroissant"}
            >
                  <FaSort className={`order-icon ${sortOrder === "desc" ? "desc" : ""}`} />
                  <span>{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Collaborator List */}
        <div className="content-area">
          <div className="panel notifications-list-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <FaUsers className="panel-icon" /> Collaborateurs ({filteredAndSortedCollaborateurs.length})
              </h3>
              
              {filteredAndSortedCollaborateurs.length > 0 && (
                <button 
                  className={`send-all-btn ${sentToAll ? 'sending' : ''}`}
                  onClick={sendReminderToAll}
                  disabled={sentToAll}
                >
                  {sentToAll ? (
                    <>
                      <div className="button-spinner"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="btn-icon" />
                      <span>Envoyer à tous</span>
                    </>
                  )}
                </button>
              )}
            </div>
                  
            <div className="panel-content">
          {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Chargement des notifications...</p>
                </div>
          ) : filteredAndSortedCollaborateurs.length > 0 ? (
                <div className="collaborators-grid">
              {filteredAndSortedCollaborateurs.map((collab) => (
                <div key={collab.id} className="notification-card">
                      <div className="notification-status">
                        <div className={`status-indicator ${getStatusClass(collab.daysOverdue)}`}></div>
                      </div>
                      
                      <div className="notification-content">
                        <div className="collaborator-info">
                          <div className="collab-avatar">
                            {collab.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="collab-details">
                            <h4 className="collab-name">{collab.name}</h4>
                            <div className="collab-metadata">
                              <span className="department-badge">
                                <FaBuilding className="metadata-icon" />
                                {collab.department}
                              </span>
                              <span className="last-active">
                                <FaCalendarAlt className="metadata-icon" />
                                {formatDate(collab.lastActive)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="notification-message">
                          <div className="message-header">
                            <FaExclamationTriangle className="warning-icon" />
                            <span className="message-title">Timesheet non rempli</span>
                    </div>
                  </div>
                        
                        <div className="notification-actions">
                  <button 
                            className={`send-reminder-btn ${sendingReminders[collab.email] ? 'sending' : ''}`}
                    onClick={() => sendReminder(collab.email)}
                            disabled={sendingReminders[collab.email]}
                    data-email={collab.email}
                  >
                            {sendingReminders[collab.email] ? (
                              <FaCheckCircle className="success-icon" />
                            ) : (
                              <FaEnvelope className="mail-icon" />
                            )}
                            <span>
                              {sendingReminders[collab.email] ? 'Envoyé' : 'Envoyer un rappel'}
                            </span>
                  </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          ) : (
            <div className="no-notifications">
                  <div className="success-illustration">
              <FaCheckCircle className="success-icon" />
                  </div>
                  <h3 className="success-title">Tous les collaborateurs ont rempli leur timesheet</h3>
                  <p className="success-message">Vous êtes à jour avec les notifications</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;










