import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Key, Save, AlertCircle, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { setGoogleAIToken } from '@/services/ai/gemini'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/settings/ai')({
  component: AISettingsPage,
})

function AISettingsPage() {
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load saved token from localStorage
    const savedToken = localStorage.getItem('google_ai_token') || ''
    setToken(savedToken)
  }, [])

  const handleSave = () => {
    localStorage.setItem('google_ai_token', token)
    setGoogleAIToken(token)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Configure unified header
  useSetHeader({
    showBack: true,
    backTo: '/settings',
    section: 'Settings',
    title: 'AI',
  })

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Google AI Token */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3 mb-4">
            <Key className="w-5 h-5 text-purple-500 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Google AI API Key
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Required: Add your Google AI API key to use Gemini AI for intelligent food analysis.
              </p>

              <div className="space-y-3">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />

                <button
                  onClick={handleSave}
                  className="w-full py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saved ? 'Saved!' : 'Save Token'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">How to get an API key:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li>Click "Create API Key"</li>
                  <li>Copy and paste it here</li>
                </ol>
                <p className="mt-2 text-xs">Free tier: 15 requests/minute, 1500 requests/day</p>
              </div>
            </div>
          </div>
        </section>

        {/* Model Info */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            About Gemini AI
          </h2>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong className="text-gray-900 dark:text-gray-100">Google Gemini</strong> is a powerful multimodal AI that understands images and generates intelligent insights.
            </p>

            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">What it analyzes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Category:</strong> Top, Bottom, Dress, Shoes, etc.</li>
                <li><strong>Colors:</strong> Primary and secondary colors</li>
                <li><strong>Style:</strong> Casual, formal, sporty, elegant</li>
                <li><strong>Occasion:</strong> Everyday, work, party, gym</li>
                <li><strong>Season:</strong> Summer, winter, all-season</li>
                <li><strong>Material:</strong> Denim, cotton, leather, etc.</li>
                <li><strong>Pattern:</strong> Solid, striped, floral, checkered</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">Works with:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Photos of people wearing clothes</li>
                <li>Flat-lay food photos</li>
                <li>Product shots</li>
                <li>Any food image</li>
              </ul>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mt-4">
              <p className="text-xs text-green-700 dark:text-green-300">
                <strong>Free Tier:</strong> 15 requests/minute • 1,500 requests/day
              </p>
            </div>

            <p className="text-xs pt-2 border-t border-gray-200 dark:border-gray-800 mt-4">
              Model: <a href="https://ai.google.dev/gemini-api/docs" target="_blank" rel="noopener noreferrer" className="text-purple-500 underline">Gemini 1.5 Flash</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
