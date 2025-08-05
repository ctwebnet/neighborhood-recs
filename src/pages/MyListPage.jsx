import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  addDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StandaloneRecForm from "../components/StandaloneRecForm";
import SavedList from "../components/SavedList";
import { Toaster, toast } from "react-hot-toast";

const MyListPage = () => {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [allServiceTypes, setAllServiceTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [addingCategory, setAddingCategory] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewSaved, setViewSaved] = useState(false);
  const [savedRecs, setSavedRecs] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const groupIds = userDoc.data().groupIds || [];
          setUserGroups(groupIds);
          setSelectedGroupId(groupIds[0] || "");
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const recsQuery = query(
      collection(db, "recommendations"),
      where("submittedByUid", "==", user.uid)
    );
    return onSnapshot(recsQuery, (snapshot) => {
      const recs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRecommendations(recs);
    });
  }, [user]);

  useEffect(() => {
  if (!user) return;

  const savedRef = collection(db, "savedRecs", user.uid, "items");

  return onSnapshot(savedRef, async (snapshot) => {
    const savedDocs = snapshot.docs.map((doc) => doc.data());

    const recPromises = savedDocs.map(async (entry) => {
      const recSnap = await getDoc(doc(db, "recommendations", entry.recId));
      return recSnap.exists() ? { id: recSnap.id, ...recSnap.data() } : null;
    });

    const recs = (await Promise.all(recPromises)).filter(Boolean);
    setSavedRecs(recs);
  });
}, [user]);

  useEffect(() => {
    const fetchServiceTypes = async () => {
      const snapshot = await getDocs(collection(db, "serviceTypes"));
      setAllServiceTypes(snapshot.docs.map((doc) => doc.id));
    };
    fetchServiceTypes();
  }, []);

  const startEditing = (rec) => {
    setEditingId(rec.id);
    setAddingCategory(null);
    setEditedData({
      name: rec.name,
      testimonial: rec.testimonial,
      contactInfo: rec.contactInfo,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedData({});
  };

  const saveChanges = async (id) => {
    const docRef = doc(db, "recommendations", id);
    await updateDoc(docRef, editedData);
    toast.success("Recommendation updated");
    cancelEditing();
  };

  const duplicateRecommendation = async (rec, targetGroupId, linkedRequestId = null) => {
    const { name, testimonial, contactInfo, serviceType, submittedByUid } = rec;

    const q = query(
      collection(db, "recommendations"),
      where("submittedByUid", "==", submittedByUid),
      where("groupId", "==", targetGroupId),
      where("serviceType", "==", serviceType)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      toast.error("You've already added this category to that group.");
      return;
    }

    const newRec = {
      name,
      testimonial,
      contactInfo,
      serviceType,
      groupId: targetGroupId,
      submittedByUid,
      submittedBy: {
        name: user.displayName || "Anonymous",
        email: user.email || "",
      },
      createdAt: new Date(),
      ...(linkedRequestId && { linkedRequestId }),
    };

    try {
      await addDoc(collection(db, "recommendations"), newRec);
      toast.success("Duplicated to selected group!");
    } catch (error) {
      console.error("Error duplicating recommendation:", error);
      toast.error("Failed to duplicate.");
    }
  };

  const filledTypes = recommendations.map((r) => r.serviceType);
  const totalFilled = new Set(filledTypes).size;

  const filteredServiceTypes = allServiceTypes.filter((type) =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filledCategories = filteredServiceTypes.filter((type) => filledTypes.includes(type));
  const unfilledCategories = filteredServiceTypes.filter((type) => !filledTypes.includes(type));

  return (
    <>
      <Header />
      {loading ? (
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      ) : !user ? (
        <div className="min-h-screen bg-gray-100 p-6 text-center">
          <p className="text-lg text-gray-600">
            Please sign in to view your recommendations.
          </p>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-100 p-6">
          <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
  <h2 className="text-2xl font-bold">My List</h2>
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <div className="flex gap-2">
      <button
        onClick={() => setViewSaved(false)}
        className={`px-4 py-2 rounded text-sm ${
          !viewSaved ? "bg-black text-white" : "bg-gray-200"
        }`}
      >
        My Recommendations
      </button>
      <button
        onClick={() => setViewSaved(true)}
        className={`px-4 py-2 rounded text-sm ${
          viewSaved ? "bg-black text-white" : "bg-gray-200"
        }`}
      >
        Saved Recommendations
      </button>
    </div>
    <button
      onClick={() => {
        const shareUrl = `${window.location.origin}/users/${user.uid}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }}
      className="bg-green-600 text-white px-4 py-2 rounded text-sm"
    >
      Share Your List
    </button>
  </div>
</div>

            {viewSaved ? (
              <SavedList savedRecs={savedRecs} />
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  You've submitted {recommendations.length} recommendations in {totalFilled} of {allServiceTypes.length} categories.
                </p>

                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border p-2 mb-6 rounded"
                />

                {filledCategories.map((type) => {
                  const recsInType = recommendations.filter((r) => r.serviceType === type);
                  return (
                    <div key={type} className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{type}</h3>
                      </div>

                      {recsInType.map((rec) => (
                        editingId === rec.id ? (
                          <div key={rec.id}>
                            <input
                              className="w-full border p-1 mb-2"
                              value={editedData.name}
                              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            />
                            <textarea
                              className="w-full border p-1 mb-2"
                              value={editedData.testimonial}
                              onChange={(e) => setEditedData({ ...editedData, testimonial: e.target.value })}
                            />
                            <input
                              className="w-full border p-1 mb-2"
                              value={editedData.contactInfo}
                              onChange={(e) => setEditedData({ ...editedData, contactInfo: e.target.value })}
                            />
                            <div className="flex gap-2">
                              <button className="bg-black text-white px-4 py-2 rounded text-sm" onClick={() => saveChanges(rec.id)}>
                                Save
                              </button>
                              <button className="btn-secondary" onClick={cancelEditing}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={rec.id} className="mb-4">
                            <p className="font-semibold">{rec.name}</p>
                            <p className="text-sm text-gray-500">{rec.contactInfo}</p>
                            <p className="mt-1">
                              {rec.testimonial.length > 250 ? (
                                <>
                                  {rec.testimonial.slice(0, 125)}...
                                  <a
                                    href={`/recommendations/${rec.id}`}
                                    className="text-blue-600 underline ml-1"
                                  >
                                    View full
                                  </a>
                                </>
                              ) : (
                                rec.testimonial
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Group: {rec.groupId}</p>
                            <div className="flex gap-2 mt-2">
                              <button className="bg-black text-white px-3 py-1 text-sm rounded" onClick={() => startEditing(rec)}>
                                Edit
                              </button>
                              <button
                                className="bg-green-600 text-white px-3 py-1 text-sm rounded"
                                onClick={() => {
                                  const url = `${window.location.origin}/recommendations/${rec.id}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("Link to this recommendation copied!");
                                }}
                              >
                                Share
                              </button>
                            </div>

                            {userGroups.length > 1 && (
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Duplicate to another group
                                </label>
                                <select
                                  className="border rounded px-3 py-2 text-sm w-full"
                                  onChange={(e) => {
                                    const targetGroup = e.target.value;
                                    if (targetGroup !== rec.groupId) {
                                      duplicateRecommendation(rec, targetGroup);
                                    }
                                    e.target.selectedIndex = 0;
                                  }}
                                >
                                  <option value="">Select group...</option>
                                  {userGroups
                                    .filter((gid) => gid !== rec.groupId)
                                    .map((gid) => (
                                      <option key={gid} value={gid}>
                                        {gid}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  );
                })}

                {unfilledCategories.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold mb-4">Categories you haven’t filled out yet</h3>
                    {unfilledCategories.map((type) => (
                      <div key={type} className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{type}</h3>
                          <button
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                            onClick={() => {
                              setAddingCategory(type);
                              setEditingId(null);
                              setAddingNewCategory(false);
                            }}
                          >
                            + Add
                          </button>
                        </div>

                        {addingCategory === type && (
                          <>
                            {userGroups.length > 1 && (
                              <div className="mb-4">
                                <label htmlFor="group-select" className="block text-sm font-medium text-gray-700 mb-1">
                                  Select group
                                </label>
                                <select
                                  id="group-select"
                                  value={selectedGroupId}
                                  onChange={(e) => setSelectedGroupId(e.target.value)}
                                  className="w-full border p-2 rounded"
                                >
                                  {userGroups.map((groupId) => (
                                    <option key={groupId} value={groupId}>
                                      {groupId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <StandaloneRecForm
                              groupId={selectedGroupId || userGroups[0]}
                              user={user}
                              defaultServiceType={type}
                              serviceTypeOptions={allServiceTypes}
                              onDone={() => setAddingCategory(null)}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">New Category</h3>
                    {!addingNewCategory && (
                      <button
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                        onClick={() => {
                          setAddingCategory(null);
                          setEditingId(null);
                          setAddingNewCategory(true);
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {addingNewCategory && (
                    <>
                      {userGroups.length > 1 && (
                        <div className="mb-4">
                          <label htmlFor="group-select-new" className="block text-sm font-medium text-gray-700 mb-1">
                            Select group
                          </label>
                          <select
                            id="group-select-new"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full border p-2 rounded"
                          >
                            {userGroups.map((groupId) => (
                              <option key={groupId} value={groupId}>
                                {groupId}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <StandaloneRecForm
                        groupId={selectedGroupId || userGroups[0]}
                        user={user}
                        serviceTypeOptions={allServiceTypes}
                        allowCustomServiceType={true}
                        onDone={() => setAddingNewCategory(false)}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default MyListPage;