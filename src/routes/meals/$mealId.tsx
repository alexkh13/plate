import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Edit, Trash2, Plus, Flame, UtensilsCrossed, Info, BarChart4 } from 'lucide-react'
import { useMealWithFoods, useDeleteMeal, useMealFoods, useSyncMealNutrition } from '@/hooks/useData'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { useState, useMemo, useEffect, useRef } from 'react'
import { calculateNetCarbs, getCarbTextColor, getCarbBorderColor, getCarbBgOpacity, calculateMealNutritionFromFoods, calculatePortionNutrition, isMealNutritionOutOfSync } from '@/utils/nutrition'
import BolusChart from '@/components/BolusChart'

export const Route = createFileRoute('/meals/$mealId')({
  component: MealDetailPage,
})

interface NutritionSummaryProps {
  nutrition: {
    totalCalories: number
    totalProtein: number
    totalCarbs: number
    totalFat: number
    totalFiber: number
    totalSugar: number
  }
}

function NutritionSummary({ nutrition }: NutritionSummaryProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const netCarbs = calculateNetCarbs(nutrition.totalCarbs, nutrition.totalFiber)
  const totalCarbs = Math.round(nutrition.totalCarbs * 10) / 10

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowBreakdown(false)
      }
    }

    if (showBreakdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showBreakdown])

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">
        Nutrition Summary
      </h2>

      {/* Total Carbs - Hero Section */}
      <div className={`mb-6 p-4 rounded-xl border-2 relative ${getCarbBorderColor(netCarbs)} ${getCarbBgOpacity(netCarbs)}`}>
        <div className="flex items-center gap-3 justify-center">
          <span className="text-3xl">🥦</span>
          <div className="flex-1">
            <div className={`text-4xl font-bold ${getCarbTextColor(netCarbs)}`}>
              {totalCarbs}g
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Carbs</div>
          </div>
          <button
            ref={buttonRef}
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Show carb breakdown"
          >
            <Info className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Popover */}
        {showBreakdown && (
          <div
            ref={popoverRef}
            className="absolute z-10 top-full mt-2 right-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Carbohydrate Breakdown
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Carbs</span>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {totalCarbs}g
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fiber</span>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {Math.round(nutrition.totalFiber * 10) / 10}g
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Net Carbs</span>
                <span className={`text-xl font-bold ${getCarbTextColor(netCarbs)}`}>
                  {Math.round(netCarbs * 10) / 10}g
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sugar</span>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {Math.round(nutrition.totalSugar * 10) / 10}g
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Macronutrients */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {Math.round(nutrition.totalProtein * 10) / 10}g
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Protein</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {Math.round(nutrition.totalFat * 10) / 10}g
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Fat</div>
        </div>
      </div>

      {/* Calories */}
      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Flame className="w-4 h-4" />
        <span className="text-sm">{Math.round(nutrition.totalCalories)} calories</span>
      </div>
    </div>
  )
}

