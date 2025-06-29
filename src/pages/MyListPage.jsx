import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Toaster, toast } from "react-hot-toast";

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
      where("submittedByUid", "==", user.uid)
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

  return (
    <>
      <Header />
      {loading ? (
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      ) : !user ? (
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">
            Please sign in to view your recommendations.
          </p>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-100 p-6">
          <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Your Recommendations</h2>
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/users/${user.uid}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied!");
                }}
                className="btn-primary"
              >
                Share Your List
              </button>
            </div>
            {recommendations.length === 0 ? (
              <p className="text-gray-600">
                You haven’t submitted any recommendations yet.
              </p>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="border border-gray-200 rounded p-4 mb-4 bg-gray-50"
                >
                  <p className="font-semibold">{rec.name}</p>
                  <p className="text-sm text-gray-500">{rec.serviceType}</p>
                  <p className="mt-1">{rec.testimonial}</p>
                  <p className="text-sm text-gray-500 italic mt-1">
                    {rec.contactInfo}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Group: {rec.groupId}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default MyListPage;