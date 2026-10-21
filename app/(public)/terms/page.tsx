import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the terms and conditions governing the use of the BookGarden digital reading platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-10 sm:pb-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-[var(--surface-default)] p-8 sm:p-12 rounded-3xl border border-[var(--border-default)] shadow-sm">
          <h1 className="text-4xl font-display font-bold mb-6 text-[var(--text-primary)]">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mb-8" suppressHydrationWarning>
            Last Updated: {new Date().toLocaleDateString()}
          </p>
          <div className="prose prose-lg max-w-none text-[var(--text-secondary)] space-y-6">
            <p>
              By accessing the BookGarden application, you agree to be bound by
              these terms of service and all applicable laws and regulations.
            </p>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-8">
              1. User License
            </h2>
            <p>
              Permission is granted to temporarily view materials
              (information or books) on BookGarden for personal,
              non-commercial transitory viewing only.
            </p>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-8">
              2. User Accounts
            </h2>
            <p>
              When you create an account with us, you must provide accurate,
              complete, and current information. Failure to do so constitutes a
              breach of the Terms, which may result in immediate termination of
              your account on our Service.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
