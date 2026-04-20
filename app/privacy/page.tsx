import NavBar from "@/app/components/NavBar";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] font-body">
      <NavBar />
      
      <main className="max-w-3xl mx-auto px-6 py-24 md:py-32">
        <div className="mb-12">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-4">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-gray-500 font-medium">Effective Date: April 21, 2026</p>
        </div>

        <div className="apple-card p-8 md:p-12 space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p className="mb-6">
              Welcome to <strong>EvalMind AI</strong>. We are committed to protecting your privacy and ensuring a safe learning experience. This policy explains how we collect, use, and safeguard your data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">1. Information We Collect</h2>
            <p>We only collect data necessary to provide our services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Information:</strong> When you log in using Google, we receive your email and basic profile details via Supabase.
              </li>
              <li>
                <strong>Submission Data:</strong> Answers you type or PDF files you upload are processed to generate feedback and scores.
              </li>
              <li>
                <strong>Usage Data:</strong> Basic anonymous data (e.g., feature usage) to improve performance and user experience.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">2. How We Use Your Data</h2>
            <p>Your data is used to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Generate AI-based evaluation and feedback</li>
              <li>Maintain your evaluation history</li>
              <li>Improve system accuracy and performance</li>
            </ul>
            <p className="font-semibold text-gray-900 mt-4">We do NOT use your data for advertising or resale.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">3. Data Storage & Security</h2>
            <p>
              Data is securely stored using <strong>Supabase</strong> and hosted on <strong>Vercel and Render</strong>. We use industry-standard encryption to protect your data. While we take reasonable measures, no system is 100% secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">4. Third-Party Services</h2>
            <p>We use trusted services to operate our platform:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Google OAuth</strong> (Authentication)</li>
              <li><strong>Supabase</strong> (Database & Auth)</li>
            </ul>
            <p>These providers may process your data under their own privacy policies.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">5. Your Rights</h2>
            <p>You have the right to access your data, request deletion of your account and data, or contact us with any privacy concerns.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">6. Contact</h2>
            <p>For any questions or concerns, please reach out to us at:</p>
            <a href="mailto:support@evalmind.ai" className="text-blue-600 font-semibold hover:underline">support@evalmind.ai</a>
          </section>

          <section className="pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500 italic">
              We may update this policy periodically. Continued use of the platform means you accept the updated terms.
            </p>
          </section>
        </div>
      </main>
      
      {/* Decorative Background */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vw] bg-blue-50/30 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
    </div>
  );
}
