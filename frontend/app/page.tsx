import Link from "next/link";

const FEATURES = [
  {
    icon: "🔀",
    title: "Smart Matchmaking",
    desc: "Our algorithm scores compatibility between your skills and each lab's needs — no generic job boards.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Onboarding",
    desc: "Upload your resume or paste your bio. ThinkR extracts your skills and interests automatically.",
  },
  {
    icon: "👆",
    title: "Swipe to Connect",
    desc: "Browse research opportunities with a Tinder-style interface. Right swipe when something sparks.",
  },
  {
    icon: "🔒",
    title: "Anonymous Browsing",
    desc: "Explore labs without revealing your identity. Only unlock contact details on a mutual match.",
  },
  {
    icon: "💬",
    title: "In-App Messaging",
    desc: "Chat directly with professors once you've matched — no cold emails required.",
  },
  {
    icon: "📊",
    title: "Match Dashboard",
    desc: "Track your matches, profile completeness, and conversation history all in one place.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-brand-900">ThinkR</span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary py-2 px-4">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary py-2 px-4">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center bg-gradient-to-b from-white to-slate-50">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 mb-6">
          ✦ Academic Research Matchmaking
        </div>
        <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight text-brand-900 sm:text-6xl leading-tight">
          Find your research match.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-500 leading-relaxed">
          ThinkR connects motivated students with professors who need talented collaborators —
          using AI-powered profiles and a swipe-based interface designed for academia.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup?role=student"
            className="btn-primary text-base px-8 py-3.5"
          >
            I&apos;m a Student →
          </Link>
          <Link
            href="/signup?role=researcher"
            className="btn-secondary text-base px-8 py-3.5"
          >
            I&apos;m a Professor / Researcher
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          No account needed to browse. Create a profile to express interest.
        </p>
      </section>

      {/* Features */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-brand-900 mb-12">
            Everything you need, nothing you don&apos;t
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:shadow-card-hover transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-brand-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-900 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to find your research home?
        </h2>
        <p className="text-brand-200 mb-8 max-w-md mx-auto">
          Join ThinkR and stop spending hours writing cold emails that go unanswered.
        </p>
        <Link href="/signup" className="btn-primary bg-white text-brand-900 hover:bg-slate-100">
          Create your free profile →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-6 px-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ThinkR — Academic Research Matchmaking Platform
      </footer>
    </div>
  );
}
