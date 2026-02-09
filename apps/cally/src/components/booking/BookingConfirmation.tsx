"use client";

interface BookingConfirmationProps {
  startTime: string;
  endTime: string;
  timezone: string;
  onClose: () => void;
  warning?: string;
}

export default function BookingConfirmation({
  startTime,
  endTime,
  timezone,
  onClose,
  warning,
}: BookingConfirmationProps) {
  const start = new Date(startTime);
  const dateStr = start.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = `${start.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} - ${new Date(endTime).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-7 h-7 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Request Submitted!
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Your request has been submitted. You will receive an email on
        confirmation.
      </p>

      {warning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-left">
          {warning}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
        <div className="text-sm text-gray-600 mb-1">Date</div>
        <div className="text-sm font-medium text-gray-900 mb-3">{dateStr}</div>
        <div className="text-sm text-gray-600 mb-1">Time</div>
        <div className="text-sm font-medium text-gray-900">{timeStr}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
