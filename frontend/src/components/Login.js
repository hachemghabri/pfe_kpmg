import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaExclamationCircle } from "react-icons/fa";
import "../styles/Login.css";
import kpmgLogo from "../assets/kpmga.png";
import naptaLogo from "../assets/naptar.png";

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
        <div className="login-logo-container">
          <div className="app-logo-circle">
            <img
              src={kpmgLogo}
              alt="KPMG Logo"
              className="logo-center"
            />
          </div>
        </div>

        <div className="login-content">
          {error && (
            <div className="error-message">
              <FaExclamationCircle className="error-icon" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <div className="input-container">
                <div className="icon-box">
                  <FaEnvelope />
                </div>
                <input 
                  type="email" 
                  id="email"
                  name="email" 
                  value={form.email}
                  onChange={handleChange} 
                  required 
                  className="login-input"
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <div className="icon-box">
                  <FaLock />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password"
                  name="password" 
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
            </div>

            <button 
              type="submit" 
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : "Login"}
            </button>
          </form>

          <div className="login-links">
            <a href="/register" className="signup-link">Créer un compte</a>
          </div>

          <div className="napta-kpmg-logos">
            <img
              src={kpmgLogo}
              alt="KPMG Logo"
              className="logo-bottom kpmg-logo"
              onClick={() => window.open("https://kpmg.com/tn/fr/home.html", "_blank")}
            />
            <img
              src={naptaLogo}
              alt="Napta Logo"
              className="logo-bottom"
              onClick={() => window.open("https://www.napta.io/en", "_blank")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
