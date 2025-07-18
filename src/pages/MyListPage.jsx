import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StandaloneRecForm from "../components/StandaloneRecForm";
import { Toaster, toast } from "react-hot-toast";
import { Link } from "react-router-dom";

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Your Recommendations</h2>
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
                        <p className="mt-1">{rec.testimonial}</p>
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
          </div>
        </div>
      )}
      <Footer user={user} />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
};

export default MyListPage;