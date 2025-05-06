import { useState, useEffect } from "react";
import { db, auth, provider } from "./firebase";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const serviceTypes = [
  "Plumber",
  "Electrician",
  "House Cleaner",
  "Landscaping",
  "Carpenter",
  "Childcare",
  "Other"
];

export default function App() {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    testimonial: "",
    contactInfo: ""
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const unsubscribeData = onSnapshot(
      collection(db, "recommendations"),
      (snapshot) => {
        setRecommendations(snapshot.docs.map((doc) => doc.data()));
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeData();
    };
  }, []);

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
    if (form.name && form.serviceType && form.testimonial && user) {
      try {
        await addDoc(collection(db, "recommendations"), {
          ...form,
          submittedBy: {
            name: user.displayName,
            email: user.email
          }
        });
        alert("Recommendation submitted!");
        setForm({ name: "", serviceType: "", testimonial: "", contactInfo: "" });
      } catch (e) {
        console.error("Error adding document: ", e);
        alert("Something went wrong!");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Neighborhood Recommendations</h1>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Hi, {user.displayName}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign in with Google
            </button>
          )}
        </div>

        {user ? (
          <div className="bg-white p-4 rounded-lg shadow mb-8">
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
        ) : (
          <p className="text-gray-600 mb-8">Sign in to submit a recommendation.</p>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">Community Recommendations</h2>
          {recommendations.length === 0 && <p>No recommendations yet!</p>}
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow mb-4">
              <h3 className="text-lg font-bold">{rec.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{rec.serviceType}</p>
              <p className="mb-2">{rec.testimonial}</p>
              {rec.contactInfo && (
                <p className="text-sm text-gray-600">Contact: {rec.contactInfo}</p>
              )}
              {rec.submittedBy && (
                <p className="text-xs text-gray-400">
                  Submitted by: {rec.submittedBy.name} ({rec.submittedBy.email})
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
