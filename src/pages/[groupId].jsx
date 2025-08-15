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
  updateDoc, 
  increment,
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
  const [showRecForm, setShowRecForm] = useState(false); 
  const [feedItems, setFeedItems] = useState([]);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref");
  if (ref) {
    localStorage.setItem("referrerUid", ref);
  }
}, []);

 useEffect(() => {
  let unsubscribeAuth;

  const checkGroupAndInitAuth = async () => {
    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      const exists = groupDoc.exists();
      setGroupExists(exists);

      if (!exists) {
        setLoading(false); // Stop loading if group doesn't exist
        return;
      }

      unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
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
  const allUsersSnap = await getDocs(collection(db, "users"));
  const userNumber = allUsersSnap.size >= 0 ? allUsersSnap.size : 0;

  // Capture referrer from localStorage
  const referrerUid = localStorage.getItem("referrerUid");

  await setDoc(userRef, {
    email: currentUser.email,
    firstName,
    lastName,
    groupIds: [groupId],
    userNumber,
    createdAt: serverTimestamp(),
    referredBy: referrerUid || null,
  });

  if (referrerUid) {
    const referrerRef = doc(db, "users", referrerUid);
    await updateDoc(referrerRef, {
      referralCount: increment(1),
    });
    localStorage.removeItem("referrerUid");
  }

  setHasGroupAccess(true);
} else {
          const userData = userSnap.data();
          const updatedData = { ...userData };
          // Fetch number of users referred by the current user
const referredSnap = await getDocs(query(
  collection(db, "users"),
  where("referredBy", "==", currentUser.uid)
));

const referredCount = referredSnap.size;
setReferralCount(referredCount);

          if (!userData.userNumber) {
            const allUsersSnap = await getDocs(collection(db, "users"));
            updatedData.userNumber = allUsersSnap.size;
          }

          if (!userData.createdAt) {
            updatedData.createdAt = serverTimestamp();
          }

          if (!userData.groupIds) {
            updatedData.groupIds = [groupId];
            setHasGroupAccess(true);
          } else if (!userData.groupIds.includes(groupId)) {
            updatedData.groupIds = [...userData.groupIds, groupId];
            setHasGroupAccess(true);

          } else {
            setHasGroupAccess(true);
          }

          await setDoc(userRef, updatedData);
        }

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
      });
    } catch (err) {
      console.error("Failed to check group or initialize auth:", err);
      setGroupExists(false);
      setLoading(false);
    }
  };

  checkGroupAndInitAuth();

  return () => {
    if (unsubscribeAuth) unsubscribeAuth();
  };
}, [groupId]);

  useEffect(() => {
  if (!user || !groupExists || !hasGroupAccess) return;

  const fetchFeed = async () => {
    const [reqSnap, recSnap, userSnap, serviceSnap] = await Promise.all([
      getDocs(query(
        collection(db, "requests"),
        where("groupId", "==", groupId)
      )),
      getDocs(query(
  collection(db, "recommendations"),
  where("groupId", "==", groupId)
)),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "serviceTypes")),
    ]);

    setRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); // still used in reply logic
    setRecommendations(recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const types = serviceSnap.docs
      .map(doc => doc.id)
      .filter(id => id && id.trim() !== "");
    setServiceTypes(types);

    const combined = [
      ...reqSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: "request"
      })),
      ...recSnap.docs
 // .filter(doc => !doc.data().linkedRequestId)  // filter out replies
  .map(doc => ({
    id: doc.id,
    ...doc.data(),
    type: "recommendation"
  })),
      ...userSnap.docs
        .filter(doc => doc.data().groupIds?.includes(groupId))
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: "user_joined"
        }))
    ]
      .filter(item => item.createdAt)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    setFeedItems(combined);
  };

  fetchFeed();
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
          <p className="text-gray-600">Try signing in above to see if you’re already a member — or ask a neighbor for a link if you're not.</p>
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
// === Onboarding Progress Logic ===
const totalSteps = 3;
const hasJoinedGroup = !!hasGroupAccess;
const hasPostedRec = recommendations.some(
  (rec) => rec.submittedByUid === user?.uid
);
const completedSteps = [
  user ? 1 : 0,
  hasJoinedGroup ? 1 : 0,
  hasPostedRec ? 1 : 0,
].reduce((a, b) => a + b, 0);
const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  return (
    <>
  <Header />
<div className="min-h-screen bg-gray-100 p-6">
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-1">
         {groupId.charAt(0).toUpperCase() + groupId.slice(1)} Recommendations
        </h1>
       <div className="flex items-center text-sm text-gray-600 flex-wrap gap-2">
       <p className="text-gray-600 text-sm">
  {userGroupIndex !== null && groupUserCount !== null && (
    <>You're neighboroonie #{userGroupIndex} of {groupUserCount} in this group.</>
  )}
</p>
  <p className="m-0">
    {referralCount === 0
      ? "Want to help more neighbors join?"
      : `You've helped ${referralCount} neighbor${referralCount !== 1 ? "s" : ""} join.`}
  </p>
  {user && hasGroupAccess && (
    <button
      onClick={async () => {
        const url = `${window.location.origin}/${groupId}?ref=${user.uid}`;
        const title = `Join my group on Neighboroonie`;

        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            toast.success("Thanks for sharing!");
          } catch (err) {
            console.log("Share cancelled or failed", err);
          }
        } else {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Copied link to clipboard!");
          } catch (err) {
            console.error("Clipboard failed", err);
            alert("Couldn't copy to clipboard, sorry.");
          }
        }
      }}
      className="text-xs bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded shadow whitespace-nowrap"
    >
      <span className="inline-block rounded-full bg-white w-5 h-5 text-center leading-5 mr-1">🦩</span>
      Invite
    </button>
  )}
