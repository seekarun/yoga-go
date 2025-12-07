const steps = [
  {
    number: "01",
    title: "Set Your Availability",
    description:
      "Define your working hours and when you're available for appointments. Set buffer times between meetings and minimum notice periods.",
    image: (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
        <div className="space-y-3">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
            (day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-gray-700">
                  {day}
                </span>
                <div className="flex-1 h-8 bg-indigo-200 rounded-lg relative">
                  <div className="absolute left-[25%] right-[25%] h-full bg-indigo-500 rounded-lg" />
                </div>
                <span className="text-xs text-gray-500">9am - 5pm</span>
              </div>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Create Event Types",
    description:
      "Set up different appointment types like consultations, demos, or coaching sessions. Each can have different durations, locations, and custom questions.",
    image: (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
        <div className="space-y-4">
          {[
            {
              name: "30 Min Discovery Call",
              duration: "30 min",
              color: "bg-indigo-500",
            },
            {
              name: "60 Min Strategy Session",
              duration: "60 min",
              color: "bg-purple-500",
            },
            {
              name: "15 Min Quick Chat",
              duration: "15 min",
              color: "bg-pink-500",
            },
          ].map((event, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-4"
            >
              <div className={`w-2 h-12 ${event.color} rounded-full`} />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{event.name}</h4>
                <p className="text-sm text-gray-500">{event.duration} | Zoom</p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Share Your Link",
    description:
      "Get a personalized booking page or embed the widget on your website. Clients can see your availability and book instantly.",
    image: (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono">
              calel.io/your-name
            </div>
            <button className="p-2 bg-indigo-600 text-white rounded-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 text-sm py-2 px-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              Email
            </button>
            <button className="flex-1 text-sm py-2 px-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              LinkedIn
            </button>
            <button className="flex-1 text-sm py-2 px-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              Embed
            </button>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "Automate Everything",
    description:
      "Confirmations, reminders, and video links are sent automatically. You focus on your work while Calel handles the logistics.",
    image: (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
        <div className="space-y-3">
          {[
            { icon: "✓", text: "Confirmation email sent", time: "Just now" },
            { icon: "📅", text: "Added to Google Calendar", time: "1 min ago" },
            { icon: "🎥", text: "Zoom link generated", time: "1 min ago" },
            { icon: "⏰", text: "Reminder scheduled", time: "1 min ago" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center gap-3"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 text-sm text-gray-700">{item.text}</span>
              <span className="text-xs text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How Calel Works
          </h2>
          <p className="text-xl text-gray-600">
            Get started in minutes. No technical setup required.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12`}
            >
              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-block text-6xl font-bold text-indigo-100 mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-lg text-gray-600">{step.description}</p>
              </div>

              {/* Visual */}
              <div className="flex-1 w-full max-w-md">{step.image}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
