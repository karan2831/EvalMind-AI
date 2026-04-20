import NavBar from "@/app/components/NavBar";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] font-body">
      <NavBar />
      
      <main className="max-w-3xl mx-auto px-6 py-24 md:py-32">
        <div className="mb-12">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-gray-500 font-medium">Effective Date: April 21, 2026</p>
        </div>

        <div className="apple-card p-8 md:p-12 space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p className="mb-6">
              By using <strong>EvalMind AI</strong>, you agree to the following terms. Please read them carefully to understand your rights and responsibilities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">1. Use of Service</h2>
            <p>
              EvalMind AI is designed for educational and learning purposes. You agree to use the platform responsibly and for its intended purpose of academic evaluation and feedback.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">2. User Responsibilities</h2>
            <p>You must:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate information and inputs.</li>
              <li>Not upload harmful, offensive, or illegal content.</li>
              <li>Not attempt to exploit, break, or interfere with the system's security.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">3. AI Disclaimer</h2>
            <p>EvalMind AI provides automated feedback using Artificial Intelligence:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Results and scores may not always be 100% accurate.</li>
              <li>The service should be used as a learning aid, not as a final academic authority or official grading system.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">4. Account Access</h2>
            <p>
              You are responsible for all activity that occurs under your account accessed via Google login. Please ensure your login credentials remain secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">5. Service Availability</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Update or change features at any time.</li>
              <li>Modify or discontinue services temporarily or permanently.</li>
              <li>Improve system functionality without prior notice.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">6. Limitation of Liability</h2>
            <p>We are not responsible for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Any incorrect evaluations or scores provided by the AI.</li>
              <li>Loss of data, though we take measures to prevent it.</li>
              <li>Decisions or actions taken based on AI output.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">7. Contact</h2>
            <p>If you have any questions regarding these terms, please contact us at:</p>
            <a href="mailto:support@evalmind.ai" className="text-blue-600 font-semibold hover:underline">support@evalmind.ai</a>
          </section>
        </div>
      </main>
      
      {/* Decorative Background */}
      <div className="fixed top-0 left-0 w-[50vw] h-[50vw] bg-blue-50/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
    </div>
  );
}
