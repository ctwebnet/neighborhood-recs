// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";
import InviteCreator from "../components/InviteCreator";
import Layout from "../components/Layout";

export default function AdminPage() {
  const [user, setUser] = useState(null);

  const allowedEmails = ["ctwebnet@gmail.com", "ben@plush-tek.com"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user || !allowedEmails.includes(user.email)) {
    return (
      <Layout user={user}>
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-700">You are not an admin.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Invite Someone to a Group</h2>
          <InviteCreator />
        </div>

        <Link to="/Feedback">
          View Feedback
        </Link>
      </div>
    </Layout>
  );
}


