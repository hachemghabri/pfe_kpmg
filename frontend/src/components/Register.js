import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUser, FaLock, FaBuilding, FaBriefcase, FaEnvelope, FaExclamationCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/Register.css";
import kpmgLogo from "../assets/kpmga.png";
import naptaLogo from "../assets/naptar.png";

// Custom styles to make inputs smaller
const smallInputStyles = {
  container: {
    height: '36px',
    minHeight: '36px'
  },
  iconBox: {
    width: '32px',
    height: '32px',
    padding: '0.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00338d', // KPMG blue
    backgroundColor: '#f0f5ff' // Light blue background
  },
  input: {
    height: '32px',
    padding: '0.4rem 0.5rem',
    fontSize: '0.9rem'
  },
  button: {
    height: '36px',
    padding: '0.4rem'
  },
  passwordToggle: {
    fontSize: '0.9rem', 
    padding: '0 0.5rem'
  }
};

function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nom: "",
    prenom: "",
    departement: "",
    poste: "Assistant Manager 1",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => email.endsWith("@kpmg.com");

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    return passwordRegex.test(password);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!validateEmail(form.email)) {
      setError("L'email doit être sous la forme 'exemple@kpmg.com'");
      setIsLoading(false);
      return;
    }

    if (!validatePassword(form.password)) {
      setError("Le mot de passe doit contenir au moins 12 caractères, une majuscule, un chiffre et un symbole.");
      setIsLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/register", form);
      alert(response.data.message);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.detail || "Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="register-container">
      <div className="register-card">
        <div className="register-logo-container">
          <div className="app-logo-circle">
            <img src={kpmgLogo} alt="KPMG Logo" className="logo-center" style={{ filter: 'none' }} />
          </div>
        </div>

        <div className="register-content">
          <h3 className="register-title">Créer un Compte</h3>
          <p className="register-subtitle">Remplissez le formulaire pour créer votre compte</p>

          {error && (
            <div className="error-message">
              <FaExclamationCircle className="error-icon" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="prenom">Prénom</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaUser />
                  </div>
                  <input 
                    type="text" 
                    id="prenom"
                    name="prenom" 
                    placeholder="Prénom" 
                    value={form.prenom}
                    onChange={handleChange} 
                    required 
                    className="register-input"
                    style={smallInputStyles.input}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="nom">Nom</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaUser />
                  </div>
                  <input 
                    type="text" 
                    id="nom"
                    name="nom" 
                    placeholder="Nom" 
                    value={form.nom}
                    onChange={handleChange} 
                    required 
                    className="register-input"
                    style={smallInputStyles.input}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="departement">Département</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaBuilding />
                  </div>
                  <select 
                    id="departement"
                    name="departement" 
                    value={form.departement}
                    onChange={handleChange} 
                    required
                    className="register-input select-input"
                    style={smallInputStyles.input}
                  >
                    <option value="">Sélectionnez</option>
                    <option value="Audit">Audit</option>
                    <option value="Audit IFRS">Audit IFRS</option>
                    <option value="Strategy & Deal Advisory">Strategy & Deal</option>
                    <option value="IT Risk">IT Risk</option>
                    <option value="Technology">Technology</option>
                    <option value="Tax">Tax</option>
                    <option value="Tax Compliance">Tax Compliance</option>
                    <option value="Tax Payroll">Tax Payroll</option>
                    <option value="TMC">TMC</option>
                    <option value="Legal">Legal</option>
                    <option value="Finance">Finance</option>
                    <option value="RM">RM</option>
                    <option value="RH">RH</option>
                    <option value="Management Consulting">Consulting</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="poste">Poste</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaBriefcase />
                  </div>
                  <select 
                    id="poste"
                    name="poste" 
                    value={form.poste}
                    onChange={handleChange}
                    required
                    className="register-input select-input"
                    style={smallInputStyles.input}
                  >
                    <option value="Assistant Manager 1">AM 1</option>
                    <option value="Assistant Manager 2">AM 2</option>
                    <option value="Manager 1">Manager 1</option>
                    <option value="Manager 2">Manager 2</option>
                    <option value="Manager 3">Manager 3</option>
                    <option value="Senior Manager 1">SM 1</option>
                    <option value="Senior Manager 2">SM 2</option>
                    <option value="Senior Manager 3">SM 3</option>
                    <option value="Senior Manager 4">SM 4</option>
                    <option value="Director 1">Director 1</option>
                    <option value="Director 2">Director 2</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaEnvelope />
                  </div>
                  <input 
                    type="email" 
                    id="email"
                    name="email" 
                    placeholder="exemple@kpmg.com" 
                    value={form.email}
                    onChange={handleChange} 
                    required 
                    autoComplete="email"
                    className="register-input"
                    style={smallInputStyles.input}
                  />
                </div>
              </div>
              
              <div className="form-field">
                <label htmlFor="password">Mot de passe</label>
                <div className="input-container" style={smallInputStyles.container}>
                  <div className="icon-box" style={smallInputStyles.iconBox}>
                    <FaLock />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password"
                    name="password" 
                    placeholder="••••••••••" 
                    value={form.password}
                    onChange={handleChange} 
                    required 
                    autoComplete="new-password"
                    className="register-input"
                    style={smallInputStyles.input}
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                    style={smallInputStyles.passwordToggle}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-field full-width">
              <label htmlFor="confirmPassword">Confirmer mot de passe</label>
              <div className="input-container" style={smallInputStyles.container}>
                <div className="icon-box" style={smallInputStyles.iconBox}>
                  <FaLock />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  id="confirmPassword"
                  name="confirmPassword" 
                  placeholder="••••••••••" 
                  value={form.confirmPassword}
                  onChange={handleChange} 
                  required 
                  autoComplete="new-password"
                  className="register-input"
                  onCopy={(e) => e.preventDefault()} 
                  onPaste={(e) => e.preventDefault()} 
                  style={smallInputStyles.input}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  style={smallInputStyles.passwordToggle}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="register-button"
              disabled={isLoading}
              style={smallInputStyles.button}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                "S'inscrire"
              )}
            </button>
          </form>

          <div className="register-footer">
            <p className="text-center">
              <a href="/" className="login-link">Déjà un compte? Connectez-vous</a>
            </p>
          </div>
          
          <div className="napta-kpmg-logos">
            <img
              src={kpmgLogo}
              alt="KPMG Logo"
              className="logo-bottom"
              onClick={() => window.open("https://kpmg.com/tn/fr/home.html", "_blank")}
              style={{ opacity: 1, height: '30px', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
            <img
              src={naptaLogo}
              alt="Napta Logo"
              className="logo-bottom"
              onClick={() => window.open("https://www.napta.io/en", "_blank")}
              style={{ opacity: 1, height: '30px', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;
