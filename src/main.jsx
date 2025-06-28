import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/Settings"; 
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import GroupPage from "./pages/[groupId]";
import AdminPage from "./pages/Admin";
import Feedback from "./pages/Feedback";
import RequestPage from './pages/RequestPage';
import MyListPage from "./pages/MyListPage";
import UserListPage from "./pages/UserListPage";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} /> 
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/:groupId" element={<GroupPage />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/request/:requestId" element={<RequestPage />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="/users/:uid" element={<UserListPage />} />
        </Routes>
      </Router>
    </>
  </React.StrictMode>
);
