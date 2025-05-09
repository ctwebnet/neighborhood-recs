// src/pages/Admin.jsx

import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import InviteCreator from "../components/InviteCreator";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Update this list with authorized admin emails
  const allowedAdmins = [
    "ben@plush-tek.com",
    "ctwebnet@gmail.com"
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u && allowedAdmins.includes(u.email)) {
        setIsAdmin(true);
      }
    });
    return () => unsub();
  }, []);

  if (!user) return <p>Please sign in to access admin tools.</p>;
  if (!isAdmin) return <p>Access denied. You are not an admin.</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <InviteCreator />
    </div>
  );
}
