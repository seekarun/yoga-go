'use client';

import type { BoostGoal } from '@/types';

interface GoalOption {
  value: BoostGoal;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const goals: GoalOption[] = [
  {
    value: 'get_students',
    title: 'Get More Students',
    description: 'Drive enrollments across all your courses',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
        />
      </svg>
    ),
  },
  {
    value: 'promote_course',
    title: 'Promote a Course',
    description: 'Focus on a specific course to maximize enrollments',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    value: 'brand_awareness',
    title: 'Brand Awareness',
    description: 'Increase visibility and grow your audience',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      </svg>
    ),
  },
];

interface GoalSelectorProps {
  value: BoostGoal | null;
  onChange: (goal: BoostGoal) => void;
}

export default function GoalSelector({ value, onChange }: GoalSelectorProps) {
  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <button
          key={goal.value}
          type="button"
          onClick={() => onChange(goal.value)}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
            value === goal.value
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              value === goal.value ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {goal.icon}
          </div>
          <div>
            <h4
              className={`font-medium ${value === goal.value ? 'text-indigo-900' : 'text-gray-900'}`}
            >
              {goal.title}
            </h4>
            <p className="text-sm text-gray-500">{goal.description}</p>
          </div>
          {value === goal.value && (
            <div className="ml-auto">
              <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
