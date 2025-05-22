import Header from "../components/Header";
import Footer from "../components/Footer";
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
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { db, auth } from "../firebase";
import StandaloneRecForm from "../components/StandaloneRecForm";

export default function GroupPage() {
  const { groupId } = useParams();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newRequest, setNewRequest] = useState("");
  const [newRequestServiceType, setNewRequestServiceType] = useState("");
  const [newRequestCustomServiceType, setNewRequestCustomServiceType] = useState("");
  const [newReplies, setNewReplies] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
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

    const unsubReq = onSnapshot(reqQuery, (snapshot) =>
      setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    const unsubRec = onSnapshot(recQuery, (snapshot) =>
      setRecommendations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );

    return () => {
      unsubReq();
      unsubRec();
    };
  }, [user, groupId]);

  const serviceTypeOptions = Array.from(
    new Set(recommendations.map((r) => r.serviceType).filter(Boolean))
  ).sort();

  const handleRequestSubmit = async () => {
    const finalServiceType =
      newRequestServiceType === "__custom"
        ? newRequestCustomServiceType.trim()
        : newRequestServiceType;

    if (!newRequest.trim() || !finalServiceType) {
      alert("Please enter a request and select a service type.");
      return;
    }

    await addDoc(collection(db, "requests"), {
      text: newRequest.trim(),
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
    setNewRequestCustomServiceType("");
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

  const getMatchingRecs = (req) => {
    const reqType = req.serviceType?.toLowerCase()?.trim();
    return recommendations.filter(
      (rec) =>
        rec.linkedRequestId !== req.id &&
        rec.serviceType?.toLowerCase()?.trim() === reqType
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Welcome to {groupId}</h1>
            {user ? (
              <button
                onClick={() => signOut(auth)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Sign in with Google
              </button>
            )}
          </div>

          {user ? (
            <>
              <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-2">Submit a General Recommendation</h2>
                <StandaloneRecForm groupId={groupId} user={user} serviceTypeOptions={serviceTypeOptions} />
              </div>

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
                  {serviceTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="__custom">Other (enter manually)</option>
                </select>
                {newRequestServiceType === "__custom" && (
                  <input
                    className="w-full border p-2 mb-2"
                    placeholder="Custom service type"
                    value={newRequestCustomServiceType}
                    onChange={(e) => setNewRequestCustomServiceType(e.target.value)}
                  />
                )}
                <button
                  onClick={handleRequestSubmit}
                  className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                >
                  Submit Request
                </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Requests</h2>
                {requests.length === 0 ? (
                  <p className="text-gray-500 italic">No requests yet.</p>
                ) : (
                  requests.map((req) => {
                    const directRecs = recommendations.filter(
                      (rec) => rec.linkedRequestId === req.id
                    );
                    const matchedRecs = getMatchingRecs(req);

                    return (
                      <div key={req.id} className="bg-white p-4 rounded shadow mb-6">
                        <p className="font-medium">{req.text}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Service type: {req.serviceType}
                        </p>
                        <p className="text-sm text-gray-500">
                          Submitted by {req.submittedBy?.name || "unknown"}
                        </p>

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

                        <div className="mt-4">
                          <h4 className="font-medium mb-1">Add a Recommendation</h4>
                          <input
                            className="w-full border p-2 mb-2"
                            placeholder="Name"
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
                            className="w-full border p-2 mb-2"
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
                            {serviceTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            <option value="__custom">Other (enter manually)</option>
                          </select>
                          {newReplies[req.id]?.serviceType === "__custom" && (
                            <input
                              className="w-full border p-2 mb-2"
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
                            className="w-full border p-2 mb-2"
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
                            className="w-full border p-2 mb-2"
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
                          <button
                            onClick={() => handleRecommendationSubmit(req.id)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                          >
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
        </div>
      </div>
      <Footer user={user} />
    </>
  );
}



