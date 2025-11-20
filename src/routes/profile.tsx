import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Check, User, Star, Trash2 } from 'lucide-react'
import { useProfiles, useFoods, useMeals, useDeleteProfile } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/profile')({ component: ProfilePage })

function ProfilePage() {
  const navigate = useNavigate()
  const { data: profiles, isLoading: profilesLoading } = useProfiles()
  const { activeProfile, setActiveProfile } = useProfile()
  const deleteProfile = useDeleteProfile()

  // Configure unified header - main screen, show logo without back button
  useSetHeader({})

  const handleSelectProfile = (profile: any) => {
    setActiveProfile(profile)
  }

  const handleCreateProfile = () => {
    navigate({ to: '/profiles/new' })
  }

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!confirm(`Are you sure you want to delete "${profileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      // For duplicate default profiles, we need to bypass the default check
      const profileToDelete = profiles?.find(p => p.id === profileId)
      if (profileToDelete?.isDefault && profiles) {
        // Check if there are other default profiles (duplicates)
        const defaultProfiles = profiles.filter(p => p.isDefault)
        if (defaultProfiles.length <= 1) {
          alert('Cannot delete the only default profile')
          return
        }
      }

      await deleteProfile.mutateAsync(profileId)

      // If we deleted the active profile, switch to another one
      if (activeProfile?.id === profileId && profiles) {
        const remainingProfiles = profiles.filter(p => p.id !== profileId)
        if (remainingProfiles.length > 0) {
          setActiveProfile(remainingProfiles[0])
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete profile')
    }
  }

  if (profilesLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 pb-20">
        <div className="max-w-md mx-auto">
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            Loading profiles...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                My Profiles
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Switch between pantrys or create a new one
              </p>
            </div>
          </div>

          {/* Create New Profile Button */}
          <button
            onClick={handleCreateProfile}
            className="w-full py-4 px-4 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Profile
          </button>

          {/* Profiles List */}
          <div className="space-y-3">
            {profiles && profiles.length > 0 ? (
              profiles.map((profile, index) => {
                // Find the first default profile
                const firstDefaultIndex = profiles.findIndex(p => p.isDefault)
                // Allow deleting if: not default, OR it's a duplicate default (not the first one)
                const canDelete = !profile.isDefault || (profile.isDefault && index !== firstDefaultIndex)

                return (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isActive={activeProfile?.id === profile.id}
                    canDelete={canDelete}
                    onSelect={() => handleSelectProfile(profile)}
                    onDelete={() => handleDeleteProfile(profile.id, profile.name)}
                  />
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No profiles found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProfileCardProps {
  profile: any
  isActive: boolean
  canDelete: boolean
  onSelect: () => void
  onDelete: () => void
}

function ProfileCard({ profile, isActive, canDelete, onSelect, onDelete }: ProfileCardProps) {
  const { data: items } = useFoods(profile.id)
  const { data: meals } = useMeals(profile.id)

  const itemCount = items?.length || 0
  const mealCount = meals?.length || 0

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      className={`relative w-full text-left p-5 rounded-xl border-2 transition-all ${
        isActive
          ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      {/* Top-right icon: Checkmark when active, Delete when inactive and deletable */}
      <div className="absolute top-3 right-3">
        {isActive ? (
          <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        ) : canDelete ? (
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Delete profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <button onClick={onSelect} className="w-full text-left pr-10">
        <div className="flex items-start mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
                profile.avatar
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950'
              }`}
            >
              {profile.avatar || <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {profile.name}
                </h3>
                {profile.isDefault && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              {profile.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {profile.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{itemCount}</span>
            items
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{mealCount}</span>
            meals
          </div>
        </div>
      </button>
    </div>
  )
}
