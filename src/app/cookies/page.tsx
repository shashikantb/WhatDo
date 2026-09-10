import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Cookie Policy for WHATDO platform.",
};

const today = "September 9, 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">{title}</h2>
    <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
);

const cookies = [
  { name: "next-auth.session-token", purpose: "Maintains signed-in user session", retention: "30 days", type: "Strictly Necessary" },
  { name: "next-auth.csrf-token", purpose: "CSRF protection for auth forms", retention: "Session", type: "Strictly Necessary" },
  { name: "whatdo-theme", purpose: "Remembers light/dark/system theme preference", retention: "1 year", type: "Preferences" },
  { name: "whatdo-cookie-consent", purpose: "Remembers cookie consent choice", retention: "6 months", type: "Strictly Necessary" },
  { name: "_ga / _gid", purpose: "Google Analytics: count visits/traffic source (anonymized IP)", retention: "2 years / 24h", type: "Analytics" },
  { name: "_gat", purpose: "Throttle analytics request rate", retention: "1 minute", type: "Analytics" },
  { name: "fbp / _fbc", purpose: "Facebook ad delivery & conversion measurement", retention: "90 days", type: "Advertising" },
  { name: "__Secure-*", purpose: "Security-bound session cookies (TLS only)", retention: "Session", type: "Strictly Necessary" },
];

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <div className="mb-8 p-4 rounded-xl border border-amber-300/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
        ⚠️ This document is for development purposes only. Review by qualified legal counsel before production use.
      </div>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-2">
          Cookie Policy
        </h1>
        <p className="text-muted-foreground text-sm">Last updated: {today}</p>
      </header>

      <Section title="1. What Are Cookies?">
        <p>
          Cookies are small text files stored on your device (computer, phone, tablet) by websites you visit.
          They are widely used to make websites work more efficiently, remember your preferences, and provide
          information to the site owners. &quot;Similar technologies&quot; includes localStorage, IndexedDB, pixels,
          web beacons, and device fingerprints.
        </p>
      </Section>

      <Section title="2. Types of Cookies We Use">
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-foreground/90">🟢 Strictly Necessary Cookies</p>
            <p>
              Required for the Platform to function. They enable core features like security, authentication,
              and navigation. Cannot be switched off. <strong>Retention:</strong> Typically session-based or short-term.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground/90">🔵 Preference Cookies</p>
            <p>
              Remember your settings and choices such as theme, language, region, or preferred content
              categories. Improve personalization. <strong>Retention:</strong> Up to 1 year.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground/90">🟡 Analytics Cookies</p>
            <p>
              Help us understand how visitors interact with the Platform — which pages are visited, most
              popular posts, error rates, performance — so we can improve. Data is aggregated and anonymized
              where possible. <strong>Retention:</strong> Up to 2 years.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground/90">🔴 Advertising / Marketing Cookies</p>
            <p>
              Used by our partners to build a profile of your interests and show relevant ads on other sites.
              Based on uniquely identifying your browser and device. <strong>Retention:</strong> Up to 90 days to 2 years.
            </p>
          </div>
        </div>
      </Section>

      <Section title="3. Cookie List">
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
                <th className="px-4 py-3 font-semibold">Retention</th>
                <th className="px-4 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cookies.map((c) => (
                <tr key={c.name}>
                  <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.purpose}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.retention}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="4. How to Manage Cookies">
        <p>
          You can control and/or delete cookies as you wish via your browser or device settings.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
          <li><strong>Safari:</strong> Settings → Privacy → Cookies and website data</li>
          <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Browser Privacy</li>
          <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and site permissions</li>
          <li><strong>iOS Safari:</strong> Settings → Safari → Block All Cookies / Advanced</li>
          <li><strong>Android Chrome:</strong> ⋮ → Settings → Site settings → Cookies</li>
        </ul>
        <p className="pt-2">
          If you disable cookies, some features of the Platform (such as staying logged in, posting, voting,
          or remembering preferences) may not work properly.
        </p>
        <p className="pt-2">
          You can also opt out of many third-party advertising cookies via:
          <a href="https://youronlinechoices.com" target="_blank" rel="noreferrer" className="text-primary underline ml-1">Your Online Choices</a>
          {" "}or{" "}
          <a href="https://optout.networkadvertising.org" target="_blank" rel="noreferrer" className="text-primary underline">NAI Opt-Out</a>.
        </p>
      </Section>

      <Section title="5. Changes">
        <p>
          We may update this Cookie Policy from time to time. Changes will be posted on this page with an
          updated &quot;Last updated&quot; date. Material changes will be communicated via an in-app banner or email.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>
          For questions about cookies or similar technologies, email:
          <a href="mailto:privacy@whatdo.app" className="text-primary underline ml-1">privacy@whatdo.app</a>
        </p>
      </Section>
    </div>
  );
}
