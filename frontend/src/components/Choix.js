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
  // New state for new collaborator modal
  const [showNewCollaboratorModal, setShowNewCollaboratorModal] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState({
    firstName: "",
    lastName: "",
    grade: ""
  });
  // New state for saved collaborators list
  const [savedCollaborators, setSavedCollaborators] = useState([]);
  const [selectedExistingCollaborator, setSelectedExistingCollaborator] = useState(null);
  // Add new state variables for project assignment functionality
  const [showAddToProjectModal, setShowAddToProjectModal] = useState(false);
  const [selectedCollaboratorForProject, setSelectedCollaboratorForProject] = useState(null);
  const [activeProjects, setActiveProjects] = useState([]);
  const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");

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
        const uniqueCollaborators = new Set();
        
        response.data.forEach(fb => {
          if (!feedbacksByCollaborator[fb.collaborator_name]) {
            feedbacksByCollaborator[fb.collaborator_name] = [];
            uniqueCollaborators.add(fb.collaborator_name);
          }
          feedbacksByCollaborator[fb.collaborator_name].push(fb);
        });
        
        // Create array of unique collaborator names
        const collaboratorsArray = Array.from(uniqueCollaborators).map(name => {
          const nameParts = name.split(' ');
          let firstName = '';
          let lastName = '';
          
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else {
            lastName = name;
          }
          
          return { name, firstName, lastName };
        });
        
        setSavedCollaborators(collaboratorsArray);
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

  // Process grade values to ensure they're numbers
  const normalizeGradeValue = useCallback((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle comma as decimal separator
      return parseFloat(value.replace(',', '.')) || 0;
    }
    return 0;
  }, []);

  const calculateAverageGrade = (skills) => {
    if (!skills || skills.length === 0) return 0;
    
    console.log("Skills before calculation:", skills);
    
    // Filter out any invalid grade values and calculate average
    const validGrades = skills
        .map(skill => {
            // Handle both string and number formats
            const grade = normalizeGradeValue(skill["Grade Value"]);
            console.log(`Grade for ${skill["Skill"]}: ${skill["Grade Value"]} → ${grade}`);
            return grade;
        })
        .filter(grade => grade > 0); // Only include positive grades
    
    console.log("Valid grades:", validGrades);
    
    if (validGrades.length === 0) return 0;
    
    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    const average = (sum / validGrades.length).toFixed(1);
    console.log(`Average grade: ${average}`);
    return average;
  };

  // Pre-process collaborator data to normalize grade values
  const preprocessCollaborators = useCallback((collaborators) => {
    return collaborators.map(collab => ({
      ...collab,
      skills: collab.skills.map(skill => ({
        ...skill,
        "Grade Value": normalizeGradeValue(skill["Grade Value"])
      }))
    }));
  }, [normalizeGradeValue]);

  // Modified group function to ensure grade values are normalized
  const groupCollaboratorsBySkills = useCallback((collaborators) => {
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
      
      // For each skill, ensure the grade is normalized
      if (collab.skills) {
        collab.skills.forEach(skill => {
          grouped[key].skills.push({
            "Skill Parent-Category": skill["Skill Parent-Category"],
            "Skill Category": skill["Skill Category"],
            "Skill": skill["Skill"],
            "Grade Value": normalizeGradeValue(skill["Grade Value"])
          });
        });
      }
    });
    return Object.values(grouped);
  }, [normalizeGradeValue]);

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
          console.log("Raw collaborator data:", response.data.collaborators);
          
          // Pre-process to normalize grade values
          const processedCollaborators = preprocessCollaborators(response.data.collaborators);
          console.log("Processed collaborator data:", processedCollaborators);
          
          const groupedCollaborators = groupCollaboratorsBySkills(processedCollaborators);
          console.log("Grouped collaborator data:", groupedCollaborators);
          
          setCollaborators(groupedCollaborators);
          setFilteredCollaborators(groupedCollaborators);
          
          // Set categories from saved collaborators
          const categories = [...new Set(groupedCollaborators.flatMap(collab => 
            collab.skills.map(skill => skill["Skill Parent-Category"])
          ))].filter(Boolean);
          setParentCategories(categories);
          
          const skillCategories = [...new Set(groupedCollaborators.flatMap(collab => 
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
  }, [userEmail, fetchFeedbacks, preprocessCollaborators, groupCollaboratorsBySkills]);

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
          console.log("Raw collaborator data after upload:", collaboratorsResponse.data.collaborators);
          
          // Process collaborators data properly 
          const processedCollaborators = preprocessCollaborators(collaboratorsResponse.data.collaborators);
          console.log("Processed collaborator data after upload:", processedCollaborators);
          
          const groupedCollaborators = groupCollaboratorsBySkills(processedCollaborators);
          console.log("Grouped collaborator data after upload:", groupedCollaborators);
          
          // Force a complete re-rendering by setting state in sequence
          setCollaborators([]);
          setTimeout(() => {
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
          }, 100);
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

    // Get the collaborator's full name
    const collaboratorName = `${selectedCollaborator["First Name"]} ${selectedCollaborator["Last Name"]}`;
    
    // Check if the user has already provided feedback for this collaborator
    const existingFeedbacks = feedbacks[collaboratorName] || [];
    const hasUserAlreadyProvidedFeedback = existingFeedbacks.some(fb => fb.created_by === user.email);
    
    if (hasUserAlreadyProvidedFeedback) {
      setFeedbackMessage("❌ Vous avez déjà fourni un feedback pour ce collaborateur.");
      return;
    }
    
    setFeedbackLoading(true);
    setFeedbackMessage("");

    try {
      const response = await axios.post("http://localhost:8000/add_feedback", {
        collaborator_name: collaboratorName,
        feedback: feedback.trim(),
        user_email: userEmail,
        department: userDepartment
      });

      setFeedbackMessage("✅ Feedback envoyé avec succès!");
      setFeedback("");
      
      // Log if feedback was recommended based on sentiment analysis
      if (response.data && response.data.is_recommended) {
        console.log("Ce feedback a été automatiquement marqué comme recommandé basé sur l'analyse de sentiment.");
      }
      
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

  const handleNewCollaboratorSubmit = async (e) => {
    e.preventDefault();
    
    // Check if we're submitting for an existing collaborator or a new one
    if (selectedExistingCollaborator) {
      // For existing collaborator, just need feedback
      if (!feedback.trim()) {
        setFeedbackMessage("❌ Veuillez remplir le champ feedback.");
        return;
      }
      
      setFeedbackLoading(true);
      setFeedbackMessage("");

      try {
        const response = await axios.post("http://localhost:8000/add_feedback", {
          collaborator_name: selectedExistingCollaborator.name,
          feedback: feedback.trim(),
          user_email: userEmail,
          department: userDepartment
        });

        setFeedbackMessage("✅ Feedback envoyé avec succès!");
        setFeedback("");
        
        // Log if feedback was recommended based on sentiment analysis
        if (response.data && response.data.is_recommended) {
          console.log("Ce feedback a été automatiquement marqué comme recommandé basé sur l'analyse de sentiment.");
        }
        
        // Notifications are now handled by the backend
        
        // Refresh feedbacks
        fetchFeedbacks();
        
        // Close modal after successful submission
        setTimeout(() => {
          setShowNewCollaboratorModal(false);
          setSelectedExistingCollaborator(null);
          setFeedbackMessage("");
        }, 2000);
      } catch (error) {
        setFeedbackMessage("❌ Erreur lors de l'envoi du feedback.");
        console.error("Feedback error:", error);
      } finally {
        setFeedbackLoading(false);
      }
    } else {
      // For new collaborator, need all fields
      if (!feedback.trim() || !newCollaborator.firstName || !newCollaborator.lastName || !newCollaborator.grade) {
        setFeedbackMessage("❌ Veuillez remplir tous les champs.");
        return;
      }

      setFeedbackLoading(true);
      setFeedbackMessage("");

      try {
        const collaboratorName = `${newCollaborator.firstName} ${newCollaborator.lastName}`;
        
        // Check if the collaborator already exists and if the user has already given feedback
        const existingFeedbacks = feedbacks[collaboratorName] || [];
        console.log("[handleNewCollaboratorSubmit - New] Checking feedback:", { userEmail, existingFeedbacks }); // DEBUG LOG
        const hasUserAlreadyProvidedFeedback = existingFeedbacks.some(fb => fb.created_by === userEmail);
        
        if (hasUserAlreadyProvidedFeedback) {
          setFeedbackMessage("❌ Vous avez déjà fourni un feedback pour ce collaborateur.");
          return;
        }
        
        const response = await axios.post("http://localhost:8000/add_feedback", {
          collaborator_name: collaboratorName,
          feedback: feedback.trim(),
          user_email: userEmail,
          department: userDepartment
        });

        setFeedbackMessage("✅ Feedback envoyé avec succès!");
        setFeedback("");
        setNewCollaborator({
          firstName: "",
          lastName: "",
          grade: ""
        });
        
        // Log if feedback was recommended based on sentiment analysis
        if (response.data && response.data.is_recommended) {
          console.log("Ce feedback a été automatiquement marqué comme recommandé basé sur l'analyse de sentiment.");
        }
        
        // Notifications are now handled by the backend
        
        // Refresh feedbacks
        fetchFeedbacks();
        
        // Add the newly created collaborator to both main lists to ensure they appear in the "Ajouter à un projet" modal
        if (!selectedExistingCollaborator) {
          const newlyAddedCollaborator = {
            "First Name": newCollaborator.firstName,
            "Last Name": newCollaborator.lastName,
            skills: [] // Add empty skills array for consistency
          };
          setCollaborators(prev => [...prev, newlyAddedCollaborator]);
          setFilteredCollaborators(prev => [...prev, newlyAddedCollaborator]);
        }
        
        // Close modal after successful submission
        setTimeout(() => {
          setShowNewCollaboratorModal(false);
          setFeedbackMessage("");
        }, 2000);
      } catch (error) {
        setFeedbackMessage("❌ Erreur lors de l'envoi du feedback.");
        console.error("Feedback error:", error);
      } finally {
        setFeedbackLoading(false);
      }
    }
  };

  // Function to handle collaborator selection from the list
  const handleSelectExistingCollaborator = (collab) => {
    setSelectedExistingCollaborator(collab);
  };
  
  // Reset selection and show manual input form
  const handleShowManualInput = () => {
    setSelectedExistingCollaborator(null);
  };

  // Available grades for dropdown
  const gradeOptions = [
    "Junior 1",
    "Junior 2",
    "Senior 1",
    "Senior 2",
    "Senior 3"
  ];

  // Add new function to fetch active projects
  const fetchActiveProjects = useCallback(async () => {
    if (!userEmail) return;
    
    setProjectsLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/get_active_projects?user_email=${userEmail}`);
      if (response.data && Array.isArray(response.data)) {
        setActiveProjects(response.data);
      }
    } catch (error) {
      console.error("Error fetching active projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  }, [userEmail]);

  // Function to handle opening the add to project modal
  const handleAddToProject = (collab) => {
    setSelectedCollaboratorForProject(collab);
    fetchActiveProjects();
    setShowAddToProjectModal(true);
    setAssignmentMessage("");
  };

  // Function to add a collaborator to a project
  const handleAddCollaboratorToProject = async () => {
    if (!selectedCollaboratorForProject || !selectedProjectForAssignment) {
      setAssignmentMessage("❌ Veuillez sélectionner un projet.");
      return;
    }

    setProjectsLoading(true);
    try {
      const collaborator = {
        nom: selectedCollaboratorForProject["Last Name"],
        prenom: selectedCollaboratorForProject["First Name"],
        grade: "junior1", // Default grade - can be modified in the form
        respect_delais: null,
        participation: null,
        resolution_problemes: null,
        note_finale: "Non évalué"
      };
      
      await axios.post(`http://localhost:8000/add_collaborator_to_project?user_email=${userEmail}`, {
        project_id: selectedProjectForAssignment.id,
        collaborateur: collaborator
      });
      
      setAssignmentMessage("✅ Collaborateur ajouté au projet avec succès!");
      
      // Reset project selection after successful assignment
      setTimeout(() => {
        setShowAddToProjectModal(false);
        setSelectedCollaboratorForProject(null);
        setSelectedProjectForAssignment(null);
        setAssignmentMessage("");
      }, 2000);
      
    } catch (error) {
      console.error("Error adding collaborator to project:", error);
      setAssignmentMessage(`❌ Erreur: ${error.response?.data?.detail || "Impossible d'ajouter le collaborateur au projet."}`);
    } finally {
      setProjectsLoading(false);
    }
  };

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
            <div className="panel-header-actions">
              <h3 className="panel-title">
                <FaUsers className="panel-icon" /> Collaborateurs ({filteredAndSortedCollaborators.length})
              </h3>
              
              <div className="action-buttons">
                {/* Add new button for adding collaborator to project */}
                <button 
                  className="add-to-project-btn" 
                  onClick={() => {
                    // By default, open the modal without a specific collaborator
                    setSelectedCollaboratorForProject(null);
                    fetchActiveProjects();
                    setShowAddToProjectModal(true);
                    setAssignmentMessage("");
                  }}
                >
                  <FaUsers className="btn-icon" /> Ajouter à un Projet
                </button>
                
                {/* Existing button for adding feedback */}
                <button 
                  className="add-new-feedback-btn" 
                  onClick={() => {
                    setShowNewCollaboratorModal(true);
                    setFeedback("");
                    setFeedbackMessage("");
                  }}
                >
                  <FaComment className="btn-icon" /> Nouveau Feedback
                </button>
              </div>
            </div>
            
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
                                    <p className="feedback-text">
                                      {fb.feedback}
                                      {/* Display recommendation tag based on sentiment analysis and user role */}
                                      {user.poste.toLowerCase().includes("manager") && (
                                        <>
                                          {fb.is_recommended === true && (
                                            <span className="recommendation-tag positive">
                                              <FaStar className="tag-icon" /> Recommandé
                                            </span>
                                          )}
                                          {fb.is_recommended === false && (
                                            <span className="recommendation-tag negative">
                                              <FaTimes className="tag-icon" /> Non recommandé
                                            </span>
                                          )}
                                        </>
                                      )}
                        </p>
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
                
                <button 
                  className="action-btn project-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToProject(collab);
                  }}
                >
                  <FaUsers className="action-icon" /> Ajouter à un projet
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
                        {user.poste.toLowerCase().includes("manager") && (
                          <th className="recommendation-col">
                            <div className="th-content">
                              <FaStar className="th-icon" /> Recommandation
                            </div>
                          </th>
                        )}
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
                        // Sort collabFeedbacks with recommended feedbacks first
                        collabFeedbacks
                          .sort((a, b) => {
                            // Sort recommended first, then non-recommended, then others
                            if (a.is_recommended === true && b.is_recommended !== true) return -1;
                            if (a.is_recommended !== true && b.is_recommended === true) return 1;
                            return 0;
                          })
                          .map((fb, index) => (
                          <tr 
                            key={`${collaboratorName}-${index}`} 
                            className={`feedback-row ${fb.is_recommended === true ? 'recommended' : ''}`}
                          >
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
                                <div className="feedback-content">
                                  {fb.feedback}
                                </div>
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
                            {user.poste.toLowerCase().includes("manager") && (
                              <td className="recommendation-cell">
                                {fb.is_recommended === true && (
                                  <span className="recommendation-tag table-tag positive">
                                    <FaStar className="tag-icon" /> Recommandé
                                  </span>
                                )}
                                {fb.is_recommended === false && (
                                  <span className="recommendation-tag table-tag negative">
                                    <FaTimes className="tag-icon" /> Non recommandé
                                  </span>
                                )}
                                {fb.is_recommended !== true && fb.is_recommended !== false && (
                                  <span className="recommendation-tag table-tag neutral">
                                    Non évalué
                                  </span>
                                )}
                              </td>
                            )}
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

      {/* New Collaborator Feedback Modal */}
      {showNewCollaboratorModal && (
        <div className="modal-overlay">
          <div className="feedback-modal new-collab-modal">
            <div className="modal-header">
              <div className="modal-title">
                <div className="collab-avatar large new-collab">
                  <FaUser />
                </div>
                <h3>
                  {selectedExistingCollaborator 
                    ? `Feedback pour ${selectedExistingCollaborator.name}` 
                    : "Ajouter un nouveau feedback"}
                </h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  setShowNewCollaboratorModal(false);
                  setSelectedExistingCollaborator(null);
                }}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              {!selectedExistingCollaborator && (
                <>
                  {/* List of Existing Collaborators */}
                  {savedCollaborators.length > 0 && (
                    <div className="existing-collaborators-section">
                      <h4 className="section-title">Collaborateurs existants</h4>
                      <div className="collaborators-list">
                        {savedCollaborators.map((collab, index) => (
                          <div 
                            key={index}
                            className="collaborator-list-item"
                            onClick={() => handleSelectExistingCollaborator(collab)}
                          >
                            <div className="collaborator-list-avatar">
                              {collab.firstName ? collab.firstName.charAt(0) : ''}{collab.lastName.charAt(0)}
                            </div>
                            <span className="collaborator-list-name">{collab.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="separator">
                    <span>OU</span>
                  </div>

                  <h4 className="section-title">Nouveau collaborateur</h4>
                </>
              )}

              <form onSubmit={handleNewCollaboratorSubmit} className="feedback-form">
                {!selectedExistingCollaborator && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="firstName" className="form-label">Prénom</label>
                        <input
                          type="text"
                          id="firstName"
                          className="form-control"
                          placeholder="Prénom du collaborateur"
                          value={newCollaborator.firstName}
                          onChange={(e) => setNewCollaborator({...newCollaborator, firstName: e.target.value})}
                          required={!selectedExistingCollaborator}
                />
              </div>
                      <div className="form-group">
                        <label htmlFor="lastName" className="form-label">Nom</label>
                        <input
                          type="text"
                          id="lastName"
                          className="form-control"
                          placeholder="Nom du collaborateur"
                          value={newCollaborator.lastName}
                          onChange={(e) => setNewCollaborator({...newCollaborator, lastName: e.target.value})}
                          required={!selectedExistingCollaborator}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="grade" className="form-label">Grade</label>
                      <select
                        id="grade"
                        className="form-control grade-select"
                        value={newCollaborator.grade}
                        onChange={(e) => setNewCollaborator({...newCollaborator, grade: e.target.value})}
                        required={!selectedExistingCollaborator}
                      >
                        <option value="">Sélectionner un grade</option>
                        {gradeOptions.map((grade) => (
                          <option key={grade} value={grade.toLowerCase().replace(' ', '')}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {selectedExistingCollaborator && (
                  <div className="selected-collaborator-info">
                    <button 
                      type="button" 
                      className="change-collaborator-btn" 
                      onClick={handleShowManualInput}
                    >
                      <FaArrowLeft className="icon" /> Choisir un autre collaborateur
                    </button>
                  </div>
                )}

                <h4 className="section-title">Feedback</h4>
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

      {/* Add to Project Modal */}
      {showAddToProjectModal && (
        <div className="modal-overlay">
          <div className="project-assignment-modal">
            <div className="modal-header">
              <div className="modal-title">
                <div className="collab-avatar large">
                  {selectedCollaboratorForProject ? 
                    `${selectedCollaboratorForProject["First Name"].charAt(0)}${selectedCollaboratorForProject["Last Name"].charAt(0)}` : 
                    <FaUsers />
                  }
                </div>
                <h3>
                  {selectedCollaboratorForProject ? 
                    `Ajouter ${selectedCollaboratorForProject["First Name"]} ${selectedCollaboratorForProject["Last Name"]} à un projet` 
                    : "Sélectionner un projet"}
                </h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  setShowAddToProjectModal(false);
                  setSelectedCollaboratorForProject(null);
                }}
                aria-label="Fermer"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              {!selectedCollaboratorForProject && (
                <div className="collaborator-selector">
                  <h4 className="section-title">Sélectionner un collaborateur</h4>
                  <div className="collaborators-list scrollable-list">
                    {filteredAndSortedCollaborators.map((collab, index) => (
                      <div 
                        key={index}
                        className="collaborator-list-item"
                        onClick={() => setSelectedCollaboratorForProject(collab)}
                      >
                        <div className="collaborator-list-avatar">
                          {collab["First Name"].charAt(0)}{collab["Last Name"].charAt(0)}
                        </div>
                        <span className="collaborator-list-name">
                          {collab["First Name"]} {collab["Last Name"]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCollaboratorForProject && (
                <>
                  <div className="form-group">
                    <label htmlFor="project" className="form-label">Sélectionner un projet</label>
                    {projectsLoading ? (
                      <div className="loading-select-indicator">
                        <div className="spinner small"></div>
                        <span>Chargement des projets...</span>
                      </div>
                    ) : (
                      <select
                        id="project"
                        className="form-control"
                        value={selectedProjectForAssignment ? selectedProjectForAssignment.id : ""}
                        onChange={(e) => {
                          const selectedProject = activeProjects.find(p => p.id === parseInt(e.target.value));
                          setSelectedProjectForAssignment(selectedProject);
                        }}
                        disabled={projectsLoading}
                      >
                        <option value="">Sélectionner un projet</option>
                        {activeProjects.map((project, index) => (
                          <option key={index} value={project.id}>
                            {project.nom}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}

              {assignmentMessage && (
                <div className={`status-message ${assignmentMessage.includes('✅') ? 'success' : 'error'}`}>
                  {assignmentMessage}
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn"
                onClick={handleAddCollaboratorToProject}
                disabled={!selectedProjectForAssignment || projectsLoading}
              >
                {projectsLoading ? (
                  <>
                    <div className="spinner small"></div>
                    <span>Chargement...</span>
                  </>
                ) : !selectedCollaboratorForProject ? (
                  <>
                    <FaUsers className="send-icon" />
                    <span>Sélectionner un collaborateur</span>
                  </>
                ) : !selectedProjectForAssignment ? (
                  <>
                    <FaPaperPlane className="send-icon" />
                    <span>Sélectionner un projet</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="send-icon" />
                    <span>Ajouter au projet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Choix;