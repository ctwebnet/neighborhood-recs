import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

export default function TermsPage() {
  const [user] = useAuthState(auth);

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Terms of Service</h1>
        <p className="mb-4">
          Neighboroonie is a platform for kind, helpful, and trusted recommendations.
          By using the site, you agree to engage respectfully with others.
        </p>
        <p className="mb-4">
          We reserve the right to remove content or users that violate this spirit.
          The site is offered as-is and may change over time as we continue testing and improving.
        </p>
        <p className="mb-4">
          Thanks for helping us build something useful and neighborly.
        </p>
      </main>
      <Footer user={user} />
    </>
  );
}