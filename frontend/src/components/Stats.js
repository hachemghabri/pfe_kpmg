import React from 'react';
import { FaArrowLeft, FaExternalLinkAlt, FaChartLine } from 'react-icons/fa';
import '../styles/Stats.css';

function Stats() {
  return (
    <div className="stats-container">
      {/* Header Section */}
      <div className="stats-header">
        <button onClick={() => window.history.back()} className="btn back-btn">
          <FaArrowLeft className="back-icon" /> 
          <span>Retour à l'Accueil </span>
        </button>
        <h2 className="stats-title text-center">Tableaux de Bord RH</h2>
      </div>
      
      {/* Main Content */}
      <div className="stats-content-container">
        <div className="stats-message">
          <FaChartLine className="stats-icon" />
          <h3>Accès aux tableaux de bord RH</h3>
          <p>Les tableaux de bords RH sont disponibles dans ce lien:</p>
          <a 
            href="https://www.example.com/rh-dashboard" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="stats-link"
          >
            Cliquez ici <FaExternalLinkAlt className="link-icon" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default Stats;
