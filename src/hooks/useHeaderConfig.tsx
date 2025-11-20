import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface PageAction {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'destructive'
}

export interface HeaderConfig {
  showBack?: boolean
  backTo?: string
  section?: string // Section name for breadcrumb (e.g., "Pantry", "Meals")
  title?: string // Page title (short form for breadcrumbs, e.g., "Details", "New")
  pageActions?: PageAction[]
  customRight?: ReactNode
}

interface HeaderConfigContextType {
  config: HeaderConfig
  setConfig: (config: HeaderConfig) => void
  resetConfig: () => void
}

const HeaderConfigContext = createContext<HeaderConfigContextType | undefined>(undefined)

export function HeaderConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<HeaderConfig>({})

  const setConfig = (newConfig: HeaderConfig) => {
    setConfigState(newConfig)
  }

  const resetConfig = () => {
    setConfigState({})
  }

  return (
    <HeaderConfigContext.Provider value={{ config, setConfig, resetConfig }}>
      {children}
    </HeaderConfigContext.Provider>
  )
}

export function useHeaderConfig() {
  const context = useContext(HeaderConfigContext)
  if (!context) {
    // During SSR or if provider is not mounted, return a safe default
    if (typeof window === 'undefined') {
      return { config: {}, setConfig: () => {}, resetConfig: () => {} }
    }
    throw new Error('useHeaderConfig must be used within HeaderConfigProvider')
  }
  return context
}

// Hook for pages to configure their header
export function useSetHeader(config: HeaderConfig) {
  const { setConfig, resetConfig } = useHeaderConfig()

  // Memoize the serializable config to prevent unnecessary updates
  const serializableConfig = useMemo(() => ({
    showBack: config.showBack,
    backTo: config.backTo,
    section: config.section,
    title: config.title,
    // Serialize pageActions without functions
    pageActions: config.pageActions?.map(action => ({
      label: action.label,
      href: action.href,
      variant: action.variant,
    })),
    // customRight can't be serialized, so we'll just track if it exists
    hasCustomRight: !!config.customRight,
  }), [config.showBack, config.backTo, config.section, config.title, config.pageActions, config.customRight])

  // Create a stable string representation
  const configString = useMemo(() => JSON.stringify(serializableConfig), [serializableConfig])

  useEffect(() => {
    // Always set the config (including the non-serializable parts like onClick handlers)
    setConfig(config)
  }, [configString, config, setConfig])

  useEffect(() => {
    // Reset only on unmount
    return () => {
      resetConfig()
    }
  }, [resetConfig])
}
