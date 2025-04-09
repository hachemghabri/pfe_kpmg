import React, { useState, useEffect, useCallback } from "react";
import { 
  FaTrash, 
  FaPlus, 
  FaArrowLeft, 
  FaUsers, 
  FaChartLine, 
  FaStar, 
  FaFilter, 
  FaExclamationCircle, 
  FaFileExcel,
  FaCalendarAlt,
  // eslint-disable-next-line no-unused-vars
  FaPencilAlt,
  FaCheck,
  FaTimes,
  // eslint-disable-next-line no-unused-vars
  FaClock,
  FaTrophy
} from "react-icons/fa";
import * as XLSX from 'xlsx';
import axios from 'axios';
import "../styles/Equipe.css";

function Equipe() {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAddCollaborateur, setShowAddCollaborateur] = useState({});
  const [newCollaborateur, setNewCollaborateur] = useState({});
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user ? user.email : null;

  const grades = [
    { value: "all", label: "Tous les grades" },
    { value: "junior1", label: "Junior 1" },
    { value: "junior2", label: "Junior 2" },
    { value: "senior1", label: "Senior 1" },
    { value: "senior2", label: "Senior 2" },
    { value: "senior3", label: "Senior 3" }
  ];

  useEffect(() => {
    if (!userEmail) {
      setError("❌ Erreur: Utilisateur non identifié.");
      return;
    }
  }, [userEmail]);

  const fetchProjects = useCallback(async () => {
    if (!userEmail) {
      setError("❌ Erreur: Utilisateur non identifié.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/get_projects?user_email=${userEmail}`);
      setProjects(response.data);
      // If we have projects and no selected project, select the first one
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      if (error.response?.status === 401) {
        setError("❌ Session expirée. Veuillez vous reconnecter.");
      } else {
        setError("❌ Erreur lors du chargement des projets");
      }
    } finally {
      setLoading(false);
    }
  }, [userEmail, selectedProject]);

  useEffect(() => {
    if (userEmail) {
      fetchProjects();
    }
  }, [userEmail, fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProject.trim() || !startDate || !endDate) return;
    
    const newProjectObj = {
      nom: newProject,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      collaborateurs: []
    };
    
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/save_projects?user_email=${userEmail}`, [
        ...projects.map(project => ({
          nom: project.nom,
          start_date: new Date(project.start_date).toISOString(),
          end_date: new Date(project.end_date).toISOString(),
          collaborateurs: project.collaborateurs || []
        })),
        newProjectObj
      ]);

      setNewProject("");
      setStartDate("");
      setEndDate("");
      
      // Fetch updated projects
      await fetchProjects();
      setError(null);
    } catch (error) {
      console.error('Error creating project:', error);
      setError("❌ Erreur lors de la création du projet");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!userEmail) return;

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet?")) {
      return;
    }

    setLoading(true);
    try {
      // Delete project (backend will handle collaborator deletion)
      await axios.delete(`http://localhost:8000/delete_project/${projectId}?user_email=${userEmail}`);
      
      // Update local state
      const updatedProjects = projects.filter(proj => proj.id !== projectId);
      setProjects(updatedProjects);
      
      // If the deleted project was selected, select another one
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setError("❌ Erreur lors de la suppression du projet");
      // Refresh projects to ensure consistent state
      fetchProjects();
    } finally {
      setLoading(false);
    }
  };

  const validateNote = (value, field) => {
    const numValue = parseFloat(value);
    if (numValue > 5) {
      setErrors(prev => ({
        ...prev,
        [field]: "La note ne peut pas dépasser 5"
      }));
      return false;
    }
    if (numValue < 0) {
      setErrors(prev => ({
        ...prev,
        [field]: "La note ne peut pas être négative"
      }));
      return false;
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    return true;
  };

  const handleInputChange = (projectId, field, value) => {
    if (['respect_delais', 'participation', 'resolution_problemes'].includes(field)) {
      if (!validateNote(value, `${projectId}-${field}`)) {
        return;
      }
    }
    
    setNewCollaborateur({
      ...newCollaborateur,
      [projectId]: {
        ...newCollaborateur[projectId],
        [field]: value
      }
    });
  };

  const handleAddCollaborateur = async (projectId) => {
    const collaborateur = newCollaborateur[projectId];
    if (!collaborateur?.nom || !collaborateur?.prenom || !collaborateur?.grade || 
        !collaborateur?.respect_delais || !collaborateur?.participation || 
        !collaborateur?.resolution_problemes) return;

    // Validate all notes before adding
    const notes = ['respect_delais', 'participation', 'resolution_problemes'];
    const hasErrors = notes.some(note => {
      const value = parseFloat(collaborateur[note]);
      return value > 5 || value < 0;
    });

    if (hasErrors) {
      return;
    }

    const newCollaborateurObj = {
      nom: collaborateur.nom,
      prenom: collaborateur.prenom,
      grade: collaborateur.grade,
      respect_delais: parseFloat(collaborateur.respect_delais),
      participation: parseFloat(collaborateur.participation),
      resolution_problemes: parseFloat(collaborateur.resolution_problemes),
      note_finale: ((parseFloat(collaborateur.respect_delais) + 
                    parseFloat(collaborateur.participation) + 
                    parseFloat(collaborateur.resolution_problemes)) / 3).toFixed(1)
    };

    setLoading(true);
    try {
      // Update local state first
      const updatedProjects = projects.map(proj => 
        proj.id === projectId 
            ? {
                ...proj,
              collaborateurs: [...(proj.collaborateurs || []), newCollaborateurObj] 
              }
            : proj
      );

      // Save to backend
      await axios.post(`http://localhost:8000/save_projects?user_email=${userEmail}`, 
        updatedProjects.map(project => ({
          nom: project.nom,
          start_date: new Date(project.start_date).toISOString(),
          end_date: new Date(project.end_date).toISOString(),
          collaborateurs: project.collaborateurs || []
        }))
      );

      // Reset form
      setNewCollaborateur(prev => ({ ...prev, [projectId]: {} }));
      setShowAddCollaborateur(prev => ({ ...prev, [projectId]: false }));
      setErrors({});

      // Update selected project if it was the one modified
      if (selectedProject && selectedProject.id === projectId) {
        const updatedProject = updatedProjects.find(p => p.id === projectId);
        setSelectedProject(updatedProject);
      }

      // Fetch updated data
      await fetchProjects();
      setError(null);
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError("❌ Erreur lors de l'ajout du collaborateur");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollaborateur = async (projectId, collaborateurId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce collaborateur?")) {
      return;
    }
    
    setLoading(true);
    try {
      // First update local state
      const updatedProjects = projects.map(proj => 
        proj.id === projectId 
          ? { 
              ...proj, 
              collaborateurs: proj.collaborateurs.filter(c => c.id !== collaborateurId) 
            }
          : proj
      );
      
      // Save to backend
      await axios.post(`http://localhost:8000/save_projects?user_email=${userEmail}`, 
        updatedProjects.map(project => ({
          nom: project.nom,
          start_date: new Date(project.start_date).toISOString(),
          end_date: new Date(project.end_date).toISOString(),
          collaborateurs: project.collaborateurs || []
        }))
      );

      // Update local state
      setProjects(updatedProjects);
      
      // Update selected project if it was the one modified
      if (selectedProject && selectedProject.id === projectId) {
        const updatedProject = updatedProjects.find(p => p.id === projectId);
        setSelectedProject(updatedProject);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      setError("❌ Erreur lors de la suppression du collaborateur");
      // Refresh projects to ensure consistent state
      fetchProjects();
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const excelData = projects.flatMap(proj => 
      proj.collaborateurs.map(collab => ({
        'Projet': proj.nom,
        'Nom': collab.nom,
        'Prénom': collab.prenom,
        'Grade': collab.grade,
        'Respect des délais': collab.respect_delais,
        'Participation': collab.participation,
        'Résolution de problèmes': collab.resolution_problemes,
        'Note Finale': collab.note_finale
      }))
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Évaluations");
    XLSX.writeFile(wb, "evaluations_collaborateurs.xlsx");
  };

  const filteredCollaborateurs = (collaborateurs) => {
    if (selectedGrade === "all") return collaborateurs;
    return collaborateurs.filter(collab => collab.grade === selectedGrade);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateAverageRating = (project) => {
    if (!project.collaborateurs || project.collaborateurs.length === 0) return 0;
    
    const total = project.collaborateurs.reduce((acc, collab) => acc + parseFloat(collab.note_finale), 0);
    return (total / project.collaborateurs.length).toFixed(1);
  };

  if (!userEmail) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger d-flex align-items-center shadow-sm" role="alert">
          <FaExclamationCircle className="me-2" />
          <div>
            <h5 className="mb-1">❌ Erreur: Utilisateur non identifié</h5>
            <p className="mb-0">Retournez à la page de connexion pour continuer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="equipe-container">
      {/* Header Section */}
      <div className="equipe-header">
        <button onClick={() => window.history.back()} className="btn back-btn">
          <FaArrowLeft className="back-icon" /> 
          <span>Retour au Dashboard</span>
        </button>
        <h2 className="equipe-title text-center">Gestion des Projets & Équipes</h2>
      </div>
      
      {/* Notification Area */}
      {error && (
        <div className="notification-area">
          <div className="error-notification">
            <FaExclamationCircle className="notification-icon" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Chargement...</span>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="main-area">
        {/* Left Sidebar - Projects List */}
        <div className="left-sidebar">
          {/* Dashboard Stats */}
          <div className="panel stats-panel">
            <h3 className="panel-title">
              <FaChartLine className="panel-icon" /> Tableau de Bord
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon project-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{projects.length}</div>
                  <div className="stat-label">Projets</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon collab-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {projects.reduce((acc, proj) => acc + proj.collaborateurs.length, 0)}
                  </div>
                  <div className="stat-label">Collaborateurs</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon rating-icon">
                  <FaStar />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {(() => {
                      const totalScore = projects.reduce((acc, proj) => {
                        const avg = proj.collaborateurs.reduce((sum, collab) => sum + parseFloat(collab.note_finale), 0) / proj.collaborateurs.length;
                        return acc + (isNaN(avg) ? 0 : avg);
                      }, 0);
                      return (totalScore / (projects.length || 1)).toFixed(1);
                    })()}
                  </div>
                  <div className="stat-label">Note Moyenne</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Create New Project */}
          <div className="panel create-project-panel">
            <h3 className="panel-title">
              <FaPlus className="panel-icon" /> Nouveau Projet
            </h3>
            <div className="panel-content">
              <div className="form-group">
                <label htmlFor="projectName" className="form-label">Nom du projet</label>
                <input
                  type="text"
                  className="form-control"
                  id="projectName"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Entrez le nom du projet"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="startDate" className="form-label">Date de début</label>
                <div className="date-input-wrapper">
                  <FaCalendarAlt className="date-icon" />
                  <input
                    type="date"
                    className="form-control"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="endDate" className="form-label">Date de fin</label>
                <div className="date-input-wrapper">
                  <FaCalendarAlt className="date-icon" />
                  <input
                    type="date"
                    className="form-control"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <button 
                className="create-btn"
                onClick={handleCreateProject}
                disabled={!newProject.trim() || !startDate || !endDate}
              >
                <FaPlus className="btn-icon" /> Créer le Projet
              </button>
            </div>
          </div>
          
          {/* Projects List */}
          <div className="panel projects-panel">
            <h3 className="panel-title">
              <FaUsers className="panel-icon" /> Mes Projets
            </h3>
            <div className="projects-list">
              {projects.length > 0 ? (
                projects.map(project => (
                  <div 
                    key={project.id} 
                    className={`project-card ${selectedProject && selectedProject.id === project.id ? 'selected' : ''}`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="project-header">
                      <h4 className="project-name">{project.nom}</h4>
                      <div className="project-rating">
                        <FaStar className="rating-icon" />
                        <span>{calculateAverageRating(project)}</span>
                      </div>
                    </div>
                    
                    <div className="project-meta">
                      <div className="project-dates">
                        <FaCalendarAlt className="meta-icon" />
                        <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
                      </div>
                      <div className="project-team">
                        <FaUsers className="meta-icon" />
                        <span>{project.collaborateurs.length} membres</span>
                      </div>
                    </div>
                    
                    <button 
                      className="delete-project-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-data-message">
                  <p>Aucun projet trouvé</p>
                  <p>Créez votre premier projet pour commencer</p>
                </div>
              )}
            </div>
            
            <div className="panel-footer">
              <button onClick={handleExportExcel} className="export-btn">
                <FaFileExcel className="btn-icon" /> Exporter Excel
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content - Selected Project Details */}
        <div className="content-area">
          {selectedProject ? (
            <div className="selected-project-container">
              <div className="panel project-details-panel">
                <div className="panel-header">
                  <h3 className="project-title">{selectedProject.nom}</h3>
                  <div className="project-info">
                    <div className="info-item">
                      <FaCalendarAlt className="info-icon" />
                      <span>{formatDate(selectedProject.start_date)} - {formatDate(selectedProject.end_date)}</span>
                    </div>
                    <div className="info-item">
                      <FaUsers className="info-icon" />
                      <span>{selectedProject.collaborateurs.length} collaborateurs</span>
                    </div>
                    <div className="info-item">
                      <FaStar className="info-icon" />
                      <span>Note moyenne: {calculateAverageRating(selectedProject)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="panel-content">
                  {/* Filter Controls */}
                  <div className="filter-controls">
                    <div className="filter-item">
                      <label className="filter-label">
                        <FaFilter className="filter-icon" /> Filtrer par grade
                      </label>
                      <select 
                        className="grade-filter"
                        value={selectedGrade} 
                        onChange={(e) => setSelectedGrade(e.target.value)}
                      >
                        {grades.map(grade => (
                          <option key={grade.value} value={grade.value}>
                            {grade.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      className="add-collab-btn"
                      onClick={() => setShowAddCollaborateur({ 
                        ...showAddCollaborateur, 
                        [selectedProject.id]: !showAddCollaborateur[selectedProject.id] 
                      })}
                    >
                      <FaPlus className="btn-icon" />
                      {showAddCollaborateur[selectedProject.id] ? "Annuler" : "Ajouter un collaborateur"}
                    </button>
                  </div>
                  
                  {/* Add Collaborator Form */}
                  {showAddCollaborateur[selectedProject.id] && (
                    <div className="add-collab-form">
                      <h4 className="form-title">Ajouter un nouveau collaborateur</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Nom</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newCollaborateur[selectedProject.id]?.nom || ""}
                            onChange={(e) => handleInputChange(selectedProject.id, "nom", e.target.value)}
                            placeholder="Nom"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Prénom</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newCollaborateur[selectedProject.id]?.prenom || ""}
                            onChange={(e) => handleInputChange(selectedProject.id, "prenom", e.target.value)}
                            placeholder="Prénom"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Grade</label>
                          <select
                            className="form-control"
                            value={newCollaborateur[selectedProject.id]?.grade || ""}
                            onChange={(e) => handleInputChange(selectedProject.id, "grade", e.target.value)}
                          >
                            <option value="">Sélectionner un grade</option>
                            {grades.slice(1).map(grade => (
                              <option key={grade.value} value={grade.value}>
                                {grade.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Respect des délais</label>
                          <div className="rating-input-wrapper">
                            <input
                              type="number"
                              className={`form-control ${errors[`${selectedProject.id}-respect_delais`] ? 'is-invalid' : ''}`}
                              value={newCollaborateur[selectedProject.id]?.respect_delais || ""}
                              onChange={(e) => handleInputChange(selectedProject.id, "respect_delais", e.target.value)}
                              placeholder="Note /5"
                              min="0"
                              max="5"
                              step="0.1"
                            />
                            <span className="rating-suffix">/5</span>
                          </div>
                          {errors[`${selectedProject.id}-respect_delais`] && (
                            <div className="error-message">
                              {errors[`${selectedProject.id}-respect_delais`]}
                            </div>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Participation</label>
                          <div className="rating-input-wrapper">
                            <input
                              type="number"
                              className={`form-control ${errors[`${selectedProject.id}-participation`] ? 'is-invalid' : ''}`}
                              value={newCollaborateur[selectedProject.id]?.participation || ""}
                              onChange={(e) => handleInputChange(selectedProject.id, "participation", e.target.value)}
                              placeholder="Note /5"
                              min="0"
                              max="5"
                              step="0.1"
                            />
                            <span className="rating-suffix">/5</span>
                          </div>
                          {errors[`${selectedProject.id}-participation`] && (
                            <div className="error-message">
                              {errors[`${selectedProject.id}-participation`]}
                            </div>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Résolution de problèmes</label>
                          <div className="rating-input-wrapper">
                            <input
                              type="number"
                              className={`form-control ${errors[`${selectedProject.id}-resolution_problemes`] ? 'is-invalid' : ''}`}
                              value={newCollaborateur[selectedProject.id]?.resolution_problemes || ""}
                              onChange={(e) => handleInputChange(selectedProject.id, "resolution_problemes", e.target.value)}
                              placeholder="Note /5"
                              min="0"
                              max="5"
                              step="0.1"
                            />
                            <span className="rating-suffix">/5</span>
                          </div>
                          {errors[`${selectedProject.id}-resolution_problemes`] && (
                            <div className="error-message">
                              {errors[`${selectedProject.id}-resolution_problemes`]}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="form-actions">
                        <button
                          className="save-collab-btn"
                          onClick={() => handleAddCollaborateur(selectedProject.id)}
                          disabled={!newCollaborateur[selectedProject.id]?.nom || 
                                    !newCollaborateur[selectedProject.id]?.prenom || 
                                    !newCollaborateur[selectedProject.id]?.grade || 
                                    !newCollaborateur[selectedProject.id]?.respect_delais || 
                                    !newCollaborateur[selectedProject.id]?.participation || 
                                    !newCollaborateur[selectedProject.id]?.resolution_problemes ||
                                    Object.keys(errors).length > 0}
                        >
                          <FaCheck className="btn-icon" /> Sauvegarder
                        </button>
                        
                        <button
                          className="cancel-btn"
                          onClick={() => setShowAddCollaborateur({ 
                            ...showAddCollaborateur, 
                            [selectedProject.id]: false 
                          })}
                        >
                          <FaTimes className="btn-icon" /> Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Collaborators Table/Grid */}
                  <div className="collaborators-section">
                    <h4 className="section-title">
                      <FaUsers className="section-icon" /> Liste des Collaborateurs
                    </h4>
                    
                    {filteredCollaborateurs(selectedProject.collaborateurs).length > 0 ? (
                      <div className="collaborators-grid">
                        {filteredCollaborateurs(selectedProject.collaborateurs).map((collaborateur) => (
                          <div key={collaborateur.id} className="collaborator-card">
                            <div className="collab-header">
                              <div className="collab-avatar">
                                {collaborateur.prenom.charAt(0)}{collaborateur.nom.charAt(0)}
                              </div>
                              <div className="collab-info">
                                <h5 className="collab-name">{collaborateur.prenom} {collaborateur.nom}</h5>
                                <span className="collab-grade">{collaborateur.grade}</span>
                              </div>
                              <button
                                className="delete-collab-btn"
                                onClick={() => handleDeleteCollaborateur(selectedProject.id, collaborateur.id)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                            
                            <div className="collab-ratings">
                              <div className="rating-item">
                                <div className="rating-label">Respect des délais</div>
                                <div className="rating-bar-container">
                                  <div 
                                    className="rating-bar respect-bar" 
                                    style={{ width: `${(collaborateur.respect_delais/5)*100}%` }}
                                  >
                                    <span className="rating-value">{collaborateur.respect_delais}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="rating-item">
                                <div className="rating-label">Participation</div>
                                <div className="rating-bar-container">
                                  <div 
                                    className="rating-bar participation-bar" 
                                    style={{ width: `${(collaborateur.participation/5)*100}%` }}
                                  >
                                    <span className="rating-value">{collaborateur.participation}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="rating-item">
                                <div className="rating-label">Résolution de problèmes</div>
                                <div className="rating-bar-container">
                                  <div 
                                    className="rating-bar resolution-bar" 
                                    style={{ width: `${(collaborateur.resolution_problemes/5)*100}%` }}
                                  >
                                    <span className="rating-value">{collaborateur.resolution_problemes}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="collab-footer">
                              <div className="final-rating">
                                <FaTrophy className="trophy-icon" />
                                <div className="final-score">
                                  <span className="score-value">{collaborateur.note_finale}</span>
                                  <span className="score-max">/5</span>
                                </div>
                                <div className="score-emoji">
                                  {parseFloat(collaborateur.note_finale) >= 4 ? '😊' : 
                                   parseFloat(collaborateur.note_finale) >= 3 ? '😐' : '😢'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-data-message">
                        <p>Aucun collaborateur trouvé avec le grade sélectionné</p>
                        <p>Modifiez le filtre ou ajoutez de nouveaux collaborateurs</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <div className="message-icon">
                <FaUsers />
              </div>
              <h3>Sélectionnez un projet</h3>
              <p>Choisissez un projet dans la liste pour voir ses détails</p>
              {projects.length === 0 && (
                <p>Ou créez votre premier projet pour commencer</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Equipe;
