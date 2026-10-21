import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how BookGarden handles your personal data, privacy, and encryption standards.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-10 sm:pb-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--surface-default)] p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] shadow-sm">
          <h1 className="text-4xl font-display font-bold mb-6 text-[var(--text-primary)]">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mb-8" suppressHydrationWarning>
            Last Updated: {new Date().toLocaleDateString()}
          </p>
          <div className="prose prose-lg max-w-none text-[var(--text-secondary)] space-y-6">
            <p>
              Your privacy is important to us. It is BookGarden&apos;s policy to
              respect your privacy regarding any information we may collect from
              you across our website and application.
            </p>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-8">
              Information We Collect
            </h2>
            <p>
              We only ask for personal information when we truly need it to
              provide a service to you. We collect it by fair and lawful means,
              with your knowledge and consent. The information we collect
              includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-[var(--text-secondary)]">
              <li>Account information (email, name, profile picture)</li>
              <li>
                Reading history and preferences (to power curated
                recommendations)
              </li>
              <li>Reviews and community interactions</li>
            </ul>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-8">
              How We Use Information
            </h2>
            <p>
              We use the collected data to provide, maintain, and improve our
              services, including personalizing your reading recommendations and
              facilitating community interactions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
