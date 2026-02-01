import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | MyYoga.Guru',
  description:
    'Privacy Policy for MyYoga.Guru - Learn how we collect, use, and protect your information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8f8f8' }}>
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px 80px' }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#666', marginBottom: '40px' }}>Last updated: December 15, 2024</p>

          {/* Introduction */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              1. Introduction
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '12px' }}>
              Welcome to MyYoga.Guru (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are
              committed to protecting your privacy and ensuring the security of your personal
              information.
            </p>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              MyYoga.Guru is an online platform that enables yoga teachers and wellness experts to
              establish their online presence, create courses, and host live video sessions. Users
              can sign up to access courses, webinars, and interact with experts through our
              platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              2. Information We Collect
            </h2>
            <h3
              style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}
            >
              Account Information
            </h3>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              When you create an account, we collect:
            </p>
            <ul
              style={{
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '20px',
                paddingLeft: '24px',
              }}
            >
              <li>Name</li>
              <li>Email address</li>
              <li>Profile picture (if provided via social login)</li>
              <li>Account credentials (hashed and encrypted)</li>
            </ul>

            <h3
              style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}
            >
              Usage Information
            </h3>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              We automatically collect certain information when you use our platform:
            </p>
            <ul
              style={{
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '20px',
                paddingLeft: '24px',
              }}
            >
              <li>Course enrollment and progress data</li>
              <li>Webinar registrations and attendance</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and general location data</li>
              <li>Pages visited and features used</li>
            </ul>

            <h3
              style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}
            >
              Payment Information
            </h3>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              When you make purchases, payment information is collected and processed directly by
              our payment providers (Stripe and Razorpay). We do not store your full credit card
              numbers or bank account details on our servers. We only receive transaction
              confirmations and limited billing information necessary for record-keeping.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              3. How We Use Your Information
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              We use the information we collect to:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>Provide, maintain, and improve our services</li>
              <li>Process your course enrollments and webinar registrations</li>
              <li>Send you important updates about your courses and scheduled sessions</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>
                Send you service-related communications (e.g., enrollment confirmations, webinar
                reminders)
              </li>
              <li>Ensure the security and integrity of our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              4. Information Sharing
            </h2>
            <p
              style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px', fontWeight: '600' }}
            >
              We do not sell, trade, or rent your personal information to third parties.
            </p>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              We may share your information only in the following limited circumstances:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>
                <strong>With Experts:</strong> When you enroll in a course or webinar, the
                respective expert/teacher will have access to your name and email address to
                facilitate the learning experience.
              </li>
              <li>
                <strong>Payment Processors:</strong> We share necessary information with Stripe and
                Razorpay to process your payments securely.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required by law,
                regulation, or legal process.
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              5. Data Security
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '12px' }}>
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction. These measures include:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
          </section>

          {/* User Rights */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              6. Your Rights
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              You have the following rights regarding your personal information:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>
                <strong>Access:</strong> Request a copy of the personal data we hold about you
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or incomplete data
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal data (subject to legal
                retention requirements)
              </li>
              <li>
                <strong>Export:</strong> Request your data in a portable format
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent for data processing where
                consent is the legal basis
              </li>
            </ul>
            <p style={{ color: '#444', lineHeight: '1.7', marginTop: '16px' }}>
              To exercise any of these rights, please contact us using the information provided in
              Section 12.
            </p>
          </section>

          {/* Cookies */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              7. Cookies and Tracking Technologies
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '12px' }}>
              We use cookies and similar technologies to:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>Keep you signed in to your account</li>
              <li>Remember your preferences</li>
              <li>Track your course progress</li>
              <li>Understand how you use our platform to improve our services</li>
            </ul>
            <p style={{ color: '#444', lineHeight: '1.7', marginTop: '16px' }}>
              You can control cookies through your browser settings. However, disabling certain
              cookies may affect the functionality of our platform.
            </p>
          </section>

          {/* Discussion Forums */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              8. Discussion Forums and Community Features
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '12px' }}>
              Our platform includes discussion threads and community features where you can interact
              with other users and experts. Please be aware that:
            </p>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>
                Information you post in discussion forums is visible to all registered users of that
                course or community
              </li>
              <li>Your display name will be visible to other participants</li>
              <li>
                We encourage you not to share sensitive personal information in public discussions
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              9. Third-Party Services
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              We integrate with the following third-party services:
            </p>

            <h3
              style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}
            >
              Authentication Providers
            </h3>
            <ul
              style={{
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '20px',
                paddingLeft: '24px',
              }}
            >
              <li>
                <strong>Google Sign-In:</strong> Allows you to log in using your Google account. We
                receive your name, email, and profile picture from Google.
              </li>
              <li>
                <strong>Facebook Login:</strong> Allows you to log in using your Facebook account.
                We receive your name, email, and profile picture from Facebook.
              </li>
            </ul>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '20px' }}>
              These providers have their own privacy policies. We encourage you to review them:
            </p>
            <ul
              style={{
                color: '#444',
                lineHeight: '1.7',
                marginBottom: '20px',
                paddingLeft: '24px',
              }}
            >
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/privacy/policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  Facebook Privacy Policy
                </a>
              </li>
            </ul>

            <h3
              style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}
            >
              Payment Processors
            </h3>
            <ul style={{ color: '#444', lineHeight: '1.7', paddingLeft: '24px' }}>
              <li>
                <strong>Stripe:</strong> Processes payments for international users.{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  Stripe Privacy Policy
                </a>
              </li>
              <li>
                <strong>Razorpay:</strong> Processes payments for users in India.{' '}
                <a
                  href="https://razorpay.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb' }}
                >
                  Razorpay Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          {/* Advertising */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              10. Advertising
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              MyYoga.Guru does not display third-party advertisements on our platform. We do not
              share your data with advertising networks or use your information for targeted
              advertising purposes.
            </p>
          </section>

          {/* Children's Privacy */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              11. Children&apos;s Privacy
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              Our services are not intended for children under the age of 13. We do not knowingly
              collect personal information from children under 13. If we become aware that we have
              collected personal information from a child under 13, we will take steps to delete
              such information promptly. If you believe we have collected information from a child
              under 13, please contact us immediately.
            </p>
          </section>

          {/* Changes to Policy */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              12. Changes to This Privacy Policy
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by posting the new Privacy Policy on this page and updating the
              &quot;Last updated&quot; date. We encourage you to review this Privacy Policy
              periodically to stay informed about how we are protecting your information.
            </p>
          </section>

          {/* Contact Information */}
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{ fontSize: '24px', fontWeight: '600', color: '#111', marginBottom: '16px' }}
            >
              13. Contact Us
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '16px' }}>
              If you have any questions about this Privacy Policy, your personal data, or would like
              to exercise any of your rights, please contact us at:
            </p>
            <p style={{ color: '#444', lineHeight: '1.7' }}>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@myyoga.guru" style={{ color: '#2563eb' }}>
                privacy@myyoga.guru
              </a>
            </p>
          </section>

          {/* Acceptance */}
          <section
            style={{
              background: '#f8f8f8',
              padding: '24px',
              borderRadius: '12px',
              marginTop: '40px',
            }}
          >
            <p style={{ color: '#444', lineHeight: '1.7', margin: 0 }}>
              By using MyYoga.Guru, you acknowledge that you have read and understood this Privacy
              Policy and agree to its terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
