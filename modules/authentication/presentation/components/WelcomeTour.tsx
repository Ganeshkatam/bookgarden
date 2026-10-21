"use client";

import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  BookOpen,
  Search,
  Heart,
  Star,
  Users,
  Award,
  Zap,
} from "lucide-react";

import { safeStorage } from "@/shared/core/storage/privacy-storage";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

const WELCOME_TOUR_COMPLETED_KEY =
  process.env.NEXT_PUBLIC_WELCOME_TOUR_COMPLETED_KEY || "tour-completed";
const WELCOME_TOUR_SKIPPED_KEY =
  process.env.NEXT_PUBLIC_WELCOME_TOUR_SKIPPED_KEY || "tour-skipped";

interface WelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeTour({ isOpen, onClose }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      title: "Welcome to BookGarden!",
      description:
        "Your ultimate book discovery and learning platform. Let's take a quick tour to get you started!",
      icon: <BookOpen size={48} className="text-indigo-400" />,
      tips: [
        "This tour takes just 2 minutes",
        "You can skip or revisit anytime",
        "Let's discover what you can do!",
      ],
    },
    {
      title: "Discover Amazing Books ",
      description: "Browse thousands of books with smart search and filters.",
      icon: <Search size={48} className="text-purple-400" />,
      tips: [
        "Use voice input  for faster search",
        "Filter by genre, author, or rating",
        "Save books to your personal library",
        "Get personalized recommendations",
      ],
    },
    {
      title: "Read Anywhere, Anytime ",
      description:
        "Enjoy books in our beautiful e-reader with customizable settings.",
      icon: <Zap size={48} className="text-yellow-400" />,
      tips: [
        "Dark and light themes for comfortable reading",
        "Adjustable typography and layout settings",
        "Text-to-speech audio support",
        "Automatic progress saving and bookmarks",
      ],
    },
    {
      title: "Build Your Library",
      description: "Like, rate, and organize your favorite books.",
      icon: <Heart size={48} className="text-red-400" />,
      tips: [
        "Save books to your reading lists",
        "Rate books from 1 to 5 stars",
        "Create custom reading collections",
        "Track reading progress across devices",
      ],
    },
    {
      title: "Study and Learn",
      description: "Create notes, organize citations, and prepare for exams.",
      icon: <Users size={48} className="text-green-400" />,
      tips: [
        "Create and organize study notes",
        "Review flashcards for exam preparation",
        "Generate citations in standard styles",
        "Structured self-paced learning planner",
      ],
    },
    {
      title: "Get Student Benefits",
      description: "Verify your student status for academic resources.",
      icon: <Award size={48} className="text-orange-400" />,
      tips: [
        "Upload student credentials for verification",
        "Receive verified academic badge on profile",
        "Access educational textbooks and materials",
        "Dedicated priority support",
      ],
    },
    {
      title: "You Are All Set",
      description: "Start exploring the catalog and enjoy reading.",
      icon: <Check size={48} className="text-green-400" />,
      tips: [
        "Browse the catalog to find books",
        "Set reading goals in your profile",
        "Access your personalized bookshelves",
        "Visit the help center anytime for guidance",
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    safeStorage.setItem(WELCOME_TOUR_COMPLETED_KEY, "true", "functional");
    onClose();
  };

  const skipTour = () => {
    safeStorage.setItem(WELCOME_TOUR_SKIPPED_KEY, "true", "functional");
    onClose();
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl border border-[var(--border-default)] overflow-hidden animate-slideIn">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close & Skip Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {currentStep === 0 && (
            <button
              onClick={skipTour}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Skip Tour
            </button>
          )}
          <button
            onClick={completeTour}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 pt-16">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-lg text-slate-300 text-center mb-8 max-w-lg mx-auto">
            {step.description}
          </p>

          {/* Tips */}
          {step.tips && (
            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-indigo-400 mb-3 uppercase tracking-wider">
                {currentStep === 0
                  ? "What to Expect:"
                  : currentStep === tourSteps.length - 1
                    ? "Quick Links:"
                    : "Key Features:"}
              </h3>
              <ul className="space-y-2">
                {step.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-slate-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`transition-all ${
                  index === currentStep
                    ? "w-8 h-2 bg-indigo-600"
                    : index < currentStep
                      ? "w-2 h-2 bg-green-500"
                      : "w-2 h-2 bg-white/20"
                } rounded-full`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                currentStep === 0
                  ? "opacity-0 pointer-events-none"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <span>
                {currentStep === tourSteps.length - 1 ? "Get Started!" : "Next"}
              </span>
              {currentStep === tourSteps.length - 1 ? (
                <Check size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
