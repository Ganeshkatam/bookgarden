"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Check, BookOpen, Star, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { safeStorage, STORAGE_KEYS } from "@/shared/core/storage/privacy-storage";

const TOUR_STEPS = [
  {
    title: "Welcome to BookGarden",
    description:
      "Your ultimate platform for books, reading, and academic resources. Let's take a quick tour!",
    icon: <BookOpen size={48} className="text-indigo-400" />,
    targetId: null, // Centered
  },
  {
    title: "Your Dashboard",
    description:
      "Track your reading stats, level up, and resume your books right from here.",
    icon: <Star size={48} className="text-yellow-400" />,
    targetId: "tour-stats",
  },
];

const TOUR_COMPLETED_KEY = STORAGE_KEYS.TOUR_COMPLETED;

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Check if tour has been completed
    const hasSeenTour = safeStorage.getItem(TOUR_COMPLETED_KEY);
    if (!hasSeenTour) {
      // Small delay to allow UI to load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    safeStorage.setItem(TOUR_COMPLETED_KEY, "true", "functional");
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="relative w-full max-w-md bg-[var(--surface-default)] border border-[var(--border-default)] rounded-3xl p-8 shadow-2xl pointer-events-auto mx-4"
        >
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-[var(--border-default)] shadow-inner">
              {step.icon}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">{step.title}</h2>
              <p className="text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-4">
              <div className="flex gap-1 mr-auto">
                {TOUR_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "w-6 bg-indigo-500"
                        : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
                {currentStep !== TOUR_STEPS.length - 1 && (
                  <ChevronRight size={18} />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
