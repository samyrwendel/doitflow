import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || index <= currentStep + 1);

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "flex flex-col items-center space-y-1 flex-1",
                  isClickable && "cursor-pointer"
                )}
                onClick={() => isClickable && onStepClick(index)}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && "border-white/30 bg-white/10 text-white",
                    !isCompleted && !isCurrent && "border-gray-300 bg-white text-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="text-center">
                  <div
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-white",
                      isCompleted && "text-green-600",
                      !isCompleted && !isCurrent && "text-white"
                    )}
                  >
                    {step.title}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      "h-0.5 transition-colors duration-300",
                      index < currentStep ? "bg-green-500" : "bg-gray-300"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onFinish?: () => void;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  finishLabel?: string;
  className?: string;
}

export function StepperNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onFinish,
  isNextDisabled = false,
  isPreviousDisabled = false,
  nextLabel = "Próximo",
  previousLabel = "Anterior",
  finishLabel = "Finalizar",
  className
}: StepperNavigationProps) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className={cn("flex justify-between items-center pt-6", className)}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={isPreviousDisabled || currentStep === 0}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
          "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {previousLabel}
      </button>

      <div className="flex items-center space-x-2 text-sm text-white">
        <span>{currentStep + 1}</span>
        <span>de</span>
        <span>{totalSteps}</span>
      </div>

      <button
        type="button"
        onClick={isLastStep ? onFinish : onNext}
        disabled={isNextDisabled}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
          "bg-blue-600 text-white hover:bg-blue-700",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center space-x-2"
        )}
      >
        <span>{isLastStep ? finishLabel : nextLabel}</span>
        {!isLastStep && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}