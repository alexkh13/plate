import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Bell, Lock, Palette, Database, Info, RotateCcw, Check, X, Sparkles, User, Waypoints } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useProfile } from '@/hooks/useProfile'
import { useResetProfile } from '@/hooks/useData'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { useState } from 'react'

export const Route = createFileRoute('/settings/')({ component: SettingsPage })

function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { activeProfile } = useProfile()
  const resetProfile = useResetProfile()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Configure unified header - main screen, show logo without back button
  useSetHeader({ section: 'Settings' })

  const handleResetProfile = async () => {
    if (!activeProfile) return

    try {
      await resetProfile.mutateAsync(activeProfile.id)
      setShowConfirmDialog(false)
      // Show success feedback (you could add a toast notification here)
      alert('Profile reset successfully! All items, meals, and calendar entries have been removed.')
    } catch (error) {
      console.error('Failed to reset profile:', error)
      alert('Failed to reset profile. Please try again.')
    }
  }

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        { icon: Sparkles, label: 'AI Settings', description: 'Configure AI and API tokens', route: '/settings/ai' },
        { icon: Waypoints, label: 'Tandem Integration', description: 'Connect to t:connect for bolus data', route: '/settings/tandem' },
        { icon: Bell, label: 'Notifications', description: 'Manage notification settings', route: '/settings/notifications' },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        { icon: Lock, label: 'Privacy', description: 'Control your privacy settings', route: '/settings/privacy' },
        { icon: Database, label: 'Data Management', description: 'Manage your data', route: '/settings/data' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: Info, label: 'About Plate', description: 'Version and information', route: '/settings/about' },
      ],
    },
  ]

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {settingsSections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
                {section.title}
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {section.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={itemIdx}
                      onClick={() => navigate({ to: item.route })}
                      className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        itemIdx !== section.items.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-800'
                          : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {item.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Theme Selection */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Appearance
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setTheme('light')}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
              >
                <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800 dark:text-gray-200">Light Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Use light theme</p>
                </div>
                {theme === 'light' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
              >
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme</p>
                </div>
                {theme === 'dark' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <button
                onClick={() => setTheme('system')}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800 dark:text-gray-200">System</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Follow system theme</p>
                </div>
                {theme === 'system' && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            </div>
          </section>

          {/* Reset Profile Button */}
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!activeProfile}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900 transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-5 h-5" />
            Reset Current Profile
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Reset Profile?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  This will permanently delete all data associated with <span className="font-semibold">{activeProfile?.name}</span>:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
                  <li>All food items</li>
                  <li>All saved meals</li>
                  <li>All calendar entries</li>
                </ul>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-3">
                  This action cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetProfile}
                disabled={resetProfile.isPending}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetProfile.isPending ? 'Resetting...' : 'Reset Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
