import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [emailOptOut, setEmailOptOut] = useState(false);
  const [replyEmailOptOut, setReplyEmailOptOut] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setEmailOptOut(data.emailOptOut || false);
        setReplyEmailOptOut(data.replyEmailOptOut || false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateSetting = async (field, value) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { [field]: value });
  };

  const handleToggleGroupEmails = async () => {
    const newValue = !emailOptOut;
    setEmailOptOut(newValue);
    await updateSetting("emailOptOut", newValue);
    toast.success(
      newValue
        ? "We’ll keep it quiet. You won’t get group emails for now."
        : "You’re back in the loop! We’ll send you group updates."
    );
  };

  const handleToggleReplyEmails = async () => {
    const newValue = !replyEmailOptOut;
    setReplyEmailOptOut(newValue);
    await updateSetting("replyEmailOptOut", newValue);
    toast.success(
      newValue
        ? "You’ll no longer get emails when your request gets a reply."
        : "You’ll be notified when someone replies to your request!"
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6 text-center text-gray-600">Loading settings...</div>
        <Footer user={user} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="p-6 text-center text-gray-600">
          Please sign in to view your settings.
        </div>
        <Footer user={null} />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto bg-white p-4 rounded shadow">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>

          <div className="mb-6 text-sm text-gray-600">
            <p>
              <strong>Name:</strong> {user.displayName}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
          </div>

          <div className="flex items-center justify-between border-b py-3">
            <span>Email me when someone posts to my group</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!emailOptOut}
                onChange={handleToggleGroupEmails}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between border-b py-3">
            <span>Email me when someone replies to my request</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!replyEmailOptOut}
                onChange={handleToggleReplyEmails}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all"></div>
            </label>
          </div>
        </div>
      </div>
      <Footer user={user} />
    </>
  );
}