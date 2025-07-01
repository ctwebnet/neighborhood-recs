import Header from "../components/Header";
import Footer from "../components/Footer";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithRedirect,
} from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

export default function LandingPage() {
  const [user] = useAuthState(auth);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.warn("Popup sign-in failed, falling back to redirect:", error);
      signInWithRedirect(auth, provider);
    });
  };

  const handleSubmit = async () => {
    if (!location.trim()) {
      toast.error("Please enter a location.");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "groupRequests"), {
        location: location.trim(),
        notes: notes.trim(),
        submittedBy: {
          name: user.displayName,
          email: user.email,
        },
        submittedByUid: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Thanks! We'll be in touch soon.");
      setLocation("");
      setNotes("");
    } catch (err) {
      console.error("Error submitting group request:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 py-10 px-4 text-center">
  <img
    src="/android-chrome-512x512.png"
    alt="Neighboroonie logo"
    className="mx-auto mb-6 w-24 h-24"
  />
  <h1 className="text-4xl font-bold mb-4">
    Welcome to neighboroonie
  </h1>
  <p className="text-gray-600 mb-6 max-w-xl mx-auto">
    Neighboroonie is new. A few communities are already using it, and we’re looking for a handful more to help guide what comes next.
  </p>

        {user ? (
          <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Start a Neighboroonie Group
            </h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              Let us know where you'd like to start a group. We'll notify you as soon as it's ready!
            </p>
            <input
              className="w-full border p-2 mb-3"
              placeholder="Neighborhood, town, or zip code"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <textarea
              className="w-full border p-2 mb-3"
              placeholder="Anything else you'd like us to know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Submitting..." : "Request a Group"}
            </button>
          </div>
        ) : (
          <div className="text-center mt-6">
            <p className="text-gray-600 mb-2">
              Sign in to request a Neighboroonie group
            </p>
            <button onClick={handleSignIn} className="btn-primary">
              Sign in with Google
            </button>
          </div>
        )}
      </div>
      <Footer user={user} />
    </>
  );
}