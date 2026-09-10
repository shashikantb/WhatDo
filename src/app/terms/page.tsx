import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for WHATDO platform.",
};

const today = "September 9, 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">{title}</h2>
    <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <div className="mb-8 p-4 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
        ⚠️ This document is for development purposes only. Review by qualified legal counsel before production use.
      </div>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-2">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-sm">Last updated: {today}</p>
      </header>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using WHATDO (the &quot;Platform&quot;), you agree to be bound by these Terms of
          Service (&quot;Terms&quot;). If you do not agree, you may not access or use the Platform. These Terms
          constitute the entire agreement between you and WHATDO regarding your use of the Platform.
        </p>
        <p>
          We reserve the right to modify these Terms at any time. Continued use after changes constitutes
          acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="2. User Accounts">
        <p>
          You may need to create an account to use certain features. You are responsible for safeguarding
          your account credentials and for all activities under your account. You agree to provide accurate,
          current, and complete registration information and to update it promptly.
        </p>
        <p>
          You may not impersonate another person or entity or use a false identity. We reserve the right to
          suspend or terminate accounts at our sole discretion.
        </p>
      </Section>

      <Section title="3. User Content & License">
        <p>
          You retain ownership of content you post, upload, or submit to the Platform (&quot;User Content&quot;). By
          submitting User Content, you grant WHATDO a worldwide, non-exclusive, royalty-free, transferable,
          sublicensable license to host, use, distribute, modify, run, copy, publicly perform or display,
          translate, and create derivative works of your User Content for the purpose of operating and improving
          the Platform.
        </p>
        <p>
          You represent and warrant that you have all necessary rights to grant this license and that your
          User Content does not violate any third-party rights.
        </p>
      </Section>

      <Section title="4. Acceptable Use Policy">
        <p>You agree NOT to use the Platform to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Violate any applicable local, state, national, or international law or regulation.</li>
          <li>Post content that is harmful, abusive, harassing, hateful, violent, defamatory, or sexually explicit (unless properly tagged per our Community Guidelines).</li>
          <li>Engage in spam, phishing, scams, fraud, or deceptive practices.</li>
          <li>Distribute malware, viruses, or other malicious code.</li>
          <li>Interfere with or disrupt the integrity or performance of the Platform.</li>
          <li>Attempt to gain unauthorized access to any part of the Platform or user accounts.</li>
          <li>Infringe on the intellectual property rights of WHATDO or any third party.</li>
          <li>Use the Platform to build a competing service or scrape content without permission.</li>
        </ul>
      </Section>

      <Section title="5. Content Removal & Termination">
        <p>
          WHATDO reserves the right, in its sole discretion, to remove, disable, or restrict access to any
          User Content that violates these Terms, our Community Guidelines, or any applicable law. We may
          also suspend or terminate your account, with or without notice, for any reason, including repeated
          violations or creation of risk of legal liability.
        </p>
      </Section>

      <Section title="6. Disclaimers">
        <p>
          THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WHATDO EXPLICITLY DISCLAIMS ALL WARRANTIES, INCLUDING
          BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, QUIET ENJOYMENT,
          AND NON-INFRINGEMENT.
        </p>
        <p>
          WHATDO does not warrant that the Platform will be uninterrupted, error-free, secure, or free of
          viruses or other harmful components.
        </p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WHATDO, ITS AFFILIATES, DIRECTORS,
          EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
          INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.
        </p>
        <p>
          IN NO EVENT SHALL THE AGGREGATE LIABILITY OF WHATDO EXCEED THE AMOUNT PAID BY YOU, IF ANY, IN THE
          TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE CLAIM.
        </p>
      </Section>

      <Section title="8. Changes to Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes via email or
          through a prominent notice on the Platform. Your continued use of the Platform after such changes
          constitutes your acceptance of the new Terms.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          For questions about these Terms, please contact us at:
          <a href="mailto:legal@whatdo.app" className="text-primary underline ml-1">legal@whatdo.app</a>
        </p>
      </Section>
    </div>
  );
}
