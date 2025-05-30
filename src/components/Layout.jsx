import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Layout({ children, user }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <Header />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {children}
      </main>
      <Footer user={user} />
    </div>
  );
}
