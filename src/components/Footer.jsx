import { useState } from "react";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db } from "../firebase";

export default function Footer({ user }) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    try {
      await addDoc(collection(db, "feedback"), {
        message: feedback,
        email: user.email,
        createdAt: serverTimestamp(),
      });
      toast.success("Feedback submitted!");
      setFeedback("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback.");
    }
  };

  return (
    <footer className="bg-white mt-8 border-t py-6 px-4 text-sm text-gray-600">
      <div className="max-w-3xl mx-auto text-center">
        <p className="mb-2">
          Made with 🦩 by <a href="/" className="text-blue-500 hover:underline">Neighboroonie</a>
        </p>

        <div className="flex justify-center gap-4 mb-4 text-gray-600">
          <Link to="/privacy" className="hover:text-blue-600 hover:underline transition">Privacy</Link>
          <Link to="/terms" className="hover:text-blue-600 hover:underline transition">Terms</Link>
          <Link to="/settings" className="hover:text-blue-600 hover:underline transition">Settings</Link>
        </div>

        {user && (
          <div className="mt-4">
            <p className="mb-1 font-semibold">Have feedback?</p>
            <textarea
              className="w-full border p-2 rounded mb-2 text-sm"
              placeholder="We're in testing mode. Let us know if you find a bug, want a feature, or are interested in creating a new group."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Submit Feedback
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
