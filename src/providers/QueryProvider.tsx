import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { initDatabase } from '@/db'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [dbReady, setDbReady] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true)

    // Initialize database only on client side
    initDatabase()
      .then(() => {
        console.log('✅ Database initialized successfully')
        setDbReady(true)
      })
      .catch((error) => {
        console.error('❌ Failed to initialize database:', error)
        // Set dbReady to true anyway to prevent infinite loading
        setDbReady(true)
      })
  }, [])

  // During SSR, just render children without database
  if (!isClient) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  // On client, show loading spinner until DB is ready
  if (!dbReady) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Initializing database...</p>
          </div>
        </div>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
