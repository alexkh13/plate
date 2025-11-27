// src/routes/settings/tandem.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { clearTandemCache } from '../../utils/tandemCache'

export const Route = createFileRoute('/settings/tandem')({
  component: TandemSettingsPage,
})

function TandemSettingsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [region, setRegion] = useState('EU')
  const [isSaved, setIsSaved] = useState(false)
  const [isCacheCleared, setIsCacheCleared] = useState(false)

  useEffect(() => {
    setEmail(localStorage.getItem('tandem_email') || '')
    setRegion(localStorage.getItem('tandem_region') || 'EU')
  }, [])

  useSetHeader({
    title: 'Tandem Integration',
    showBack: true,
    backTo: '/settings',
  })

  const handleSave = () => {
    localStorage.setItem('tandem_email', email)
    // Avoid storing the password if it wasn't changed
    if (password) {
      localStorage.setItem('tandem_password', password)
    }
    localStorage.setItem('tandem_region', region)
    setIsSaved(true)
    // Clear password field after save for security
    setPassword('') 
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleClearCache = () => {
    clearTandemCache()
    setIsCacheCleared(true)
    setTimeout(() => setIsCacheCleared(false), 3000)
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          t:connect Credentials
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Enter your credentials to allow Plate to fetch bolus data from your Tandem pump.
          This data is sent directly to Tandem's servers and is not stored on our servers.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Leave blank to keep current"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Region
            </label>
            <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            >
                <option value="US">US</option>
                <option value="EU">EU</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            Save Credentials
          </button>
        </div>

        {isSaved && (
          <div className="mt-4 text-sm text-green-600 dark:text-green-400">
            Credentials saved successfully.
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
          Data Management
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Clear the locally cached bolus and CGM data. This will force a re-fetch from Tandem on the next view.
        </p>
        <button
            onClick={handleClearCache}
            className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
        >
            Reset Cache
        </button>
        {isCacheCleared && (
          <div className="mt-4 text-sm text-green-600 dark:text-green-400">
            Cache cleared successfully.
          </div>
        )}
      </div>
    </div>
  )
}