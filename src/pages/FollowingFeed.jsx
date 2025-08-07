import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

export default function FollowingFeed() {
  const [user] = useAuthState(auth);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchReferralCount = async () => {
  try {
    const referredSnap = await getDocs(
      query(collection(db, "users"), where("referredBy", "==", user.uid))
    );
    setReferralCount(referredSnap.size);
  } catch (err) {
    console.error("Failed to fetch referral count:", err);
  }
};

fetchReferralCount();

    const fetchFeed = async () => {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const following = userDoc.data().following || [];

    if (following.length === 0) {
      setFeedItems([]);
      setLoading(false);
      return;
    }

    // Fetch requests and recommendations from followed users
    const [requestsSnap, recsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "requests"),
          where("submittedByUid", "in", following)
        )
      ),
      getDocs(
        query(
          collection(db, "recommendations"),
          where("submittedByUid", "in", following)
        )
      ),
    ]);

    const combined = [
      ...requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: "request",
        createdAt: doc.data().createdAt || { toMillis: () => 0 },
      })),
      ...recsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: "recommendation",
        createdAt: doc.data().createdAt || { toMillis: () => 0 },
      })),
    ];

    combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    setFeedItems(combined);
  } catch (err) {
    console.error("Error loading following feed:", err);
  } finally {
    setLoading(false);
  }
};

    fetchFeed();
  }, [user]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Following Feed</h1>
<p className="text-gray-600 text-sm mb-2">
  See the latest recommendations and requests from people you follow.
</p>
{user && (
  <div className="mb-6 flex items-center gap-2">
  <p className="text-sm text-gray-600">
    You’ve referred {referralCount} new neighbor{referralCount === 1 ? "" : "s"}.
  </p>
  <button
    onClick={async () => {
      const url = `${window.location.origin}/users/${user.uid}?ref=${user.uid}`;
      const title = `Check out my trusted local recs on Neighboroonie`;

      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          toast.success("Thanks for sharing!");
        } catch (err) {
          console.log("Share cancelled or failed", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Copied link to clipboard!");
        } catch (err) {
          console.error("Clipboard failed", err);
          alert("Couldn't copy to clipboard, sorry.");
        }
      }
    }}
    className="text-xs bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded shadow whitespace-nowrap flex items-center"
  >
    <span className="inline-block rounded-full bg-white w-5 h-5 text-center leading-5 mr-1">
      🦩
    </span>
    Invite
  </button>
</div>
)}

          {loading ? (
            <p className="text-gray-500 italic">Loading...</p>
          ) : feedItems.length === 0 ? (
            <p className="text-gray-500 italic">
              Nothing here yet. Follow someone from their user profile.
            </p>
          ) : (
            feedItems.map((item) => {
              switch (item.type) {
                case "request":
                  return (
                    <div
                      key={`request-${item.id}`}
                      className="bg-white border p-4 mb-4 rounded"
                    >
                      <p className="text-sm text-gray-600">
                        🛠️{" "}
                        <Link
                          to={`/users/${item.submittedByUid}`}
                          className="text-blue-600 underline"
                        >
                          {item.submittedBy?.name || "A neighbor"}
                        </Link>{" "}
                        asked:
                      </p>
                      <p className="font-semibold mb-2">{item.text}</p>
                      <Link
                        to={`/request/${item.id}`}
                        className="text-blue-600 underline text-sm"
                      >
                        View Request →
                      </Link>
                    </div>
                  );

                case "recommendation":
                  return (
                    <div
                      key={`rec-${item.id}`}
                      className="bg-gray-50 border p-4 mb-4 rounded"
                    >
                      <p className="text-sm text-gray-600">
                        ✅{" "}
                        <Link
                          to={`/users/${item.submittedByUid}`}
                          className="text-blue-600 underline"
                        >
                          {item.submittedBy?.name || "A neighbor"}
                        </Link>{" "}
                        recommended:
                      </p>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500 mb-2">
                        for {item.serviceType}
                      </p>
                      <Link
                        to={`/recommendations/${item.id}`}
                        className="text-blue-600 underline text-sm"
                      >
                        View Recommendation →
                      </Link>
                    </div>
                  );

                default:
                  return null;
              }
            })
          )}
        </div>
      </div>
      <Footer user={user} />
    </>
  );
}