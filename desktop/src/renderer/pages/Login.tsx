import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

interface LoginPageProps {
  onLoggedIn: () => void
}

export function LoginPage({ onLoggedIn }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await window.clocksy.login({ email: email.trim(), password })
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-text-primary">
      <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-400 text-base font-bold text-orange-foreground"
          aria-hidden
        >
          C
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Sign in to Clocksy
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Use your work account to start tracking.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-status-error">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
          {isSubmitting ? (
            <>
              <Spinner size="xs" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </div>
  )
}
