import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FaUpload, 
  FaFileAlt, 
  FaChartBar, 
  FaFolderOpen, 
  FaTrash, 
  FaArrowLeft, 
  FaSpinner,
  FaTimes,
  FaChartPie
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import "../styles/Rapports.css";

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
      const endpoint = "http://localhost:8000/upload";
      
      await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus(`✅ ${selectedFile.name} téléchargé avec succès pour ${reportType} !`);
      if (reportType === "Rapport de Timesheet") {
         navigate("/notifications");
      } else if (reportType === "Staffing Individuel") {
        // Automatically show graphs after successful upload
        setShowGraphs(true);
      }
      setSelectedFile(null);
      setReportType("");
      fetchKPIs();
    } catch (error) {
      setError("❌ " + (error.response?.data?.detail || "Erreur lors du téléchargement. Veuillez réessayer."));
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

  // Project-related data
  const budgetByProjectData = kpis
    .filter((kpi) => kpi.metric_name.startsWith("Budget - Projet") && kpi.metric_value !== 0)
    .map((kpi) => ({
      project: kpi.metric_name.replace("Budget - Projet ", ""),
      budget: kpi.metric_value,
    }));

  const rentabiliteData = kpis
    .filter((kpi) => kpi.metric_name.startsWith("Rentabilité - Projet") && kpi.metric_value !== 0)
    .map((kpi) => ({
      project: kpi.metric_name.replace("Rentabilité - Projet ", ""),
      rentabilite: kpi.metric_value,
    }));

  // Color palette for charts
  const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF", "#FF4567", "#82CA9D"];

  // Client-related data
  const budgetParClient = kpis
    .filter((kpi) => kpi.metric_name.startsWith("Budget - Client") && kpi.metric_value !== 0)
    .map((kpi, index) => ({
      name: kpi.metric_name.replace("Budget - Client ", ""),
      value: kpi.metric_value,
      fill: colors[index % colors.length],
    }));

  // Staffing data for stacked bar chart - works with both file formats
  const staffingData = kpis
    .filter((kpi) => kpi.metric_name.startsWith("Staffing - "))
    .map(kpi => {
      const parts = kpi.metric_name.split(" - ");
      // Parts[1] should be the position name, parts[2] should be the category
      const position = parts.length > 1 ? parts[1] : "Unknown";
      const staffingCategory = parts.length > 2 ? parts[2] : "Unknown";
      return {
        position: position,
        staffingCategory: staffingCategory, 
        count: kpi.metric_value
      };
    });
  
  // Group by position for the stacked bar chart
  const groupedStaffingData = staffingData.reduce((acc, { position, staffingCategory, count }) => {
    if (!acc[position]) acc[position] = { position };
    acc[position][staffingCategory] = count;
    return acc;
  }, {});
  
  const staffingChartData = Object.values(groupedStaffingData);

  // Staffed hours by position data for pie chart
  const staffedHoursByPositionData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Staffed Hours - Position - "))
    .map((kpi, index) => ({
      name: kpi.metric_name.replace("Staffed Hours - Position - ", ""),
      value: kpi.metric_value,
      fill: colors[index % colors.length]
    }))
    .sort((a, b) => b.value - a.value); // Sort by hours descending
  
  // Margin data
  // eslint-disable-next-line no-unused-vars
  const marginData = kpis
    .filter((kpi) => kpi.metric_name === "Marge Réelle (%)")
    .map((kpi) => ({
      date: formatDate(kpi.date_created),
      margin: kpi.metric_value,
    }));

  // Availability data - only for the first file format
  const availabilityTrendData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Avg Availability - Trend - "))
    .map(kpi => {
      const weekName = kpi.metric_name.replace("Avg Availability - Trend - ", "");
      const weekMatch = weekName.match(/^W(\d+)/);
      const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : 0;
      return {
        week: weekName,
        availability: kpi.metric_value,
        weekNum: weekNum 
      };
    })
    .sort((a, b) => a.weekNum - b.weekNum);

  const availabilityByBUData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Avg Availability - BU - "))
    .map(kpi => ({
      bu: kpi.metric_name.replace("Avg Availability - BU - ", ""),
      availability: kpi.metric_value
    }))
    .sort((a, b) => b.availability - a.availability);

  const availabilityByPositionData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Avg Availability - Position - "))
    .map(kpi => ({
      position: kpi.metric_name.replace("Avg Availability - Position - ", ""),
      availability: kpi.metric_value
    }))
    .sort((a, b) => b.availability - a.availability);

  // Financial comparison data
  const marginComparisonData = kpis
    .filter((kpi) => (kpi.metric_name.startsWith("Margin Planned - Projet") || kpi.metric_name.startsWith("Margin Real - Projet")) && kpi.metric_value !== 0)
    .reduce((acc, kpi) => {
      const projectId = kpi.metric_name.replace(/(Margin Planned|Margin Real) - Projet /, "");
      const metricType = kpi.metric_name.includes("Planned") ? "margin_planned" : "margin_real";

      if (!acc[projectId]) acc[projectId] = { project: projectId, margin_planned: 0, margin_real: 0 };
      acc[projectId][metricType] = kpi.metric_value;
      return acc;
    }, {});

  const marginChartData = Object.values(marginComparisonData).filter((item) => item.margin_planned !== 0 || item.margin_real !== 0); 

  // New: Turnover comparison data transformation
  const turnoverComparisonData = kpis
    .filter((kpi) => (kpi.metric_name.startsWith("Turnover Planned - Projet") || kpi.metric_name.startsWith("Turnover Real - Projet")) && kpi.metric_value !== 0) // Exclude zero
    .reduce((acc, kpi) => {
      const projectId = kpi.metric_name.replace(/(Turnover Planned|Turnover Real) - Projet /, "");
      const metricType = kpi.metric_name.includes("Planned") ? "turnover_planned" : "turnover_real";

      if (!acc[projectId]) acc[projectId] = { project: projectId, turnover_planned: 0, turnover_real: 0 };
      acc[projectId][metricType] = kpi.metric_value;
      return acc;
    }, {});

  const turnoverChartData = Object.values(turnoverComparisonData).filter((item) => item.turnover_planned !== 0 || item.turnover_real !== 0);

  // New: Cost comparison data transformation
  const costComparisonData = kpis
    .filter((kpi) => (kpi.metric_name.startsWith("Cost Planned - Projet") || kpi.metric_name.startsWith("Cost Real - Projet")) && kpi.metric_value !== 0) // Exclude zero
    .reduce((acc, kpi) => {
      const projectId = kpi.metric_name.replace(/(Cost Planned|Cost Real) - Projet /, "");
      const metricType = kpi.metric_name.includes("Planned") ? "cost_planned" : "cost_real";

      if (!acc[projectId]) acc[projectId] = { project: projectId, cost_planned: 0, cost_real: 0 };
      acc[projectId][metricType] = kpi.metric_value;
      return acc;
    }, {});

  const costChartData = Object.values(costComparisonData).filter((item) => item.cost_planned !== 0 || item.cost_real !== 0);

  // New: Sector data for Pie Chart (Secteur d'activité)
  const sectorData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Secteur - "))
    .map((kpi, index) => ({
      name: kpi.metric_name.replace("Secteur - ", ""),
      value: kpi.metric_value,
      fill: colors[index % colors.length]
    }));

  // New: Billing method data for Pie Chart
  const billingMethodData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Billing - "))
    .map((kpi, index) => ({
      name: kpi.metric_name.replace("Billing - ", ""),
      value: kpi.metric_value,
      fill: colors[(index + 3) % colors.length] // Offset colors to differentiate from sector chart
    }));

  // New: Advancement rate data
  const advancementRateData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Advancement - Projet"))
    .map(kpi => ({
      project: kpi.metric_name.replace("Advancement - Projet ", ""),
      rate: kpi.metric_value
    }))
    .sort((a, b) => b.rate - a.rate); // Sort by rate descending

  // New: Project Category data
  const projectCategoryData = kpis
    .filter(kpi => kpi.metric_name.startsWith("Category - "))
    .map((kpi, index) => ({
      name: kpi.metric_name.replace("Category - ", ""),
      value: kpi.metric_value,
      fill: colors[(index + 5) % colors.length] // Offset colors to differentiate from other charts
    }));

  return (
    <div className="rapports-container">
      <div className="rapports-wrapper">
        {/* Header with Back Button */}
        <div className="rapports-header-section">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        <FaArrowLeft /> Retour à l'Accueil 
      </button>
          <div className="rapports-header">
        <h1>Rapports et Tableaux de Bord</h1>
            <p className="subtitle">Visualisez et analysez vos données en temps réel</p>
          </div>
      </div>

        {/* Main Content */}
        <div className="rapports-content">
      {/* Error Message */}
      {error && (
        <div className="error-message">
              <FaTimes className="error-icon" />
          {error}
        </div>
      )}

          {/* Upload Section Card */}
          <div className="report-selection-card">
            <div className="card-header">
              <FaFileAlt className="card-icon" />
              <h2>Téléchargement de Rapports</h2>
            </div>
            <div className="card-content">
      <div className="report-selection">
        <label className="select-label">
          <FaFolderOpen className="icon" />
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            disabled={isLoading}
                    className="report-select"
          >
            <option value="">-- Sélectionnez un type de rapport --</option>
            <option value="Rapport de Finance">Rapport de Finance</option>
            <option value="Rapport de Timesheet">Rapport de Timesheet</option>
            <option value="Staffing Individuel">Staffing Individuel</option>
            <option value="Staffing Projet">Staffing Projet</option>
          </select>
        </label>
      </div>

      <div className="upload-section">
        <label className="file-input-label">
          <FaFileAlt className="icon" />
          <input 
            type="file" 
            onChange={(e) => setSelectedFile(e.target.files[0])}
            disabled={isLoading}
            accept=".xlsx,.xls"
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
            </div>
          </div>

          {/* KPI Actions Card */}
          <div className="kpi-actions-card">
            <div className="card-header">
              <FaChartPie className="card-icon" />
              <h2>Analyses et Visualisations</h2>
            </div>
            <div className="card-content">
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
                <>
                  {/* KPIs personnalisés pour Timesheet */}
                  {kpis.find(k => k.metric_name === "Taux d'approbation (%)") && (
                    <div className="highlighted-kpis">
                      <div className="kpi-box">
                        ✅ <strong>Taux d'approbation :</strong> {kpis.find(k => k.metric_name === "Taux d'approbation (%)").metric_value} %
                      </div>
                    </div>
                  )}
                
        <div className="chart-grid">
                    {/* Budget per Project Bar Chart */}
          {budgetByProjectData.length > 0 && (
            <div className="chart-container">
                        <div className="chart-header">
              <h2>Budget Vendu par Projet</h2>
                        </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetByProjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="project" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="budget" fill="#3b82f6" barSize={30} name="Budget (€)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Rentabilité Chart */}
          {rentabiliteData.length > 0 && (
            <div className="chart-container">
                        <div className="chart-header">
              <h2>Rentabilité par Projet (%)</h2>
                        </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rentabiliteData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="project" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="rentabilite" fill="#4ade80" barSize={30} name="Rentabilité (%)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Budget Pie Chart */}
          {budgetParClient.length > 0 && (
            <div className="chart-container">
                        <div className="chart-header">
              <h2>Répartition du Budget par Client</h2>
                        </div>
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
                                color: "#444",
                      marginTop: "15px",
                                backgroundColor: "rgba(255, 255, 255, 0.8)",
                                borderRadius: "8px",
                                padding: "5px"
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
                        <div className="chart-header">
              <h2>Comparaison Marge Planifiée vs Réelle par Projet</h2>
                        </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={marginChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="project" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="margin_planned" fill="#3b82f6" name="Marge Planifiée (€)" />
                            <Bar dataKey="margin_real" fill="#4ade80" name="Marge Réelle (€)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Turnover Planned vs Real Chart */}
                    {turnoverChartData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Comparaison Chiffre d'Affaires Planifié vs Réel par Projet</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={turnoverChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="project" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="turnover_planned" fill="#3b82f6" name="Chiffre d'Affaires Planifié (€)" />
                            <Bar dataKey="turnover_real" fill="#4ade80" name="Chiffre d'Affaires Réel (€)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Cost Planned vs Real Chart */}
                    {costChartData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Comparaison Coûts Planifiés vs Réels par Projet</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={costChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="project" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="cost_planned" fill="#a855f7" name="Coûts Planifiés (€)" />
                            <Bar dataKey="cost_real" fill="#ec4899" name="Coûts Réels (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Staffing Individuel Chart */}
          {staffingChartData.length > 0 && (
            <div className="chart-container">
                        <div className="chart-header">
              <h2>Taux de chargabilté par Position</h2>
                        </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={staffingChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="position" stroke="#444" />
                            <YAxis stroke="#444" />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "10px" }} />
                            <Bar dataKey="<50%" fill="#4ade80" stackId="a" name="Moins de 50%" />
                            <Bar dataKey="50%-90%" fill="#fb923c" stackId="a" name="Entre 50% et 90%" />
                            <Bar dataKey=">90%" fill="#f43f5e" stackId="a" name="Plus de 90%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

                    {/* Secteur d'activité Pie Chart */}
                    {sectorData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Répartition par Secteur d'Activité</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={sectorData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {sectorData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} projets`} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                          </PieChart>
                        </ResponsiveContainer>
        </div>
      )}

                    {/* Billing Method Pie Chart */}
                    {billingMethodData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Méthodes de Facturation</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={billingMethodData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {billingMethodData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} projets`} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                          </PieChart>
                        </ResponsiveContainer>
      </div>
    )}  

                    {/* Advancement Rate Bar Chart */}
                    {advancementRateData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Taux d'Avancement par Projet (%)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart 
                            data={advancementRateData}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <YAxis type="category" dataKey="project" width={40} />
                            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                            <Bar 
                              dataKey="rate" 
                              name="Taux d'Avancement"
                              barSize={20}
                              radius={[0, 4, 4, 0]}
                            >
                              {advancementRateData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.rate > 75 ? '#4ade80' : entry.rate > 50 ? '#fb923c' : '#f43f5e'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
  </div>
)}

                    {/* Project Category Pie Chart */}
                    {projectCategoryData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Répartition par Catégorie de Projet</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={projectCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {projectCategoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} projets`} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Availability Trend Line Chart */}
                    {availabilityTrendData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Tendance de Disponibilité Moyenne (%)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={availabilityTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="availability"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                              name="Disponibilité Moyenne"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Availability by BU Pie Chart */}
                    {availabilityByBUData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Disponibilité Moyenne par BU (%)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={availabilityByBUData}
                              dataKey="availability"
                              nameKey="bu"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                              labelLine={false}
                            >
                              {availabilityByBUData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Availability by Position Bar Chart */}
                    {availabilityByPositionData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Disponibilité Moyenne par Poste (%)</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={availabilityByPositionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="position" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                            <Legend />
                            <Bar dataKey="availability" fill="#ffc658" name="Disponibilité Moyenne (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Staffed Hours by Position Pie Chart */}
                    {staffedHoursByPositionData.length > 0 && (
                      <div className="chart-container">
                        <div className="chart-header">
                          <h2>Répartition des Heures Staffées par Position</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={staffedHoursByPositionData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              label={false}
                              labelLine={false}
                            >
                              {staffedHoursByPositionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value.toFixed(1)} heures`} />
                            <Legend 
                              layout="vertical" 
                              align="right" 
                              verticalAlign="middle"
                              wrapperStyle={{
                                fontSize: "14px",
                                padding: "10px",
                                fontWeight: "500"
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                  </div>
                </>
              )}

      {/* KPI Table */}
              {showGraphs && kpis.length > 0 && (
                <div className="kpi-table-container">
                  <div className="kpi-table-header">
          <h3>KPIs de votre compte</h3>
                  </div>
          {isLoading ? (
            <div className="loading-message">
              <FaSpinner className="fa-spin" /> Chargement des KPIs...
            </div>
                  ) : (
                    <div className="kpi-table-wrapper">
                      <table className="kpi-table">
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
                    </div>
          )}
        </div>
      )}
              
              {showGraphs && kpis.length === 0 && !isLoading && (
                <p className="no-data-message">Aucun KPI disponible. Veuillez télécharger un rapport pour générer des KPIs.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rapports;