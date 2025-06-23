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
          {user && (
            <>
              {" • "}
              <Link to="/settings" className="text-blue-500 hover:underline">
                Settings
              </Link>
            </>
          )}
        </p>

        {user && (
          <div className="mt-4">
            <p className="mb-1 font-semibold">Have feedback?</p>
            <textarea
              className="w-full border p-2 rounded mb-2 text-sm"
              placeholder="We're in testing mode. Let us know if you find a bug, want a feature or are interested in creating a new group."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button onClick={handleSubmit}>Submit Feedback</button>
          </div>
        )}
      </div>
    </footer>
  );
}
