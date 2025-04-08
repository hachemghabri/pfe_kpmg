import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUpload, FaFileAlt, FaChartBar, FaFolderOpen, FaTrash, FaArrowLeft, FaSpinner } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
// ✅ Register Chart.js components
import "../styles/Rapports.css";
import imagef from "../assets/kpmglogo.png";
import imagen from "../assets/napta.png";

// ✅ Register Chart.js components

function Rapports() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGraphs, setShowGraphs] = useState(false);
  const navigate = useNavigate();

  // Get User Info
  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user ? user.email : null;

  // Fetch KPIs from Backend
  const fetchKPIs = useCallback(async () => {
    if (!userEmail) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`http://localhost:8000/kpis?user_email=${userEmail}`);
      setKpis(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des KPIs:", error);
      setError("Erreur lors de la récupération des KPIs. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // Handle File Upload
  const handleUpload = async () => {
    if (!selectedFile || !reportType) {
      setError("Veuillez sélectionner un type de rapport et un fichier.");
      return;
    }

    if (!userEmail) {
      setError("Utilisateur non authentifié.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("report_type", reportType);
    formData.append("user_email", userEmail);

    try {
      await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus(`✅ ${selectedFile.name} téléchargé avec succès pour ${reportType} !`);
      // Dans handleUpload après setUploadStatus
      if (reportType === "Rapport de Timesheet") {
         navigate("/notifications");
                             }
      setSelectedFile(null);
      setReportType("");
      fetchKPIs();
    } catch (error) {
      setError("❌ Erreur lors du téléchargement. Veuillez réessayer.");
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
    
  };

  // Delete User KPIs
  const deleteKPIs = async () => {
    if (!userEmail) {
      setError("Utilisateur non authentifié.");
      return;
    }

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer tous vos KPIs ?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await axios.delete(`http://localhost:8000/kpis?user_email=${userEmail}`);
      setKpis([]);
      setUploadStatus("✅ Tous vos KPIs ont été supprimés.");
    } catch (error) {
      console.error("Erreur lors de la suppression des KPIs:", error);
      setError("❌ Erreur lors de la suppression. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format Date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("fr-FR");
  };

  const budgetByProjectData = kpis
  .filter((kpi) => kpi.metric_name.startsWith("Budget - Projet") && kpi.metric_value !== 0) // Exclude zero
  .map((kpi) => ({
    project: kpi.metric_name.replace("Budget - Projet ", ""),
    budget: kpi.metric_value,
  }));
  const staffingData = kpis
  .filter((kpi) => kpi.metric_name.startsWith("Staffing -"))
  .map((kpi) => {
    const [, grade, staffingCategory] = kpi.metric_name.split(" - ");
    return {
      grade: grade,
      staffingCategory: staffingCategory,
      count: kpi.metric_value,
    };
  });

// Convert to grouped format for stacked bar chart
const groupedStaffingData = staffingData.reduce((acc, { grade, staffingCategory, count }) => {
  if (!acc[grade]) acc[grade] = { grade };
  acc[grade][staffingCategory] = count;
  return acc;
}, {});

const staffingChartData = Object.values(groupedStaffingData);


// eslint-disable-next-line no-unused-vars
const marginData = kpis
  .filter((kpi) => kpi.metric_name === "Marge Réelle (%)")
  .map((kpi) => ({
    date: formatDate(kpi.date_created),
    margin: kpi.metric_value,
  }));
;

const rentabiliteData = kpis
.filter((kpi) => kpi.metric_name.startsWith("Rentabilité - Projet") && kpi.metric_value !== 0) // Exclude zero
.map((kpi) => ({
  project: kpi.metric_name.replace("Rentabilité - Projet ", ""),
  rentabilite: kpi.metric_value,
}));


console.log("✅ Données Rentabilité:", rentabiliteData); // Debugging ✅
const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF", "#FF4567", "#82CA9D"];

const budgetParClient = kpis
  .filter((kpi) => kpi.metric_name.startsWith("Budget - Client") && kpi.metric_value !== 0) // Exclude zero
  .map((kpi, index) => ({
    name: kpi.metric_name.replace("Budget - Client ", ""),
    value: kpi.metric_value,
    fill: colors[index % colors.length],
  }));

  const marginComparisonData = kpis
  .filter((kpi) => (kpi.metric_name.startsWith("Margin Planned - Projet") || kpi.metric_name.startsWith("Margin Real - Projet")) && kpi.metric_value !== 0) // Exclude zero
  .reduce((acc, kpi) => {
    const projectId = kpi.metric_name.replace(/(Margin Planned|Margin Real) - Projet /, "");
    const metricType = kpi.metric_name.includes("Planned") ? "margin_planned" : "margin_real";

    if (!acc[projectId]) acc[projectId] = { project: projectId, margin_planned: 0, margin_real: 0 };
    acc[projectId][metricType] = kpi.metric_value;
    return acc;
  }, {});

const marginChartData = Object.values(marginComparisonData).filter((item) => item.margin_planned !== 0 || item.margin_real !== 0); 


// Remove zero rows




 return (
    <div className="rapports-container">
      {/* Back to Dashboard */}
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        <FaArrowLeft /> Retour au Dashboard
      </button>

      {/* Logos Section */}
      <div className="logos-container">
        <img src={imagef} alt="KPMG Logo" className="logo-kpmg" />
        <h1>Rapports et Tableaux de Bord</h1>
        <img src={imagen} alt="Napta Logo" className="logo-napta" />
      </div>

      <p className="subtitle">Sélectionnez le type de rapport et téléchargez votre fichier.</p>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Select Report Type */}
      <div className="report-selection">
        <label className="select-label">
          <FaFolderOpen className="icon" />
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- Sélectionnez un type de rapport --</option>
            <option value="Rapport de Finance">Rapport de Finance</option>
            <option value="Rapport de Timesheet">Rapport de Timesheet</option>
            <option value="Staffing Individuel">Staffing Individuel</option>
            <option value="Staffing Projet">Staffing Projet</option>
          </select>
        </label>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <label className="file-input-label">
          <FaFileAlt className="icon" />
          <input 
            type="file" 
            onChange={(e) => setSelectedFile(e.target.files[0])}
            disabled={isLoading}
          />
          {selectedFile ? `📂 ${selectedFile.name}` : "Sélectionnez un fichier"}
        </label>
        <button 
          className="upload-btn" 
          onClick={handleUpload}
          disabled={isLoading || !selectedFile || !reportType}
        >
          {isLoading ? (
            <>
              <FaSpinner className="fa-spin" /> Téléchargement en cours...
            </>
          ) : (
            <>
              <FaUpload /> Télécharger
            </>
          )}
        </button>
      </div>

      {/* Status Message */}
      {uploadStatus && (
        <div className="status-message">
          {uploadStatus}
        </div>
      )}

      {/* KPI Actions */}
      <div className="kpi-actions">
        <button 
          className="fetch-btn" 
          onClick={() => {
            if (!showGraphs) {
              fetchKPIs();
            }
            setShowGraphs(!showGraphs);
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FaSpinner className="fa-spin" /> Chargement...
            </>
          ) : (
            <>
              <FaChartBar /> {showGraphs ? "Masquer les KPIs" : "Charger les KPIs"}
            </>
          )}
        </button>
        {kpis.length > 0 && (
          <button 
            className="delete-btn" 
            onClick={deleteKPIs}
            disabled={isLoading}
          >
            <FaTrash /> Supprimer mes KPIs
          </button>
        )}
      </div>

      {/* Charts Grid - Now with conditional rendering */}
      {showGraphs && (
        <div className="chart-grid">
          {/* 📊 Budget per Project Bar Chart */}
          {budgetByProjectData.length > 0 && (
            <div className="chart-container">
              <h2>Budget Vendu par Projet</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetByProjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project" stroke="#FFF" />
                  <YAxis stroke="#FFF" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" barSize={30} name="Budget (€)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rentabilité Chart */}
          {rentabiliteData.length > 0 && (
            <div className="chart-container">
              <h2>Rentabilité par Projet (%)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rentabiliteData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#666" />
                  <XAxis dataKey="project" stroke="#FFF" />
                  <YAxis stroke="#FFF" />
                  <Tooltip contentStyle={{ backgroundColor: "#222", color: "#FFF" }} />
                  <Legend />
                  <Bar dataKey="rentabilite" fill="#FFD700" barSize={30} name="Rentabilité (%)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Budget Pie Chart */}
          {budgetParClient.length > 0 && (
            <div className="chart-container">
              <h2>Répartition du Budget par Client</h2>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={budgetParClient}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="40%"
                    outerRadius={130}
                    innerRadius={50}
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {budgetParClient.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    wrapperStyle={{
                      fontSize: "14px",
                      color: "#E0E0E0",
                      marginTop: "15px",
                    }}
                  />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} TND`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Margin Planned vs Real Chart */}
          {marginChartData.length > 0 && (
            <div className="chart-container">
              <h2>Comparaison Marge Planifiée vs Réelle par Projet</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={marginChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project" stroke="#FFF" />
                  <YAxis stroke="#FFF" />
                  <Tooltip contentStyle={{ backgroundColor: "#222", color: "#FFF" }} />
                  <Legend />
                  <Bar dataKey="margin_planned" fill="#8884d8" name="Marge Planifiée (€)" />
                  <Bar dataKey="margin_real" fill="#82ca9d" name="Marge Réelle (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Staffing Individuel Chart */}
          {staffingChartData.length > 0 && (
            <div className="chart-container">
              <h2>Répartition du Staffing par Grade</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={staffingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" stroke="#FFF" />
                  <YAxis stroke="#FFF" />
                  <Tooltip contentStyle={{ backgroundColor: "#222", color: "#FFF" }} />
                  <Legend />
                  <Bar dataKey="<50%" fill="#FF4567" stackId="a" name="Moins de 50%" />
                  <Bar dataKey="50%-90%" fill="#FFBB28" stackId="a" name="Entre 50% et 90%" />
                  <Bar dataKey=">90%" fill="#00C49F" stackId="a" name="Plus de 90%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      {/* KPIs personnalisés pour Timesheet */}
{showGraphs && (
  <div className="highlighted-kpis">
    {kpis.find(k => k.metric_name === "Taux d’approbation (%)") && (
      <div className="kpi-box">
        ✅ <strong>Taux d’approbation :</strong> {kpis.find(k => k.metric_name === "Taux d’approbation (%)").metric_value} %
      </div>
    )}  
  </div>
)}


      {/* KPI Table */}
      {showGraphs && (
        <div className="kpi-table">
          <h3>KPIs de votre compte</h3>
          {isLoading ? (
            <div className="loading-message">
              <FaSpinner className="fa-spin" /> Chargement des KPIs...
            </div>
          ) : kpis.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Nom du KPI</th>
                  <th>Valeur</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {kpis
                  .filter((kpi) => kpi.metric_value !== 0)
                  .sort((a, b) => a.metric_name.localeCompare(b.metric_name))
                  .map((kpi, index) => (
                    <tr key={index} className="kpi-row">
                      <td>{kpi.metric_name}</td>
                      <td>{kpi.metric_value.toLocaleString()} </td>
                      <td>{formatDate(kpi.date_created)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data-message">Aucun KPI disponible.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Rapports;
