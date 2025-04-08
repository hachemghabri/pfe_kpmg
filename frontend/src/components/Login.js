import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaUser, FaLock, FaArrowRight, FaExclamationCircle } from "react-icons/fa";
import "../styles/Login.css";
import imagef from "../assets/kpmglogo.png";
import imagen from "../assets/napta.png";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post("http://127.0.0.1:8000/login", form);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (response.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.detail || "Une erreur est survenue");
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="login-container">
      <div className="login-card">
        <div className="login-images">
          <img
            src={imagef}
            alt="KPMG Logo"
            className="logo-left"
            onClick={() => window.open("https://kpmg.com/tn/fr/home.html", "_blank")}
          />
          <img
            src={imagen}
            alt="Napta Logo"
            className="logo-right"
            onClick={() => window.open("https://www.napta.io/en", "_blank")}
          />
        </div>

        <div className="login-content">
          <h3 className="login-title">Bienvenue</h3>
          <p className="login-subtitle">Connectez-vous pour accéder à votre espace</p>

          {error && (
            <div className="error-message">
              <FaExclamationCircle className="error-icon" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <div className="input-icon">
                <FaUser />
              </div>
              <input 
                type="email" 
                name="email" 
                placeholder="Adresse email" 
                value={form.email}
                onChange={handleChange} 
                required 
                className="login-input"
                autoComplete="email"
              />
            </div>
            
            <div className="input-group">
              <div className="input-icon">
                <FaLock />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="Mot de passe" 
                value={form.password}
                onChange={handleChange} 
                required 
                className="login-input"
                autoComplete="current-password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button 
              type="submit" 
              className={`btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  Se connecter
                  <FaArrowRight className="btn-icon" />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="register-text">
              Vous n'avez pas de compte?
              <a href="/register" className="register-link">
                Inscrivez-vous
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
