import { UtensilsCrossed } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Food, MealFood } from '@/types'

interface MealThumbnailProps {
  foods: Array<Food & { portion?: { amount: number; unit: string; order: number } }>
  mealImage?: string // Photo of the complete meal
  mealFoods?: MealFood[] // MealFood junction data with bounding boxes
  totalCalories?: number
  totalProtein?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
  loading?: boolean
  showNutritionOverlay?: boolean
}

export function MealThumbnail({
  foods = [],
  mealImage,
  mealFoods,
  totalCalories,
  totalProtein,
  size = 'medium',
  className = '',
  loading = false,
  showNutritionOverlay = false
}: MealThumbnailProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset image state when mealImage changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [mealImage])

  // Get foods that have photos OR could use meal image as fallback
  const foodsWithPhotos = foods.filter(food => {
    // Include if food has its own photo
    if (food.photo) return true

    // Include if there's a meal image AND no bounding box (so it can use meal image as fallback)
    const mealFood = mealFoods?.find(mf => mf.foodId === food.id)
    const hasBoundingBox = !!mealFood?.boundingBox
    return !hasBoundingBox && mealImage
  })

  // Limit displayed foods to max 6 for better layout
  const displayFoods = foodsWithPhotos.slice(0, 6)
  const hasFoods = displayFoods.length > 0

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'h-24',
      icon: 'w-8 h-8',
      grid: 'gap-0.5',
      text: 'text-xs'
    },
    medium: {
      container: 'h-48',
      icon: 'w-12 h-12',
      grid: 'gap-1',
      text: 'text-sm'
    },
    large: {
      container: 'h-64',
      icon: 'w-16 h-16',
      grid: 'gap-2',
      text: 'text-base'
    }
  }

  const config = sizeConfig[size]

  // Determine grid layout based on number of foods
  const getGridLayout = () => {
    const count = displayFoods.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2'
    if (count === 4) return 'grid-cols-2'
    return 'grid-cols-3'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${config.container} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className} overflow-hidden`}>
        <div className="w-full h-full animate-pulse bg-gray-300 dark:bg-gray-700" />
      </div>
    )
  }

  // Meal Photo Display (Priority)
  if (mealImage && !imageError) {
    return (
      <div className={`${config.container} bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className} overflow-hidden relative`}>
        {/* Loading state */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        )}

        {/* Meal Image */}
        <img
          src={mealImage}
          alt="Meal"
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* Nutrition Overlay */}
        {showNutritionOverlay && totalCalories !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className={`${config.text} text-white font-semibold flex items-center gap-3`}>
              <span>{totalCalories} cal</span>
              {totalProtein !== undefined && <span>{totalProtein}g protein</span>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Empty state or no photos
  if (!hasFoods) {
    return (
      <div className={`${config.container} bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-lg border border-orange-200 dark:border-orange-800 ${className} flex flex-col items-center justify-center gap-2`}>
        <UtensilsCrossed className={`${config.icon} text-orange-400 dark:text-orange-600`} />
        {totalCalories !== undefined && (
          <div className={`${config.text} text-orange-600 dark:text-orange-400 font-semibold`}>
            {totalCalories} cal
          </div>
        )}
      </div>
    )
  }

  // Foods Grid Thumbnail Display
  return (
    <div className={`${config.container} bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className} overflow-hidden relative`}>
      <div className={`grid ${getGridLayout()} ${config.grid} w-full h-full`}>
        {displayFoods.map((food, index) => (
          <FoodPhoto
            key={food.id}
            food={food}
            index={index}
            totalFoods={displayFoods.length}
            mealImage={mealImage}
            mealFoods={mealFoods}
          />
        ))}
      </div>

      {/* Nutrition Overlay */}
      {showNutritionOverlay && totalCalories !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className={`${config.text} text-white font-semibold flex items-center gap-2`}>
            <span>{totalCalories} cal</span>
            {totalProtein !== undefined && <span>{totalProtein}g protein</span>}
          </div>
        </div>
      )}
    </div>
  )
}

interface FoodPhotoProps {
  food: Food
  index: number
  totalFoods: number
  mealImage?: string
  mealFoods?: MealFood[]
}

function FoodPhoto({ food, index, totalFoods, mealImage, mealFoods }: FoodPhotoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset error state when food changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [food.id])

  // Special handling for 3-food layout: first food spans 2 columns
  const shouldSpanTwoColumns = totalFoods === 3 && index === 0

  // Check if this food has a bounding box
  const mealFood = mealFoods?.find(mf => mf.foodId === food.id)
  const hasBoundingBox = !!mealFood?.boundingBox

  // Determine which photo to show
  // Priority: food.photo > whole meal image (if no bounding box) > empty state
  const photoSrc = food.photo || (!hasBoundingBox && mealImage ? mealImage : null)

  if (!photoSrc || imageError) {
    return (
      <div className={`relative bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ${shouldSpanTwoColumns ? 'col-span-2' : ''}`}>
        <UtensilsCrossed className="w-6 h-6 text-gray-400 dark:text-gray-600" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${shouldSpanTwoColumns ? 'col-span-2' : ''}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-300 dark:bg-gray-700 animate-pulse" />
      )}
      <img
        src={photoSrc}
        alt={food.name}
        loading="lazy"
        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  )
}
