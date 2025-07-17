import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams, Link, useNavigate  } from "react-router-dom";
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
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { db, auth } from "../firebase";
import StandaloneRecForm from "../components/StandaloneRecForm";
import CategorySearchAndPrompt from "../components/CategorySearchAndPrompt";
import Request from "../components/Request";

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [groupUserCount, setGroupUserCount] = useState(null);
  const [userGroupIndex, setUserGroupIndex] = useState(null);
  const [user, setUser] = useState(null);
  const [groupExists, setGroupExists] = useState(null);
  const [hasGroupAccess, setHasGroupAccess] = useState(null);
  const [requests, setRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newRequest, setNewRequest] = useState("");
  const [newRequestServiceType, setNewRequestServiceType] = useState("");
  const [customServiceType, setCustomServiceType] = useState("");
  const [newReplies, setNewReplies] = useState({});
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setLoading(false);

    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    let firstName = "";
    let lastName = "";
    if (currentUser.displayName) {
      const nameParts = currentUser.displayName.split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    }

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: currentUser.email,
        firstName,
        lastName,
        groupIds: [groupId],
      });
      setHasGroupAccess(true);
    } else {
      const userData = userSnap.data();
      if (!userData.groupIds) {
        await setDoc(userRef, {
          ...userData,
          groupIds: [groupId],
        });
        setHasGroupAccess(true);
      } else if (!userData.groupIds.includes(groupId)) {
        await setDoc(userRef, {
          ...userData,
          groupIds: [...userData.groupIds, groupId],
        });
        setHasGroupAccess(true);
      } else {
        setHasGroupAccess(true);
      }
    }

    // Always check group index and count once user is valid
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const groupUsers = usersSnap.docs.filter(doc =>
        doc.data().groupIds?.includes(groupId)
      );
      setGroupUserCount(groupUsers.length);

      const sortedGroupUsers = groupUsers.sort((a, b) =>
        a.data().email.localeCompare(b.data().email)
      );

      const index = sortedGroupUsers.findIndex(u => u.id === currentUser.uid);
      setUserGroupIndex(index >= 0 ? index + 1 : null);
    } catch (error) {
      console.error("Error calculating group index:", error);
    }
  });

  return () => unsubscribeAuth();
}, [groupId]);

  useEffect(() => {
    const checkGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        setGroupExists(groupDoc.exists());
      } catch (err) {
        setGroupExists(false);
      }
    };
    checkGroup();
  }, [groupId]);

  useEffect(() => {
    if (!user || !groupExists || !hasGroupAccess) return;

    const reqQuery = query(
      collection(db, "requests"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );
    const recQuery = query(
      collection(db, "recommendations"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );
    const serviceTypeQuery = query(collection(db, "serviceTypes"));

    const unsubReq = onSnapshot(reqQuery, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRec = onSnapshot(recQuery, (snapshot) => {
      setRecommendations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubServiceTypes = onSnapshot(serviceTypeQuery, (snapshot) => {
      const types = snapshot.docs
        .map((doc) => doc.id)
        .filter((type) => type && type.trim() !== "");
      setServiceTypes(types);
    });

    return () => {
      unsubReq();
      unsubRec();
      unsubServiceTypes();
    };
  }, [user, groupExists, groupId, hasGroupAccess]);

  const handleRequestSubmit = async () => {
    let finalServiceType = newRequestServiceType;
    if (newRequestServiceType === "__custom") {
      if (!customServiceType.trim()) {
        alert("Please enter a custom service type.");
        return;
      }
      finalServiceType = customServiceType.trim();
      await setDoc(doc(db, "serviceTypes", finalServiceType), {});
    }

    if (!newRequest.trim() || !finalServiceType.trim()) {
      alert("Please enter both a request and a service type.");
      return;
    }

    await addDoc(collection(db, "requests"), {
      text: newRequest,
      serviceType: finalServiceType,
      groupId,
      createdAt: serverTimestamp(),
      submittedBy: {
        name: user.displayName,
        email: user.email,
      },
    });
    toast.success("Thanks! Your request has been posted.");
    setNewRequest("");
    setNewRequestServiceType("");
    setCustomServiceType("");
  };

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
    groupId,
    linkedRequestId: requestId,
    createdAt: serverTimestamp(),
    submittedBy: {
      name: user.displayName,
      email: user.email,
    },
    submittedByUid: user.uid,
  });
  toast.success("Thanks! Your recommendation was submitted.");
  setNewReplies((prev) => ({ ...prev, [requestId]: {} }));

  setTimeout(() => {
    navigate("/my-list");
  }, 1500); // Delay allows the toast to display before redirect
};

  const getMatchingRecs = (req) => {
    return recommendations.filter(
      (rec) =>
        rec.serviceType === req.serviceType &&
        rec.linkedRequestId !== req.id
    );
  };

  if (loading || groupExists === null) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Checking group...</p>
        </div>
        <Footer user={user} />
      </>
    );
  }

  if (!groupExists) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Group not found.</h1>
          <p className="text-gray-600">Please check the link or contact an admin.</p>
        </div>
        <Footer user={user} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">
            Welcome to the {groupId} Group!
          </h1>
          <p className="text-gray-600 mb-4">
            Neighboroonie is a private space where neighbors share and request trusted recommendations. Sign in to join the conversation!
          </p>

          <button
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="btn-primary"
          >
            Sign in with Google
          </button>
        </div>
        <Footer user={user} />
      </>
    );
  }

  if (hasGroupAccess === false) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">
            Sorry, you're not a member of the {groupId} group.
          </h1>
          <p className="text-gray-600">
            Please ask a neighbor for an invite code to join this group.
          </p>
        </div>
        <Footer user={user} />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-4">
  <h1 className="text-3xl font-bold">{groupId.charAt(0).toUpperCase() + groupId.slice(1)} Trusted Recommendations</h1>
  {userGroupIndex !== null && groupUserCount !== null && (
    <p className="text-gray-600 text-sm sm:ml-4 sm:mt-0 mt-2">
      You’re user #{userGroupIndex} of {groupUserCount} in this group.
    </p>
  )}
