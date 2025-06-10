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
  getDoc,
  setDoc,
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
  const [hasGroupAccess, setHasGroupAccess] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Error signing in:", error);
    });
  };

  // Group membership check and onboarding
  useEffect(() => {
    const checkGroupAccess = async () => {
      if (!user) return;

      const requestRef = doc(db, "requests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        setRequest(null);
        return;
      }

      const requestData = requestSnap.data();
      setRequest({ id: requestSnap.id, ...requestData });

      const groupId = requestData.groupId;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.groupIds?.includes(groupId)) {
          setHasGroupAccess(true);
        } else {
          // Let user join group by viewing request page
          await setDoc(userRef, {
            ...userData,
            groupIds: [...(userData.groupIds || []), groupId],
          });
          setHasGroupAccess(true);
        }
      } else {
        await setDoc(userRef, {
          email: user.email,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          groupIds: [groupId],
        });
        setHasGroupAccess(true);
      }
    };

    checkGroupAccess();
  }, [user, requestId]);

  useEffect(() => {
    if (!user || !request || hasGroupAccess !== true) return;

    const recsQuery = query(
      collection(db, "recommendations"),
      where("groupId", "==", request.groupId),
      orderBy("createdAt", "desc")
    );
    const unsubRecs = onSnapshot(recsQuery, (snapshot) => {
      const recs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecommendations(recs);
    });

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
      unsubRecs();
      unsubServiceTypes();
    };
  }, [user, request, requestId, hasGroupAccess]);

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
      groupId: request.groupId,
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

  if (!request) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">
            This request does not exist or could not be loaded.
          </p>
        </div>
        <Footer user={user} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    );
  }

  if (hasGroupAccess === false) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">
            Sorry, you're not a member of this group.
          </h1>
          <p className="text-gray-600">
            Please ask a neighbor for an invite code to join this group.
          </p>
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
          <Request
            request={request}
            directRecs={recommendations.filter(
              (rec) => rec.linkedRequestId === request.id
            )}
            matchedRecs={getMatchingRecs(request)}
            newReplies={newReplies}
            setNewReplies={setNewReplies}
            handleReplySubmit={handleReplySubmit}
            serviceTypes={serviceTypes}
          />
          {request && (
  <div className="mb-4">
    <a
      href={`/${request.groupId}`}
      className="text-blue-600 underline text-sm"
    >
      ← Back to {request.groupId} Group
    </a>
  </div>
)}
        </div>
      </div>
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default RequestPage;