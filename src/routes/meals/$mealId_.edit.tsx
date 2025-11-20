import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Plus, X, Sparkles, RefreshCw, Layers, Camera } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useFoods, useMealWithFoods, useUpdateMeal, useMealFoods, useUpdateMealFood } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { BoundingBoxEditor, type BoundingBox } from '@/components/BoundingBoxEditor'

export const Route = createFileRoute('/meals/$mealId_/edit')({ component: EditMealPage })

interface MealFoodFormData {
  id: string // mealFood connection id
  foodId: string
  name: string
  category: string
  photo: string // Food's standalone photo
  portion: {
    amount: number
    unit: string
  }
  // Meal-specific data
  boundingBox?: BoundingBox
  croppedImageData?: string // Cropped from meal image
  generatedImageData?: string // AI generated clean image
  currentDisplayImage: string // What's currently displayed
}

function EditMealPage() {
  const navigate = useNavigate()
  const { mealId } = Route.useParams()
  const { activeProfile } = useProfile()
  const { data: allFoods } = useFoods(activeProfile?.id)
  const { data: meal, isLoading } = useMealWithFoods(mealId)
  const { data: mealFoods } = useMealFoods(mealId)
  const updateMeal = useUpdateMeal()
  const updateMealFood = useUpdateMealFood()

  const [formData, setFormData] = useState({
    name: '',
    mealType: 'lunch',
    notes: ''
  })
  const [mealFoodItems, setMealFoodItems] = useState<MealFoodFormData[]>([])
  const [editingBoundingBoxForFood, setEditingBoundingBoxForFood] = useState<string | null>(null)
  const [selectedBoundingBox, setSelectedBoundingBox] = useState<BoundingBox | null>(null)
  const [showAddFoodModal, setShowAddFoodModal] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isReExtracting, setIsReExtracting] = useState(false)

  const imageRef = useRef<HTMLImageElement>(null)

  // Load meal image dimensions
  useEffect(() => {
    if (meal?.mealImage) {
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
      }
      img.src = meal.mealImage
    }
  }, [meal?.mealImage])

  // Pre-populate form when meal data is loaded
  useEffect(() => {
    if (meal && mealFoods) {
      setFormData({
        name: meal.name || '',
        mealType: meal.mealType || 'lunch',
        notes: meal.notes || ''
      })

      // Build meal food items with proper structure
      const items: MealFoodFormData[] = meal.foods?.map((food) => {
        const mealFood = mealFoods.find(mf => mf.foodId === food.id)

        // Determine current display image
        let currentDisplayImage = food.photo || ''
        if (mealFood?.croppedImageData) {
          currentDisplayImage = mealFood.generatedImageData || mealFood.croppedImageData
        }

        return {
          id: mealFood?.id || food.id,
          foodId: food.id,
          name: food.name,
          category: food.category,
          photo: food.photo || '',
          portion: food.portion || { amount: 100, unit: 'g' },
          boundingBox: mealFood?.boundingBox,
          croppedImageData: mealFood?.croppedImageData,
          generatedImageData: mealFood?.generatedImageData,
          currentDisplayImage
        }
      }) || []

      setMealFoodItems(items)
    }
  }, [meal, mealFoods])

  const handleSave = async () => {
    if (!formData.name) {
      alert('Please enter a meal name')
      return
    }

    if (mealFoodItems.length === 0) {
      alert('Please add at least one food item to the meal')
      return
    }

    try {
      // Update meal basic info
      await updateMeal.mutateAsync({
        id: mealId,
        data: {
          name: formData.name,
          mealType: formData.mealType,
          notes: formData.notes || undefined,
          // Update itemIds
          itemIds: mealFoodItems.map(f => f.foodId)
        }
      })

      // Update each mealFood with portion and bounding box
      for (const mealFood of mealFoodItems) {
        const mf = mealFoods?.find(mf => mf.foodId === mealFood.foodId)
        if (mf) {
          await updateMealFood.mutateAsync({
            id: mf.id,
            data: {
              portion: mealFood.portion,
              boundingBox: mealFood.boundingBox,
              croppedImageData: mealFood.croppedImageData,
              generatedImageData: mealFood.generatedImageData
            }
          })
        }
      }

      navigate({ to: '/meals/$mealId', params: { mealId } })
    } catch (error) {
      console.error('Failed to update meal:', error)
      alert('Failed to save meal. Please try again.')
    }
  }

  // Configure unified header with save button
  useSetHeader({
    showBack: true,
    backTo: `/meals/${mealId}`,
    section: 'Meals',
    title: 'Edit',
    pageActions: [
      {
        icon: Check,
        label: updateMeal.isPending ? 'Saving...' : 'Save',
        onClick: handleSave,
      },
    ],
  })

  const handleRemoveFood = (foodId: string) => {
    setMealFoodItems(prev => prev.filter(f => f.foodId !== foodId))
  }

  const handleUpdateFoodPortion = (foodId: string, portion: { amount: number; unit: string }) => {
    setMealFoodItems(prev => prev.map(f =>
      f.foodId === foodId ? { ...f, portion } : f
    ))
  }

  const handleStartEditBoundingBox = (foodId: string) => {
    const mealFood = mealFoodItems.find(f => f.foodId === foodId)
    if (!mealFood?.boundingBox || !meal?.mealImage) return

    setEditingBoundingBoxForFood(foodId)
    setSelectedBoundingBox(mealFood.boundingBox)
  }

  const handleSaveBoundingBox = async (newBox: BoundingBox) => {
    if (!editingBoundingBoxForFood || !meal?.mealImage) return

    try {
      // Recrop image with new bounding box
      const newCroppedImage = await cropImage(meal.mealImage, newBox)

      setMealFoodItems(prev => prev.map(f =>
        f.foodId === editingBoundingBoxForFood
          ? {
              ...f,
              boundingBox: newBox,
              croppedImageData: newCroppedImage,
              currentDisplayImage: newCroppedImage,
              generatedImageData: undefined // Clear generated image as crop changed
            }
          : f
      ))

      setEditingBoundingBoxForFood(null)
      setSelectedBoundingBox(null)
    } catch (error) {
      console.error('Failed to update bounding box:', error)
      alert('Failed to update bounding box')
    }
  }

  const handleToggleImageView = (foodId: string) => {
    setMealFoodItems(prev => prev.map(f => {
      if (f.foodId !== foodId || !f.croppedImageData || !f.generatedImageData) return f

      const showGenerated = f.currentDisplayImage === f.croppedImageData
      return {
        ...f,
        currentDisplayImage: showGenerated ? f.generatedImageData : f.croppedImageData
      }
    }))
  }

  const handleGenerateAIImage = async (foodId: string) => {
    const mealFood = mealFoodItems.find(f => f.foodId === foodId)
    if (!mealFood?.croppedImageData) return

    try {
      const { generateCleanProductImageFromData } = await import('@/services/ai/gemini')

      // Update to show processing
      setMealFoodItems(prev => prev.map(f =>
        f.foodId === foodId ? { ...f, isProcessing: true } as any : f
      ))

      const generatedImage = await generateCleanProductImageFromData(
        mealFood.croppedImageData,
        (message) => console.log(message),
        {
          name: mealFood.name,
          category: mealFood.category
        }
      )

      setMealFoodItems(prev => prev.map(f =>
        f.foodId === foodId
          ? {
              ...f,
              generatedImageData: generatedImage,
              currentDisplayImage: generatedImage,
              isProcessing: false
            } as any
          : f
      ))
    } catch (error) {
      console.error('Failed to generate AI image:', error)
      setMealFoodItems(prev => prev.map(f =>
        f.foodId === foodId ? { ...f, isProcessing: false } as any : f
      ))
    }
  }

  const handleAddFoodsFromPantry = (foodIds: string[]) => {
    const foodsToAdd = allFoods?.filter(f => foodIds.includes(f.id)) || []

    const newMealFoods: MealFoodFormData[] = foodsToAdd.map(food => ({
      id: food.id,
      foodId: food.id,
      name: food.name,
      category: food.category,
      photo: food.photo || '',
      portion: { amount: food.servingSize || 100, unit: food.servingSizeUnit || 'g' },
      currentDisplayImage: food.photo || ''
    }))

    setMealFoodItems(prev => [...prev, ...newMealFoods])
    setShowAddFoodModal(false)
  }

  // Re-extract foods from meal image
  const handleReExtractFoods = async (foodId: string) => {
    if (!meal?.mealImage) return

    setIsReExtracting(true)

    try {
      // Convert data URL to File
      const response = await fetch(meal.mealImage)
      const blob = await response.blob()
      const file = new File([blob], 'meal.jpg', { type: 'image/jpeg' })

      // Import AI service dynamically
      const { extractMultipleFoodsMetadata } = await import('@/services/ai/gemini')

      // Extract food metadata with bounding boxes
      const foodsMetadata = await extractMultipleFoodsMetadata(file, (message, progress) => {
        console.log(`Re-extraction: ${message} (${progress}%)`)
      })

      if (foodsMetadata.length === 0) {
        alert('No foods detected in the image. Please try again.')
        return
      }

      // Find the meal food we're re-extracting for
      const currentMealFood = mealFoodItems.find(f => f.foodId === foodId)
      if (!currentMealFood) return

      // Try to match by name similarity
      const matchedFood = foodsMetadata.find(detected =>
        detected.name.toLowerCase().includes(currentMealFood.name.toLowerCase()) ||
        currentMealFood.name.toLowerCase().includes(detected.name.toLowerCase())
      ) || foodsMetadata[0] // Fallback to first detected food

      // Crop the new bounding box
      if (matchedFood.metadata?.boundingBox) {
        const newCroppedImage = await cropImage(meal.mealImage, matchedFood.metadata.boundingBox)

        setMealFoodItems(prev => prev.map(f =>
          f.foodId === foodId
            ? {
                ...f,
                boundingBox: matchedFood.metadata.boundingBox,
                croppedImageData: newCroppedImage,
                currentDisplayImage: newCroppedImage,
                generatedImageData: undefined // Clear generated image as crop changed
              }
            : f
        ))

        alert(`Successfully re-extracted "${matchedFood.name}" with new bounding box`)
      }
    } catch (error) {
      console.error('Failed to re-extract foods:', error)
      alert('Failed to re-extract foods. Please try again.')
    } finally {
      setIsReExtracting(false)
    }
  }

  // Crop image helper
  const cropImage = async (imageDataUrl: string, boundingBox: BoundingBox): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          const cropX = Math.max(0, Math.floor(boundingBox.x))
          const cropY = Math.max(0, Math.floor(boundingBox.y))
          const cropWidth = Math.min(img.width - cropX, Math.ceil(boundingBox.width))
          const cropHeight = Math.min(img.height - cropY, Math.ceil(boundingBox.height))

          if (cropWidth <= 0 || cropHeight <= 0) {
            throw new Error(`Invalid crop dimensions: ${cropWidth}x${cropHeight}`)
          }

          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
          resolve(canvas.toDataURL('image/jpeg', 0.95))
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageDataUrl
    })
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meal...</p>
        </div>
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Meal not found</p>
          <button
            type="button"
            onClick={() => navigate({ to: '/meals' })}
            className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Back to Meals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Meal Image with Bounding Boxes Overlay */}
        {meal.mealImage && (
          <section className="relative">
            <div className="relative w-full aspect-square bg-gray-900">
              <img
                ref={imageRef}
                src={meal.mealImage}
                alt={meal.name}
                className="w-full h-full object-contain"
              />

              {/* Bounding boxes overlay - show all food regions */}
              {imageDimensions && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className="relative"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`
                    }}
                  >
                    <svg
                      className="w-full h-full"
                      viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ display: 'block' }}
                    >
                      {mealFoodItems.map((mealFood, index) => {
                        if (!mealFood.boundingBox) return null

                        const bbox = mealFood.boundingBox
                        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                        const color = colors[index % colors.length]

                        return (
                          <g key={mealFood.foodId}>
                            <rect
                              x={bbox.x}
                              y={bbox.y}
                              width={bbox.width}
                              height={bbox.height}
                              fill="none"
                              stroke={color}
                              strokeWidth="4"
                              strokeDasharray="10,5"
                              opacity="0.8"
                            />
                            {/* Label */}
                            <text
                              x={bbox.x}
                              y={bbox.y}
                              fill={color}
                              fontSize="32"
                              fontWeight="bold"
                              dy="-8"
                            >
                              {mealFood.name}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Image Actions */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/90 text-white rounded-lg shadow-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
              >
                <Camera className="w-4 h-4" />
                Replace Photo
              </button>
            </div>
          </section>
        )}

        <div className="px-4 py-6 space-y-6">
          {/* Meal Details */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Meal Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Grilled Chicken Bowl"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mealType}
                  onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add notes about this meal..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </section>

          {/* Foods in Meal */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Foods ({mealFoodItems.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowAddFoodModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Food
              </button>
            </div>

            {mealFoodItems.length > 0 ? (
              <div className="space-y-4">
                {mealFoodItems.map((mealFood) => (
                  <div
                    key={mealFood.foodId}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    {/* Food Header with Image */}
                    <div className="flex items-start gap-4 mb-3">
                      {/* Image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={mealFood.currentDisplayImage || mealFood.photo}
                          alt={mealFood.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        {mealFood.generatedImageData && (
                          <div className="absolute top-1 right-1">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-1">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Basic Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                          {mealFood.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {mealFood.category}
                        </p>

                        {/* Portion Editor */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Portion:</span>
                          <input
                            type="number"
                            value={mealFood.portion.amount}
                            onChange={(e) => handleUpdateFoodPortion(mealFood.foodId, {
                              ...mealFood.portion,
                              amount: Number(e.target.value)
                            })}
                            className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                          />
                          <input
                            type="text"
                            value={mealFood.portion.unit}
                            onChange={(e) => handleUpdateFoodPortion(mealFood.foodId, {
                              ...mealFood.portion,
                              unit: e.target.value
                            })}
                            className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFood(mealFood.foodId)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* Toggle Image View */}
                      {mealFood.croppedImageData && mealFood.generatedImageData && (
                        <button
                          type="button"
                          onClick={() => handleToggleImageView(mealFood.foodId)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          <Layers className="w-3 h-3" />
                          {mealFood.currentDisplayImage === mealFood.generatedImageData ? 'Show Cropped' : 'Show AI'}
                        </button>
                      )}

                      {/* Generate AI Image */}
                      {mealFood.croppedImageData && (
                        <button
                          type="button"
                          onClick={() => handleGenerateAIImage(mealFood.foodId)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-pink-600"
                        >
                          <Sparkles className="w-3 h-3" />
                          {mealFood.generatedImageData ? 'Regenerate' : 'Generate AI'}
                        </button>
                      )}

                      {/* Edit Bounding Box */}
                      {mealFood.boundingBox && meal.mealImage && (
                        <button
                          type="button"
                          onClick={() => handleStartEditBoundingBox(mealFood.foodId)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          Edit Box
                        </button>
                      )}

                      {/* Re-extract from Image */}
                      {meal.mealImage && (
                        <button
                          type="button"
                          onClick={() => handleReExtractFoods(mealFood.foodId)}
                          disabled={isReExtracting}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`w-3 h-3 ${isReExtracting ? 'animate-spin' : ''}`} />
                          {isReExtracting ? 'Re-extracting...' : 'Re-extract'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No foods in this meal yet
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddFoodModal(true)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Add your first food
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Bounding Box Editor Modal */}
      {editingBoundingBoxForFood && selectedBoundingBox && meal?.mealImage && (
        <BoundingBoxEditor
          originalImage={meal.mealImage}
          initialBox={selectedBoundingBox}
          onSave={handleSaveBoundingBox}
          onCancel={() => {
            setEditingBoundingBoxForFood(null)
            setSelectedBoundingBox(null)
          }}
        />
      )}

      {/* Add Food Modal */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Add Foods from Pantry
                </h3>
                <button
                  onClick={() => setShowAddFoodModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {allFoods && allFoods.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {allFoods
                    .filter(food => !mealFoodItems.some(mf => mf.foodId === food.id))
                    .map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => handleAddFoodsFromPantry([food.id])}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                      >
                        {food.photo ? (
                          <img
                            src={food.photo}
                            alt={food.name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                          </div>
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full">
                          {food.name}
                        </span>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No foods available in pantry
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
