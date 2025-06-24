import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

export default function PrivacyPage() {
  const [user] = useAuthState(auth);

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Privacy Policy</h1>
        <p className="mb-4">
          Neighboroonie values your privacy. We collect only the information needed
          to connect you with neighbors you trust and to help you manage your recommendations.
        </p>
        <p className="mb-4">
          We do not sell your data or show ads. You can delete your account or opt out
          of email communication at any time from your{" "}
          <a href="/settings" className="text-blue-500 underline">
            Settings
          </a>{" "}
          page.
        </p>
        <p className="mb-4">
          Questions? Send us a note using the feedback form below.
        </p>
      </main>
      <Footer user={user} />
    </>
  );
}