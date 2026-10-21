import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Editorial Inquiries",
  description: "Get in touch with the BookGarden editorial, technical support, and partnership teams.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-10 sm:pb-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--surface-default)] p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] shadow-sm">
          <h1 className="text-4xl font-display font-bold mb-6 text-[var(--text-primary)]">
            Contact Us
          </h1>
          <div className="prose prose-lg max-w-none text-[var(--text-secondary)] space-y-4">
            <p>We would love to hear from you.</p>
            <p>
              Whether you have a question about features, reading lists, or anything
              else, our team is ready to answer all your questions.
            </p>
            <ul className="mt-6 space-y-3 pl-4">
              <li>
                <strong className="text-[var(--text-primary)]">General Support:</strong> support@bookgarden.tomesphere.in
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Partnerships:</strong> partners@bookgarden.tomesphere.in
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Feedback:</strong> feedback@bookgarden.tomesphere.in
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
