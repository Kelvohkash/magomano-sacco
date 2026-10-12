import type { Dispatch, SetStateAction } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'

interface AdminLoginFormProps {
  adminUsername: string
  setAdminUsername: Dispatch<SetStateAction<string>>
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  showPassword: boolean
  setShowPassword: Dispatch<SetStateAction<boolean>>
  isSubmitting: boolean
}

export function AdminLoginForm({
  adminUsername,
  setAdminUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
}: AdminLoginFormProps) {
  return (
    <>
      <label className="field-label" htmlFor="admin-username">
        Admin username
      </label>
      <input
        id="admin-username"
        name="username"
        type="text"
        autoComplete="username"
        value={adminUsername}
        onChange={(event) => setAdminUsername(event.target.value)}
        required
      />

      <div className="password-label-row">
        <label className="field-label" htmlFor="admin-password">
          Admin password
        </label>
      </div>
      <div className="password-field">
        <LockKeyhole className="field-icon" size={17} strokeWidth={1.8} aria-hidden="true" />
        <input
          id="admin-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your admin password"
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
        <span>{isSubmitting ? 'Signing in…' : 'Admin sign in'}</span>
        {!isSubmitting && <ArrowRight size={18} strokeWidth={1.8} />}
      </button>
    </>
  )
}

