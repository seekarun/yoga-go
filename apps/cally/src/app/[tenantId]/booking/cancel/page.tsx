/**
 * Visitor Cancel Booking Page (Server Component)
 * Reads the token from searchParams and renders the cancel form
 */

import CancelBookingForm from "@/components/booking/CancelBookingForm";

interface CancelBookingPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function CancelBookingPage({
  params,
  searchParams,
}: CancelBookingPageProps) {
  const { tenantId } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invalid Cancel Link
          </h1>
          <p className="text-gray-600">
            This cancellation link is missing or invalid. Please use the link
            from your booking confirmation email.
          </p>
        </div>
      </div>
    );
  }

  return <CancelBookingForm tenantId={tenantId} token={token} />;
}
