'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GoalSelector from '@/components/boost/GoalSelector';
import BudgetSelector from '@/components/boost/BudgetSelector';
import CourseSelector from '@/components/boost/CourseSelector';
import CreativePreview from '@/components/boost/CreativePreview';
import type {
  BoostGoal,
  BoostCreative,
  BoostTargeting,
  ExpertWallet,
  Course,
  Expert,
} from '@/types';

type Step = 'goal' | 'course' | 'budget' | 'preview' | 'confirm';

interface GeneratedCampaign {
  targeting: BoostTargeting;
  creative: BoostCreative;
  alternativeCreatives: BoostCreative[];
  reasoning: string;
}

export default function CreateBoostPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  // Form state
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<BoostGoal | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [selectedCreative, setSelectedCreative] = useState<BoostCreative | null>(null);

  // Data state
  const [wallet, setWallet] = useState<ExpertWallet | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [campaign, setCampaign] = useState<GeneratedCampaign | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data (with cache-busting to ensure fresh wallet data)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();

      // Fetch wallet (required)
      const walletRes = await fetch(`/data/app/expert/me/wallet?t=${timestamp}`, {
        cache: 'no-store',
      });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData.success) {
          setWallet(walletData.data);
        }
      }

      // Fetch courses (optional - might not exist yet)
      try {
        const coursesRes = await fetch('/data/app/expert/me/courses');
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          if (coursesData.success) setCourses(coursesData.data.courses || []);
        }
      } catch {
        // Courses endpoint might not exist, that's OK
      }

      // Fetch expert (required for preview)
      const expertRes = await fetch(`/data/experts/${expertId}`);
      if (expertRes.ok) {
        const expertData = await expertRes.json();
        if (expertData.success) setExpert(expertData.data);
      }
    } catch (err) {
      console.error('[DBG][CreateBoostPage] Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate campaign with AI
  const generateCampaign = async () => {
    if (!goal || budget < 1000) return;

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/data/app/expert/me/boosts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          courseId: goal === 'promote_course' ? courseId : undefined,
          budget,
          currency: wallet?.currency || 'USD',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate campaign');
      }

      setCampaign(data.data);
      setSelectedCreative(data.data.creative);
      setStep('preview');
    } catch (err) {
      console.error('[DBG][CreateBoostPage] Error generating campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };

  // Submit boost
  const submitBoost = async () => {
    if (!campaign || !goal || !selectedCreative) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/data/app/expert/me/boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          courseId: goal === 'promote_course' ? courseId : undefined,
          budget,
          currency: wallet?.currency || 'USD',
          creative: selectedCreative,
          targeting: campaign.targeting,
          alternativeCreatives: campaign.alternativeCreatives,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create boost');
      }

      // Redirect to boost dashboard
      router.push(`/srv/${expertId}/boost`);
    } catch (err) {
      console.error('[DBG][CreateBoostPage] Error creating boost:', err);
      setError(err instanceof Error ? err.message : 'Failed to create boost');
    } finally {
      setSubmitting(false);
    }
  };

  // Step navigation
  const goToNextStep = () => {
    if (step === 'goal' && goal) {
      if (goal === 'promote_course') {
        setStep('course');
      } else {
        setStep('budget');
      }
    } else if (step === 'course') {
      setStep('budget');
    } else if (step === 'budget' && budget >= 1000) {
      generateCampaign();
    } else if (step === 'preview') {
      setStep('confirm');
    }
  };

  const goToPreviousStep = () => {
    if (step === 'course') {
      setStep('goal');
    } else if (step === 'budget') {
      if (goal === 'promote_course') {
        setStep('course');
      } else {
        setStep('goal');
      }
    } else if (step === 'preview') {
      setStep('budget');
    } else if (step === 'confirm') {
      setStep('preview');
    }
  };

  const canProceed = () => {
    if (step === 'goal') return goal !== null;
    if (step === 'course') return courseId !== null;
    if (step === 'budget') return budget >= 1000 && budget <= (wallet?.balance || 0);
    if (step === 'preview') return selectedCreative !== null;
    return true;
  };

  const formatCurrency = (amount: number) => {
    const val = amount / 100;
    if (wallet?.currency === 'INR') {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return `$${val.toLocaleString('en-US')}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-64 bg-gray-200 rounded mt-8" />
        </div>
      </div>
    );
  }

  if (!wallet || wallet.balance < 1000) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <svg
            className="w-12 h-12 text-yellow-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Insufficient Balance</h2>
          <p className="text-yellow-700 mb-6">
            You need at least {wallet?.currency === 'INR' ? '₹10' : '$10'} in your wallet to create
            a boost campaign.
            {wallet
              ? ` (Current balance: ${wallet.currency === 'INR' ? '₹' : '$'}${(wallet.balance / 100).toFixed(2)})`
              : ''}
          </p>
          <Link
            href={`/srv/${expertId}/boost`}
            className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
          >
            Add Funds to Wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/srv/${expertId}/boost`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Boost
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Boost</h1>
        <p className="text-gray-600 mt-1">Launch an AI-powered ad campaign in minutes.</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['goal', 'course', 'budget', 'preview', 'confirm'].map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === s;
            const isPast = ['goal', 'course', 'budget', 'preview', 'confirm'].indexOf(step) > i;
            const isHidden = s === 'course' && goal !== 'promote_course';

            if (isHidden) return null;

            return (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isPast
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isPast ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                {i <
                  ['goal', 'course', 'budget', 'preview', 'confirm'].filter(
                    x => !(x === 'course' && goal !== 'promote_course')
                  ).length -
                    1 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {/* Step 1: Goal Selection */}
        {step === 'goal' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What's your goal?</h2>
            <p className="text-gray-600 text-sm mb-6">
              Choose the primary objective for your campaign.
            </p>
            <GoalSelector value={goal} onChange={setGoal} />
          </div>
        )}

        {/* Step 2: Course Selection (only for promote_course) */}
        {step === 'course' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Select a course to promote</h2>
            <p className="text-gray-600 text-sm mb-6">Choose which course you want to advertise.</p>
            <CourseSelector
              courses={courses}
              value={courseId}
              onChange={setCourseId}
              loading={false}
            />
          </div>
        )}

        {/* Step 3: Budget Selection */}
        {step === 'budget' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Set your budget</h2>
            <p className="text-gray-600 text-sm mb-6">
              Choose how much you want to spend on this campaign.
            </p>
            <BudgetSelector
              value={budget}
              onChange={setBudget}
              currency={wallet.currency}
              maxBudget={wallet.balance}
            />
          </div>
        )}

        {/* Step 4: Preview Generated Campaign */}
        {step === 'preview' && campaign && expert && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Review your campaign</h2>
            <p className="text-gray-600 text-sm mb-6">
              Our AI has generated this campaign for you. Select your preferred creative.
            </p>
            <CreativePreview
              creative={campaign.creative}
              alternativeCreatives={campaign.alternativeCreatives}
              targeting={campaign.targeting}
              reasoning={campaign.reasoning}
              expertName={expert.name}
              expertAvatar={expert.avatar}
              onSelectCreative={setSelectedCreative}
            />
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 'confirm' && campaign && selectedCreative && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm and launch</h2>
            <p className="text-gray-600 text-sm mb-6">
              Review your campaign details before launching.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Campaign Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Goal</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {goal?.replace('_', ' ')}
                    </span>
                  </div>
                  {courseId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Course</span>
                      <span className="font-medium text-gray-900">
                        {courses.find(c => c.id === courseId)?.title || 'Selected'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget</span>
                    <span className="font-medium text-gray-900">{formatCurrency(budget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Headline</span>
                    <span className="font-medium text-gray-900">{selectedCreative.headline}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-indigo-900 font-medium">What happens next?</p>
                    <p className="text-sm text-indigo-700 mt-1">
                      Your campaign will be submitted for review. Once approved, it will start
                      running on Facebook and Instagram. You can pause or stop it anytime from your
                      dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-yellow-800 font-medium">Budget deduction</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {formatCurrency(budget)} will be deducted from your wallet when you launch
                      this campaign.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={step === 'goal'}
          className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step === 'confirm' ? (
          <button
            type="button"
            onClick={submitBoost}
            disabled={submitting}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Launching...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Launch Campaign
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!canProceed() || generating}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </>
            ) : step === 'budget' ? (
              'Generate Campaign'
            ) : (
              'Continue'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
