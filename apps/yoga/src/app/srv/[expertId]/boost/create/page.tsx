'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GoalSelector from '@/components/boost/GoalSelector';
import BudgetSelector from '@/components/boost/BudgetSelector';
import CourseSelector from '@/components/boost/CourseSelector';
import CreativePreview from '@/components/boost/CreativePreview';
import BoostPaymentModal from '@/components/boost/BoostPaymentModal';
import type {
  Boost,
  BoostGoal,
  BoostCreative,
  BoostTargeting,
  Course,
  Expert,
  SupportedCurrency,
} from '@/types';
import { formatPrice } from '@/lib/currency/currencyService';

type Step = 'goal' | 'course' | 'budget' | 'preview' | 'payment';

interface GeneratedCampaign {
  targeting: BoostTargeting;
  creative: BoostCreative;
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
  const [budget, setBudget] = useState(1000); // Default $10 / ₹1000
  const [editedCreative, setEditedCreative] = useState<BoostCreative | null>(null);
  const [editedTargeting, setEditedTargeting] = useState<BoostTargeting | null>(null);

  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [campaign, setCampaign] = useState<GeneratedCampaign | null>(null);
  const [expertDomain, setExpertDomain] = useState<string>(`${expertId}.myyoga.guru`);
  const [currency, setCurrency] = useState<string>('USD');

  // Payment modal state
  const [createdBoost, setCreatedBoost] = useState<Boost | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch courses (optional)
      try {
        const coursesRes = await fetch('/data/app/expert/me/courses');
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          if (coursesData.success) setCourses(coursesData.data.courses || []);
        }
      } catch {
        // Courses endpoint might not exist
      }

      // Fetch expert (required for preview)
      const expertRes = await fetch(`/data/experts/${expertId}`);
      if (expertRes.ok) {
        const expertData = await expertRes.json();
        if (expertData.success) setExpert(expertData.data);
      }

      // Fetch tenant for custom domain
      try {
        const tenantRes = await fetch(`/data/app/expert/me/tenant`);
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          if (tenantData.success && tenantData.data?.primaryDomain) {
            setExpertDomain(tenantData.data.primaryDomain);
          }
        }
      } catch {
        // Tenant might not exist
      }

      // Detect currency based on locale (simplified)
      const userLocale = navigator.language || 'en-US';
      if (userLocale.includes('IN') || userLocale === 'en-IN') {
        setCurrency('INR');
        setBudget(50000); // Default ₹500
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
          currency,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate campaign');
      }

      setCampaign(data.data);
      setEditedCreative(data.data.creative);
      setEditedTargeting(data.data.targeting);
      setStep('preview');
    } catch (err) {
      console.error('[DBG][CreateBoostPage] Error generating campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate campaign');
    } finally {
      setGenerating(false);
    }
  };

  // Create boost and show payment modal
  const handlePayAndLaunch = async () => {
    if (!campaign || !goal || !editedCreative || !editedTargeting) return;

    try {
      setSubmitting(true);
      setError(null);

      // Create boost (will be in pending_payment status)
      const response = await fetch('/data/app/expert/me/boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          courseId: goal === 'promote_course' ? courseId : undefined,
          budget,
          currency,
          creative: editedCreative,
          targeting: editedTargeting,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create boost');
      }

      // Store the created boost and show payment modal
      setCreatedBoost(data.data);
      setShowPaymentModal(true);
    } catch (err) {
      console.error('[DBG][CreateBoostPage] Error creating boost:', err);
      setError(err instanceof Error ? err.message : 'Failed to create boost');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    // If boost was created but payment cancelled, redirect to boost dashboard
    // The boost will be in pending_payment status
    if (createdBoost) {
      router.push(`/srv/${expertId}/boost`);
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
      setStep('payment');
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
    } else if (step === 'payment') {
      setStep('preview');
    }
  };

  const canProceed = () => {
    if (step === 'goal') return goal !== null;
    if (step === 'course') return courseId !== null;
    if (step === 'budget') return budget >= 1000;
    if (step === 'preview') return editedCreative !== null && editedTargeting !== null;
    return true;
  };

  const formatCurrency = (amount: number) => {
    return formatPrice(amount / 100, currency as SupportedCurrency);
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
          {['goal', 'course', 'budget', 'preview', 'payment'].map((s, i) => {
            const isActive = step === s;
            const isPast = ['goal', 'course', 'budget', 'preview', 'payment'].indexOf(step) > i;
            const isHidden = s === 'course' && goal !== 'promote_course';

            if (isHidden) return null;

            const stepLabels: Record<string, string> = {
              goal: 'Goal',
              course: 'Course',
              budget: 'Budget',
              preview: 'Preview',
              payment: 'Pay',
            };

            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
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
                      i + 1
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{stepLabels[s]}</span>
                </div>
                {i <
                  ['goal', 'course', 'budget', 'preview', 'payment'].filter(
                    x => !(x === 'course' && goal !== 'promote_course')
                  ).length -
                    1 && <div className="w-8 md:w-12 h-0.5 bg-gray-200 mx-1 md:mx-2 mb-4" />}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">What&apos;s your goal?</h2>
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
              currency={currency}
              minBudget={1000}
              maxBudget={10000000} // $100,000 or ₹100,000
            />
          </div>
        )}

        {/* Step 4: Preview Generated Campaign */}
        {step === 'preview' && campaign && expert && editedCreative && editedTargeting && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Review your campaign</h2>
            <p className="text-gray-600 text-sm mb-6">
              Our AI has generated this campaign for you. Edit any field to customize.
            </p>
            <CreativePreview
              creative={editedCreative}
              targeting={editedTargeting}
              reasoning={campaign.reasoning}
              expertName={expert.name}
              expertAvatar={expert.avatar}
              expertDomain={expertDomain}
              expertId={expertId}
              onCreativeChange={setEditedCreative}
              onTargetingChange={setEditedTargeting}
            />
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 'payment' && campaign && editedCreative && editedTargeting && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Pay and launch</h2>
            <p className="text-gray-600 text-sm mb-6">
              Review your campaign details and complete payment to launch.
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
                    <span className="text-gray-600">Headline</span>
                    <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
                      {editedCreative.headline}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-indigo-900 font-medium">Total Amount</p>
                    <p className="text-sm text-indigo-700">One-time payment for ad campaign</p>
                  </div>
                  <div className="text-2xl font-bold text-indigo-900">{formatCurrency(budget)}</div>
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"
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
                    <p className="text-gray-900 font-medium">What happens next?</p>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1">
                      <li>• Complete secure payment via Stripe/Razorpay</li>
                      <li>• Your ad will be submitted for review</li>
                      <li>• Once approved, it starts running on Facebook & Instagram</li>
                      <li>• Track performance from your dashboard</li>
                    </ul>
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

        {step === 'payment' ? (
          <button
            type="button"
            onClick={handlePayAndLaunch}
            disabled={submitting}
            className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Pay {formatCurrency(budget)}
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

      {/* Payment Modal */}
      {createdBoost && (
        <BoostPaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentModalClose}
          boost={createdBoost}
          expertId={expertId}
        />
      )}
    </div>
  );
}
