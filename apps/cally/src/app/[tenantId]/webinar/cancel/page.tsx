/**
 * Visitor Cancel Webinar Page (Server Component)
 * Reads the token from searchParams and renders the cancel form
 */

import CancelWebinarForm from "@/components/webinar/CancelWebinarForm";

interface CancelWebinarPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function CancelWebinarPage({
  params,
  searchParams,
}: CancelWebinarPageProps) {
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
            from your webinar confirmation email.
          </p>
        </div>
      </div>
    );
  }

  return <CancelWebinarForm tenantId={tenantId} token={token} />;
}