</div>
{/* Search and Request Form */}
<CategorySearchAndPrompt
  serviceTypes={serviceTypes}
  recommendations={recommendations}
  onPrefillRequest={async (category, text) => {
    // Check if serviceType exists in Firestore
    const categoryRef = doc(db, "serviceTypes", category);
    const snap = await getDoc(categoryRef);
    if (!snap.exists()) {
      await setDoc(categoryRef, { createdAt: serverTimestamp() });
    }

    const docRef = await addDoc(collection(db, "requests"), {
      text,
      serviceType: category,
      groupId,
      createdAt: serverTimestamp(),
      submittedBy: {
        name: user.displayName,
        email: user.email,
      },
      submittedByUid: user.uid,
    });

    navigate(`/request/${docRef.id}`);
  }}
/>

          {/* Standalone Recommendation Form */}
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">
              Submit a General Recommendation
            </h2>
            <p className="text-gray-600 text-sm mb-2">
              👋 New here? Shout out a contractor or service provider who you'd highly recommend.
            </p>
            <StandaloneRecForm
              groupId={groupId}
              user={user}
              serviceTypeOptions={serviceTypes}
            />
          </div>
         
          {/* Request Form */}
{/*
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Ask for a Recommendation</h2>
            <input
              className="w-full border p-2 mb-2"
              placeholder="What are you looking for?"
              value={newRequest}
              onChange={(e) => setNewRequest(e.target.value)}
            />
            <select
              className="w-full border p-2 mb-2"
              value={newRequestServiceType}
              onChange={(e) => setNewRequestServiceType(e.target.value)}
            >
              <option value="">Select a service type</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="__custom">Other (Add a new category)</option>
            </select>
            {newRequestServiceType === "__custom" && (
              <input
                className="w-full border p-2 mb-2"
                placeholder="e.g., Furniture repair, piano tuner"
                value={customServiceType}
                onChange={(e) => setCustomServiceType(e.target.value)}
              />
            )}
            <button onClick={handleRequestSubmit} className="btn-primary">
              Submit Request
            </button>
          </div>*/}
          {/* Requests & Replies */}
<div className="mb-8">
  <h2 className="text-xl font-semibold mb-2">Recent Requests for Recommendations</h2>
  {requests.length === 0 ? (
    <p className="text-gray-500 italic">No requests yet.</p>
  ) : (
    requests.map((req) => {
      const directRecs = recommendations.filter(
        (rec) => rec.linkedRequestId === req.id
      );
      const matchedRecs = getMatchingRecs(req);

      return (
        <Request
          key={req.id}
          request={req}
          directRecs={directRecs}
          matchedRecs={matchedRecs}
          newReplies={newReplies}
          setNewReplies={setNewReplies}
          handleReplySubmit={handleReplySubmit}
          serviceTypes={serviceTypes}
          user={user} // ✅ required for ThankButton
        />
      );
    })
  )}
</div>
        </div>
      </div>
      <Footer user={user} />
    </>
  );
}

