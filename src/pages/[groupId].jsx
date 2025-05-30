import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import StandaloneRecForm from "../components/StandaloneRecForm";

export default function GroupPage() {
  const { groupId } = useParams();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newRequest, setNewRequest] = useState("");
  const [newRequestServiceType, setNewRequestServiceType] = useState("");
  const [customRequestServiceType, setCustomRequestServiceType] = useState("");
  const [newReplies, setNewReplies] = useState({});
  const [serviceTypes, setServiceTypes] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchServiceTypes = async () => {
      const snapshot = await getDocs(collection(db, "serviceTypes"));
      const types = snapshot.docs
        .map((doc) => doc.id?.trim())
        .filter((id) => typeof id === "string" && id.length > 0)
        .sort();
      setServiceTypes(types);
    };
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (!user) return;

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

    const unsubReq = onSnapshot(reqQuery, (snapshot) => {
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRec = onSnapshot(recQuery, (snapshot) => {
      setRecommendations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubReq();
      unsubRec();
    };
  }, [user, groupId]);

  const handleRequestSubmit = async () => {
    const finalServiceType =
      newRequestServiceType === "__custom"
        ? customRequestServiceType.trim()
        : newRequestServiceType;

    if (!newRequest.trim() || !finalServiceType) {
      alert("Please provide both a request and a service type.");
      return;
    }

    if (newRequestServiceType === "__custom" && finalServiceType) {
      await setDoc(doc(db, "serviceTypes", finalServiceType), {});
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
    setCustomRequestServiceType("");
  };

  const handleRecommendationSubmit = async (requestId) => {
    const reply = newReplies[requestId];
    const finalServiceType =
      reply?.serviceType === "__custom"
        ? reply?.customServiceType?.trim()
        : reply?.serviceType?.trim();

    if (
      !reply?.testimonial?.trim() ||
      !reply?.name?.trim() ||
      !finalServiceType ||
      !reply?.contactInfo?.trim()
    ) {
      alert("Please fill out all fields, including a service type.");
      return;
    }

    await addDoc(collection(db, "recommendations"), {
      ...reply,
      serviceType: finalServiceType,
      groupId,
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

  return (
    <Layout user={user}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Welcome to {groupId}</h1>
        {user ? (
          <button onClick={() => signOut(auth)}>
            Sign out
          </button>
        ) : (
          <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>
            Sign in with Google
          </button>
        )}
      </div>

      {user ? (
        <>
          {/* General Recommendation Form */}
          <div className="bg-white border border-gray-200 rounded p-4 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Submit a General Recommendation</h2>
            <StandaloneRecForm groupId={groupId} user={user} />
          </div>

          {/* Ask for a Recommendation */}
          <div className="bg-white border border-gray-200 rounded p-4 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Ask for a Recommendation</h2>
            <input
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              placeholder="What are you looking for?"
              value={newRequest}
              onChange={(e) => setNewRequest(e.target.value)}
            />
            <select
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              value={newRequestServiceType}
              onChange={(e) => setNewRequestServiceType(e.target.value)}
            >
              <option value="">Select a service type</option>
              {serviceTypes.map((type, index) => (
                <option key={`${type}-${index}`} value={type}>
                  {type}
                </option>
              ))}
              <option value="__custom">Other (enter manually)</option>
            </select>
            {newRequestServiceType === "__custom" && (
              <input
                className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                placeholder="Custom service type"
                value={customRequestServiceType}
                onChange={(e) => setCustomRequestServiceType(e.target.value)}
              />
            )}
            <button onClick={handleRequestSubmit}>
              Submit Request
            </button>
          </div>

          {/* Requests List */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Requests</h2>
            {requests.length === 0 ? (
              <p className="text-gray-500 italic">No requests yet.</p>
            ) : (
              requests.map((req) => {
                const directRecs = recommendations.filter(
                  (rec) => rec.linkedRequestId === req.id
                );
                const matchedRecs = recommendations.filter(
                  (rec) =>
                    rec.linkedRequestId !== req.id &&
                    rec.serviceType?.toLowerCase().trim() ===
                      req.serviceType?.toLowerCase().trim()
                );

                return (
                  <div key={req.id} className="bg-white border border-gray-200 rounded p-4 mb-6 shadow-sm">
                    <p className="font-medium">{req.text}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {req.serviceType && <>({req.serviceType}) </>}
                      Submitted by {req.submittedBy?.name || "unknown"}
                    </p>

                    {/* Direct replies */}
                    {directRecs.length > 0 && (
                      <>
                        <h4 className="mt-4 font-semibold">Replies</h4>
                        {directRecs.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-gray-200 rounded p-2 bg-gray-50 mt-2"
                          >
                            <p className="font-semibold">{rec.name}</p>
                            <p className="text-sm text-gray-500">{rec.serviceType}</p>
                            <p>{rec.testimonial}</p>
                            <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              – {rec.submittedBy?.name}
                            </p>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Matched recommendations */}
                    {matchedRecs.length > 0 && (
                      <>
                        <h4 className="mt-4 font-semibold text-gray-700">
                          Other recommendations that might help
                        </h4>
                        {matchedRecs.map((rec) => (
                          <div
                            key={rec.id}
                            className="border border-dashed border-gray-300 rounded p-2 bg-gray-50 mt-2"
                          >
                            <p className="font-semibold">{rec.name}</p>
                            <p className="text-sm text-gray-500">{rec.serviceType}</p>
                            <p>{rec.testimonial}</p>
                            <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              – {rec.submittedBy?.name}
                            </p>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Add a Recommendation */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-1">Add a Recommendation</h4>
                      <input
                        className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                        placeholder="Who are you recommending?"
                        value={newReplies[req.id]?.name || ""}
                        onChange={(e) =>
                          setNewReplies((prev) => ({
                            ...prev,
                            [req.id]: {
                              ...prev[req.id],
                              name: e.target.value,
                            },
                          }))
                        }
                      />
                      <select
                        className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                        value={newReplies[req.id]?.serviceType || ""}
                        onChange={(e) =>
                          setNewReplies((prev) => ({
                            ...prev,
                            [req.id]: {
                              ...prev[req.id],
                              serviceType: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">Select a service type</option>
                        {serviceTypes.map((type, index) => (
                          <option key={`${type}-${index}`} value={type}>
                            {type}
                          </option>
                        ))}
                        <option value="__custom">Other (enter manually)</option>
                      </select>
                      {newReplies[req.id]?.serviceType === "__custom" && (
                        <input
                          className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                          placeholder="Custom service type"
                          value={newReplies[req.id]?.customServiceType || ""}
                          onChange={(e) =>
                            setNewReplies((prev) => ({
                              ...prev,
                              [req.id]: {
                                ...prev[req.id],
                                customServiceType: e.target.value,
                                serviceType: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                      <textarea
                        className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                        placeholder="Why do you recommend them?"
                        value={newReplies[req.id]?.testimonial || ""}
                        onChange={(e) =>
                          setNewReplies((prev) => ({
                            ...prev,
                            [req.id]: {
                              ...prev[req.id],
                              testimonial: e.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
                        placeholder="Contact Info"
                        value={newReplies[req.id]?.contactInfo || ""}
                        onChange={(e) =>
                          setNewReplies((prev) => ({
                            ...prev,
                            [req.id]: {
                              ...prev[req.id],
                              contactInfo: e.target.value,
                            },
                          }))
                        }
                      />
                      <button onClick={() => handleRecommendationSubmit(req.id)}>
                        Submit Recommendation
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-600 italic">
          Please sign in to ask for or view recommendations.
        </p>
      )}
    </Layout>
  );
}

