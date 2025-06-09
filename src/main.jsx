import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import GroupPage from "./pages/[groupId]";
import AdminPage from "./pages/Admin";
import Feedback from "./pages/Feedback";
import RequestPage from './pages/RequestPage';
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
          <Route path="/:groupId" element={<GroupPage />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/request/:requestId" element={<RequestPage />} />
        </Routes>
      </Router>
    </>
  </React.StrictMode>
);
