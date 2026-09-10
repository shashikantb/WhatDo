import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for WHATDO platform.",
};

const today = "September 9, 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">{title}</h2>
    <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <div className="mb-8 p-4 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
        ⚠️ This document is for development purposes only. Review by qualified legal counsel before production use.
      </div>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm">Last updated: {today}</p>
      </header>

      <Section title="1. Information We Collect">
        <p className="font-semibold text-foreground/80">A. Information you provide directly</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account information: name, email, username, password hash, profile bio.</li>
          <li>Profile details: display name, avatar, interests, category preferences.</li>
          <li>User Content: posts, votes, comments, messages, and media you upload.</li>
          <li>Communications: support inquiries, feedback, and emails you send us.</li>
        </ul>
        <p className="font-semibold text-foreground/80 pt-2">B. Information collected automatically</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Usage data: pages visited, features used, clicks, time spent, and interactions.</li>
          <li>Device & browser: user agent, screen resolution, language, and operating system.</li>
          <li>IP address: stored as a <strong>cryptographic hash (anonymized)</strong> — we do not retain raw IP addresses long-term.</li>
          <li>Cookies and similar technologies: see our Cookie Policy.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide, maintain, and improve the Platform and its features.</li>
          <li>Personalize content, recommendations, and your feed.</li>
          <li>Process votes, comments, posts, and other interactions.</li>
          <li>Authenticate accounts and ensure security.</li>
          <li>Send account, service, and transactional communications.</li>
          <li>Monitor for abuse, fraud, spam, and enforce our policies.</li>
          <li>Conduct analytics, research, and product development.</li>
          <li>Comply with legal obligations.</li>
        </ul>
      </Section>

      <Section title="3. How We Share Your Information">
        <p>We do NOT sell your personal information. We share information only as follows:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Public content:</strong> Posts, usernames, display names, avatars, votes, and comments you submit are visible to other users and the public per the Platform&apos;s design.</li>
          <li><strong>Service providers:</strong> Trusted vendors (hosting, cloud, analytics, email delivery) bound by confidentiality obligations.</li>
          <li><strong>Legal & safety:</strong> When required by law, subpoena, or to protect the rights, safety, and integrity of WHATDO, our users, or the public.</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or asset sale.</li>
          <li><strong>With your consent:</strong> When you explicitly direct us to share.</li>
        </ul>
      </Section>

      <Section title="4. Security">
        <p>
          We implement industry-standard technical and organizational security measures — including
          encryption in transit (TLS), encryption at rest, password hashing (bcrypt), access controls, and
          regular security reviews — to protect your information. However, no method of transmission over the
          Internet is 100% secure.
        </p>
      </Section>

      <Section title="5. Retention">
        <p>
          We retain your personal information for as long as your account is active or as needed to provide
          services. We retain and delete information in accordance with our internal data retention schedules
          and applicable law. You may request deletion at any time via your account settings.
        </p>
      </Section>

      <Section title="6. Your Rights">
        <p>
          Depending on your jurisdiction, you may have the following rights regarding your personal
          information. Most can be exercised directly from your <a href="/settings" className="text-primary underline">account settings</a> page:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access:</strong> Request a copy of your personal data.</li>
          <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
          <li><strong>Erasure / Deletion:</strong> Request deletion of your account and associated data.</li>
          <li><strong>Restriction / Objection:</strong> Restrict or object to certain processing.</li>
          <li><strong>Data portability:</strong> Export your data in a machine-readable format.</li>
          <li><strong>Withdraw consent:</strong> Where processing is based on consent.</li>
        </ul>
      </Section>

      <Section title="7. Cookies">
        <p>
          We use cookies and similar technologies to operate the Platform, remember your preferences, and
          analyze traffic. For detailed information about the cookies we use and how to manage them, see our
          <a href="/cookies" className="text-primary underline ml-1">Cookie Policy</a>.
        </p>
      </Section>

      <Section title="8. International Transfers">
        <p>
          Your information may be processed in countries outside the one in which you reside. We use
          appropriate safeguards (such as Standard Contractual Clauses) for transfers as required by
          applicable law.
        </p>
        <p className="pt-2 font-semibold text-foreground/80">
          For EU/EEA users: GDPR applies. Contact data controller at
          <a href="mailto:privacy@whatdo.app" className="text-primary underline ml-1">privacy@whatdo.app</a>.
        </p>
      </Section>

      <Section title="9. Children">
        <p>
          The Platform is not directed to children under the age of 13 (or the applicable age of majority in
          your jurisdiction). We do not knowingly collect personal information from children. If you believe
          we have collected such information, please contact us immediately.
        </p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be notified via a
          prominent platform notice or email. Your continued use after changes take effect constitutes
          acceptance.
        </p>
      </Section>

      <Section title="11. Contact">
        <p>
          For privacy inquiries, requests, or complaints, contact our data protection team at:
          <a href="mailto:privacy@whatdo.app" className="text-primary underline ml-1">privacy@whatdo.app</a>
        </p>
      </Section>
    </div>
  );
}
