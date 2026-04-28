import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center bg-white">
              <Image 
                src="/logo.jpeg" 
                alt="EvalMind AI Logo" 
                width={32}
                height={32}
                style={{ width: "auto", height: "auto" }}
                className="object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 font-headline">
              EvalMind <span className="text-blue-600">AI</span>
            </span>
          </Link>
          <p className="text-sm text-gray-500 font-medium">
            Built for students. Powered by AI.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <div className="flex gap-8 text-sm font-semibold text-gray-600">
            <Link href="/evaluate" className="hover:text-blue-600 transition-colors">Evaluate</Link>
            <Link href="/history" className="hover:text-blue-600 transition-colors">History</Link>
            <Link href="/profile" className="hover:text-blue-600 transition-colors">Profile</Link>
          </div>
          
          <div className="flex gap-8 text-sm font-semibold text-gray-400">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-400">
        <p>© {new Date().getFullYear()} EvalMind AI. All rights reserved.</p>
        <p>Built with academic precision for learners worldwide.</p>
      </div>
    </footer>
  );
}
