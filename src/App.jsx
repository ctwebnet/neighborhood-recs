import { useState, useEffect } from "react";
import { db, auth, provider } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
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

export default function App() {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    testimonial: "",
    contactInfo: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "recommendations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map((doc) => doc.data());
      setRecommendations(recs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleSubmit = async () => {
    if (form.name && form.serviceType && form.testimonial) {
      try {
        await addDoc(collection(db, "recommendations"), {
          ...form,
          createdAt: serverTimestamp(),
          submittedBy: {
            name: user.displayName,
            email: user.email
          }
        });
        alert("Recommendation submitted!");
        setForm({
          name: "",
          serviceType: "",
          testimonial: "",
          contactInfo: ""
        });
      } catch (e) {
        console.error("Error adding document: ", e);
        alert("Something went wrong!");
      }
    }
  };

  const filteredRecs = recommendations.filter(
    (rec) =>
      rec.name?.toLowerCase().includes(search.toLowerCase()) ||
      rec.testimonial?.toLowerCase().includes(search.toLowerCase()) ||
      rec.serviceType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold">Neighborhood Recommendations</h1>
          {user && (
            <button
              onClick={handleLogout}
              className="border border-black text-black px-4 py-2 rounded hover:bg-black hover:text-white transition"
            >
              Sign out
            </button>
          )}
        </div>

        {user && (
          <div className="bg-white border border-gray-200 rounded p-4 mb-8 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Submit a Recommendation</h2>
            <input
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              placeholder="Who are you recommending?"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              value={form.serviceType}
              onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
            >
              <option value="">Select Service Type</option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <textarea
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              placeholder="What did they do for you, and how was the experience?"
              value={form.testimonial}
              onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
            />
            <input
              className="w-full border-b border-gray-400 py-2 px-1 mb-3 focus:outline-none focus:border-black transition"
              placeholder="Phone, email, website, or other way to reach them"
              value={form.contactInfo}
              onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            />
            <button
              onClick={handleSubmit}
              className="border border-black text-black px-4 py-2 rounded hover:bg-black hover:text-white transition w-full"
            >
              Submit
            </button>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">Community Recommendations</h2>

          {!user && (
            <div className="mb-6">
              <p className="text-gray-600 mb-2">Sign in to submit or view recs.</p>
              <button
                onClick={handleLogin}
                className="border border-black text-black px-4 py-2 rounded hover:bg-black hover:text-white transition"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {user && (
            <>
              <input
                type="text"
                className="w-full border-b border-gray-400 py-2 px-1 mb-4 focus:outline-none focus:border-black transition"
                placeholder="Search by name, category, or testimonial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {filteredRecs.length === 0 ? (
                <p>No recommendations yet!</p>
              ) : (
                filteredRecs.map((rec, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded p-4 mb-4 shadow-sm">
                    <h3 className="text-lg font-semibold">{rec.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">{rec.serviceType}</p>
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
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

