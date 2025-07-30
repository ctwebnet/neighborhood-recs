import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import ThankButton from "../components/ThankButton";
import { Toaster, toast } from "react-hot-toast";
import SavedList from "../components/SavedList";
import { getSavedRecsForUser } from "../utils/savedRecs";

const UserListPage = () => {
  const { uid } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [savedRecs, setSavedRecs] = useState([]);
const [thankedRecs, setThankedRecs] = useState([]);
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

    // Listen to submitted recommendations
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

    // Listen to saved recommendations
    const savedRef = collection(db, "savedRecs", uid, "items");
    const unsubSaved = onSnapshot(savedRef, async (snapshot) => {
      const savedDocs = snapshot.docs.map((doc) => doc.data());

      const recPromises = savedDocs.map(async (entry) => {
        const recSnap = await getDoc(doc(db, "recommendations", entry.recId));
        return recSnap.exists() ? { id: recSnap.id, ...recSnap.data() } : null;
      });

      const recs = (await Promise.all(recPromises)).filter(Boolean);
      setSavedRecs(recs);
    });

    return () => {
      unsub();
      unsubSaved();
    };
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
            {targetUser.firstName ? `${targetUser.firstName}'s List` : `Recommendations by ${targetUser.email}`}
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-600">No recommendations found.</p>
          ) : (
            recommendations.map((rec) => (
             <div key={rec.id} className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <div className="mb-2 sm:mb-0">
    <p className="font-semibold text-base">{rec.name}</p>
      <p className="text-sm text-gray-500 mb-1">{rec.serviceType}</p>
      <p className="text-xs text-gray-400">
        Group:{" "}
        {typeof rec.groupId === "string" ? (
          <Link
            to={`/${rec.groupId}`}
            className="text-blue-600 underline"
          >
            {rec.groupId.charAt(0).toUpperCase() + rec.groupId.slice(1)}
          </Link>
        ) : (
          <span className="text-gray-500 italic">General Recommendation</span>
        )}
      </p>
    </div>
    <div className="flex-shrink-0">
      <Link
        to={`/recommendations/${rec.id}`}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded block text-center"
      >
        View Recommendation
      </Link>
    </div>
  </div>
</div>
            ))
          )}
        </div>
      </div>
     {savedRecs.length > 0 && (
  <div className="mt-8 bg-gray-100 p-6">
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Saved Recommendations</h2>
      {savedRecs.map((rec) => (
        <div
          key={rec.id}
          className="border border-gray-200 rounded p-4 mb-4 bg-gray-50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <p className="font-semibold text-base">{rec.name}</p>
              <p className="text-sm text-gray-500 mb-1">{rec.serviceType}</p>
              <p className="text-xs text-gray-400">
                Group:{" "}
                {typeof rec.groupId === "string" ? (
                  <Link to={`/${rec.groupId}`} className="text-blue-600 underline">
                    {rec.groupId.charAt(0).toUpperCase() + rec.groupId.slice(1)}
                  </Link>
                ) : (
                  <span className="text-gray-500 italic">General</span>
                )}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                to={`/recommendations/${rec.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded block text-center"
              >
                View Recommendation
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
      <Footer user={currentUser} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default UserListPage;