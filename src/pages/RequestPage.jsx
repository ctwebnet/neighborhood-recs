import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  getDocs,
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
  const navigate = useNavigate();
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

      let wasNewToGroup = false;

            if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedUser = {
          ...userData,
          groupIds: userData.groupIds?.includes(groupId)
            ? userData.groupIds
            : [...(userData.groupIds || []), groupId],
          createdAt: userData.createdAt || new Date(),
          userNumber: userData.userNumber ?? (await getDocs(collection(db, "users"))).size,
        };

        if (
          !userData.groupIds?.includes(groupId) ||
          userData.userNumber === undefined ||
          userData.createdAt === undefined
        ) {
          await setDoc(userRef, updatedUser);
        }

        setHasGroupAccess(true);
        wasNewToGroup = !userData.groupIds?.includes(groupId);
      } else {
        const usersSnap = await getDocs(collection(db, "users"));
        const newUserNumber = usersSnap.size;

        await setDoc(userRef, {
          email: user.email,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          groupIds: [groupId],
          userNumber: newUserNumber,
          createdAt: new Date(),
        });
        setHasGroupAccess(true);
        wasNewToGroup = true;
      }

      if (wasNewToGroup) {
  const usersSnap = await getDocs(collection(db, "users"));
  const userCount = usersSnap.size;

  toast(
    `👋 Welcome! You’re user #${userCount} and just joined the ${groupId} group. We're in beta — feedback is welcome via the form in the footer.`,
    {
      icon: "🚀",
      duration: 12000,
      style: { maxWidth: "500px", lineHeight: "1.4" },
      position: "top-center",
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    }
  );
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
    const reply = {
      ...newReplies[requestId],
      serviceType: request.serviceType,
    };
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
      submittedByUid: user.uid,
    });
    toast.success("Thanks! Your recommendation was submitted.");
setTimeout(() => {
  navigate("/my-list");
}, 1500);
  };

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        toast.success("Link copied to clipboard! Share it with neighbors!", {
          duration: 6000,
        });
      })
      .catch((error) => {
        console.error("Failed to copy link:", error);
        toast.error("Failed to copy link.");
      });
  };

  const getMatchingRecs = (req) => {
    return recommendations.filter(
      (rec) => rec.serviceType === req.serviceType && rec.linkedRequestId !== req.id
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Request Details</h2>
            <button
              onClick={handleShare}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
            >
              Share Request
            </button>
          </div>
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
            user={user}
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