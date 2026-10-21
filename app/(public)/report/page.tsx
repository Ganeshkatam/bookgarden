"use client";

import { useState } from "react";
import { ShieldAlert, Send, CheckCircle2, ArrowLeft, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { submitReportAction } from "@/modules/support/presentation/actions/reportActions";

const REPORT_TYPES = [
  { label: 'Bug / Glitch', value: 'BUG' },
  { label: 'Abuse / Spam', value: 'ABUSE' },
  { label: 'Security Vulnerability', value: 'SECURITY' }
];

export default function ReportPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const result = await submitReportAction(formData);
      
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setErrorMsg(result.error || "An unexpected error occurred.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pt-12 pb-24">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 relative z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 mb-6 transform -rotate-3">
            <ShieldAlert size={32} className="transform rotate-3" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Report an Issue
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Help us keep BookGarden safe and running smoothly. Our Trust & Safety team reviews all submissions promptly.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/40 dark:shadow-black/40 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
          {isSubmitted ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Report Submitted</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                Thank you for your report. Our team has received the information and will investigate it shortly.
              </p>
              <button 
                onClick={() => {
                  setIsSubmitted(false);
                  setErrorMsg(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Submit Another Report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex gap-3 text-red-600 dark:text-red-400 text-sm">
                  <MessageSquareWarning className="shrink-0" size={18} />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  What are you reporting?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {REPORT_TYPES.map((type, i) => (
                    <label key={type.value} className="relative flex cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                      <input type="radio" name="type" value={type.value} className="peer sr-only" defaultChecked={i === 0} />
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300 peer-checked:text-indigo-600 dark:peer-checked:text-indigo-400">
                        {type.label}
                      </div>
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-indigo-600 dark:peer-checked:border-indigo-500 pointer-events-none" />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Issue Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  placeholder="Brief summary of the issue"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Detailed Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={5}
                  placeholder="Please provide as much detail as possible, including steps to reproduce if applicable."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="If you'd like us to follow up with you"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
