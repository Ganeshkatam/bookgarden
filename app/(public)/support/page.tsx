import { createSupabaseServerClient } from "@/shared/core/database/server";
import { Mail, MessageCircle, HelpCircle } from "lucide-react";
import { GetFaqsQueryHandler } from "@/modules/support/application/queries/GetFaqs/handler";
import { SupabaseSupportReadModel } from "@/modules/support/infrastructure/read-models/SupabaseSupportReadModel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center & Reader Support",
  description: "Find answers to frequently asked questions, user guides, and contact reader support.",
};

export const revalidate = 3600; // Cache for 1 hour

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  const repo = new SupabaseSupportReadModel(supabase);
  const handler = new GetFaqsQueryHandler(repo);

  // Fetch FAQs from database
  const faqs = await handler.execute();

  // Group FAQs by category
  const groupedFaqs =
    faqs?.reduce((acc: any, faq: any) => {
      const category = faq.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(faq);
      return acc;
    }, {}) || {};

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] overflow-x-hidden">
      <main className="pt-8 pb-16 sm:pt-10 sm:pb-20 max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-6 ring-1 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <HelpCircle className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-display font-bold mb-6 text-[var(--text-primary)] tracking-tight">
            How can we help?
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            Search our knowledge base or browse categories below to find answers
            to common questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-12">
            {Object.entries(groupedFaqs).map(
              ([category, items]: [string, any]) => (
                <div key={category} className="space-y-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <span className="w-8 h-px bg-indigo-500/50"></span>
                    {category}
                  </h2>
                  <div className="space-y-4">
                    {items.map((faq: any) => (
                      <details
                        key={faq.id}
                        className="group bg-[var(--surface-default)] rounded-2xl border border-[var(--border-default)] overflow-hidden transition-all duration-200 hover:border-indigo-500/40 shadow-xs"
                      >
                        <summary className="flex items-center justify-between p-6 cursor-pointer select-none">
                          <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pr-6">
                            {faq.question}
                          </h3>
                          <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <div className="absolute w-4 h-0.5 bg-indigo-500 rounded-full transition-transform duration-300 group-open:rotate-180" />
                            <div className="absolute w-0.5 h-4 bg-indigo-500 rounded-full transition-transform duration-300 group-open:-rotate-90" />
                          </div>
                        </summary>
                        <div className="px-6 pb-6 pt-2 text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]">
                          {faq.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ),
            )}

            {(!faqs || faqs.length === 0) && (
              <div className="text-center py-12 bg-[var(--surface-default)] rounded-3xl border border-[var(--border-default)]">
                <p className="text-[var(--text-secondary)]">
                  No FAQs available at the moment.
                </p>
              </div>
            )}
          </div>

          {/* Contact Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--surface-default)] rounded-3xl p-8 border border-[var(--border-default)] relative overflow-hidden shadow-sm">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                Still need help?
              </h3>
              <p className="text-[var(--text-secondary)] mb-8 text-sm">
                Can&apos;t find the answer you&apos;re looking for? Our support
                team is here to help.
              </p>

              <div className="space-y-4">
                <a
                  href="mailto:support@bookgarden.tomesphere.in"
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-default)] hover:border-indigo-500/40 text-[var(--text-primary)] font-medium transition-colors"
                >
                  <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Email Support</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
