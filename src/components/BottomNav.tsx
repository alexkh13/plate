import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { Apple, UtensilsCrossed, Plus, Lightbulb, Calendar } from 'lucide-react'
import { ActionDrawer } from './ActionDrawer'

export default function BottomNav() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const matchRoute = useMatchRoute()

  // Check if current route matches
  const isPantryActive = matchRoute({ to: '/pantry', fuzzy: true }) || matchRoute({ to: '/', fuzzy: true })
  const isMealsActive = matchRoute({ to: '/meals', fuzzy: true })
  const isDiscoverActive = matchRoute({ to: '/discover', fuzzy: true })
  const isCalendarActive = matchRoute({ to: '/calendar', fuzzy: true })

  return (
    <>
      <ActionDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-md mx-auto px-3">
          <div className="flex items-center justify-around py-1">
            <Link
              to="/pantry"
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-colors ${
                isPantryActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Apple className="w-5 h-5" />
              <span className="text-[10px] font-medium">Pantry</span>
            </Link>

            <Link
              to="/meals"
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-colors ${
                isMealsActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span className="text-[10px] font-medium">Meals</span>
            </Link>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex flex-col items-center gap-0.5 -mt-3 -translate-y-[2vh]"
            >
              <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors active:scale-95">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </button>

            <Link
              to="/discover"
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-colors ${
                isDiscoverActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Lightbulb className="w-5 h-5" />
              <span className="text-[10px] font-medium">Discover</span>
            </Link>

            <Link
              to="/calendar"
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 transition-colors ${
                isCalendarActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-medium">Calendar</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}
