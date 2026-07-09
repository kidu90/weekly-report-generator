import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, MoonStar, SunMedium, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ChatWidget } from '@/components/ChatWidget'

const navItems = [
  { to: '/reports', label: 'My Reports', roles: ['TeamMember', 'Manager'] as const },
  { to: '/dashboard', label: 'Dashboard', roles: ['Manager'] as const },
  { to: '/dashboard/reports', label: 'Manager Reports', roles: ['Manager'] as const },
  { to: '/projects', label: 'Projects', roles: ['Manager'] as const },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleNavItems = user ? navItems.filter((item) => item.roles.some((role) => role === user.role)) : []

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="hidden w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/reports" className="text-lg font-semibold tracking-tight text-white">
            Weekly Report
          </Link>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleTheme}>
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>
        </div>
        <Separator className="bg-sidebar-muted/40" />
        <nav className="flex flex-1 flex-col gap-2 px-4 py-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-sidebar-muted/70',
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
            <p className="font-medium">Signed in as</p>
            <p className="truncate text-white/70">{user?.email}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/50">{user?.role}</p>
          </div>
          <Button variant="secondary" className="mt-4 w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setMobileOpen((open) => !open)}>
                <Menu className="h-4 w-4" />
              </Button>
              <Link to="/reports" className="font-semibold tracking-tight">
                Weekly Report
              </Link>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </Button>
          </div>
          {mobileOpen ? (
            <div className="border-t bg-background px-4 py-3">
              <nav className="flex flex-col gap-2">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{user?.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </div>
          ) : null}
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
        <ChatWidget />
      </div>
    </div>
  )
}