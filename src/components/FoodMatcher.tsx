// FoodMatcher Component
// Shows similar foods from pantry catalog and allows user to select a match or create new

import { UtensilsCrossed, Check, Plus, X } from 'lucide-react'
import type { Food } from '@/types'
import type { NutritionData, FoodMatch } from '@/utils/foodMatching'
import { findMatchingFoods } from '@/utils/foodMatching'
import { calculateNetCarbs, getCarbTextColor } from '@/utils/nutrition'

export interface DetectedFoodData {
  name: string
  category: string
  nutrition: NutritionData
  imageData?: string
}

interface FoodMatcherProps {
  detectedFood: DetectedFoodData
  existingFoods: Food[]
  onSelectMatch: (food: Food) => void
  onCreateNew: () => void
  onCancel: () => void
}

export function FoodMatcher({
  detectedFood,
  existingFoods,
  onSelectMatch,
  onCreateNew,
  onCancel
}: FoodMatcherProps) {
  // Find matching foods
  const matches = findMatchingFoods(
    detectedFood.name,
    detectedFood.category,
    detectedFood.nutrition,
    existingFoods,
    5, // max results
    50  // min confidence (lowered to show more results)
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Find Similar Food
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detected: <span className="font-semibold">{detectedFood.name}</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Detected Food Preview */}
        {detectedFood.imageData && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <img
                src={detectedFood.imageData}
                alt={detectedFood.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  AI Detected Nutrition:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className={`font-semibold ${getCarbTextColor(calculateNetCarbs(detectedFood.nutrition.carbs, detectedFood.nutrition.fiber))}`}>
                    🥦 {calculateNetCarbs(detectedFood.nutrition.carbs, detectedFood.nutrition.fiber)}g net
                  </span>
                  <span className="text-gray-500 mx-1">•</span>
                  {detectedFood.nutrition.carbs}g carbs
                  <span className="text-gray-500 mx-1">•</span>
                  {detectedFood.nutrition.protein}g protein
                  <span className="text-gray-500 mx-1">•</span>
                  {detectedFood.nutrition.fat}g fat
                  <span className="text-gray-500 mx-1">•</span>
                  {detectedFood.nutrition.calories} cal
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto p-6">
          {matches.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Similar foods in your pantry ({matches.length}):
              </p>
              {matches.map((match: FoodMatch) => (
                <button
                  key={match.food.id}
                  onClick={() => onSelectMatch(match.food)}
                  className="w-full flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 text-left group"
                >
                  {match.food.photo ? (
                    <img
                      src={match.food.photo}
                      alt={match.food.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {match.food.name}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className={`
                          px-2 py-0.5 rounded-full text-xs font-bold
                          ${match.confidence >= 80
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : match.confidence >= 60
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }
                        `}>
                          {match.confidence}% match
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {match.food.category}
                      {match.food.brand && ` • ${match.food.brand}`}
                    </p>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <span className={`font-semibold ${getCarbTextColor(calculateNetCarbs(match.food.carbs, match.food.fiber))}`}>
                        🥦 {calculateNetCarbs(match.food.carbs, match.food.fiber)}g net
                      </span>
                      <span className="text-gray-500 mx-1">•</span>
                      {match.food.carbs}g carbs
                      <span className="text-gray-500 mx-1">•</span>
                      {match.food.protein}g protein
                      <span className="text-gray-500 mx-1">•</span>
                      {match.food.fat}g fat
                      <span className="text-gray-500 mx-1">•</span>
                      {match.food.calories} cal
                    </p>

                    {match.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {match.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Check className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UtensilsCrossed className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No similar foods found in your pantry
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Click "Create New Food" to add this to your catalog
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <button
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create New Food
          </button>

          {matches.length === 0 && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-500">
              This will add "{detectedFood.name}" to your pantry
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
