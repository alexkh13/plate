import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Bell } from 'lucide-react'

export const Route = createFileRoute('/notifications')({ component: NotificationsPage })

function NotificationsPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-16 z-10">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Notifications
          </button>
        </div>

        {/* Empty State */}
        <div className="px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-sm">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                No Notifications
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You're all caught up! We'll notify you when there's something new.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
