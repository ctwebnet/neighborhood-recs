// src/components/InviteCreator.jsx

import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function InviteCreator() {
  const [groupId, setGroupId] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState(null);

  const handleCreate = async () => {
    if (!groupId || !token) return;

    try {
      const docId = `${groupId}_${token}`;
      await setDoc(doc(db, "invites", docId), {
        groupId,
        token,
        createdAt: serverTimestamp(),
        createdBy: "admin@neighborinos.com"
      });

      setMessage(
        `Invite created! Share this link: /${groupId}?invite=${token}`
      );
    } catch (err) {
      console.error("Error creating invite:", err);
      setMessage("Error creating invite.");
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-6">
      <h2 className="text-lg font-semibold mb-2">Create Group Invite</h2>
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Group ID (e.g. westville)"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      />
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Invite Token (e.g. abc123)"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <button
        onClick={handleCreate}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Create Invite
      </button>
      {message && <p className="text-sm text-gray-700 mt-2">{message}</p>}
    </div>
  );
}
