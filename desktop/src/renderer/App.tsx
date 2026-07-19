import { useEffect, useState } from 'react'
import { LoginPage } from '@/pages/Login'
import { TrackerPage } from '@/pages/Tracker'
import { Spinner } from '@/components/ui/spinner'

type AuthUser = { id: string; email: string | null }

function App(): JSX.Element {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    void window.clocksy.getUser().then(setUser)
  }, [])

  async function handleLogout(): Promise<void> {
    await window.clocksy.logout()
    setUser(null)
  }

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="md" label="Loading" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLoggedIn={() => void window.clocksy.getUser().then(setUser)} />
  }

  return (
    <TrackerPage email={user.email} onLogout={() => void handleLogout()} />
  )
}

export default App
