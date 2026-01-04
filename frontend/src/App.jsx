import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Webhooks from './pages/Webhooks';
import Drivers from './pages/Drivers';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import RouteSimulator from './pages/RouteSimulator';
import Register from './pages/Register';
import SuperAdmin from './pages/SuperAdmin';
import ApiDocs from './pages/ApiDocs';
import Integrations from './pages/Integrations';
import Integrations from './pages/Integrations';
import ChatwootWidget from './pages/ChatwootWidget';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chatwoot-widget" element={<ProtectedRoute><ChatwootWidget /></ProtectedRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="settings" element={<Settings />} />
        <Route path="simulator/:driverId" element={<RouteSimulator />} />
        <Route path="super-admin" element={<SuperAdmin />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="developers" element={<ApiDocs />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
