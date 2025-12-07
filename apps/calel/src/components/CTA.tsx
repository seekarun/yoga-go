import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to simplify your scheduling?
        </h2>
        <p className="text-xl text-indigo-100 mb-8">
          Join thousands of professionals who save hours every week with Calel.
          Start free, no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all font-semibold text-lg shadow-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 bg-transparent text-white rounded-xl hover:bg-white/10 transition-all font-semibold text-lg border-2 border-white/30"
          >
            View Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
