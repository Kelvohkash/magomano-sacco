interface RegistrationInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options?: {
    autoComplete?: string
    type?: string
    placeholder?: string
    maxLength?: number
    pattern?: string
    inputMode?: 'text' | 'numeric' | 'tel' | 'email'
    required?: boolean
  }
}

export function RegistrationInput({
  id,
  label,
  value,
  onChange,
  options = {},
}: RegistrationInputProps) {
  return (
    <label className="join-field" htmlFor={id}>
      <span>
        {label}
        {options.required && <b aria-hidden="true"> *</b>}
      </span>
      <input
        id={id}
        type={options.type ?? 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={options.autoComplete}
        placeholder={options.placeholder}
        maxLength={options.maxLength}
        pattern={options.pattern}
        inputMode={options.inputMode}
        required={options.required}
      />
    </label>
  )
}

