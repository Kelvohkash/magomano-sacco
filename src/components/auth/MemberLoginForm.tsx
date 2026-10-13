import type { Dispatch, SetStateAction } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'

interface MemberLoginFormProps {
  nationalId: string
  setNationalId: Dispatch<SetStateAction<string>>
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  showPassword: boolean
  setShowPassword: Dispatch<SetStateAction<boolean>>
  isSubmitting: boolean
}

export function MemberLoginForm({
  nationalId,
  setNationalId,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
}: MemberLoginFormProps) {
  return (
    <>
      <label className="field-label" htmlFor="national-id">
        National ID
      </label>
      <input
        id="national-id"
        name="nationalId"
        type="text"
        autoComplete="username"
        placeholder="e.g. 37765731"
        value={nationalId}
        onChange={(event) => setNationalId(event.target.value)}
        maxLength={20}
        required
      />

      <div className="password-label-row">
        <label className="field-label" htmlFor="password">
          Password
        </label>
      </div>
      <div className="password-field">
        <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="visibility-button"
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((visible) => !visible)}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
        {!isSubmitting && <ArrowRight size={18} strokeWidth={1.8} />}
      </button>
    </>
  )
}

