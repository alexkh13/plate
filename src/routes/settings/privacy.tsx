import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Shield, Eye, Image, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/settings/privacy')({ component: PrivacyPage })

interface PrivacySettings {
  storePhotosLocally: boolean
  autoDeleteOldItems: boolean
  autoDeleteDays: number
  analyticsEnabled: boolean
  shareUsageData: boolean
}

function PrivacyPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<PrivacySettings>({
    storePhotosLocally: true,
    autoDeleteOldItems: false,
    autoDeleteDays: 365,
    analyticsEnabled: false,
    shareUsageData: false
  })
  const [cacheSize, setCacheSize] = useState('0 MB')

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('privacySettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load privacy settings:', error)
      }
    }

    // Estimate cache size
    estimateCacheSize()
  }, [])

  const estimateCacheSize = () => {
    try {
      let totalSize = 0
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length
        }
      }
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2)
      setCacheSize(`${sizeInMB} MB`)
    } catch (error) {
      console.error('Failed to estimate cache size:', error)
      setCacheSize('Unknown')
    }
  }

  // Save settings to localStorage whenever they change
  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('privacySettings', JSON.stringify(newSettings))
  }

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cache? This will remove temporary data but keep your pantry items.')) {
      // Clear only cache-related items, not the actual database
      const keysToKeep = Object.keys(localStorage).filter(key =>
        key.startsWith('profile_') ||
        key === 'activeProfileId' ||
        key === 'theme' ||
        key === 'privacySettings' ||
        key === 'notificationSettings'
      )

      localStorage.clear()
      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) localStorage.setItem(key, value)
      })

      estimateCacheSize()
      alert('Cache cleared successfully!')
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-16 z-10">
          <button
            onClick={() => navigate({ to: '/settings' })}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Privacy
          </button>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Data Storage */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Data Storage
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          Store Photos Locally
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Keep item photos in browser storage
                        </p>
                      </div>
                      <button
                        onClick={() => updateSetting('storePhotosLocally', !settings.storePhotosLocally)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.storePhotosLocally
                            ? 'bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.storePhotosLocally ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          Auto-Delete Old Items
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Automatically remove unused items
                        </p>
                      </div>
                      <button
                        onClick={() => updateSetting('autoDeleteOldItems', !settings.autoDeleteOldItems)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.autoDeleteOldItems
                            ? 'bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.autoDeleteOldItems ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {settings.autoDeleteOldItems && (
                      <div className="mt-4">
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Delete items not used in {settings.autoDeleteDays} days
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="730"
                          step="30"
                          value={settings.autoDeleteDays}
                          onChange={(e) => updateSetting('autoDeleteDays', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>30 days</span>
                          <span>2 years</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy Controls */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Privacy Controls
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          Analytics
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Help improve the app with usage data
                        </p>
                      </div>
                      <button
                        onClick={() => updateSetting('analyticsEnabled', !settings.analyticsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.analyticsEnabled
                            ? 'bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.analyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-50 dark:bg-green-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          Share Usage Data
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Anonymous data for app improvement
                        </p>
                      </div>
                      <button
                        onClick={() => updateSetting('shareUsageData', !settings.shareUsageData)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.shareUsageData
                            ? 'bg-blue-600'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.shareUsageData ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cache Management */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Cache
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Cache Size
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cacheSize}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </section>

          {/* Privacy Note */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <span className="font-semibold">Your Privacy Matters:</span> All your data is stored
              locally on your device. We never send your pantry data to external servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
