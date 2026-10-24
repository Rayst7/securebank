import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { BeneficiariesPage } from '../pages/BeneficiariesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HistoryPage } from '../pages/HistoryPage'
import { LoginPage } from '../pages/LoginPage'
import { MovementsPage } from '../pages/MovementsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PaymentsPage } from '../pages/PaymentsPage'
import { TransferPage } from '../pages/TransferPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/movimientos" element={<MovementsPage />} />
          <Route path="/transferencias" element={<TransferPage />} />
          <Route path="/beneficiarios" element={<BeneficiariesPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/historial" element={<HistoryPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
