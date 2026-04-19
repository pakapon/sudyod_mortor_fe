import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from '@/routes'
import { useAuthStore } from '@/stores/authStore'
import { ApiErrorModal } from '@/components/ui/ApiErrorModal'

export function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
      <ApiErrorModal />
    </>
  )
}
