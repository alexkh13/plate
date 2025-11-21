import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Smile } from 'lucide-react'
import { useState } from 'react'
import { useCreateProfile } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/profiles/new')({ component: NewProfilePage })

const EMOJI_OPTIONS = ['🍎', '🥦', '🥕', '🍞', '🧀', '🥩', '🍲', '🥗', '🍊', '🍚', '🍳', '🍦']

function NewProfilePage() {
  const navigate = useNavigate()
  const createProfile = useCreateProfile()
  const { setActiveProfile } = useProfile()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('👔')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Configure unified header
  useSetHeader({
    showBack: true,
    backTo: '/profile',
    title: 'Create New Profile',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const newProfile = await createProfile.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        avatar: selectedEmoji,
        isDefault: false
      })

      // Set as active profile
      setActiveProfile(newProfile)

      // Navigate back to profiles page
      navigate({ to: '/profile' })
    } catch (error) {
      console.error('Failed to create profile:', error)
      alert('Failed to create profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
          {/* Profile Icon Selection */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Profile Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-blue-100 dark:bg-blue-950 ring-2 ring-blue-500 dark:ring-blue-500'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </section>

          {/* Profile Details */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Profile Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Kitchen, Gym Meals, Weekly Prep"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={50}
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this pantry collection..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={200}
              />
            </div>
          </section>

          {/* Preview */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg bg-gray-100 dark:bg-gray-800">
                {selectedEmoji}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {name || 'Profile Name'}
                </h4>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-3 px-4 bg-blue-500 dark:bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
