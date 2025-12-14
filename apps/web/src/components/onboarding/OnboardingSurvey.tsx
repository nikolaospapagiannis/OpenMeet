'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Users,
  Target,
  Zap,
  MessageSquare,
  Share2,
  Database,
  UserPlus,
  Video,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingStep, OptionCard, CheckboxCard } from './OnboardingStep';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export function OnboardingSurvey() {
  const router = useRouter();
  const {
    data,
    currentStep,
    totalSteps,
    progressPercentage,
    updateData,
    nextStep,
    previousStep,
    completeOnboarding,
    isLoading,
    error,
  } = useOnboarding();

  const handleSkip = async () => {
    const success = await completeOnboarding(true);
    if (success) {
      router.push('/dashboard');
    }
  };

  const handleComplete = async () => {
    const success = await completeOnboarding(false);
    if (success) {
      router.push('/dashboard');
    }
  };

  const handleRoleSelect = (role: string) => {
    updateData({ role });
    setTimeout(() => nextStep(), 300);
  };

  const handleTeamSizeSelect = (teamSize: string) => {
    updateData({ teamSize });
    setTimeout(() => nextStep(), 300);
  };

  const toggleGoal = (goal: string) => {
    const currentGoals = data.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter((g) => g !== goal)
      : [...currentGoals, goal];
    updateData({ goals: newGoals });
  };

  const toggleIntegration = (integration: string) => {
    const currentIntegrations = data.interestedIntegrations || [];
    const newIntegrations = currentIntegrations.includes(integration)
      ? currentIntegrations.filter((i) => i !== integration)
      : [...currentIntegrations, integration];
    updateData({ interestedIntegrations: newIntegrations });
  };

  return (
    <div className="min-h-screen bg-[#000211] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e293b] bg-[#0a0a1a]/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-semibold text-white">
              Welcome to OpenMeet
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip for now
            </button>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="mt-2 text-sm text-gray-400">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Role Selection */}
          {currentStep === 1 && (
            <OnboardingStep
              key="step-1"
              title="What's your role?"
              description="Help us personalize your experience"
              illustration={
                <Briefcase className="w-20 h-20 text-[#7a5af8]" />
              }
            >
              <div className="space-y-3">
                <OptionCard
                  label="Sales"
                  description="Close more deals with conversation insights"
                  icon={<DollarSign className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'Sales'}
                  onClick={() => handleRoleSelect('Sales')}
                />
                <OptionCard
                  label="Marketing"
                  description="Understand customer conversations at scale"
                  icon={<Target className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'Marketing'}
                  onClick={() => handleRoleSelect('Marketing')}
                />
                <OptionCard
                  label="Product"
                  description="Extract insights from user interviews"
                  icon={<Zap className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'Product'}
                  onClick={() => handleRoleSelect('Product')}
                />
                <OptionCard
                  label="Engineering"
                  description="Document technical discussions efficiently"
                  icon={<FileText className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'Engineering'}
                  onClick={() => handleRoleSelect('Engineering')}
                />
                <OptionCard
                  label="HR"
                  description="Streamline interviews and meetings"
                  icon={<UserPlus className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'HR'}
                  onClick={() => handleRoleSelect('HR')}
                />
                <OptionCard
                  label="Other"
                  description="I wear multiple hats"
                  icon={<Users className="w-6 h-6 text-[#7a5af8]" />}
                  selected={data.role === 'Other'}
                  onClick={() => handleRoleSelect('Other')}
                />
              </div>
            </OnboardingStep>
          )}

          {/* Step 2: Team Size */}
          {currentStep === 2 && (
            <OnboardingStep
              key="step-2"
              title="How big is your team?"
              description="We'll recommend the right features for your team size"
              illustration={<Users className="w-20 h-20 text-[#7a5af8]" />}
            >
              <div className="space-y-3">
                <OptionCard
                  label="Just me"
                  description="Individual contributor"
                  selected={data.teamSize === '1'}
                  onClick={() => handleTeamSizeSelect('1')}
                />
                <OptionCard
                  label="2-10 people"
                  description="Small team"
                  selected={data.teamSize === '2-10'}
                  onClick={() => handleTeamSizeSelect('2-10')}
                />
                <OptionCard
                  label="11-50 people"
                  description="Growing company"
                  selected={data.teamSize === '11-50'}
                  onClick={() => handleTeamSizeSelect('11-50')}
                />
                <OptionCard
                  label="50+ people"
                  description="Enterprise organization"
                  selected={data.teamSize === '50+'}
                  onClick={() => handleTeamSizeSelect('50+')}
                />
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={previousStep}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Continue
                </Button>
              </div>
            </OnboardingStep>
          )}

          {/* Step 3: Goals */}
          {currentStep === 3 && (
            <OnboardingStep
              key="step-3"
              title="What are your main goals?"
              description="Select all that apply - we'll help you achieve them"
              illustration={<Target className="w-20 h-20 text-[#7a5af8]" />}
            >
              <div className="space-y-3">
                <CheckboxCard
                  label="Record meetings automatically"
                  description="Never miss important details"
                  icon={<Video className="w-6 h-6 text-[#7a5af8]" />}
                  checked={data.goals?.includes('Record meetings') || false}
                  onChange={() => toggleGoal('Record meetings')}
                />
                <CheckboxCard
                  label="Take better notes"
                  description="AI-powered summaries and action items"
                  icon={<FileText className="w-6 h-6 text-[#7a5af8]" />}
                  checked={data.goals?.includes('Take notes') || false}
                  onChange={() => toggleGoal('Take notes')}
                />
                <CheckboxCard
                  label="Share highlights with team"
                  description="Keep everyone in the loop"
                  icon={<Share2 className="w-6 h-6 text-[#7a5af8]" />}
                  checked={data.goals?.includes('Share highlights') || false}
                  onChange={() => toggleGoal('Share highlights')}
                />
                <CheckboxCard
                  label="Sync with CRM"
                  description="Automatically log calls and notes"
                  icon={<Database className="w-6 h-6 text-[#7a5af8]" />}
                  checked={data.goals?.includes('CRM sync') || false}
                  onChange={() => toggleGoal('CRM sync')}
                />
                <CheckboxCard
                  label="Team collaboration"
                  description="Work together on meeting insights"
                  icon={<MessageSquare className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.goals?.includes('Team collaboration') || false
                  }
                  onChange={() => toggleGoal('Team collaboration')}
                />
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={previousStep}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Continue
                </Button>
              </div>
            </OnboardingStep>
          )}

          {/* Step 4: Integrations */}
          {currentStep === 4 && (
            <OnboardingStep
              key="step-4"
              title="Which tools do you use?"
              description="We'll help you set up integrations later"
              illustration={<Zap className="w-20 h-20 text-[#7a5af8]" />}
            >
              <div className="space-y-3">
                <CheckboxCard
                  label="Zoom"
                  description="Video conferencing platform"
                  icon={<Video className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('Zoom') || false
                  }
                  onChange={() => toggleIntegration('Zoom')}
                />
                <CheckboxCard
                  label="Google Meet"
                  description="Google's video platform"
                  icon={<Video className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('Meet') || false
                  }
                  onChange={() => toggleIntegration('Meet')}
                />
                <CheckboxCard
                  label="Microsoft Teams"
                  description="Microsoft's collaboration tool"
                  icon={<Video className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('Teams') || false
                  }
                  onChange={() => toggleIntegration('Teams')}
                />
                <CheckboxCard
                  label="Slack"
                  description="Team communication platform"
                  icon={<MessageSquare className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('Slack') || false
                  }
                  onChange={() => toggleIntegration('Slack')}
                />
                <CheckboxCard
                  label="Salesforce"
                  description="Customer relationship management"
                  icon={<Database className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('Salesforce') ||
                    false
                  }
                  onChange={() => toggleIntegration('Salesforce')}
                />
                <CheckboxCard
                  label="HubSpot"
                  description="Marketing and sales platform"
                  icon={<DollarSign className="w-6 h-6 text-[#7a5af8]" />}
                  checked={
                    data.interestedIntegrations?.includes('HubSpot') || false
                  }
                  onChange={() => toggleIntegration('HubSpot')}
                />
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={previousStep}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </OnboardingStep>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
