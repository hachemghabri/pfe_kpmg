import React, { useState, useEffect } from "react";
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
  FaStar
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

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user ? user.email : null;

  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error fetching saved collaborators:", error);
        setMessage("❌ Erreur lors du chargement des collaborateurs sauvegardés.");
      }
    };

    fetchSavedCollaborators();
  }, [userEmail]);

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
        user_email: userEmail
      });

      setFeedbackMessage("✅ Feedback envoyé avec succès!");
      setFeedback("");
    } catch (error) {
      setFeedbackMessage("❌ Erreur lors de l'envoi du feedback.");
      console.error("Feedback error:", error);
    } finally {
      setFeedbackLoading(false);
    }
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
      {/* 🚀 Back to Dashboard Button */}
      <button className="btn btn-light shadow-sm back-btn" onClick={() => navigate("/dashboard")}>
        <FaArrowLeft /> Retour au Dashboard
      </button>

      <h2 className="choix-title">🌟 Sélection des Collaborateurs</h2>

      {/* Upload Section */}
      <div className="upload-section">
        <label className="file-input-label">
          <FaFileAlt className="me-2" />
          <input type="file" accept=".xlsx" onChange={handleFileChange} hidden />
          {file ? `📂 ${file.name}` : "Sélectionnez un fichier"}
        </label>
        <button 
          className={`btn btn-success mt-3 upload-btn ${loadingAnimation ? 'loading' : ''}`} 
          onClick={handleUpload} 
          disabled={loading}
        >
          <FaUpload /> {loading ? "Chargement..." : "Charger Fichier"}
        </button>
      </div>

      {message && <p className="status-message">{message}</p>}

      {/* Search and Sort Section */}
      <div className="search-sort-section">
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
        <button className="sort-btn" onClick={toggleSort}>
          <FaStar className="me-2" />
          {sortOrder === "asc" ? "Grade croissant" : "Grade décroissant"}
        </button>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        {parentCategories.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">
              <FaFilter className="me-2" />
              <select 
                className="form-select" 
                value={selectedParentCategory} 
                onChange={(e) => setSelectedParentCategory(e.target.value)}
              >
                <option value="">-- Filtrer par Parent-Category --</option>
                {parentCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        
        {skillCategories.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">
              <FaFilter className="me-2" />
              <select 
                className="form-select" 
                value={selectedSkillCategory} 
                onChange={(e) => setSelectedSkillCategory(e.target.value)}
              >
                <option value="">-- Filtrer par Skill Category --</option>
                {skillCategories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Collaborators Display */}
      <div className="collaborator-grid">
        {filteredAndSortedCollaborators.length > 0 ? (
          filteredAndSortedCollaborators.map((collab, index) => {
            const collabKey = `${collab["First Name"]} ${collab["Last Name"]}`;
            const isExpanded = expandedCollaborators.has(collabKey);
            const averageGrade = calculateAverageGrade(collab.skills);
            
            return (
              <div 
                className={`collaborator-card shadow ${selectedCollaborator === collab ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`} 
                key={index}
              >
                <div className="collaborator-header" onClick={() => handleCollaboratorClick(collab)}>
                  <div className="collaborator-info">
                    <h3>
                      <FaUser className="icon-user text-primary" /> {collab["First Name"]} {collab["Last Name"]}
                    </h3>
                    <div className="average-grade">
                      <FaTrophy className="icon-trophy" /> {averageGrade}
                    </div>
                  </div>
                  <button 
                    className="btn btn-link expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollaboratorExpansion(collabKey);
                    }}
                  >
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="skills-list">
                    {collab.skills.map((skill, skillIndex) => (
                      <div key={skillIndex} className="skill-item">
                        <p className="skill-category">🏆 {skill["Skill Parent-Category"]}</p>
                        <p className="skill-name">📌 {skill["Skill"]}</p>
                        <p className="grade-value text-success">
                          <FaTrophy className="icon-trophy" /> Score: {skill["Grade Value"]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCollaboratorClick(collab);
                  }}
                >
                  <FaComment /> Donner un feedback
                </button>
              </div>
            );
          })
        ) : (
          <p className="no-data">⚠ Aucun collaborateur trouvé.</p>
        )}
      </div>

      {/* Feedback Modal */}
      {selectedCollaborator && (
        <div className="feedback-modal">
          <div className="feedback-content">
            <h3>Feedback pour {selectedCollaborator["First Name"]} {selectedCollaborator["Last Name"]}</h3>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="form-group">
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Écrivez votre feedback ici..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                />
              </div>
              {feedbackMessage && <p className="feedback-message">{feedbackMessage}</p>}
              <button 
                type="submit" 
                className="btn btn-primary mt-3"
                disabled={feedbackLoading}
              >
                <FaPaperPlane /> {feedbackLoading ? "Envoi..." : "Envoyer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Choix;
