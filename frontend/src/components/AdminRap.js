import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { FaUsers, FaArrowLeft } from "react-icons/fa";
import "../styles/AdminRap.css";
import naptaLogo from "../assets/napta.png";

function AdminRap() {
  const [insights, setInsights] = useState({
    totalUsers: 0,
    departmentData: [],
    positionData: [],
  });

  const admin = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`http://127.0.0.1:8000/admin/user_insights?admin_email=${admin.email}`)
      .then((res) => {
        const { total_users, department_distribution, position_distribution } = res.data;

        const departmentData = Object.entries(department_distribution).map(([name, value]) => ({
          name,
          value,
        }));

        const positionData = Object.entries(position_distribution).map(([name, count]) => ({
          name,
          count,
        }));

        setInsights({
          totalUsers: total_users,
          departmentData,
          positionData,
        });
      })
      .catch((err) => {
        alert(err.response?.data?.detail || "Erreur lors du chargement des insights");
      });
  }, [admin.email]);

  const COLORS = ["#4CAF50", "#2196F3", "#FFC107", "#E91E63", "#9C27B0", "#00BCD4", "#FF5722", "#795548", "#607D8B", "#3F51B5"];

  return (
    <div className="admin-rap-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/admin")}>
        <FaArrowLeft /> Retour au Tableau de Bord
      </button>

      {/* Header */}
      <div className="admin-rap-header">
        <img src={naptaLogo} alt="Napta Logo" className="admin-rap-logo" />
        <h1>Statistiques des Utilisateurs</h1>
      </div>

      {/* Total Users */}
      <div className="total-users-card">
        <FaUsers className="total-users-icon" />
        <h2>Total Utilisateurs</h2>
        <p>{insights.totalUsers}</p>
      </div>

      {/* Charts Section */}
      <div className="charts-container">
        {/* Pie Chart for Departments */}
        <div className="chart">
          <h3>Répartition des Utilisateurs par Département</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={insights.departmentData}
                cx="50%"
                cy="50%"
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
              >
                {insights.departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} utilisateurs`, name]}
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 30, 47, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Department Legend */}
          <div className="department-legend">
            {insights.departmentData.map((entry, index) => (
              <span key={index} className="legend-item">
                <span className="color-box" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name} ({entry.value})
              </span>
            ))}
          </div>
        </div>

        {/* Bar Chart for Job Positions */}
        <div className="chart">
          <h3>Répartition des Utilisateurs par Poste</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={insights.positionData} 
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: "white", fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis 
                tick={{ fill: "white", fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                formatter={(value, name) => [`${value} utilisateurs`, name]}
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 30, 47, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#4CAF50" 
                barSize={40}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Position Legend */}
          <div className="position-legend">
            {insights.positionData.map((position, index) => (
              <div key={index} className="position-item">
                <span>{position.name}</span>
                <span className="position-count">{position.count} utilisateurs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminRap;
