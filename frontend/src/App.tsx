import { AuthProvider } from './contexts/AuthProvider'
import { ToastProvider } from './contexts/ToastProvider'
import { AppRouter } from './routes/router'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  )
}
