// src/pages/[groupId].jsx

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from "firebase/auth";

const serviceTypes = [
  "Plumber",
  "Electrician",
  "Handyman",
  "Landscaping",
  "House Cleaner",
  "Painter",
  "Pest Control",
  "HVAC",
  "Childcare",
  "Pet Care",
  "Carpenter",
  "Tech Help",
  "Other"
];

const provider = new GoogleAuthProvider();

export default function GroupPage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [isMember, setIsMember] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    testimonial: "",
    contactInfo: ""
  });
  const [recommendations, setRecommendations] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsMember(false);
        return;
      }

      setUser(u);
      const memberRef = doc(db, `groups/${groupId}/members`, u.uid);
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        setIsMember(true);
      } else {
        const inviteToken = searchParams.get("invite");

        if (!inviteToken) {
          setIsMember(false);
          setError("Access denied. You need an invite to join this group.");
          return;
        }

        const inviteRef = doc(db, "invites", `${groupId}_${inviteToken}`);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setIsMember(false);
          setError("Invalid invite token.");
          return;
        }

        await setDoc(memberRef, {
          email: u.email,
          displayName: u.displayName,
          joinedAt: serverTimestamp()
        });

        setIsMember(true);
      }
    });

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (!isMember) return;

    const q = query(
      collection(db, "recommendations"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map((doc) => doc.data());
      setRecommendations(recs);
    });

    return () => unsubscribe();
  }, [groupId, isMember]);

  useEffect(() => {
    if (!isMember) return;

    async function fetchMembers() {
      const snap = await getDocs(collection(db, `groups/${groupId}/members`));
      setMembers(snap.docs.map((doc) => doc.data()));
    }

    fetchMembers();
  }, [groupId, isMember]);

  const handleSubmit = async () => {
    if (form.name && form.serviceType && form.testimonial && user) {
      try {
        await addDoc(collection(db, "recommendations"), {
          ...form,
          groupId,
          createdAt: serverTimestamp(),
          submittedBy: {
            name: user.displayName,
            email: user.email
          }
        });
        alert("Recommendation submitted!");
        setForm({ name: "", serviceType: "", testimonial: "", contactInfo: "" });
      } catch (e) {
        console.error("Error adding recommendation:", e);
        alert("Something went wrong.");
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login error", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  if (isMember === null) return <p>Loading...</p>;
  if (isMember === false) return (
    <div className="p-4 text-center">
      <p className="mb-4">{error || "Access denied."}</p>
      <button
        onClick={handleLogin}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Sign in with Google
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome to {groupId}</h1>
        {user && (
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Sign out
          </button>
        )}
      </div>

      <button
        onClick={() => setShowMembers(!showMembers)}
        className="text-blue-600 underline mb-4"
      >
        {showMembers ? "Hide" : "View"} Group Members
      </button>

      {showMembers && (
        <div className="mb-6 border p-3 rounded bg-white">
          <h2 className="font-semibold mb-2">Members:</h2>
          <ul className="list-disc list-inside">
            {members.map((m, i) => (
              <li key={i}>{m.displayName || m.email}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Submit a Recommendation</h2>
        <input
          className="w-full border p-2 mb-3"
          placeholder="Business or Person's Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="w-full border p-2 mb-3"
          value={form.serviceType}
          onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
        >
          <option value="">Select Service Type</option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <textarea
          className="w-full border p-2 mb-3"
          placeholder="Why do you recommend them?"
          value={form.testimonial}
          onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
        />
        <input
          className="w-full border p-2 mb-3"
          placeholder="Optional: Contact Info (Phone, Email)"
          value={form.contactInfo}
          onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-bold">{rec.name}</h3>
            <p className="text-sm text-gray-500 mb-1">{rec.serviceType}</p>
            <p className="mb-2">{rec.testimonial}</p>
            {rec.contactInfo && (
              <p className="text-sm text-gray-600 mb-1">
                Contact: {rec.contactInfo}
              </p>
            )}
            {rec.submittedBy && (
              <p className="text-xs text-gray-400">
                Submitted by: {rec.submittedBy.name} ({rec.submittedBy.email})
              </p>
            )}
            {rec.createdAt?.toDate && (
              <p className="text-xs text-gray-400">
                {rec.createdAt.toDate().toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


