import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ReportEditorPage } from '@/pages/reports/ReportEditorPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ManagerReportsPage } from '@/pages/dashboard/ManagerReportsPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute role="any" />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/reports" replace />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/new" element={<ReportEditorPage mode="create" />} />
          <Route path="reports/:id/edit" element={<ReportEditorPage mode="edit" />} />

          <Route element={<ProtectedRoute role="Manager" />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dashboard/reports" element={<ManagerReportsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}