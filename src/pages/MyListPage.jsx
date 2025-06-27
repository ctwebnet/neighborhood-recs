// src/pages/MyListPage.jsx

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Toaster } from "react-hot-toast";

const MyListPage = () => {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const recsQuery = query(
      collection(db, "recommendations"),
      where("submittedBy.email", "==", user.email)
    );

    const unsub = onSnapshot(recsQuery, (snapshot) => {
      const recs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecommendations(recs);
    });

    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
        <Footer user={user} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Please sign in to view your recommendations.</p>
        </div>
        <Footer user={user} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-4">Your Recommendations</h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-600">You haven’t submitted any recommendations yet.</p>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                <p className="font-semibold">{rec.name}</p>
                <p className="text-sm text-gray-500">{rec.serviceType}</p>
                <p className="mt-1">{rec.testimonial}</p>
                <p className="text-sm text-gray-500 italic mt-1">{rec.contactInfo}</p>
                <p className="text-xs text-gray-400 mt-2">Group: {rec.groupId}</p>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default MyListPage;