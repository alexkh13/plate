import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, UtensilsCrossed, Flame } from 'lucide-react'
import { useMeals } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { calculateNetCarbs, getCarbBadgeColor } from '@/utils/nutrition'

export const Route = createFileRoute('/meals/')({ component: MealsPage })

function MealsPage() {
  const { activeProfile } = useProfile()
  const { data: meals, isLoading, error } = useMeals(activeProfile?.id)

  // Configure unified header with "Create meal" action
  useSetHeader({
    section: 'Meals',
    pageActions: [
      {
        icon: Plus,
        label: 'Create Meal',
        href: '/meals/new',
      },
    ],
  })

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meals...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load meals</p>
        </div>
      </div>
    )
  }

  const hasMeals = meals && meals.length > 0

  // Group meals by type
  const mealsByType = meals?.reduce((acc, meal) => {
    if (!acc[meal.mealType]) {
      acc[meal.mealType] = []
    }
    acc[meal.mealType].push(meal)
    return acc
  }, {} as Record<string, typeof meals>)

  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack']
  const mealTypeLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks'
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20 min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6">
          {hasMeals ? (
            <div className="space-y-6">
              {mealTypeOrder.map(type => {
                const typeMeals = mealsByType?.[type]
                if (!typeMeals || typeMeals.length === 0) return null

                return (
                  <div key={type}>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 capitalize">
                      {mealTypeLabels[type as keyof typeof mealTypeLabels] || type}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      {typeMeals.map((meal) => (
                        <Link
                          key={meal.id}
                          to="/meals/$mealId"
                          params={{ mealId: meal.id }}
                          className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors overflow-hidden"
                        >
                          {/* Meal Image */}
                          {meal.mealImage ? (
                            <div className="h-32 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <img
                                src={meal.mealImage}
                                alt={meal.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-32 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 flex items-center justify-center">
                              <UtensilsCrossed className="w-12 h-12 text-orange-300 dark:text-orange-700" />
                            </div>
                          )}

                          {/* Meal Info */}
                          <div className="p-3">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 truncate">
                              {meal.name}
                            </h3>

                            {/* Nutrition Summary - Carb First */}
                            <div className="space-y-2">
                              {/* Total Carbs Badge */}
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${getCarbBadgeColor(calculateNetCarbs(meal.totalCarbs, meal.totalFiber))}`}>
                                <span>🥦</span>
                                <span>{Math.round(meal.totalCarbs * 10) / 10}g carbs</span>
                              </div>

                              {/* Macros */}
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{Math.round(meal.totalProtein * 10) / 10}g protein</span>
                                <span>•</span>
                                <span>{Math.round(meal.totalFat * 10) / 10}g fat</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Flame className="w-3 h-3" />
                                <span>{Math.round(meal.totalCalories)} cal</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-sm">
                <UtensilsCrossed className="w-24 h-24 text-gray-300 dark:text-gray-700 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                  No Meals Yet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start creating meals by combining foods from your Pantry.
                </p>
                <Link
                  to="/meals/new"
                  className="inline-flex items-center gap-2 py-3 px-6 bg-emerald-500 dark:bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Meal
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
