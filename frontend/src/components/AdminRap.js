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
  Legend
} from "recharts";
import { FaUsers, FaArrowLeft, FaChartLine } from "react-icons/fa";
import "../styles/AdminRap.css";
import naptaLogo from "../assets/naptar.png";

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

  // KPMG Theme Colors
  const COLORS = ["#00338D", "#0091DA", "#6CACE4", "#93C90E", "#E2007A", "#FFDD00", "#FF8F1C", "#A7A8AA", "#47D7AC", "#253746"];

  return (
    <div className="admin-rap-container">
      <div className="admin-content">
        <div className="admin-header">
          <div className="header-left">
            <img src={naptaLogo} alt="Napta Logo" className="logo-header" />
            <h1>
              Bienvenue, <span className="user-name">{admin ? `${admin.prenom} ${admin.nom}` : ""}</span>
            </h1>
          </div>
          <button className="back-btn" onClick={() => navigate("/admin")}>
            <FaArrowLeft /> Retour au Tableau de Bord
          </button>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h2 className="admin-title">
              <FaChartLine /> Statistiques des Utilisateurs
            </h2>
          </div>

          {/* Total Users Card */}
          <div className="stats-summary">
            <div className="total-users-card">
              <FaUsers className="total-users-icon" />
              <div className="total-users-content">
                <h3>Total Utilisateurs</h3>
                <p className="total-users-count">{insights.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-container">
            {/* Pie Chart for Departments */}
            <div className="chart-card">
              <h3 className="chart-title">Répartition par Département</h3>
              <div className="chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={insights.departmentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {insights.departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} utilisateurs`, name]}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        color: '#333'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart for Job Positions */}
            <div className="chart-card">
              <h3 className="chart-title">Répartition par Poste</h3>
              <div className="chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={insights.positionData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#333", fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: "#333", fontSize: 12 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`${value} utilisateurs`, "Nombre"]}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        color: '#333'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      name="Utilisateurs"
                      fill="#00338D" 
                      barSize={20}
                      radius={[4, 4, 0, 0]}
                    >
                      {insights.positionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table Section */}
          <div className="data-tables">
            <div className="data-table">
              <h3 className="table-title">Détails par Département</h3>
              <div className="table-responsive">
                <table className="data-table-content">
                  <thead>
                    <tr>
                      <th>Département</th>
                      <th>Nombre d'utilisateurs</th>
                      <th>Pourcentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.departmentData.map((dept, index) => (
                      <tr key={index}>
                        <td>{dept.name}</td>
                        <td>{dept.value}</td>
                        <td>{((dept.value / insights.totalUsers) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="data-table">
              <h3 className="table-title">Détails par Poste</h3>
              <div className="table-responsive">
                <table className="data-table-content">
                  <thead>
                    <tr>
                      <th>Poste</th>
                      <th>Nombre d'utilisateurs</th>
                      <th>Pourcentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.positionData.map((pos, index) => (
                      <tr key={index}>
                        <td>{pos.name}</td>
                        <td>{pos.count}</td>
                        <td>{((pos.count / insights.totalUsers) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminRap;
