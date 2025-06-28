import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Toaster } from "react-hot-toast";

const UserListPage = () => {
  const { uid } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const fetchUserAndRecs = async () => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      setTargetUser(userData);

      const recsQuery = query(
        collection(db, "recommendations"),
        where("submittedBy.email", "==", userData.email)
      );

      const unsub = onSnapshot(recsQuery, (snapshot) => {
        const recs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRecommendations(recs);
        setLoading(false);
      });

      return () => unsub();
    };

    fetchUserAndRecs();
  }, [uid]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
        <Footer user={currentUser} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Please sign in to view recommendations.</p>
        </div>
        <Footer user={currentUser} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  if (!targetUser) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">User not found.</p>
        </div>
        <Footer user={currentUser} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-4">
            Recommendations by {targetUser.firstName || targetUser.email}
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-600">No recommendations found.</p>
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
      <Footer user={currentUser} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default UserListPage;