</div>
      </div>

      {user && progressPercent < 100 && (
  <div className="mb-6">
    <div className="text-sm text-gray-600 mb-1">
      Profile progress:{" "}
      <strong>{progressPercent}% complete</strong>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-green-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  </div>
)}

{progressPercent === 67 && (
  <div className="text-sm text-yellow-900 bg-yellow-50 border border-yellow-300 rounded p-4 mb-6">
    <p className="mb-1 font-medium">You’re almost there! 🎯</p>
    <p className="mb-2">
      Just one more step to complete your profile and help seed this community.
      Visit <Link to="/my-list" className="underline text-blue-600 font-medium">your list</Link> to add a trusted recommendation.
    </p>
    <p className="text-xs text-gray-500">Or pick a category below to ask for a rec.</p>
  </div>
)}
{progressPercent === 100 && (
  <div className="text-sm text-green-900 bg-green-50 border border-green-300 rounded p-4 mb-6">
    <p className="mb-1 font-medium">Nice work! ✅</p>
   <p className="mb-2">
  You’re one of the first to contribute — thank you.  
  Ready to share a few more names your neighbors should know?
</p>
    <button
      onClick={() => navigate("/my-list")}
      className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
    >
      Add More Recommendations
    </button>
  </div>
)}
{/* Search and Request Form */}
<CategorySearchAndPrompt
  serviceTypes={serviceTypes}
  recommendations={recommendations}
  groupMemberCount={groupUserCount ?? 0}   // ← add this
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
          {/* Collapsible Standalone Recommendation Form */}
{/* <div className="bg-white p-4 rounded shadow mb-6">
  <button
    onClick={() => setShowRecForm(!showRecForm)}
    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
  >
    {showRecForm ? "Hide Recommendation Form" : "+ Add a Recommendation"}
  </button>

  {showRecForm && (
    <div className="mt-4">
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
  )}
</div> /} 
         
          {/* Old Request Form */}
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
  <h2 className="text-xl font-semibold mb-4">Group Activity</h2>
  {feedItems.length === 0 ? (
    <p className="text-gray-500 italic">No recent activity yet.</p>
  ) : (
    feedItems.map((item) => {
      switch (item.type) {
        case "request":
  return (
    <div key={`request-${item.id}`} className="bg-white border p-4 mb-4 rounded">
      <p className="text-sm text-gray-600">
        🛠️{" "}
        <Link
          to={`/users/${item.submittedByUid}`}
          className="text-blue-600 underline"
        >
          {item.submittedBy?.name || "A neighbor"}
        </Link>{" "}
        asked:
      </p>

      <p className="font-semibold mb-2">{item.text}</p>

      <div className="mt-2 flex items-center gap-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
            (item.repliesCount || 0) > 0
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700"
          }`}
          title="Number of replies"
        >
          💬 {(item.repliesCount ?? 0)}{" "}
          {(item.repliesCount ?? 0) === 1 ? "reply" : "replies"}
        </span>

        {(item.repliesCount ?? 0) === 0 && (
          <span className="text-gray-500">Be the first to help</span>
        )}

        <Link
          to={`/request/${item.id}`}
          className="text-blue-600 underline"
        >
          View Request →
        </Link>
      </div>
    </div>
  );

        case "recommendation":
          return (
            <div key={`rec-${item.id}`} className="bg-gray-50 border p-4 mb-4 rounded">
              <p className="text-sm text-gray-600">
                ✅{" "}
                <Link
                  to={`/users/${item.submittedByUid}`}
                  className="text-blue-600 underline"
                >
                  {item.submittedBy?.name || "A neighbor"}
                </Link>{" "}
                recommended:
              </p>
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-gray-500 mb-2">for {item.serviceType}</p>
              <Link
                to={`/recommendations/${item.id}`}
                className="text-blue-600 underline text-sm"
              >
                View Recommendation →
              </Link>
            </div>
          );

        case "user_joined":
          return (
            <div
              key={`user-${item.id}`}
              className="bg-white border p-4 mb-4 rounded text-sm text-gray-500 italic"
            >
              <span className="text-2xl mr-2">🦩</span>
              {item.firstName || item.email} just joined the group.
            </div>
          );

        default:
          return null;
      }
    })
  )}
</div>
        </div>
      </div>
      <Footer user={user} />
    </>
  );
}

