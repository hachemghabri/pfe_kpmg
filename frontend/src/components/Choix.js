import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  FaUpload, 
  FaUser, 
  FaTrophy, 
  FaFileAlt, 
  FaArrowLeft, 
  FaFilter, 
  FaComment, 
  FaPaperPlane, 
  FaChevronDown, 
  FaChevronUp,
  FaSearch,
  FaTimes,
  FaStar,
  FaClock,
  FaUsers
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap for better UI
import "../styles/Choix.css"; // Custom styles

const Choix = () => {
  const [file, setFile] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [skillCategories, setSkillCategories] = useState([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState("");
  const [selectedSkillCategory, setSelectedSkillCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [expandedCollaborators, setExpandedCollaborators] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
  const [loadingAnimation, setLoadingAnimation] = useState(false);
  const [feedbacks, setFeedbacks] = useState({}); // Store feedbacks by collaborator name
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user ? user.email : null;
  const userDepartment = user ? user.departement : null;

  // Wrap fetchFeedbacks in useCallback to prevent infinite loops
  const fetchFeedbacks = useCallback(async () => {
    console.log("fetchFeedbacks called", { userEmail, userDepartment });
    if (!userEmail || !userDepartment) return;
    
    setFeedbacksLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/get_feedbacks?user_email=${userEmail}&department=${userDepartment}`);
      console.log("Feedback response:", response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // Group feedbacks by collaborator name
        const feedbacksByCollaborator = {};
        response.data.forEach(fb => {
          if (!feedbacksByCollaborator[fb.collaborator_name]) {
            feedbacksByCollaborator[fb.collaborator_name] = [];
          }
          feedbacksByCollaborator[fb.collaborator_name].push(fb);
        });
        setFeedbacks(feedbacksByCollaborator);
        console.log("Processed feedbacks:", feedbacksByCollaborator);
      } else {
        console.log("No feedback data or invalid format");
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setFeedbacksLoading(false);
    }
  }, [userEmail, userDepartment]);

  useEffect(() => {
    console.log("Main useEffect running");
    if (!userEmail) {
      setMessage("❌ Erreur: Utilisateur non identifié.");
      return;
    }

    // Fetch saved collaborators when component mounts
    const fetchSavedCollaborators = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/get_saved_collaborators?user_email=${userEmail}`);
        if (response.data && response.data.collaborators) {
          setCollaborators(response.data.collaborators);
          setFilteredCollaborators(response.data.collaborators);
          
          // Set categories from saved collaborators
          const categories = [...new Set(response.data.collaborators.flatMap(collab => 
            collab.skills.map(skill => skill["Skill Parent-Category"])
          ))].filter(Boolean);
          setParentCategories(categories);
          
          const skillCategories = [...new Set(response.data.collaborators.flatMap(collab => 
            collab.skills.map(skill => skill["Skill Category"])
          ))].filter(Boolean);
          setSkillCategories(skillCategories);

          // Fetch feedbacks for all collaborators
          console.log("About to call fetchFeedbacks from useEffect");
          fetchFeedbacks();
        }
      } catch (error) {
        console.error("Error fetching saved collaborators:", error);
        setMessage("❌ Erreur lors du chargement des collaborateurs sauvegardés.");
      }
    };

    fetchSavedCollaborators();
  }, [userEmail, fetchFeedbacks]); // Added fetchFeedbacks to dependency array

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  const calculateAverageGrade = (skills) => {
    if (!skills || skills.length === 0) return 0;
    
    // Filter out any invalid grade values and calculate average
    const validGrades = skills
        .map(skill => {
            const grade = parseFloat(skill["Grade Value"]);
            return isNaN(grade) ? 0 : grade;
        })
        .filter(grade => grade >= 0 && grade <= 5);
    
    if (validGrades.length === 0) return 0;
    
    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    return (sum / validGrades.length).toFixed(1);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("❗ Veuillez sélectionner un fichier.");
      return;
    }
    if (!userEmail) {
      setMessage("❌ Erreur: Utilisateur non identifié.");
      return;
    }

    setLoading(true);
    setLoadingAnimation(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_email", userEmail);

    try {
      const response = await axios.post("http://localhost:8000/upload_skills", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.message) {
        setMessage("✅ " + response.data.message);
        
        // Immediately fetch and display the collaborators
        const collaboratorsResponse = await axios.get(`http://localhost:8000/get_saved_collaborators?user_email=${userEmail}`);
        if (collaboratorsResponse.data && collaboratorsResponse.data.collaborators) {
          const groupedCollaborators = groupCollaboratorsBySkills(collaboratorsResponse.data.collaborators);
          setCollaborators(groupedCollaborators);
          setFilteredCollaborators(groupedCollaborators);
          
          // Set categories from the new collaborators
          const categories = [...new Set(groupedCollaborators.flatMap(collab => 
            collab.skills.map(skill => skill["Skill Parent-Category"])
          ))].filter(Boolean);
          setParentCategories(categories);
          
          const skillCategories = [...new Set(groupedCollaborators.flatMap(collab => 
            collab.skills.map(skill => skill["Skill Category"])
          ))].filter(Boolean);
          setSkillCategories(skillCategories);

          // Reset states
          setSearchTerm("");
          setSelectedParentCategory("");
          setSelectedSkillCategory("");
          setExpandedCollaborators(new Set());
          setSelectedCollaborator(null);
          setFeedback("");
          setFeedbackMessage("");
          
          // Fetch feedbacks for all collaborators
          fetchFeedbacks();
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("❌ " + (error.response?.data?.detail || "Erreur lors de l'envoi du fichier."));
      setCollaborators([]);
      setFilteredCollaborators([]);
      setParentCategories([]);
      setSkillCategories([]);
    } finally {
      setLoading(false);
      setLoadingAnimation(false);
    }
  };

  const groupCollaboratorsBySkills = (collaborators) => {
    const grouped = {};
    collaborators.forEach(collab => {
      const key = `${collab["First Name"]} ${collab["Last Name"]}`;
      if (!grouped[key]) {
        grouped[key] = {
          "First Name": collab["First Name"],
          "Last Name": collab["Last Name"],
          skills: []
        };
      }
      grouped[key].skills.push({
        "Skill Parent-Category": collab["Skill Parent-Category"],
        "Skill Category": collab["Skill Category"],
        "Skill": collab["Skill"],
        "Grade Value": collab["Grade Value"]
      });
    });
    return Object.values(grouped);
  };

  const toggleCollaboratorExpansion = (collabKey) => {
    setExpandedCollaborators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collabKey)) {
        newSet.delete(collabKey);
      } else {
        newSet.add(collabKey);
      }
      return newSet;
    });
  };

  const handleCollaboratorClick = (collab) => {
    setSelectedCollaborator(collab);
    setFeedback("");
    setFeedbackMessage("");
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || !selectedCollaborator) return;

    setFeedbackLoading(true);
    setFeedbackMessage("");

    try {
      await axios.post("http://localhost:8000/add_feedback", {
        collaborator_name: `${selectedCollaborator["First Name"]} ${selectedCollaborator["Last Name"]}`,
        feedback: feedback.trim(),
        user_email: userEmail,
        department: userDepartment
      });

      setFeedbackMessage("✅ Feedback envoyé avec succès!");
      setFeedback("");
      
      // Refresh feedbacks
      fetchFeedbacks();
    } catch (error) {
      setFeedbackMessage("❌ Erreur lors de l'envoi du feedback.");
      console.error("Feedback error:", error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (selectedParentCategory || selectedSkillCategory) {
      const filtered = collaborators
        .filter((collab) => {
          const matchesParentCategory = !selectedParentCategory || 
            collab.skills.some(skill => skill["Skill Parent-Category"] === selectedParentCategory);
          
          const matchesSkillCategory = !selectedSkillCategory || 
            collab.skills.some(skill => skill["Skill Category"] === selectedSkillCategory);
          
          return matchesParentCategory && matchesSkillCategory;
        })
        .map(collab => ({
          ...collab,
          skills: collab.skills.filter(skill => 
            (!selectedParentCategory || skill["Skill Parent-Category"] === selectedParentCategory) &&
            (!selectedSkillCategory || skill["Skill Category"] === selectedSkillCategory)
          )
        }));
      setFilteredCollaborators(filtered);
    } else {
      setFilteredCollaborators(collaborators);
    }
  }, [selectedParentCategory, selectedSkillCategory, collaborators]);

  useEffect(() => {
    if (collaborators.length > 0) {
      const categories = [...new Set(collaborators.flatMap(collab => 
        collab.skills.map(skill => skill["Skill Category"])
      ))].filter(Boolean);
      setSkillCategories(categories);
    }
  }, [collaborators]);

  const filteredAndSortedCollaborators = filteredCollaborators
    .filter(collab => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${collab["First Name"]} ${collab["Last Name"]}`.toLowerCase();
      return fullName.includes(searchLower);
    })
    .sort((a, b) => {
      const gradeA = calculateAverageGrade(a.skills);
      const gradeB = calculateAverageGrade(b.skills);
      return sortOrder === "asc"
        ? gradeA - gradeB
        : gradeB - gradeA;
    });

  return (
    <div className="choix-container">
      {/* Header Section with Navigation and Title */}
      <div className="choix-header">
        <button className="btn back-btn" onClick={() => navigate("/dashboard")}>
          <FaArrowLeft className="back-icon" /> 
          <span>Retour au Dashboard</span>
        </button>
        <h2 className="choix-title">Gestion des Collaborateurs</h2>
      </div>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Left Sidebar - Filters and Upload */}
        <div className="left-sidebar">
          {/* Upload Section */}
          <div className="panel upload-panel">
            <h3 className="panel-title">
              <FaUpload className="panel-icon" /> Importer des données
            </h3>
            <div className="upload-content">
              <label className="file-input-label">
                <FaFileAlt className="me-2" />
                <input type="file" accept=".xlsx" onChange={handleFileChange} hidden />
                <span className="file-label-text">{file ? `📂 ${file.name}` : "Sélectionner un fichier"}</span>
              </label>
              <button 
                className={`upload-button ${loadingAnimation ? 'loading' : ''}`} 
                onClick={handleUpload} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    <FaUpload /> 
                    <span>Charger Fichier</span>
                  </>
                )}
              </button>
              {message && <div className={`status-message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
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
                    placeholder="Rechercher un collaborateur..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button className="clear-search" onClick={clearSearch}>
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {/* Sort Button */}
              <div className="sort-container">
                <button className="sort-btn" onClick={toggleSort}>
                  <FaStar className="sort-icon" />
                  <span>{sortOrder === "asc" ? "Grade croissant" : "Grade décroissant"}</span>
                </button>
              </div>

              {/* Category Filters */}
              {parentCategories.length > 0 && (
                <div className="filter-group">
                  <label className="filter-label">Catégorie Parent</label>
                  <div className="select-wrapper">
                    <select 
                      className="filter-select" 
                      value={selectedParentCategory} 
                      onChange={(e) => setSelectedParentCategory(e.target.value)}
                    >
                      <option value="">Toutes les catégories</option>
                      {parentCategories.map((category, index) => (
                        <option key={index} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="select-arrow" />
                  </div>
                </div>
              )}
              
              {skillCategories.length > 0 && (
                <div className="filter-group">
                  <label className="filter-label">Compétence</label>
                  <div className="select-wrapper">
                    <select 
                      className="filter-select" 
                      value={selectedSkillCategory} 
                      onChange={(e) => setSelectedSkillCategory(e.target.value)}
                    >
                      <option value="">Toutes les compétences</option>
                      {skillCategories.map((category, index) => (
                        <option key={index} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className="select-arrow" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="content-area">
          {/* Collaborator Display */}
          <div className="panel collaborators-panel">
            <h3 className="panel-title">
              <FaUsers className="panel-icon" /> Collaborateurs ({filteredAndSortedCollaborators.length})
            </h3>
            
            {feedbacksLoading && (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <span>Chargement des données...</span>
              </div>
            )}
            
            <div className="collaborator-grid">
              {filteredAndSortedCollaborators.length > 0 ? (
                filteredAndSortedCollaborators.map((collab, index) => {
                  const collabKey = `${collab["First Name"]} ${collab["Last Name"]}`;
                  const isExpanded = expandedCollaborators.has(collabKey);
                  const averageGrade = calculateAverageGrade(collab.skills);
                  const collabFeedbacks = feedbacks[collabKey] || [];
                  
                  return (
                    <div 
                      className={`collaborator-card ${selectedCollaborator === collab ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`} 
                      key={index}
                    >
                      <div className="card-header" onClick={() => handleCollaboratorClick(collab)}>
                        <div className="collaborator-avatar">
                          {collab["First Name"].charAt(0)}{collab["Last Name"].charAt(0)}
                        </div>
                        <div className="collaborator-info">
                          <h3 className="collaborator-name">
                            {collab["First Name"]} {collab["Last Name"]}
                          </h3>
                          <div className="collaborator-grade">
                            <div className="grade-stars">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`star ${i < Math.round(averageGrade) ? 'filled' : ''}`}>★</span>
                              ))}
                            </div>
                            <span className="grade-value">{averageGrade}</span>
                          </div>
                        </div>
                        <button 
                          className="expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollaboratorExpansion(collabKey);
                          }}
                        >
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="card-content">
                          <div className="skills-section">
                            <h4 className="section-title">Compétences</h4>
                            <div className="skills-grid">
                              {collab.skills.map((skill, skillIndex) => (
                                <div key={skillIndex} className="skill-chip">
                                  <div className="skill-name">
                                    <span className="skill-emoji">🔹</span> {skill["Skill"]}
                                  </div>
                                  <div className="skill-grade">
                                    <FaTrophy className="skill-grade-icon" /> 
                                    <span>{skill["Grade Value"]}</span>
                                  </div>
                                  <div className="skill-category">{skill["Skill Category"]}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Display feedbacks for this collaborator */}
                          {collabFeedbacks.length > 0 && (
                            <div className="feedbacks-section">
                              <h4 className="section-title">Feedbacks ({collabFeedbacks.length})</h4>
                              <div className="feedbacks-list">
                                {collabFeedbacks.map((fb, fbIndex) => (
                                  <div key={fbIndex} className="feedback-item">
                                    <div className="feedback-header">
                                      <div className="feedback-author">
                                        <div className="author-avatar">{fb.created_by.charAt(0)}</div>
                                        <span>{fb.created_by}</span>
                                      </div>
                                      <div className="feedback-date">
                                        <FaClock className="date-icon" /> {formatDate(fb.created_at)}
                                      </div>
                                    </div>
                                    <p className="feedback-text">{fb.feedback}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="card-actions">
                        <button 
                          className="action-btn feedback-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCollaboratorClick(collab);
                          }}
                        >
                          <FaComment className="action-icon" /> Donner un feedback
                        </button>
                        
                        {collabFeedbacks.length > 0 && !isExpanded && (
                          <div 
                            className="feedback-badge"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollaboratorExpansion(collabKey);
                            }}
                          >
                            <FaComment className="badge-icon" /> {collabFeedbacks.length}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-data-message">
                  <div className="no-data-icon">⚠</div>
                  <p className="no-data-text">Aucun collaborateur trouvé.</p>
                  <p className="no-data-help">Essayez de modifier vos filtres ou importez de nouvelles données.</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedbacks Overview Section */}
          <div className="panel feedbacks-panel">
            <h3 className="panel-title">
              <FaComment className="panel-icon" /> Feedbacks
            </h3>
            
            {feedbacksLoading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <span>Chargement des feedbacks...</span>
              </div>
            ) : Object.keys(feedbacks).length > 0 ? (
              <>
                <div className="table-responsive feedback-table-container">
                  <table className="feedback-table" id="feedbackTable">
                    <thead>
                      <tr>
                        <th className="collaborator-col">
                          <div className="th-content">
                            <FaUser className="th-icon" /> Collaborateur
                          </div>
                        </th>
                        <th className="feedback-col">
                          <div className="th-content">
                            <FaComment className="th-icon" /> Feedback
                          </div>
                        </th>
                        <th className="author-col">
                          <div className="th-content">
                            <FaUser className="th-icon" /> Auteur
                          </div>
                        </th>
                        <th className="date-col">
                          <div className="th-content">
                            <FaClock className="th-icon" /> Date
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(feedbacks).flatMap(([collaboratorName, collabFeedbacks]) => 
                        collabFeedbacks.map((fb, index) => (
                          <tr key={`${collaboratorName}-${index}`} className="feedback-row">
                            <td className="collaborator-cell">
                              <div className="cell-content">
                                <div className="collab-avatar">
                                  {collaboratorName.split(' ').map(name => name[0]).join('')}
                                </div>
                                <div className="collab-name">{collaboratorName}</div>
                              </div>
                            </td>
                            <td className="feedback-cell">
                              <div className="feedback-content-wrapper">
                                <div className="feedback-content">{fb.feedback}</div>
                                {fb.feedback.length > 100 && (
                                  <button 
                                    className="expand-feedback-btn" 
                                    onClick={(e) => {
                                      const content = e.currentTarget.previousSibling;
                                      content.classList.toggle('expanded');
                                      e.currentTarget.textContent = content.classList.contains('expanded') 
                                        ? 'Voir moins' 
                                        : 'Voir plus';
                                    }}
                                  >
                                    Voir plus
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="author-cell">
                              <div className="author-badge">
                                <span className="author-initial">{fb.created_by[0]}</span>
                                <span className="author-name">{fb.created_by}</span>
                              </div>
                            </td>
                            <td className="date-cell">
                              <div className="date-wrapper">
                                <div className="date-day">{formatDate(fb.created_at).split(' ')[0]}</div>
                                <div className="date-time">{formatDate(fb.created_at).split(' ')[1]}</div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="feedback-summary">
                  <div className="summary-card">
                    <div className="summary-content">
                      <h5 className="summary-title">Résumé des Feedbacks</h5>
                      <div className="stats-container">
                        <div className="stat-item">
                          <div className="stat-value">{Object.keys(feedbacks).length}</div>
                          <div className="stat-label">Collaborateurs</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value">
                            {Object.values(feedbacks).reduce((total, feedbacks) => total + feedbacks.length, 0)}
                          </div>
                          <div className="stat-label">Feedbacks</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value">
                            {new Set(
                              Object.values(feedbacks)
                                .flatMap(feedbacks => feedbacks.map(fb => fb.created_by))
                            ).size}
                          </div>
                          <div className="stat-label">Auteurs</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-data-message">
                <div className="no-data-icon">📝</div>
                <p className="no-data-text">Aucun feedback n'a été trouvé.</p>
                <p className="no-data-help">Commencez à donner des feedbacks à vos collaborateurs!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {selectedCollaborator && (
        <div className="modal-overlay">
          <div className="feedback-modal">
            <div className="modal-header">
              <div className="modal-title">
                <div className="collab-avatar large">
                  {selectedCollaborator["First Name"].charAt(0)}{selectedCollaborator["Last Name"].charAt(0)}
                </div>
                <h3>Feedback pour {selectedCollaborator["First Name"]} {selectedCollaborator["Last Name"]}</h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setSelectedCollaborator(null)}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Display existing feedbacks in modal */}
              {feedbacks[`${selectedCollaborator["First Name"]} ${selectedCollaborator["Last Name"]}`]?.length > 0 && (
                <div className="existing-feedbacks">
                  <h4 className="section-title">Feedbacks précédents</h4>
                  <div className="existing-feedbacks-list">
                    {feedbacks[`${selectedCollaborator["First Name"]} ${selectedCollaborator["Last Name"]}`].map((fb, index) => (
                      <div key={index} className="existing-feedback-item">
                        <div className="feedback-header">
                          <div className="feedback-author">
                            <div className="author-avatar">{fb.created_by.charAt(0)}</div>
                            <span>{fb.created_by}</span>
                          </div>
                          <div className="feedback-date">
                            <FaClock className="date-icon" /> {formatDate(fb.created_at)}
                          </div>
                        </div>
                        <p className="feedback-text">{fb.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                <h4 className="section-title">Nouveau Feedback</h4>
                <div className="form-group">
                  <textarea
                    id="feedback-text"
                    className="feedback-textarea"
                    rows="4"
                    placeholder="Écrivez votre feedback ici..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    required
                  ></textarea>
                </div>
                {feedbackMessage && (
                  <div className={`feedback-message ${feedbackMessage.includes('✅') ? 'success' : 'error'}`}>
                    {feedbackMessage}
                  </div>
                )}
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={feedbackLoading}
                >
                  {feedbackLoading ? (
                    <>
                      <div className="spinner small"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="send-icon" /> 
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Choix;
