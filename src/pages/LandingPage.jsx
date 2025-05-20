// src/pages/LandingPage.jsx

import { useState, useEffect } from "react";
import { auth, provider, db } from "../firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleSubmitFeedback = async () => {
  if (!feedback) return;
  try {
    await addDoc(collection(db, "feedback"), {
      message: feedback, // top-level message for email trigger
      email: user?.email || null, // top-level email for email trigger
      submittedAt: serverTimestamp(),
      user: user
        ? { name: user.displayName, email: user.email }
        : null,
    });
    setFeedback("");
    alert("Thanks for your feedback!");
  } catch (e) {
    console.error("Feedback submission failed", e);
  }
};


  return (
    <div className="min-h-screen bg-gray-100 p-6 text-center">
      <h1 className="text-4xl font-bold text-purple-700 mb-4">neighboroonie</h1>
      <p className="mb-6 text-gray-700">A simple way to share and find trusted local recommendations.</p>

      {!user ? (
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="mb-6">
          <p className="text-gray-700 mb-2">Signed in as {user.displayName}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign out
          </button>
        </div>
      )}

      <div className="bg-white rounded shadow p-4 max-w-xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">Looking for a group?</h2>
        <p className="text-gray-600 mb-4">Ask a neighbor or admin for an invite link to your local group, like <code>/westville</code> or <code>/rena</code>.</p>
      </div>

      <div className="bg-white rounded shadow p-4 max-w-xl mx-auto mt-6">
        <h2 className="text-lg font-semibold mb-2">Submit a Feature or Bug</h2>
        <textarea
          className="w-full border p-2 mb-2"
          placeholder="What should we fix or add?"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          onClick={handleSubmitFeedback}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
}
