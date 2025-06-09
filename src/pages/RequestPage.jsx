import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Toaster, toast } from "react-hot-toast";
import Request from "../components/Request";

const RequestPage = () => {
  const { requestId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [newReplies, setNewReplies] = useState({});
  const [serviceTypes, setServiceTypes] = useState([]);
useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setLoading(false);

    if (currentUser) {
      const idTokenResult = await currentUser.getIdTokenResult();
      console.log("Custom claims:", idTokenResult.claims);
    }
  });
  return () => unsubscribeAuth();
}, []);
  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Error signing in:", error);
    });
  };

  useEffect(() => {
    if (!user) return;

    // Load the request
    const requestRef = doc(db, "requests", requestId);
    const unsubReq = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        setRequest(null);
      }
    });

    // Load recommendations linked to this request
    const recsQuery = query(
      collection(db, "recommendations"),
      where("linkedRequestId", "==", requestId)
    );
    const unsubRec = onSnapshot(recsQuery, (snapshot) => {
      const recs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecommendations(recs);
    });

    // Load service types from Firestore
    const unsubServiceTypes = onSnapshot(
      collection(db, "serviceTypes"),
      (snapshot) => {
        const types = snapshot.docs
          .map((doc) => doc.id)
          .filter((type) => type && type.trim() !== "");
        setServiceTypes(types);
      }
    );

    return () => {
      unsubReq();
      unsubRec();
      unsubServiceTypes();
    };
  }, [requestId, user]);

  const handleReplySubmit = async (requestId) => {
    const reply = newReplies[requestId];
    if (
      !reply?.name?.trim() ||
      !reply?.testimonial?.trim() ||
      !reply?.contactInfo?.trim() ||
      !reply?.serviceType?.trim()
    ) {
      alert("Please fill out all fields.");
      return;
    }
    await addDoc(collection(db, "recommendations"), {
      ...reply,
      linkedRequestId: requestId,
      createdAt: serverTimestamp(),
      submittedBy: {
        name: user.displayName,
        email: user.email,
      },
    });
    toast.success("Thanks! Your recommendation was submitted.");
    setNewReplies((prev) => ({ ...prev, [requestId]: {} }));
  };

  const getMatchingRecs = (req) => {
    return recommendations.filter(
      (rec) =>
        rec.serviceType === req.serviceType &&
        rec.linkedRequestId !== req.id
    );
  };

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
          <p className="text-lg text-gray-600">
            Please sign in to view this request.
          </p>
          <button onClick={handleSignIn} className="btn-primary mt-4">
            Sign In
          </button>
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
        {request ? (
          <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
            <Request
              request={request}
              directRecs={recommendations}
              matchedRecs={getMatchingRecs(request)}
              newReplies={newReplies}
              setNewReplies={setNewReplies}
              handleReplySubmit={handleReplySubmit}
              serviceTypes={serviceTypes}
            />
          </div>
        ) : (
          <p className="text-center text-lg text-gray-600">
            This request does not exist or could not be loaded.
          </p>
        )}
      </div>
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default RequestPage;