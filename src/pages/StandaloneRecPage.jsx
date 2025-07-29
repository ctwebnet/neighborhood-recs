import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getDoc,
  getDocs,
  doc,
  collection,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Toaster, toast } from "react-hot-toast";
import { saveRecommendationForUser } from "../utils/saveRec";

const StandaloneRecPage = () => {
  const { recId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rec, setRec] = useState(null);
  const [groupRecs, setGroupRecs] = useState([]);
  const [hasGroupAccess, setHasGroupAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasThanked, setHasThanked] = useState(false);
const [thanksCount, setThanksCount] = useState(0);
const handleThank = async () => {
  if (!rec || hasThanked) return;
  const recRef = doc(db, "recommendations", rec.id);
  const updatedThanks = { ...(rec.thanks || {}), [user.uid]: true };

  await setDoc(recRef, { ...rec, thanks: updatedThanks });

  setHasThanked(true);
  setThanksCount(Object.keys(updatedThanks).length);
};
const handleSave = async () => {
  if (!user || !rec || user.uid === rec.submittedByUid) return;

  try {
    await saveRecommendationForUser(user.uid, rec);
    toast.success("Saved to your list!");
  } catch (error) {
    console.error("Failed to save:", error);
    toast.error("Error saving recommendation.");
  }
};

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((err) =>
      console.error("Error signing in:", err)
    );
  };

  useEffect(() => {
    const checkGroupAccess = async () => {
      if (!user || !recId) return;

      const recRef = doc(db, "recommendations", recId);
      const recSnap = await getDoc(recRef);

      if (!recSnap.exists()) {
        setRec(null);
        return;
      }

      const recData = recSnap.data();
      setRec({ id: recSnap.id, ...recData });
      
      const thanks = recData.thanks || {};
setHasThanked(thanks[user.uid] === true);
setThanksCount(Object.keys(thanks).length);
// ✅ Check if already saved
if (user) {
  const savedRef = doc(db, "savedRecs", user.uid, "items", recSnap.id);
  const savedSnap = await getDoc(savedRef);
  setHasSaved(savedSnap.exists());
}

      const groupId = recData.groupId;
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
  };

  if (!userData.createdAt) {
    updatedUser.createdAt = new Date();
  }

  if (!userData.userNumber) {
    const usersSnap = await getDocs(collection(db, "users"));
    updatedUser.userNumber = usersSnap.size;
  }

  if (updatedUser.groupIds.length !== userData.groupIds?.length) {
    wasNewToGroup = true;
  }

  await setDoc(userRef, updatedUser);
  setHasGroupAccess(true);
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
          }
        );
      }

      const q = query(
        collection(db, "recommendations"),
        where("groupId", "==", groupId),
        where("serviceType", "==", recData.serviceType),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const recs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGroupRecs(recs.filter((r) => r.id !== recId));
      });

      return () => unsub();
    };

    checkGroupAccess();
  }, [user, recId]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6 text-center text-gray-600">Loading...</div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="p-6 text-center">
          <p className="text-lg">Please sign in to view this recommendation.</p>
          <button onClick={handleSignIn} className="btn-primary mt-4">
            Sign In
          </button>
        </div>
        <Footer />
        <Toaster position="top-center" />
      </>
    );
  }

  if (!rec) {
    return (
      <>
        <Header />
        <div className="p-6 text-center text-gray-600">
          Recommendation not found.
        </div>
        <Footer />
      </>
    );
  }

  if (!hasGroupAccess) {
    return (
      <>
        <Header />
        <div className="p-6 text-center text-gray-600">
          You're not a member of this group. Ask a neighbor for an invite.
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="p-6 max-w-2xl mx-auto bg-white shadow rounded">
        <h1 className="text-xl font-bold mb-2">{rec.name}</h1>
        <p className="mb-2">
          <strong>Category:</strong> {rec.serviceType}
        </p>
        <p className="mb-2 whitespace-pre-line">{rec.testimonial}</p>
        <p className="mb-4">
          <strong>Contact:</strong> {rec.contactInfo}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Shared by{" "}
          <Link
            to={`/users/${rec.submittedByUid}`}
            className="text-blue-600 underline"
          >
            {rec.submittedBy?.name || "unknown"}
          </Link>
        </p>
<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
  <div>
    <button
      onClick={handleThank}
      className={`px-4 py-2 rounded ${
        hasThanked ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 text-white"
      }`}
      disabled={hasThanked}
    >
      {hasThanked ? "Thanks sent!" : "Say Thanks"}
    </button>
    {thanksCount > 0 && (
      <span className="ml-2 text-sm text-gray-600">{thanksCount} thanked this</span>
    )}
  </div>

  {user.uid !== rec.submittedByUid && (
    <div className="mb-4">
  <button
    onClick={handleSave}
    className={`ml-2 px-4 py-2 rounded ${
      hasSaved ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 text-white"
    }`}
    disabled={hasSaved}
  >
    {hasSaved ? "Saved ✓" : "Save to My List"}
  </button>
</div>
  )}
</div>
        {groupRecs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">
              More in {rec.serviceType}
            </h2>
            <ul className="list-disc pl-6 text-sm">
              {groupRecs.map((r) => (
               <li key={r.id}>
  <Link to={`/recommendations/${r.id}`} className="underline">
    {r.name}: View full recommendation →
  </Link>
</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <Link to={`/${rec.groupId}`} className="text-blue-600 underline">
            ← Back to {rec.groupId} Group
          </Link>
        </div>
      </div>
      <Footer />
      <Toaster position="top-center" />
    </>
  );
};

export default StandaloneRecPage;