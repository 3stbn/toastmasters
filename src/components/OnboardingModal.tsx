import { useState } from 'react';
import type { Translations } from '../i18n';

interface OnboardingModalProps {
  onDone: () => void;
  i18n: Translations;
}

export default function OnboardingModal({ onDone, i18n }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const cards = i18n.onboarding;
  const card = cards[step];
  const isLast = step === cards.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div key={step} className="animate-fade-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-4">
        <div className="text-center">
          <span className="text-5xl">{card.icon}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center">{card.title}</h2>
        <p className="text-gray-600 leading-relaxed text-center">{card.body}</p>

        {/* Dots */}
        <div className="flex justify-center gap-1.5">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-700 transition-all duration-150 hover:bg-gray-50 active:bg-gray-100"
            >
              {i18n.back}
            </button>
          )}
          <button
            onClick={isLast ? onDone : () => setStep((s) => s + 1)}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-all duration-150 hover:bg-blue-500 active:bg-blue-700"
          >
            {isLast ? i18n.getStarted : i18n.next}
          </button>
        </div>

        {!isLast && (
          <button
            onClick={onDone}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {i18n.skip}
          </button>
        )}
      </div>
    </div>
  );
}
