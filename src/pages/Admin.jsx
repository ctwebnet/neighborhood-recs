// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Link } from "react-router-dom";
import InviteCreator from "../components/InviteCreator";
import Layout from "../components/Layout";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState({
    users: 0,
    recommendations: 0,
    requests: 0,
    lastUpdated: "",
  });

  const allowedEmails = ["ctwebnet@gmail.com", "ben@plush-tek.com"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && allowedEmails.includes(currentUser.email)) {
        const [usersSnap, recsSnap, reqsSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "recommendations")),
          getCountFromServer(collection(db, "requests")),
        ]);

        setCounts({
          users: usersSnap.data().count,
          recommendations: recsSnap.data().count,
          requests: reqsSnap.data().count,
          lastUpdated: new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        });
      }
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

      {/* 📊 Stats */}
      <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Stats</h2>
        <ul className="space-y-1 text-gray-800">
          <li>🧑‍🤝‍🧑 Users: <strong>{counts.users}</strong></li>
          <li>💬 Recommendations: <strong>{counts.recommendations}</strong></li>
          <li>❓ Requests: <strong>{counts.requests}</strong></li>
          <li className="text-sm text-gray-500 mt-2">
            Last updated: {counts.lastUpdated}
          </li>
        </ul>
      </div>

      {/* 🛠️ Tools */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Invite Someone to a Group</h2>
          <InviteCreator />
        </div>

        <Link to="/Feedback" className="text-blue-600 underline">
          View Feedback
        </Link>
      </div>
    </Layout>
  );
}

