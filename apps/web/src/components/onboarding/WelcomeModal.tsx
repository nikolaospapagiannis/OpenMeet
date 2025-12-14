'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  MessageSquare,
  BarChart3,
  Check,
  X
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button-v2';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const slides: Slide[] = [
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: 'Welcome to OpenMeet',
    description: 'Transform your meetings into actionable insights with AI-powered transcription, analysis, and collaboration tools.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: <Video className="w-12 h-12" />,
    title: 'Record & Transcribe',
    description: 'Automatically record meetings from Zoom, Google Meet, Teams, or upload your own recordings. Get accurate transcriptions in minutes.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <MessageSquare className="w-12 h-12" />,
    title: 'AI Assistant',
    description: 'Ask questions about your meetings, get instant summaries, and extract key insights with our intelligent AI assistant.',
    color: 'from-teal-500 to-green-500',
  },
  {
    icon: <BarChart3 className="w-12 h-12" />,
    title: 'Track & Analyze',
    description: 'Monitor topics, sentiment, speaker analytics, and team performance. Turn conversations into data-driven decisions.',
    color: 'from-orange-500 to-red-500',
  },
];

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export default function WelcomeModal({ open, onClose, onStartTour }: WelcomeModalProps) {
  const { user } = useAuth();
  const { hideWelcomeModal } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = async () => {
    await hideWelcomeModal(dontShowAgain);
    onClose();
  };

  const handleTakeTour = async () => {
    await hideWelcomeModal(dontShowAgain);
    onStartTour();
    onClose();
  };

  const currentSlideData = slides[currentSlide];

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      className="w-full max-w-2xl mx-4"
      closeOnBackdropClick={false}
      showCloseButton={false}
    >
      <DialogContent className="p-0">
        <div className="relative overflow-hidden">
          {/* Header with greeting */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Let's get you started with a quick tour
                </p>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Slide Content */}
          <div className="px-6 py-8 min-h-[320px] flex flex-col items-center text-center">
            {/* Icon */}
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentSlideData.color} flex items-center justify-center text-white mb-6 shadow-lg`}
            >
              {currentSlideData.icon}
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-4">
              {currentSlideData.title}
            </h3>

            {/* Description */}
            <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
              {currentSlideData.description}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-8 bg-teal-500'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 border-t border-slate-700/50 pt-4">
            {/* Don't show again checkbox */}
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="dont-show"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <label
                htmlFor="dont-show"
                className="text-sm text-slate-400 cursor-pointer select-none"
              >
                Don't show this again
              </label>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost-glass"
                size="default"
                onClick={handleSkip}
              >
                Skip for now
              </Button>

              <div className="flex items-center gap-2">
                {!isFirstSlide && (
                  <Button
                    variant="ghost-glass"
                    size="default"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}

                {isLastSlide ? (
                  <Button
                    variant="gradient-primary"
                    size="default"
                    onClick={handleTakeTour}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Take the Tour
                  </Button>
                ) : (
                  <Button
                    variant="gradient-primary"
                    size="default"
                    onClick={handleNext}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
