import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaUser,
  FaLock,
  FaBuilding,
  FaBriefcase,
  FaSave,
  FaArrowLeft,
  FaEnvelope,
  FaUserCircle,
  FaShieldAlt,
  FaInfoCircle,
  FaTrophy,
  FaAward
} from "react-icons/fa";
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import "../styles/Settings.css";

function Settings() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPromotion, setIsPromotion] = useState(false);
  const navigate = useNavigate();
  const { width, height } = useWindowSize();

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    departement: "",
    poste: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showConfetti, setShowConfetti] = useState(false);

  // Position hierarchy for promotion logic
  const positionHierarchy = [
    "Assistant Manager 1",
    "Assistant Manager 2",
    "Manager 1",
    "Manager 2",
    "Manager 3",
    "Senior Manager 1",
    "Senior Manager 2",
    "Senior Manager 3",
    "Senior Manager 4",
    "Director 1",
    "Director 2",
    "Partner"
  ];

  // State for promotion message
  const [showPromotionMessage, setShowPromotionMessage] = useState(false);

  // Get available positions for promotion (only positions higher than current one)
  const getAvailablePositions = (currentPosition) => {
    const currentIndex = positionHierarchy.indexOf(currentPosition);
    if (currentIndex === -1 || currentIndex === positionHierarchy.length - 1) return []; // If position not found or highest position, return empty array
    return [positionHierarchy[currentIndex + 1]]; // Only return the next position in hierarchy
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setForm({
        prenom: parsedUser.prenom,
        nom: parsedUser.nom,
        departement: parsedUser.departement,
        poste: parsedUser.poste,
        email: parsedUser.email,
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
    
    // Show promotion message if position is being changed to a higher one
    if (name === 'poste' && value !== user?.poste) {
      const currentIndex = positionHierarchy.indexOf(user?.poste);
      const newIndex = positionHierarchy.indexOf(value);
      if (newIndex > currentIndex) {
        setShowPromotionMessage(true);
      } else {
        setShowPromotionMessage(false);
      }
    }
    
    setError("");
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    setError("");
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    return passwordRegex.test(password);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsPromotion(false);

    // Determine if this is a promotion
    const currentIndex = positionHierarchy.indexOf(user.poste);
    const newIndex = positionHierarchy.indexOf(form.poste);
    const promoted = newIndex > currentIndex;

    try {
      const response = await axios.post("http://127.0.0.1:8000/update_profile", {
        email: user.email,
        ...form
      });

      if (response.data.message) {
        if (promoted) {
          setIsPromotion(true);
          setSuccess("Félicitations pour votre promotion! Votre profil a été mis à jour avec succès!");
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000); // Stop confetti after 5 seconds
        } else {
          setSuccess("Profil mis à jour avec succès!");
        }
        setIsEditing(false);
        // Update local storage with new user data
        const updatedUser = { ...user, ...form };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      setError(error.response?.data?.detail || "Erreur lors de la mise à jour du profil.");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validatePassword(passwordForm.newPassword)) {
      setError("Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/change_password", {
        email: user.email,
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });

      if (response.data.message) {
        setSuccess("Mot de passe modifié avec succès!");
        setIsChangingPassword(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      setError(error.response?.data?.detail || "Erreur lors du changement de mot de passe.");
    }
  };

  return (
    <div className="settings-container">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

      <div className="settings-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          <FaArrowLeft /> Retour au tableau de bord
        </button>
        <h1 className="settings-title">Paramètres du Compte</h1>
      </div>

      <div className="settings-content">
        {/* Profile Section */}
        <div className="settings-section">
          <div className="section-header">
            <div className="section-icon-wrapper">
              <FaUserCircle className="section-icon" />
            </div>
            <h2>Informations du Profil</h2>
            {!isEditing && (
              <button className="edit-button" onClick={() => setIsEditing(true)}>
                Modifier
              </button>
            )}
          </div>

          <div className="section-card">
            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="settings-form">
                <div className="form-row">
                  <div className="form-group">
                    <div className="input-group">
                      <div className="input-icon">
                        <FaUser />
                      </div>
                      <input
                        type="text"
                        name="prenom"
                        placeholder="Prénom"
                        value={form.prenom}
                        onChange={handleChange}
                        required
                        className="settings-input disabled-input"
                        disabled
                      />
                    </div>
                    <label>Prénom</label>
                  </div>

                  <div className="form-group">
                    <div className="input-group">
                      <div className="input-icon">
                        <FaUser />
                      </div>
                      <input
                        type="text"
                        name="nom"
                        placeholder="Nom"
                        value={form.nom}
                        onChange={handleChange}
                        required
                        className="settings-input disabled-input"
                        disabled
                      />
                    </div>
                    <label>Nom</label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div className="input-field">
                      <input
                        type="text"
                        value={user?.departement}
                        disabled
                        className="settings-input"
                        readOnly
                      />
                    </div>
                    <label>Département</label>
                  </div>

                  <div className="form-group">
                    <div className="input-group">
                      <div className="input-icon">
                        <FaBriefcase />
                      </div>
                      <select
                        name="poste"
                        value={form.poste}
                        onChange={handleChange}
                        required
                        className="settings-select"
                        disabled={getAvailablePositions(user?.poste).length === 0}
                      >
                        <option value={user?.poste}>{user?.poste}</option>
                        {getAvailablePositions(user?.poste).map((position) => (
                          <option key={position} value={position}>
                            {position}
                          </option>
                        ))}
                      </select>
                      {getAvailablePositions(user?.poste).length === 0 && (
                        <p className="info-text"><FaInfoCircle /> You've reached the highest position.</p>
                      )}
                      {showPromotionMessage && (
                        <p className="success-message promotion-message">
                          <FaAward /> Congratulations on your promotion!
                        </p>
                      )}
                    </div>
                    <label>Poste</label>
                  </div>
                </div>

                <div className="form-group full-width">
                  <div className="input-group">
                    <div className="input-icon">
                      <FaEnvelope />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      disabled
                      className="settings-input disabled-input"
                    />
                  </div>
                  <label>Email</label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="save-button">
                    <FaSave /> Enregistrer
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-grid">
                  <div className="info-group">
                    <div className="info-icon">
                      <FaUser />
                    </div>
                    <div>
                      <label>Prénom</label>
                      <p>{user?.prenom}</p>
                    </div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-icon">
                      <FaUser />
                    </div>
                    <div>
                      <label>Nom</label>
                      <p>{user?.nom}</p>
                    </div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-icon">
                      <FaBuilding />
                    </div>
                    <div>
                      <label>Département</label>
                      <p>{user?.departement}</p>
                    </div>
                  </div>
                  
                  <div className="info-group">
                    <div className="info-icon">
                      <FaBriefcase />
                    </div>
                    <div>
                      <label>Poste</label>
                      <p>{user?.poste}</p>
                    </div>
                  </div>
                  
                  <div className="info-group full-width">
                    <div className="info-icon">
                      <FaEnvelope />
                    </div>
                    <div>
                      <label>Email</label>
                      <p>{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className="settings-section">
          <div className="section-header">
            <div className="section-icon-wrapper">
              <FaLock className="section-icon" />
            </div>
            <h2>Sécurité</h2>
            {!isChangingPassword && (
              <button className="edit-button" onClick={() => setIsChangingPassword(true)}>
                Modifier
              </button>
            )}
          </div>

          <div className="section-card">
            {isChangingPassword ? (
              <form onSubmit={handlePasswordUpdate} className="settings-form">
                <div className="form-group">
                  <div className="input-group">
                    <div className="input-icon">
                      <FaLock />
                    </div>
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Mot de passe actuel"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="settings-input"
                    />
                  </div>
                  <label>Mot de passe actuel</label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div className="input-group">
                      <div className="input-icon">
                        <FaLock />
                      </div>
                      <input
                        type="password"
                        name="newPassword"
                        placeholder="Nouveau mot de passe"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                        className="settings-input"
                      />
                    </div>
                    <label>Nouveau mot de passe</label>
                  </div>

                  <div className="form-group">
                    <div className="input-group">
                      <div className="input-icon">
                        <FaLock />
                      </div>
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirmer le nouveau mot de passe"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="settings-input"
                      />
                    </div>
                    <label>Confirmer le mot de passe</label>
                  </div>
                </div>

                <div className="password-requirements">
                  <div className="requirements-header">
                    <FaInfoCircle /> Exigences de sécurité:
                  </div>
                  <ul>
                    <li>Au moins 12 caractères</li>
                    <li>Au moins une lettre majuscule</li>
                    <li>Au moins un chiffre</li>
                    <li>Au moins un caractère spécial (@$!%*?&)</li>
                  </ul>
                </div>

                <div className="form-actions">
                  <button type="submit" className="save-button">
                    <FaSave /> Enregistrer
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setIsChangingPassword(false)}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="password-info">
                <div className="security-status">
                  <div className="security-icon">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h3>Statut de sécurité</h3>
                    <p>Dernière modification du mot de passe: <span className="accent-text">{new Date().toLocaleDateString()}</span></p>
                  </div>
                </div>
                <div className="password-guidance">
                  <p>Un mot de passe fort est essentiel pour protéger votre compte. Nous vous recommandons de le changer régulièrement.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="message-container error">
            <FaInfoCircle className="message-icon" />
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className={`message-container success ${isPromotion ? 'promotion' : ''}`}>
            {isPromotion && <FaTrophy className="trophy-icon" />}
            <p>{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings; 