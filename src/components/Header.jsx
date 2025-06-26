import { Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function Header() {
  const [user] = useAuthState(auth);

  return (
    <header className="bg-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 relative">
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-black">
            neighboroonie{" "}
            <span className="text-xs font-normal text-gray-500">beta v0.1</span>
          </Link>
          <p className="text-gray-600 text-sm mt-1">
            A simple way to share and find trusted local recommendations.
          </p>
        </div>

        <div className="absolute right-4 top-4 text-sm space-x-2 flex items-center">
          {user ? (
            <>
              <Link
                to="/settings"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs"
                title="Settings"
              >
                ⚙️
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
  onClick={() => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.warn("Popup sign-in failed, falling back to redirect:", error);
      signInWithRedirect(auth, provider);
    });
  }}
  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs"
>
  Sign In
</button>
          )}
        </div>
      </div>
    </header>
  );
}