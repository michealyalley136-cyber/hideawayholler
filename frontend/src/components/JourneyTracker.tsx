'use client';

import { JourneyStep } from '@/lib/types';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

export function JourneyTracker({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.status} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                step.completed
                  ? 'bg-brand-600 text-white'
                  : step.current
                  ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              {step.completed ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={clsx('w-0.5 flex-1 min-h-[24px]', step.completed ? 'bg-brand-400' : 'bg-slate-200')} />
            )}
          </div>
          <div className="pb-6 pt-1">
            <p className={clsx('text-sm font-medium', step.current ? 'text-brand-700' : step.completed ? 'text-slate-700' : 'text-slate-400')}>
              {step.label}
            </p>
            {step.current && <p className="text-xs text-brand-600 mt-0.5">Current step</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
