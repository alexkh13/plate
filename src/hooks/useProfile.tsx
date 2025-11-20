import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Profile } from '@/types'
import { getDatabase } from '@/db'

interface ProfileContextType {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile) => void
  isLoading: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load or create default profile on mount
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const db = await getDatabase()

        // Check for existing profiles
        const profiles = await db.profiles.find().exec()

        let defaultProfile: any = null

        if (profiles.length === 0) {
          // No profiles exist, create default profile
          console.log('📝 Creating default profile...')
          const now = Date.now()
          const newProfile = await db.profiles.insert({
            id: `profile_${now}_default`,
            name: 'My Pantry',
            isDefault: true,
            createdAt: now,
            updatedAt: now
          })
          defaultProfile = newProfile.toJSON()
          console.log('✅ Default profile created:', defaultProfile.id)
        } else {
          // Profiles exist, try to load active profile from localStorage
          const storedProfileId = localStorage.getItem('activeProfileId')

          if (storedProfileId) {
            const storedProfile = await db.profiles.findOne(storedProfileId).exec()
            if (storedProfile) {
              defaultProfile = storedProfile.toJSON()
              console.log('✅ Loaded active profile from storage:', defaultProfile.id)
            }
          }

          // If no stored profile or it doesn't exist, use default profile
          if (!defaultProfile) {
            const dbDefaultProfile = await db.profiles.findOne({ selector: { isDefault: true } }).exec()
            if (dbDefaultProfile) {
              defaultProfile = dbDefaultProfile.toJSON()
              console.log('✅ Loaded default profile:', defaultProfile.id)
            } else {
              // Use first available profile if no default is set
              defaultProfile = profiles[0].toJSON()
              console.log('✅ Using first available profile:', defaultProfile.id)
            }
          }
        }

        if (defaultProfile) {
          setActiveProfileState(defaultProfile)
          localStorage.setItem('activeProfileId', defaultProfile.id)
          localStorage.setItem(`profile_${defaultProfile.id}`, JSON.stringify(defaultProfile))
        }
      } catch (error) {
        console.error('Failed to initialize profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeProfile()
  }, [])

  const setActiveProfile = (profile: Profile) => {
    setActiveProfileState(profile)
    // Persist to localStorage
    localStorage.setItem('activeProfileId', profile.id)
    localStorage.setItem(`profile_${profile.id}`, JSON.stringify(profile))
  }

  return (
    <ProfileContext.Provider value={{ activeProfile, setActiveProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    // During SSR or if provider is not mounted, return a safe default
    if (typeof window === 'undefined') {
      return { activeProfile: null, setActiveProfile: () => {}, isLoading: true }
    }
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
