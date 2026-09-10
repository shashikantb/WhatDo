import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Community Guidelines for WHATDO platform.",
};

const today = "September 9, 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">{title}</h2>
    <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

export default function CommunityGuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <div className="mb-8 p-4 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
        ⚠️ This document is for development purposes only. Review by qualified legal counsel before production use.
      </div>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-2">
          Community Guidelines
        </h1>
        <p className="text-muted-foreground text-sm">Last updated: {today}</p>
        <p className="text-muted-foreground text-sm mt-4 max-w-2xl">
          WHATDO is built for open, honest, and respectful conversation. These guidelines keep the
          community safe and civil for everyone. When you use WHATDO, you agree to follow these rules.
        </p>
      </header>

      <Section title="The Rules">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-1">🔇 No spam, scams, or commercial abuse</h3>
            <p>
              Don&apos;t post repetitive, deceptive, or commercial content. No affiliate links, fake giveaways,
              pump-and-dump schemes, pyramid selling, or crypto/NFT scams. Do not use automated tools to
              create accounts, cast votes, or post content.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">🤝 No harassment, bullying, or hate speech</h3>
            <p>
              We do not tolerate harassment, targeted abuse, bullying, doxxing, brigading, or hate speech
              directed at individuals or groups based on race, ethnicity, religion, caste, nationality,
              disability, gender, gender identity, sexual orientation, age, or other protected characteristics.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">🔞 No NSFW or sexually explicit content (unless mature-tagged)</h3>
            <p>
              Do not post pornography, graphic sexual content, non-consensual explicit material, or content
              that sexualizes minors. Mature, adult, or suggestive content is allowed only if clearly tagged
              with a <strong>Mature</strong> label and approved by an admin. Misclassification is a violation.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">🩸 No violence, self-harm, or gore</h3>
            <p>
              Do not glorify, encourage, or depict violence, self-harm, suicide, eating disorders, or
              excessive gore. If you or someone you know is struggling, contact local emergency services or a
              crisis hotline.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">⚖️ No illegal content</h3>
            <p>
              Do not post, link to, or solicit content that violates applicable laws, including illegal drugs,
              weapons, stolen goods, counterfeit products, hacking tools, pirated media, or instructions for
              committing crimes.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">🎭 No scams, fraud, or misinformation</h3>
            <p>
              Do not impersonate someone you are not. Do not spread knowingly false or materially misleading
              information about elections, public health, safety events, or other people that could cause harm.
              Satire and opinion are fine; deliberate deception is not.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">©️ No copyright or trademark infringement</h3>
            <p>
              Only post content that you own or have permission to use. If you believe your work has been
              copied in a way that constitutes infringement, contact us with proper DMCA/IP notice details.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">👤 No personal information</h3>
            <p>
              Do not share other people&apos;s private or personally identifiable information (PII) — addresses,
              phone numbers, IDs, financial details, private messages — without explicit consent.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">💬 Respect others</h3>
            <p>
              Disagree respectfully. Avoid personal attacks, sealioning, bad-faith argument, and thread
              hijacking. Content or profiles designed to provoke, enrage, or derail conversation may be
              removed even if they don&apos;t fit an explicit rule above.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Enforcement">
        <p>
          Moderators and administrators enforce these guidelines at their discretion, using context, severity,
          and user history. Typical enforcement escalation:
        </p>
        <ol className="list-decimal pl-6 space-y-1">
          <li><strong>Warning:</strong> Content removed with a warning notice.</li>
          <li><strong>Temporary suspension:</strong> Account features restricted or account disabled for a set duration.</li>
          <li><strong>Permanent ban:</strong> Account and associated accounts permanently removed from the Platform.</li>
        </ol>
        <p className="pt-2">
          Severe violations (e.g., CSAM, credible threats, doxxing) may result in immediate permanent ban
          without prior warning.
        </p>
        <p className="pt-2">
          <strong>Appeals:</strong> You can appeal moderation actions by emailing
          <a href="mailto:moderation@whatdo.app" className="text-primary underline ml-1">moderation@whatdo.app</a>
          with your account details and reason for appeal. Appeals are typically reviewed within 7 business days.
        </p>
      </Section>

      <Section title="Reporting">
        <p>
          If you see content or behavior that violates these guidelines, please report it:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Tap the <strong>⋯</strong> (more) menu on any post, comment, or profile, then select <strong>Report</strong>.</li>
          <li>Choose the most accurate reason and add optional details.</li>
          <li>Reports are reviewed by human moderators (not automated only) and are confidential.</li>
        </ul>
        <p className="pt-2">
          False or abusive reporting is itself a violation and may result in action against the reporter&apos;s
          account. For emergencies involving imminent harm, contact your local authorities in addition to
          reporting to us.
        </p>
      </Section>
    </div>
  );
}
