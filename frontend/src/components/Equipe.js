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
  FaPencilAlt,
  FaCheck,
  FaTimes,
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
  const [notification, setNotification] = useState(null);
  const [editingCollaborateur, setEditingCollaborateur] = useState(null);
  const [editFormData, setEditFormData] = useState({
    respect_delais: '',
    participation: '',
    resolution_problemes: '',
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user ? user.email : null;

  // Show notification function
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
    if (!collaborateur) return;

    // Find the project, safely handle the case when project is not found
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found.`);
      setError("❌ Erreur: Projet non trouvé.");
      return;
    }
    
    const projectEndDate = new Date(project.end_date);
    const today = new Date();
    const isProjectCompleted = projectEndDate < today;
    
    // Basic validation for mandatory fields
    if (!collaborateur?.nom || !collaborateur?.prenom || !collaborateur?.grade) return;
    
    // For active projects, rating fields are not required
    if (isProjectCompleted && (!collaborateur?.respect_delais || !collaborateur?.participation || !collaborateur?.resolution_problemes)) return;

    // Validate all notes before adding (only for completed projects)
    let hasErrors = false;
    if (isProjectCompleted) {
    const notes = ['respect_delais', 'participation', 'resolution_problemes'];
      hasErrors = notes.some(note => {
      const value = parseFloat(collaborateur[note]);
      return value > 5 || value < 0;
    });
    }

    if (hasErrors) {
      return;
    }

    // Set default rating values for active projects
    const respect_delais = isProjectCompleted ? parseFloat(collaborateur.respect_delais) : null;
    const participation = isProjectCompleted ? parseFloat(collaborateur.participation) : null;
    const resolution_problemes = isProjectCompleted ? parseFloat(collaborateur.resolution_problemes) : null;
    const note_finale = isProjectCompleted 
      ? ((respect_delais + participation + resolution_problemes) / 3).toFixed(1)
      : "Non évalué";

    const newCollaborateurObj = {
      id: Date.now().toString(), // Generate a unique ID for the collaborator
      nom: collaborateur.nom,
      prenom: collaborateur.prenom,
      grade: collaborateur.grade,
      respect_delais: respect_delais,
      participation: participation,
      resolution_problemes: resolution_problemes,
      note_finale: note_finale
    };

    setLoading(true);
    setError(null);
    
    try {
      // Find the project to update
      const projectToUpdate = projects.find(p => p.id === projectId);
      if (!projectToUpdate) {
        console.error(`Project with ID ${projectId} not found in local state.`);
        setError("❌ Erreur: Projet non trouvé.");
        setLoading(false);
        return;
      }
      
      // Add the new collaborator to the existing ones
      const updatedCollaborateurs = [...(projectToUpdate.collaborateurs || []), newCollaborateurObj];
      
      console.log(`Adding new collaborator to project ${projectId}: ${newCollaborateurObj.prenom} ${newCollaborateurObj.nom}`);
      console.log(`Updated collaborators count: ${updatedCollaborateurs.length}`);
      
      // Create updated project data with the new collaborator
      const updatedProject = {
        ...projectToUpdate,
        collaborateurs: updatedCollaborateurs
      };
      
      // Format data for the API using the update_project endpoint
      const projectData = {
        project_id: projectId,
        nom: updatedProject.nom,
        start_date: new Date(updatedProject.start_date).toISOString(),
        end_date: new Date(updatedProject.end_date).toISOString(),
        collaborateurs: updatedCollaborateurs.map(c => ({
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          grade: c.grade,
          respect_delais: c.respect_delais === null ? 0 : parseFloat(c.respect_delais),
          participation: c.participation === null ? 0 : parseFloat(c.participation),
          resolution_problemes: c.resolution_problemes === null ? 0 : parseFloat(c.resolution_problemes),
          note_finale: c.note_finale === "Non évalué" ? 0 : parseFloat(c.note_finale)
        }))
      };
      
      console.log("Sending update to API for new collaborator:", projectData);
      
      // Use the update_project endpoint instead of save_projects
      const response = await axios.post(`http://localhost:8000/update_project?user_email=${userEmail}`, projectData);
      
      console.log("API response:", response.data);

      // Reset form
      setNewCollaborateur(prev => ({ ...prev, [projectId]: {} }));
      setShowAddCollaborateur(prev => ({ ...prev, [projectId]: false }));
      setErrors({});

      // IMPORTANT FIX: Always fetch fresh data from server after adding to get proper IDs
      await fetchProjects();
      
      // Find and select the updated project with fresh data
      const refreshedProjects = await axios.get(`http://localhost:8000/get_projects?user_email=${userEmail}`);
      const freshProject = refreshedProjects.data.find(p => p.id === projectId);
      if (freshProject) {
        setSelectedProject(freshProject);
      }

      showNotification("✅ Collaborateur ajouté avec succès!");
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setError("❌ Erreur lors de l'ajout du collaborateur");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollaborateur = async (projectId, collaborateurId) => {
    // Safety check - if collaborateurId is undefined, log error and exit
    if (!collaborateurId) {
      console.error("[Frontend Delete] Cannot delete collaborator - ID is undefined or null");
      setError("❌ Erreur: Impossible de supprimer le collaborateur (ID manquant)");
      return;
    }

    // Check if ID is in temporary format (contains hyphens) or not a number
    const isTemporaryId = collaborateurId.toString().includes('-') || isNaN(parseInt(collaborateurId, 10));
    const intProjectId = parseInt(projectId, 10);
    
    console.log(`[Frontend Delete] Attempting to delete Collaborateur ID: ${collaborateurId} from Project ID: ${intProjectId}`);
    console.log(`[Frontend Delete] ID appears to be a ${isTemporaryId ? 'temporary' : 'database'} ID`);

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce collaborateur?")) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // For temporary IDs, skip the DELETE endpoint and go straight to UPDATE approach
      if (!isTemporaryId) {
        try {
          console.log(`[Frontend Delete] Using DELETE API endpoint with database ID: ${collaborateurId}`);
          const response = await axios.delete(`http://localhost:8000/delete_collaborator/${intProjectId}/${collaborateurId}?user_email=${userEmail}`);
          console.log("[Frontend Delete] DELETE API response:", response.data);
          
          // If successful, refresh projects and we're done
          await fetchProjects();
          
          // Re-select the current project
          const updatedProjects = await axios.get(`http://localhost:8000/get_projects?user_email=${userEmail}`);
          const refreshedProject = updatedProjects.data.find(p => p.id === intProjectId);
          if (refreshedProject) {
            setSelectedProject(refreshedProject);
          }
          
          showNotification("✅ Collaborateur supprimé avec succès!");
          setLoading(false);
          return;
        } catch (deleteError) {
          console.error("[Frontend Delete] DELETE API error:", deleteError.response?.data);
          console.log("[Frontend Delete] Falling back to UPDATE method...");
        }
      } else {
        console.log("[Frontend Delete] Skipping DELETE API for temporary ID, using UPDATE method directly");
      }
      
      // Get the current project to make manual update
      const projectToUpdate = projects.find(p => p.id === intProjectId);
      if (!projectToUpdate) {
        throw new Error(`Project with ID ${intProjectId} not found in local state.`);
      }
      
      const currentCollaborateurs = projectToUpdate.collaborateurs || [];
      console.log(`[Frontend Delete] Current collaborateurs:`, currentCollaborateurs);
      
      let updatedCollaborateurs;
      
      // For temporary IDs, filter by name components
      if (isTemporaryId && collaborateurId.includes('-')) {
        const nameParts = collaborateurId.split('-');
        const targetNom = nameParts[0];
        const targetPrenom = nameParts[1];
        
        console.log(`[Frontend Delete] Using name matching for temporary ID: "${targetNom}" "${targetPrenom}"`);
        
        updatedCollaborateurs = currentCollaborateurs.filter(c => {
          // Don't match if the values are undefined
          if (!c.nom || !c.prenom) return true;
          
          // Case-insensitive match of name components
          const nomMatches = c.nom.toLowerCase() === targetNom.toLowerCase();
          const prenomMatches = c.prenom.toLowerCase() === targetPrenom.toLowerCase();
          return !(nomMatches && prenomMatches);
        });
      } else {
        // Regular ID matching (string comparison to be safe)
        updatedCollaborateurs = currentCollaborateurs.filter(c => 
          String(c.id) !== String(collaborateurId)
        );
      }
      
      console.log(`[Frontend Delete] Project ${intProjectId} collaborators before: ${currentCollaborateurs.length}, after: ${updatedCollaborateurs.length}`);
      
      // If no collaborators were removed, we failed to find a match
      if (updatedCollaborateurs.length === currentCollaborateurs.length) {
        console.error("[Frontend Delete] Could not find collaborator to delete");
        throw new Error("Collaborateur introuvable. Essayez de rafraîchir la page.");
      }
      
      // Create a new project object with updated collaborateur list
      const updatedProject = { ...projectToUpdate, collaborateurs: updatedCollaborateurs };
      
      // Format data for the update_project endpoint
      const projectData = {
        project_id: intProjectId,
        nom: updatedProject.nom,
        start_date: new Date(updatedProject.start_date).toISOString(),
        end_date: new Date(updatedProject.end_date).toISOString(),
        collaborateurs: updatedCollaborateurs.map(c => ({
          id: c.id, // Keep original IDs
          nom: c.nom,
          prenom: c.prenom,
          grade: c.grade,
          respect_delais: parseFloat(c.respect_delais),
          participation: parseFloat(c.participation),
          resolution_problemes: parseFloat(c.resolution_problemes),
          note_finale: parseFloat(c.note_finale)
        }))
      };
      
      console.log("[Frontend Delete] Using UPDATE API for collaborator removal:", projectData);
      
      // Use the update_project endpoint to update the project
      const updateResponse = await axios.post(`http://localhost:8000/update_project?user_email=${userEmail}`, projectData);
      console.log("[Frontend Delete] UPDATE API response:", updateResponse.data);
      
      // Always fetch fresh data after update
      await fetchProjects();
      
      // Re-select the current project with fresh data
      const refreshedProjects = await axios.get(`http://localhost:8000/get_projects?user_email=${userEmail}`);
      const freshProject = refreshedProjects.data.find(p => p.id === intProjectId);
      if (freshProject) {
        setSelectedProject(freshProject);
      }
      
      showNotification("✅ Collaborateur supprimé avec succès!");
    } catch (error) {
      console.error('[Frontend Delete] Error deleting collaborator:', error);
      setError(`❌ Erreur: ${error.message || 'Impossible de supprimer le collaborateur'}`);
      // Force refresh data from server on error
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

  // Add a new handler for editing collaborator
  const handleEditCollaborateur = (projectId, collaborateur) => {
    setEditingCollaborateur(collaborateur);
    setEditFormData({
      respect_delais: collaborateur.respect_delais === "Non évalué" ? '' : collaborateur.respect_delais,
      participation: collaborateur.participation === "Non évalué" ? '' : collaborateur.participation,
      resolution_problemes: collaborateur.resolution_problemes === "Non évalué" ? '' : collaborateur.resolution_problemes,
    });
    setErrors({});
  };

  // Add a handler for updating input in edit form
  const handleEditInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[`edit-${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`edit-${field}`]: null
      }));
    }
  };

  // Add handler for saving edits
  const handleSaveEdit = async (projectId) => {
    // Validate inputs
    const newErrors = {};
    
    ['respect_delais', 'participation', 'resolution_problemes'].forEach(field => {
      const value = editFormData[field];
      
      if (value === '') {
        // Empty is allowed (will be set to "Non évalué")
        return;
      }
      
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 5) {
        newErrors[`edit-${field}`] = 'La note doit être entre 0 et 5';
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    
    // Calculate final rating (average of all non-empty fields)
    const ratings = ['respect_delais', 'participation', 'resolution_problemes']
      .map(field => editFormData[field] === '' ? null : parseFloat(editFormData[field]))
      .filter(rating => rating !== null);
    
    const noteFinalValue = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "Non évalué";
    
    try {
      setLoading(true);
      
      // Create updated collaborator object
      const updatedCollaborateur = {
        ...editingCollaborateur,
        respect_delais: editFormData.respect_delais === '' ? "Non évalué" : parseFloat(editFormData.respect_delais),
        participation: editFormData.participation === '' ? "Non évalué" : parseFloat(editFormData.participation),
        resolution_problemes: editFormData.resolution_problemes === '' ? "Non évalué" : parseFloat(editFormData.resolution_problemes),
        note_finale: noteFinalValue
      };
      
      // Update the project with the updated collaborator
      const updatedCollaborateurs = selectedProject.collaborateurs.map(c => 
        c.id === editingCollaborateur.id ? updatedCollaborateur : c
      );
      
      const projectData = {
        project_id: projectId,
        nom: selectedProject.nom,
        start_date: new Date(selectedProject.start_date).toISOString(),
        end_date: new Date(selectedProject.end_date).toISOString(),
        collaborateurs: updatedCollaborateurs.map(c => ({
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          grade: c.grade,
          respect_delais: c.respect_delais === "Non évalué" ? 0 : parseFloat(c.respect_delais),
          participation: c.participation === "Non évalué" ? 0 : parseFloat(c.participation),
          resolution_problemes: c.resolution_problemes === "Non évalué" ? 0 : parseFloat(c.resolution_problemes),
          note_finale: c.note_finale === "Non évalué" ? 0 : parseFloat(c.note_finale)
        }))
      };
      
      const response = await axios.post(`http://localhost:8000/update_project?user_email=${userEmail}`, projectData);
      
      // Update the project list with the updated project
      await fetchProjects();
      
      // Re-select the current project with fresh data
      const refreshedProjects = await axios.get(`http://localhost:8000/get_projects?user_email=${userEmail}`);
      const freshProject = refreshedProjects.data.find(p => p.id === projectId);
      if (freshProject) {
        setSelectedProject(freshProject);
      }
      
      // Clear the edit state
      handleCancelEdit();
      
      // Show success notification
      showNotification("✅ Évaluation mise à jour avec succès");
    } catch (error) {
      console.error("Error updating project:", error);
      showNotification("❌ Erreur lors de la mise à jour de l'évaluation", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add cancel edit handler
  const handleCancelEdit = () => {
    setEditingCollaborateur(null);
    setEditFormData({
      respect_delais: '',
      participation: '',
      resolution_problemes: '',
    });
    setErrors({});
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
      
      {/* Success Notification */}
      {notification && (
        <div className="notification-area">
          <div className={`notification ${notification.type}-notification`}>
            {notification.type === 'success' ? 
              <FaCheck className="notification-icon" /> : 
              <FaExclamationCircle className="notification-icon" />
            }
            <span>{notification.message}</span>
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
                  <div className="stat-label">
                    <span className="hover-label">Projets</span>
                  </div>
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
                  <div className="stat-label">
                    <span className="hover-label">Collaborateurs</span>
                  </div>
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
                  <div className="stat-label">
                    <span className="hover-label">Note Moyenne</span>
                  </div>
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
                      
                      {/* Project Status Indicator */}
                      {(() => {
                        const projectEndDate = new Date(selectedProject.end_date);
                        const today = new Date();
                        const isProjectCompleted = projectEndDate < today;
                        
                        return !isProjectCompleted && (
                          <div className="project-status-alert">
                            <div className="status-icon-container">
                              <FaExclamationCircle className="status-icon" />
                                </div>
                            <div className="status-content">
                              <h5 className="status-title">Projet en cours</h5>
                              <p className="status-message">
                                Ce projet est actuellement en cours jusqu'au <strong>{formatDate(selectedProject.end_date)}</strong>. Les évaluations de performance seront activées automatiquement à la fin du projet.
                              </p>
                                  </div>
                                </div>
                        );
                      })()}
                      
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
                        
                        {/* Rating Fields - Only enabled for completed projects */}
                        {(() => {
                          const projectEndDate = new Date(selectedProject.end_date);
                          const today = new Date();
                          const isProjectCompleted = projectEndDate < today;
                          
                          return (
                            <>
                              <div className="form-group">
                                <label className="form-label">Respect des délais {!isProjectCompleted && "(Indisponible)"}</label>
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
                                    disabled={!isProjectCompleted}
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
                                <label className="form-label">Participation {!isProjectCompleted && "(Indisponible)"}</label>
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
                                    disabled={!isProjectCompleted}
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
                                <label className="form-label">Résolution de problèmes {!isProjectCompleted && "(Indisponible)"}</label>
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
                                    disabled={!isProjectCompleted}
                                  />
                                  <span className="rating-suffix">/5</span>
                                </div>
                                {errors[`${selectedProject.id}-resolution_problemes`] && (
                                  <div className="error-message">
                                    {errors[`${selectedProject.id}-resolution_problemes`]}
                                    </div>
                                  )}
                                </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="form-actions">
                                <button
                          className="save-collab-btn"
                          onClick={() => handleAddCollaborateur(selectedProject.id)}
                          disabled={(() => {
                            const projectEndDate = new Date(selectedProject.end_date);
                            const today = new Date();
                            const isProjectCompleted = projectEndDate < today;
                            
                            const basicFieldsMissing = !newCollaborateur[selectedProject.id]?.nom || 
                                              !newCollaborateur[selectedProject.id]?.prenom || 
                                              !newCollaborateur[selectedProject.id]?.grade;
                                              
                            const ratingFieldsMissing = isProjectCompleted && (
                              !newCollaborateur[selectedProject.id]?.respect_delais || 
                              !newCollaborateur[selectedProject.id]?.participation || 
                              !newCollaborateur[selectedProject.id]?.resolution_problemes
                            );
                            
                            return basicFieldsMissing || ratingFieldsMissing || Object.keys(errors).length > 0;
                          })()}
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
                              <div className="collab-actions">
                                {/* Edit button - only available for completed projects */}
                                {(() => {
                                  const projectEndDate = new Date(selectedProject.end_date);
                                  const today = new Date();
                                  const isProjectCompleted = projectEndDate < today;
                                  
                                  return isProjectCompleted && (
                                    <button
                                      className="edit-collab-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCollaborateur(selectedProject.id, collaborateur);
                                      }}
                                    >
                                      <FaPencilAlt />
                                    </button>
                                  );
                                })()}
                                <button
                                  className="delete-collab-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Collaborateur to delete:", collaborateur);
                                    const safeId = collaborateur.id || `${collaborateur.nom}-${collaborateur.prenom}-${Date.now()}`;
                                    handleDeleteCollaborateur(selectedProject.id, safeId);
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                            
                            {/* If this collaborator is being edited, show edit form */}
                            {editingCollaborateur && editingCollaborateur.id === collaborateur.id && (
                              <div className="edit-form">
                                <h4 className="edit-form-title">Modifier l'évaluation</h4>
                                <div className="edit-form-grid">
                                  <div className="form-group">
                                    <label className="form-label">Respect des délais</label>
                                    <div className="rating-input-wrapper">
                                      <input
                                        type="number"
                                        className={`form-control ${errors[`edit-respect_delais`] ? 'is-invalid' : ''}`}
                                        value={editFormData.respect_delais}
                                        onChange={(e) => handleEditInputChange("respect_delais", e.target.value)}
                                        placeholder="Note /5"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                      />
                                      <span className="rating-suffix">/5</span>
                                    </div>
                                    {errors[`edit-respect_delais`] && (
                                      <div className="error-message">
                                        {errors[`edit-respect_delais`]}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="form-group">
                                    <label className="form-label">Participation</label>
                                    <div className="rating-input-wrapper">
                                      <input
                                        type="number"
                                        className={`form-control ${errors[`edit-participation`] ? 'is-invalid' : ''}`}
                                        value={editFormData.participation}
                                        onChange={(e) => handleEditInputChange("participation", e.target.value)}
                                        placeholder="Note /5"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                      />
                                      <span className="rating-suffix">/5</span>
                                    </div>
                                    {errors[`edit-participation`] && (
                                      <div className="error-message">
                                        {errors[`edit-participation`]}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="form-group">
                                    <label className="form-label">Résolution de problèmes</label>
                                    <div className="rating-input-wrapper">
                                      <input
                                        type="number"
                                        className={`form-control ${errors[`edit-resolution_problemes`] ? 'is-invalid' : ''}`}
                                        value={editFormData.resolution_problemes}
                                        onChange={(e) => handleEditInputChange("resolution_problemes", e.target.value)}
                                        placeholder="Note /5"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                      />
                                      <span className="rating-suffix">/5</span>
                                    </div>
                                    {errors[`edit-resolution_problemes`] && (
                                      <div className="error-message">
                                        {errors[`edit-resolution_problemes`]}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="edit-form-actions">
                                  <button
                                    className="save-edit-btn"
                                    onClick={() => handleSaveEdit(selectedProject.id)}
                                  >
                                    <FaCheck className="btn-icon" /> Sauvegarder
                                  </button>
                                  
                                  <button
                                    className="cancel-edit-btn"
                                    onClick={handleCancelEdit}
                                  >
                                    <FaTimes className="btn-icon" /> Annuler
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Only show ratings if not editing this collaborator */}
                            {!(editingCollaborateur && editingCollaborateur.id === collaborateur.id) && (
                              <div className="collab-ratings">
                                {collaborateur.respect_delais === 0 && collaborateur.participation === 0 && collaborateur.resolution_problemes === 0 ? (
                                  <div className="no-ratings-message">
                                    <p>Ce collaborateur n'a pas encore été évalué.</p>
                                    <p>L'évaluation sera disponible une fois le projet terminé.</p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="rating-item">
                                      <div className="rating-label">Respect des délais</div>
                                      <div className="rating-bar-container">
                                        {collaborateur.respect_delais === 0 ? (
                                          <div className="unrated-bar">
                                            <span className="rating-value">Non évalué</span>
                                          </div>
                                        ) : (
                                          <div 
                                            className="rating-bar respect-bar" 
                                            style={{ width: `${(collaborateur.respect_delais/5)*100}%` }}
                                          >
                                            <span className="rating-value">{collaborateur.respect_delais}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="rating-item">
                                      <div className="rating-label">Participation</div>
                                      <div className="rating-bar-container">
                                        {collaborateur.participation === 0 ? (
                                          <div className="unrated-bar">
                                            <span className="rating-value">Non évalué</span>
                                          </div>
                                        ) : (
                                          <div 
                                            className="rating-bar participation-bar" 
                                            style={{ width: `${(collaborateur.participation/5)*100}%` }}
                                          >
                                            <span className="rating-value">{collaborateur.participation}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="rating-item">
                                      <div className="rating-label">Résolution de problèmes</div>
                                      <div className="rating-bar-container">
                                        {collaborateur.resolution_problemes === 0 ? (
                                          <div className="unrated-bar">
                                            <span className="rating-value">Non évalué</span>
                                          </div>
                                        ) : (
                                          <div 
                                            className="rating-bar resolution-bar" 
                                            style={{ width: `${(collaborateur.resolution_problemes/5)*100}%` }}
                                          >
                                            <span className="rating-value">{collaborateur.resolution_problemes}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            
                            <div className="collab-footer">
                              <div className="final-rating">
                                <FaTrophy className="trophy-icon" />
                                <div className="final-score">
                                  {(typeof collaborateur.note_finale === "string" && collaborateur.note_finale === "Non évalué") || 
                                   (collaborateur.respect_delais === 0 && collaborateur.participation === 0 && collaborateur.resolution_problemes === 0) ? (
                                    <span className="score-pending">Non évalué</span>
                                  ) : (
                                    <>
                                      <span className="score-value">{collaborateur.note_finale}</span>
                                      <span className="score-max">/5</span>
                                    </>
                                  )}
                                </div>
                                <div className="score-emoji">
                                  {(typeof collaborateur.note_finale === "string") || 
                                   (collaborateur.respect_delais === 0 && collaborateur.participation === 0 && collaborateur.resolution_problemes === 0) ? '⏳' :
                                   parseFloat(collaborateur.note_finale) >= 4 ? '😊' : 
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