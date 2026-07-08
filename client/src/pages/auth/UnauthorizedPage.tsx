import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>You do not have access to this page with your current role.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link to="/reports">Go to reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}