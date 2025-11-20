import { Link, useRouter } from '@tanstack/react-router'
import { Bell, User, Settings, MoreVertical } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useHeaderConfig, type PageAction } from '@/hooks/useHeaderConfig'
import { useState } from 'react'

function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flower petals radiating from center */}
      {/* Top petal */}
      <ellipse cx="12" cy="5" rx="2.5" ry="4" />
      {/* Top-right petal */}
      <ellipse cx="17" cy="7" rx="2.5" ry="4" transform="rotate(45 17 7)" />
      {/* Right petal */}
      <ellipse cx="19" cy="12" rx="2.5" ry="4" transform="rotate(90 19 12)" />
      {/* Bottom-right petal */}
      <ellipse cx="17" cy="17" rx="2.5" ry="4" transform="rotate(135 17 17)" />
      {/* Bottom petal */}
      <ellipse cx="12" cy="19" rx="2.5" ry="4" />
      {/* Bottom-left petal */}
      <ellipse cx="7" cy="17" rx="2.5" ry="4" transform="rotate(-135 7 17)" />
      {/* Left petal */}
      <ellipse cx="5" cy="12" rx="2.5" ry="4" transform="rotate(90 5 12)" />
      {/* Top-left petal */}
      <ellipse cx="7" cy="7" rx="2.5" ry="4" transform="rotate(-45 7 7)" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="3" opacity="0.9" />
    </svg>
  )
}

function ActionMenu({ pageActions }: { pageActions?: PageAction[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const hasPageActions = pageActions && pageActions.length > 0

  const handleActionClick = (action: PageAction) => {
    if (action.onClick) {
      action.onClick()
    } else if (action.href) {
      router.navigate({ to: action.href as any })
    }
    setIsOpen(false)
  }

  return (
    <>
      {/* Menu Button - Always show as unified menu */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Menu Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Content */}
          <div className="fixed top-16 right-4 z-50 w-64 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="py-2">
                {/* Page Actions - if present */}
                {hasPageActions && (
                  <>
                    {pageActions.map((action, index) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={index}
                          onClick={() => handleActionClick(action)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            action.variant === 'destructive'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{action.label}</span>
                        </button>
                      )
                    })}

                    {/* Divider between page actions and global actions */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                    {/* Global Actions Section Header */}
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        More
                      </p>
                    </div>
                  </>
                )}

                {/* Global Actions - always shown */}
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function Header() {
  const { activeProfile } = useProfile()
  const { config } = useHeaderConfig()

  const { section, title, pageActions, customRight } = config

  // Determine what to display
  const showBreadcrumb = section && title
  const showSectionOnly = section && !title
  const showTitleOnly = !section && title

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="text-emerald-500 dark:text-emerald-400 flex-shrink-0">
                <LogoIcon />
              </div>
              {showBreadcrumb ? (
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">Plate</span>
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 flex-shrink-0">{section}</span>
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-600 flex-shrink-0">/</span>
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 truncate">{title}</span>
                </div>
              ) : showSectionOnly ? (
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">Plate</span>
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 truncate">{section}</span>
                </div>
              ) : showTitleOnly ? (
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</span>
              ) : (
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">Plate</span>
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400 truncate">Pantry</span>
                </div>
              )}
            </Link>

            {/* Active Profile Indicator - only show on home */}
            {!section && !title && activeProfile && (
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {activeProfile.avatar && (
                  <span className="text-sm">{activeProfile.avatar}</span>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {activeProfile.name}
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {customRight || <ActionMenu pageActions={pageActions} />}
          </div>
        </div>
      </div>
    </header>
  )
}
