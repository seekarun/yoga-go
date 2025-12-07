import Link from "next/link";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    features: [
      "1 Event Type",
      "1 Calendar Connection",
      "Unlimited Bookings",
      "Email Notifications",
      "Calel Branding",
    ],
    cta: "Get Started",
    ctaStyle: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    popular: false,
  },
  {
    name: "Professional",
    description: "For individuals and small teams",
    price: "$12",
    period: "/month",
    features: [
      "Unlimited Event Types",
      "Multiple Calendar Connections",
      "Zoom & Google Meet Integration",
      "Custom Branding",
      "SMS Reminders",
      "Remove Calel Branding",
      "Priority Support",
    ],
    cta: "Start Free Trial",
    ctaStyle:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    popular: true,
  },
  {
    name: "Team",
    description: "For growing businesses",
    price: "$29",
    period: "/user/month",
    features: [
      "Everything in Professional",
      "Team Scheduling",
      "Round-Robin Assignment",
      "Admin Dashboard",
      "API Access",
      "Webhooks",
      "SSO Integration",
      "Dedicated Support",
    ],
    cta: "Contact Sales",
    ctaStyle: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Start free. Upgrade as you grow. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-gradient-to-b from-indigo-50 to-white border-2 border-indigo-200 shadow-xl"
                  : "bg-white border border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
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
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className={`block w-full py-3 px-4 rounded-xl font-semibold text-center transition-all ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Need a custom solution for your enterprise?
          </p>
          <Link
            href="mailto:enterprise@calel.io"
            className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            Contact us for Enterprise pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
