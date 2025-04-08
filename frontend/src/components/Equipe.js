import React, { useState, useEffect, useCallback } from "react";
import { FaTrash, FaPlus, FaArrowLeft, FaUsers, FaChartLine, FaStar, FaFilter, FaExclamationCircle, FaFileExcel } from "react-icons/fa";
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
  }, [userEmail]);

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

    setLoading(true);
    try {
      // Delete project (backend will handle collaborator deletion)
      await axios.delete(`http://localhost:8000/delete_project/${projectId}?user_email=${userEmail}`);
      
      setProjects(prevProjects => prevProjects.filter(proj => proj.id !== projectId));
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
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-start mb-4">
        <button onClick={() => window.history.back()} className="btn btn-outline-secondary">
          <FaArrowLeft className="me-2" /> Retour
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger d-flex align-items-center shadow-sm" role="alert">
          <FaExclamationCircle className="me-2" />
          {error}
        </div>
      )}
      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-lg border-0">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h1 className="h2 mb-2">
                    <FaUsers className="me-2 text-primary" />
                    Gestion des Projets
                  </h1>
                  <p className="text-muted mb-0">Gérez vos projets et évaluez vos collaborateurs</p>
                </div>
                <div className="d-flex gap-4">
                  <div className="card bg-light">
                    <div className="card-body text-center p-3">
                      <FaUsers className="text-primary mb-2" style={{ fontSize: '1.5rem' }} />
                      <h3 className="mb-0">{projects.length}</h3>
                      <small className="text-muted">Projets</small>
                    </div>
                  </div>
                  <div className="card bg-light">
                    <div className="card-body text-center p-3">
                      <FaChartLine className="text-primary mb-2" style={{ fontSize: '1.5rem' }} />
                      <h3 className="mb-0">
                        {projects.reduce((acc, proj) => acc + proj.collaborateurs.length, 0)}
                      </h3>
                      <small className="text-muted">Collaborateurs</small>
                    </div>
                  </div>
                  <div className="card bg-light">
                    <div className="card-body text-center p-3">
                      <FaStar className="text-primary mb-2" style={{ fontSize: '1.5rem' }} />
                      <h3 className="mb-0">
                        {(() => {
                          const totalScore = projects.reduce((acc, proj) => {
                            const avg = proj.collaborateurs.reduce((sum, collab) => sum + parseFloat(collab.note_finale), 0) / proj.collaborateurs.length;
                            return acc + (isNaN(avg) ? 0 : avg);
                          }, 0);
                          return (totalScore / (projects.length || 1)).toFixed(1);
                        })()}
                      </h3>
                      <small className="text-muted">Note Moyenne</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm mb-4">
                <div className="card-body p-4">
                  <h5 className="card-title mb-3">Ajouter un nouveau projet</h5>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="form-floating">
        <input
          type="text"
                          className="form-control"
                          id="projectName"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
                          placeholder="Nom du projet"
                        />
                        <label htmlFor="projectName">Nom du projet</label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id="startDate"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                        <label htmlFor="startDate">Date de début</label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id="endDate"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                        <label htmlFor="endDate">Date de fin</label>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <button 
                        className="btn btn-primary w-100 h-100"
                        onClick={handleCreateProject}
                        disabled={!newProject.trim() || !startDate || !endDate}
                      >
                        <FaPlus className="me-2" /> Ajouter
        </button>
                    </div>
                  </div>
                </div>
      </div>

              {projects.map((project) => (
                <div key={project.id} className="card shadow-sm mb-4">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <div>
                      <h5 className="mb-1">{project.nom}</h5>
                      <div className="d-flex gap-3">
                        <span className="badge bg-primary">
                          <FaUsers className="me-1" />
                          {project.collaborateurs.length} Collaborateurs
                        </span>
                        <span className="text-muted">
                          Début: {new Date(project.start_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-muted">
                          Fin: {new Date(project.end_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <FaTrash className="me-1" /> Supprimer
            </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <div className="d-flex align-items-center">
                        <FaFilter className="me-2 text-muted" />
                        <select 
                          className="form-select w-auto"
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
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Nom</th>
                            <th>Prénom</th>
                  <th>Grade</th>
                            <th>Respect des délais</th>
                  <th>Participation</th>
                            <th>Résolution de problèmes</th>
                  <th>Note Finale</th>
                            <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                          {filteredCollaborateurs(project.collaborateurs).map((collaborateur) => (
                            <tr key={collaborateur.id}>
                              <td>{collaborateur.nom}</td>
                              <td>{collaborateur.prenom}</td>
                              <td>
                                <span className="badge bg-info">
                                  {collaborateur.grade}
                                </span>
                              </td>
                              <td>
                                <div className="progress" style={{ height: '20px' }}>
                                  <div 
                                    className="progress-bar bg-success" 
                                    role="progressbar" 
                                    style={{ width: `${(collaborateur.respect_delais/5)*100}%` }}
                                    aria-valuenow={collaborateur.respect_delais}
                                    aria-valuemin="0"
                                    aria-valuemax="5"
                                  >
                                    {collaborateur.respect_delais}/5
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="progress" style={{ height: '20px' }}>
                                  <div 
                                    className="progress-bar bg-info" 
                                    role="progressbar" 
                                    style={{ width: `${(collaborateur.participation/5)*100}%` }}
                                    aria-valuenow={collaborateur.participation}
                                    aria-valuemin="0"
                                    aria-valuemax="5"
                                  >
                                    {collaborateur.participation}/5
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="progress" style={{ height: '20px' }}>
                                  <div 
                                    className="progress-bar bg-warning" 
                                    role="progressbar" 
                                    style={{ width: `${(collaborateur.resolution_problemes/5)*100}%` }}
                                    aria-valuenow={collaborateur.resolution_problemes}
                                    aria-valuemin="0"
                                    aria-valuemax="5"
                                  >
                                    {collaborateur.resolution_problemes}/5
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${parseFloat(collaborateur.note_finale) >= 4 ? 'bg-success' : parseFloat(collaborateur.note_finale) >= 3 ? 'bg-warning' : 'bg-danger'}`}>
                                  {collaborateur.note_finale}/5
                                  {parseFloat(collaborateur.note_finale) > 3.5 ? ' 😊' : parseFloat(collaborateur.note_finale) >= 2.5 ? ' 😐' : ' 😢'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDeleteCollaborateur(project.id, collaborateur.id)}
                                >
                                  <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
                          {showAddCollaborateur[project.id] && (
                            <tr className="bg-light">
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={newCollaborateur[project.id]?.nom || ""}
                                  onChange={(e) => handleInputChange(project.id, "nom", e.target.value)}
                                  placeholder="Nom"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={newCollaborateur[project.id]?.prenom || ""}
                                  onChange={(e) => handleInputChange(project.id, "prenom", e.target.value)}
                                  placeholder="Prénom"
                                />
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={newCollaborateur[project.id]?.grade || ""}
                                  onChange={(e) => handleInputChange(project.id, "grade", e.target.value)}
                                >
                                  <option value="">Sélectionner un grade</option>
                                  {grades.slice(1).map(grade => (
                                    <option key={grade.value} value={grade.value}>
                                      {grade.label}
                                    </option>
                        ))}
                      </select>
                    </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    className={`form-control ${errors[`${project.id}-respect_delais`] ? 'is-invalid' : ''}`}
                                    value={newCollaborateur[project.id]?.respect_delais || ""}
                                    onChange={(e) => handleInputChange(project.id, "respect_delais", e.target.value)}
                                    placeholder="Note /5"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                  />
                                  {errors[`${project.id}-respect_delais`] && (
                                    <div className="invalid-feedback">
                                      {errors[`${project.id}-respect_delais`]}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    className={`form-control ${errors[`${project.id}-participation`] ? 'is-invalid' : ''}`}
                                    value={newCollaborateur[project.id]?.participation || ""}
                                    onChange={(e) => handleInputChange(project.id, "participation", e.target.value)}
                                    placeholder="Note /5"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                  />
                                  {errors[`${project.id}-participation`] && (
                                    <div className="invalid-feedback">
                                      {errors[`${project.id}-participation`]}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    className={`form-control ${errors[`${project.id}-resolution_problemes`] ? 'is-invalid' : ''}`}
                                    value={newCollaborateur[project.id]?.resolution_problemes || ""}
                                    onChange={(e) => handleInputChange(project.id, "resolution_problemes", e.target.value)}
                                    placeholder="Note /5"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                  />
                                  {errors[`${project.id}-resolution_problemes`] && (
                                    <div className="invalid-feedback">
                                      {errors[`${project.id}-resolution_problemes`]}
                                    </div>
                                  )}
                                </div>
                              </td>
                    <td colSpan="2">
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleAddCollaborateur(project.id)}
                                  disabled={!newCollaborateur[project.id]?.nom || 
                                           !newCollaborateur[project.id]?.prenom || 
                                           !newCollaborateur[project.id]?.grade || 
                                           !newCollaborateur[project.id]?.respect_delais || 
                                           !newCollaborateur[project.id]?.participation || 
                                           !newCollaborateur[project.id]?.resolution_problemes ||
                                           Object.keys(errors).length > 0}
                                >
                                  <FaPlus />
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
                    </div>

                    <div className="mt-3">
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowAddCollaborateur({ ...showAddCollaborateur, [project.id]: !showAddCollaborateur[project.id] })}
                      >
                        <FaPlus className="me-2" />
                        {showAddCollaborateur[project.id] ? "Annuler" : "Ajouter un collaborateur"}
                      </button>
                    </div>
                  </div>
          </div>
        ))}

              <div className="d-flex justify-content-between mt-4">
                <button onClick={handleExportExcel} className="btn btn-success">
                  <FaFileExcel className="me-2" /> Exporter Excel
        </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Equipe;
