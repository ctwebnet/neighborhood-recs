// src/pages/[groupId].jsx

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { auth, db, provider } from "../firebase";
import {
  collection,
  doc,
  getDoc,
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
  signOut
} from "firebase/auth";

const serviceTypes = [
  "Plumber", "Electrician", "Handyman", "Landscaping", "House Cleaner",
  "Painter", "Pest Control", "HVAC", "Childcare", "Pet Care",
  "Carpenter", "Tech Help", "Other"
];

export default function GroupPage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [isMember, setIsMember] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", serviceType: "", testimonial: "", contactInfo: "", requestId: "" });
  const [requestText, setRequestText] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [openReplyId, setOpenReplyId] = useState(null);

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
    const recQuery = query(collection(db, "recommendations"), where("groupId", "==", groupId), orderBy("createdAt", "desc"));
    const unsubscribeRecs = onSnapshot(recQuery, (snapshot) => {
      setRecommendations(snapshot.docs.map((doc) => doc.data()));
    });

    const reqQuery = query(collection(db, "requests"), where("groupId", "==", groupId), orderBy("createdAt", "desc"));
    const unsubscribeReqs = onSnapshot(reqQuery, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeRecs();
      unsubscribeReqs();
    };
  }, [groupId, isMember]);

  const handleRequestSubmit = async () => {
    if (!requestText || !user) return;
    try {
      await addDoc(collection(db, "requests"), {
        requestText,
        groupId,
        createdAt: serverTimestamp(),
        submittedBy: {
          name: user.displayName,
          email: user.email
        }
      });
      setRequestText("");
    } catch (e) {
      console.error("Error submitting request:", e);
      alert("Something went wrong.");
    }
  };

  const handleSubmit = async () => {
    if (form.name && form.serviceType && form.testimonial && user) {
      let finalRequestId = form.requestId;
      if (!finalRequestId && requests.length > 0) {
        const lowerTestimonial = form.testimonial.toLowerCase();
        const lowerName = form.name.toLowerCase();
        const lowerService = form.serviceType.toLowerCase();
        const matched = requests.find((req) => {
          const txt = req.requestText.toLowerCase();
          return (
            lowerTestimonial.includes(txt) ||
            lowerName.includes(txt) ||
            lowerService.includes(txt) ||
            txt.includes(lowerService)
          );
        });
        if (matched) finalRequestId = matched.id;
      }

      try {
        await addDoc(collection(db, "recommendations"), {
          ...form,
          requestId: finalRequestId,
          groupId,
          createdAt: serverTimestamp(),
          submittedBy: {
            name: user.displayName,
            email: user.email
          }
        });
        alert("Recommendation submitted!");
        setForm({ name: "", serviceType: "", testimonial: "", contactInfo: "", requestId: "" });
      } catch (e) {
        console.error("Error adding recommendation:", e);
        alert("Something went wrong.");
      }
    }
  };

  const groupedRecs = requests.map((request) => {
    const requestText = request.requestText.toLowerCase();
    return {
      request,
      recs: recommendations.filter((rec) => {
        const serviceType = rec.serviceType?.toLowerCase() || "";
        const testimonial = rec.testimonial?.toLowerCase() || "";
        const name = rec.name?.toLowerCase() || "";
        return (
          rec.requestId === request.id ||
          testimonial.includes(requestText) ||
          name.includes(requestText) ||
          requestText.includes(serviceType) ||
          serviceType.includes(requestText)
        );
      })
    };
  });

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Ask for a Recommendation</h2>
        <input
          className="w-full border p-2 mb-3"
          placeholder="What are you looking for?"
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
        />
        <button
          onClick={handleRequestSubmit}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Submit Request
        </button>
      </div>

      <div className="space-y-6">
        {groupedRecs.map(({ request, recs }) => (
          <div key={request.id} className="bg-white p-4 rounded shadow">
            <div className="mb-2">
              <p className="font-semibold">🔍 {request.requestText}</p>
              <p className="text-xs text-gray-500">
                {request.submittedBy?.name || request.submittedBy?.email} – {request.createdAt?.toDate && request.createdAt.toDate().toLocaleString()}
              </p>
              <button
                className="mt-2 text-sm text-blue-600 hover:underline"
                onClick={() => setOpenReplyId(openReplyId === request.id ? null : request.id)}
              >
                {openReplyId === request.id ? "Cancel" : "Reply with a Recommendation"}
              </button>
            </div>

            {openReplyId === request.id && (
              <div className="bg-blue-50 p-3 rounded mb-3">
                <input
                  className="w-full border p-2 mb-2"
                  placeholder="Business or Person's Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, requestId: request.id })}
                />
                <select
                  className="w-full border p-2 mb-2"
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                >
                  <option value="">Select Service Type</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <textarea
                  className="w-full border p-2 mb-2"
                  placeholder="Why do you recommend them?"
                  value={form.testimonial}
                  onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
                />
                <input
                  className="w-full border p-2 mb-2"
                  placeholder="Optional: Contact Info (Phone, Email)"
                  value={form.contactInfo}
                  onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                />
                <button
                  onClick={handleSubmit}
                  className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Submit Recommendation
                </button>
              </div>
            )}

            {recs.length > 0 && (
              <div className="border-t mt-2 pt-2 space-y-3">
                {recs.map((rec, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded">
                    <h3 className="font-bold">{rec.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">{rec.serviceType}</p>
                    <p className="mb-1">{rec.testimonial}</p>
                    {rec.contactInfo && (
                      <p className="text-sm text-gray-600 mb-1">
                        Contact: {rec.contactInfo}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Submitted by: {rec.submittedBy?.name} ({rec.submittedBy?.email})
                    </p>
                    {rec.createdAt?.toDate && (
                      <p className="text-xs text-gray-400">
                        {rec.createdAt.toDate().toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}





