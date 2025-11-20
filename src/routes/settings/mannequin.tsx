import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, RefreshCw, User, Trash2, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  getCachedMannequinTemplate,
  generateMannequinTemplate,
  clearMannequinTemplate,
  hasMannequinTemplate
} from '@/services/ai/mannequin-template'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/settings/mannequin')({
  component: MannequinSettingsPage,
})

function MannequinSettingsPage() {
  const navigate = useNavigate()
  const [mannequinImage, setMannequinImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [apiKey, setApiKey] = useState('')

  useSetHeader({
    showBack: true,
    backTo: '/settings',
    section: 'Settings',
    title: 'Mannequin Template',
  })

  // Load API key and mannequin on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('google_ai_token')
    if (storedKey) {
      setApiKey(storedKey)
    }

    const cached = getCachedMannequinTemplate()
    if (cached) {
      setMannequinImage(cached)
    }
  }, [])

  const handleGenerate = async () => {
    if (!apiKey) {
      if (confirm('Google AI API key not configured. Go to AI Settings?')) {
        navigate({ to: '/settings/ai' })
      }
      return
    }

    setIsGenerating(true)
    setGenerationProgress('Starting...')

    try {
      const result = await generateMannequinTemplate(
        apiKey,
        (message, progress) => {
          setGenerationProgress(`${message} (${Math.round(progress)}%)`)
        },
        '3:4' // Optimal aspect ratio for meal display
      )

      setMannequinImage(result)
      setGenerationProgress('')
      alert('Mannequin template generated successfully!')
    } catch (err) {
      console.error('Mannequin generation failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate mannequin'
      alert(`Generation failed: ${errorMessage}`)
      setGenerationProgress('')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClear = () => {
    if (confirm('Clear the mannequin template? It will be regenerated automatically when needed.')) {
      clearMannequinTemplate()
      setMannequinImage(null)
    }
  }

  const hasTemplate = hasMannequinTemplate()

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About Mannequin Template</p>
              <p className="text-blue-800 dark:text-blue-200">
                The mannequin template is used as a base for AI meal previews. It ensures all your meal visualizations have a consistent, professional look.
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Template Status
              </h2>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              hasTemplate
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {hasTemplate ? 'Generated' : 'Not Generated'}
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {hasTemplate
              ? 'Your mannequin template is ready and cached for use in meal previews.'
              : 'No mannequin template yet. It will be automatically generated when you create your first meal preview, or you can generate it now.'}
          </p>
        </div>

        {/* Mannequin Preview */}
        {mannequinImage && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Current Mannequin Template
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <img
                src={mannequinImage}
                alt="Mannequin Template"
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
            </div>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Generating Mannequin</div>
                <div className="text-sm opacity-90">{generationProgress || 'Processing...'}</div>
              </div>
            </div>
            <p className="text-xs opacity-75">
              This may take 30-60 seconds. The template will be cached for future use.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !apiKey}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 py-4 rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating
              ? 'Generating...'
              : hasTemplate
              ? 'Regenerate Mannequin'
              : 'Generate Mannequin'}
          </button>

          {hasTemplate && (
            <button
              onClick={handleClear}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 py-4 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 dark:border-red-800"
            >
              <Trash2 className="w-5 h-5" />
              Clear Template
            </button>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            How it works:
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>The mannequin is AI-generated using Gemini with professional proportions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>It's cached locally and reused for all meal previews</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Regenerate if you want a different mannequin style</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>If cleared, it will auto-generate when creating meal previews</span>
            </li>
          </ul>
        </div>

        {!apiKey && (
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              ⚠️ Google AI API key not configured. Please add it in{' '}
              <button
                onClick={() => navigate({ to: '/settings/ai' })}
                className="underline font-medium"
              >
                AI Settings
              </button>
              {' '}to generate mannequin templates.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
