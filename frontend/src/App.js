import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Equipe from "./components/Equipe";
import Rapports from "./components/Rapports";
import Notifications from "./components/Notifications";
import Choix from "./components/Choix"; 
import Admin from "./components/Admin";
import AdminRap from "./components/AdminRap";
import Settings from "./components/Settings"
import "./styles/Login.css";
import "./styles/Register.css";
import "./styles/Dashboard.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/rapports" element={<Rapports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/choix" element={<Choix />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/adminrap" element={<AdminRap />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
