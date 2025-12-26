'use client';

export default function GeoBlockedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Currently Available in Australia Only
          </h1>
          <p className="text-gray-600 leading-relaxed">
            MyYoga.guru is currently only available to users in Australia. We&apos;re working on
            expanding to more regions soon.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Want to be notified?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Leave your email and we&apos;ll let you know when we launch in your region.
          </p>
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault();
              // For now, just show a message - can implement later
              alert('Thanks! We will notify you when we launch in your region.');
            }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              required
            />
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Notify Me
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
