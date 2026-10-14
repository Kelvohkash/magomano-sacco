import { Check } from 'lucide-react'

interface RegistrationStep {
  title: string
  description: string
}

interface RegistrationStepsIndicatorProps {
  step: number
  steps: RegistrationStep[]
}

export function RegistrationStepsIndicator({ step, steps }: RegistrationStepsIndicatorProps) {
  return (
    <>
      <div className="join-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        <div className="join-progress-top">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <strong>{steps[step].title}</strong>
        </div>
        <div className="join-progress-track">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={`join-progress-segment ${index <= step ? 'complete' : ''}`}
            />
          ))}
        </div>
        <div className="join-step-labels">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={index === step ? 'current' : index < step ? 'complete' : ''}
            >
              {index < step ? <Check size={12} aria-hidden="true" /> : index + 1}
              <span>{item.title}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
