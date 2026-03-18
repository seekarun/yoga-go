import { Suspense } from "react";

function RsvpContent({
  searchParams,
}: {
  searchParams: Promise<{ response?: string; event?: string }>;
}) {
  // Use the searchParams promise pattern for Next.js 15+
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RsvpContentInner searchParams={searchParams} />
    </Suspense>
  );
}

async function RsvpContentInner({
  searchParams,
}: {
  searchParams: Promise<{ response?: string; event?: string }>;
}) {
  const params = await searchParams;
  const response = params.response || "accepted";
  const eventTitle = params.event || "the event";
  const isAccepted = response === "accepted";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
        <div
          className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isAccepted ? "bg-green-100" : "bg-gray-100"
          }`}
        >
          {isAccepted ? (
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {isAccepted ? "You're attending!" : "RSVP recorded"}
        </h1>

        <p className="text-gray-600 mb-6">
          {isAccepted
            ? `Your attendance for "${eventTitle}" has been confirmed.`
            : `You've declined the invitation to "${eventTitle}".`}
        </p>

        <p className="text-sm text-gray-400">You can close this page.</p>
      </div>
    </div>
  );
}

export default function RsvpConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ response?: string; event?: string }>;
}) {
  return <RsvpContent searchParams={searchParams} />;
}
