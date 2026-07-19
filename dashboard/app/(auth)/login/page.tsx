import { BrandMark } from '@/components/brand'
import { Card } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default function LoginPage(): JSX.Element {
  return (
    <Card className="w-full max-w-sm p-6 shadow-sm">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark className="h-9 w-9 text-base" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">
            Sign in to Clocksy
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Use your admin account to open the dashboard.
          </p>
        </div>
      </div>

      <LoginForm />
    </Card>
  )
}
