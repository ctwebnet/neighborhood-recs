// src/pages/LandingPage.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import toast from "react-hot-toast";
import Layout from "../components/Layout";

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((err) => {
      console.error("Login failed", err);
      toast.error("Login failed");
    });
  };

  const handleLogout = () => {
    signOut(auth).catch((err) => {
      console.error("Logout failed", err);
      toast.error("Logout failed");
    });
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;

    try {
      await addDoc(collection(db, "feedback"), {
        message: feedback,
        email: user?.email || "",
        createdAt: serverTimestamp()
      });
      toast.success("Feedback submitted!");
      setFeedback("");
    } catch (err) {
      console.error("Error submitting feedback", err);
      toast.error("Error submitting feedback");
    }
  };

  return (
    <Layout user={user}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-4">neighboroonie</h1>
        <p className="mb-6 text-gray-700">
          A simple way to share and find trusted local recommendations.
        </p>

        {!user ? (
          <button onClick={handleLogin}>
            Sign in with Google
          </button>
        ) : (
          <div className="mb-6">
            <p className="text-gray-700 mb-2">Signed in as {user.displayName}</p>
            <button onClick={handleLogout}>
              Sign out
            </button>
          </div>
        )}

        <div className="bg-white rounded shadow p-4 max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-2">Looking for a group?</h2>
          <p className="text-gray-600 mb-4">
            Ask a neighbor or admin for an invite link to your local group, like{" "}
            <code>/westville</code> or <code>/rena</code>.
          </p>
        </div>
      </div>
    </Layout>
  );
}