function MealDetailPage() {
  const navigate = useNavigate()
  const { mealId } = Route.useParams()
  const { data: meal, isLoading, error } = useMealWithFoods(mealId)
  const { data: mealFoods } = useMealFoods(mealId)
  const deleteMeal = useDeleteMeal()
  const syncMealNutrition = useSyncMealNutrition()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBolusChart, setShowBolusChart] = useState(false)

  // Calculate live nutrition from current food data × portion sizes
  const liveNutrition = useMemo(() => {
    if (!meal) return null
    return calculateMealNutritionFromFoods(meal)
  }, [meal])

  // Auto-sync cached nutrition if out of sync
  useEffect(() => {
    if (meal && liveNutrition && !syncMealNutrition.isPending) {
      if (isMealNutritionOutOfSync(meal, liveNutrition)) {
        console.log('🔄 Meal nutrition out of sync, syncing...', {
          cached: {
            calories: meal.totalCalories,
            protein: meal.totalProtein,
            carbs: meal.totalCarbs
          },
          live: {
            calories: liveNutrition.totalCalories,
            protein: liveNutrition.totalProtein,
            carbs: liveNutrition.totalCarbs
          }
        })
        syncMealNutrition.mutate(mealId)
      }
    }
  }, [meal, liveNutrition, mealId, syncMealNutrition])

  const handleDelete = async () => {
    try {
      await deleteMeal.mutateAsync(mealId)
      navigate({ to: '/meals' })
    } catch (err) {
      console.error('Failed to delete meal:', err)
      alert('Failed to delete meal')
    }
  }

  // Configure unified header
  useSetHeader({
    showBack: true,
    backTo: '/meals',
    section: 'Meals',
    title: meal?.name || 'Details',
    pageActions: [
      {
        icon: Edit,
        label: 'Edit Meal',
        onClick: () => navigate({ to: '/meals/$mealId/edit', params: { mealId } }),
      },
      {
        icon: Trash2,
        label: 'Delete Meal',
        onClick: () => setShowDeleteConfirm(true),
        variant: 'destructive' as const,
      },
    ],
  })

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meal...</p>
        </div>
      </div>
    )
  }

  if (error || !meal) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load meal</p>
        </div>
      </div>
    )
  }

  const mealTypeLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack'
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-20">
      <div className="max-w-md mx-auto">
        {/* Meal Photo */}
        {meal.mealImage ? (
          <div className="w-full h-64 bg-gray-200 dark:bg-gray-800">
            <img
              src={meal.mealImage}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30 flex items-center justify-center">
            <UtensilsCrossed className="w-24 h-24 text-orange-300 dark:text-orange-700" />
          </div>
        )}

        <div className="px-4 py-6 space-y-6">
          {/* Meal Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full capitalize">
                {mealTypeLabels[meal.mealType as keyof typeof mealTypeLabels] || meal.mealType}
              </span>
              {meal.timestamp && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(meal.timestamp).toLocaleString()}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {meal.name}
            </h1>
            {meal.notes && (
              <p className="text-gray-600 dark:text-gray-400">{meal.notes}</p>
            )}
          </div>

          {/* Nutrition Summary */}
          {liveNutrition && (
            <NutritionSummary nutrition={liveNutrition} />
          )}

          {/* Foods in Meal */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Foods ({meal.foods?.length || 0})
              </h2>
              <Link
                to="/meals/$mealId/edit"
                params={{ mealId }}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Manage
              </Link>
            </div>

            {meal.foods && meal.foods.length > 0 ? (
              <div className="space-y-3">
                {meal.foods.map((food) => {
                  // Check if this food has a bounding box
                  const mealFood = mealFoods?.find(mf => mf.foodId === food.id)
                  const hasBoundingBox = !!mealFood?.boundingBox

                  // Determine which photo to show
                  // Priority: food.photo > whole meal image (if no bounding box) > empty state
                  const photoSrc = food.photo || (!hasBoundingBox && meal.mealImage ? meal.mealImage : null)

                  return (
                    <Link
                      key={food.id}
                      to="/foods/$foodId"
                      params={{ foodId: food.id }}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* Food Photo */}
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={food.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="w-6 h-6 text-gray-400" />
                        </div>
                      )}

                      {/* Food Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {food.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">
                            {food.portion?.amount} {food.portion?.unit}
                          </span>
                          <span>•</span>
                          <span>{food.calories} cal</span>
                        </div>
                      </div>

                      {/* Nutrition per portion */}
                      <div className="text-right">
                        {food.portion && (() => {
                          const portionNutrition = calculatePortionNutrition(food, food.portion)
                          return (
                            <>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {portionNutrition.calories} cal
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {portionNutrition.protein}g protein
                              </p>
                            </>
                          )
                        })()}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <UtensilsCrossed className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No foods in this meal yet
                </p>
                <Link
                  to="/meals/$mealId/edit"
                  params={{ mealId }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 dark:bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Foods
                </Link>
              </div>
            )}
          </div>

          {/* Tandem Integration */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Tandem Integration
                </h2>
                <button
                onClick={() => setShowBolusChart(!showBolusChart)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Toggle bolus chart"
                >
                <BarChart4 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>
            {showBolusChart && meal.timestamp && (
                <BolusChart mealTime={new Date(meal.timestamp)} />
            )}
          </div>

          {/* Tags */}
          {meal.tags && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {meal.tags.split(',').map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              Delete Meal?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{meal.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}