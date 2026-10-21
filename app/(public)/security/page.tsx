import { ShieldCheck, Lock, Server, FileCheck, ArrowRight, EyeOff, Key } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security, Privacy & Data Protection",
  description: "Learn how BookGarden protects your data, ensures privacy, and maintains robust security infrastructure.",
};

const SECURITY_FEATURES = [
  {
    icon: <Lock size={24} />,
    title: "End-to-End Encryption",
    description: "Your personal notes, annotations, and uploaded documents are encrypted at rest using AES-256 and in transit via TLS 1.3.",
  },
  {
    icon: <EyeOff size={24} />,
    title: "Absolute Privacy",
    description: "We do not sell your data or read your private notes. Your intellectual property remains yours, always.",
  },
  {
    icon: <Server size={24} />,
    title: "Secure Infrastructure",
    description: "Hosted on enterprise-grade cloud providers with strict perimeter security, DDoS protection, and continuous monitoring.",
  },
  {
    icon: <Key size={24} />,
    title: "Advanced Authentication",
    description: "Support for magic links, strict session management, and robust password policies to prevent unauthorized access.",
  },
  {
    icon: <FileCheck size={24} />,
    title: "Regular Audits",
    description: "We subject our codebase and infrastructure to regular vulnerability scanning and periodic third-party penetration tests.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Data Portability",
    description: "Your data shouldn't be locked in. Export your highlights, notes, and library anytime in open formats.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-indigo-500/30 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/30 to-transparent blur-[100px] rounded-full" />
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center text-white transform -rotate-6">
            <ShieldCheck size={40} className="transform rotate-6" />
          </div>
          
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              Security is our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Foundation</span>.
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              When you use BookGarden to learn, read, and remember, you are trusting us with your intellectual property. We do not take that responsibility lightly.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SECURITY_FEATURES.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Report CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Found a Vulnerability?
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto text-lg">
              We work closely with the security community to keep our users safe. If you believe you have discovered a security issue, please let us know immediately.
            </p>
            <div className="pt-4">
              <Link
                href="/report"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-4 rounded-xl transition-transform hover:scale-105 active:scale-95"
              >
                Report a Security Issue
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
