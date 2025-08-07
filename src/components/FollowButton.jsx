// src/components/FollowButton.jsx
import React, { useEffect, useState } from "react";
import { followUser, unfollowUser, isFollowing } from "../utils/follows";

const FollowButton = ({ currentUserId, targetUserId }) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!currentUserId || !targetUserId) return;
      const result = await isFollowing(currentUserId, targetUserId);
      setFollowing(result);
      setLoading(false);
    };
    check();
  }, [currentUserId, targetUserId]);

  const toggleFollow = async () => {
    if (!currentUserId || !targetUserId) return;
    if (following) {
      await unfollowUser(currentUserId, targetUserId);
    } else {
      await followUser(currentUserId, targetUserId);
    }
    setFollowing(!following);
  };

  if (loading || currentUserId === targetUserId) return null;

  return (
    <button
      onClick={toggleFollow}
      className={`text-sm px-3 py-1 rounded border ${
        following
          ? "bg-gray-200 text-gray-600 border-gray-300"
          : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;