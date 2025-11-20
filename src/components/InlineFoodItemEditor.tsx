// InlineFoodItemEditor Component
// Comprehensive inline editor for detected food items with all AI capabilities

import { useState } from 'react'
import { Sparkles, Layers, Trash2, Check, X, RefreshCw } from 'lucide-react'
import { BoundingBoxEditor, type BoundingBox } from './BoundingBoxEditor'
import type { NutritionData } from '@/utils/foodMatching'

export interface DetectedFoodFormData {
  id: string
  name: string
  category: string
  imageData: string
  originalImageData?: string
  croppedImageData?: string
  generatedImageData?: string
  boundingBox?: BoundingBox
  nutrition: NutritionData
  servingSize: number
  servingSizeUnit: string
  estimatedPortion: string
  brand?: string
  tags?: string
  notes?: string
  confidence?: number
  saveToPantry: boolean
  portion: {
    amount: number
    unit: string
  }
}

interface InlineFoodItemEditorProps {
  foodData: DetectedFoodFormData
  onChange: (data: DetectedFoodFormData) => void
  onGenerateAIImage?: (croppedImageData: string) => Promise<string>
  onRemove?: () => void
  showRemoveButton?: boolean
}

export function InlineFoodItemEditor({
  foodData,
  onChange,
  onGenerateAIImage,
  onRemove,
  showRemoveButton = true
}: InlineFoodItemEditorProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [showGeneratedImage, setShowGeneratedImage] = useState(true)
  const [isEditingBoundingBox, setIsEditingBoundingBox] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const updateField = (field: string, value: any) => {
    onChange({ ...foodData, [field]: value })
  }

  const updateNutrition = (field: keyof NutritionData, value: number) => {
    onChange({
      ...foodData,
      nutrition: { ...foodData.nutrition, [field]: value }
    })
  }

  const updatePortion = (field: 'amount' | 'unit', value: any) => {
    onChange({
      ...foodData,
      portion: { ...foodData.portion, [field]: value }
    })
  }

  const handleGenerateAIImage = async () => {
    if (!onGenerateAIImage || !foodData.croppedImageData) return

    setIsGeneratingImage(true)
    try {
      const generatedImage = await onGenerateAIImage(foodData.croppedImageData)
      onChange({
        ...foodData,
        generatedImageData: generatedImage,
        imageData: generatedImage
      })
      setShowGeneratedImage(true)
    } catch (error) {
      console.error('Failed to generate AI image:', error)
      alert('Failed to generate AI image. Please try again.')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleToggleImageView = () => {
    const newShowGenerated = !showGeneratedImage
    setShowGeneratedImage(newShowGenerated)
    onChange({
      ...foodData,
      imageData: newShowGenerated && foodData.generatedImageData
        ? foodData.generatedImageData
        : foodData.croppedImageData || foodData.imageData
    })
  }

  const handleSaveBoundingBox = async (newBox: BoundingBox) => {
    if (!foodData.originalImageData) return

    try {
      // Recrop image with new bounding box
      const newCroppedImage = await cropImage(foodData.originalImageData, newBox)

      onChange({
        ...foodData,
        boundingBox: newBox,
        croppedImageData: newCroppedImage,
        imageData: newCroppedImage,
        generatedImageData: undefined // Clear generated image as crop changed
      })

      setIsEditingBoundingBox(false)
    } catch (error) {
      console.error('Failed to update bounding box:', error)
      alert('Failed to update bounding box')
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

  const portionCalories = Math.round(foodData.nutrition.calories * (foodData.portion.amount / foodData.servingSize))
  const portionProtein = Math.round(foodData.nutrition.protein * (foodData.portion.amount / foodData.servingSize))

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        {/* Header with Image and Basic Info */}
        <div className="flex items-start gap-4 mb-4">
          {/* Image Preview */}
          <div className="relative flex-shrink-0">
            <img
              src={foodData.imageData}
              alt={foodData.name}
              className="w-24 h-24 object-cover rounded-lg"
            />

            {/* Confidence Badge */}
            {foodData.confidence !== undefined && foodData.confidence < 0.75 && (
              <div className="absolute top-1 left-1">
                <div className="bg-yellow-500 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  {Math.round(foodData.confidence * 100)}%
                </div>
              </div>
            )}

            {/* AI Badge */}
            {foodData.generatedImageData && (
              <div className="absolute top-1 right-1">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-1">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={foodData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full text-lg font-semibold text-gray-800 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-emerald-500 focus:outline-none mb-2"
              placeholder="Food name"
            />

            <select
              value={foodData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 mb-2"
            >
              <option value="">Select Category</option>
              <option value="Protein">Protein</option>
              <option value="Carbs">Carbs</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Fruits">Fruits</option>
              <option value="Dairy">Dairy</option>
              <option value="Fats">Fats</option>
              <option value="Snacks">Snacks</option>
              <option value="Beverages">Beverages</option>
              <option value="Prepared">Prepared Meals</option>
            </select>

            {/* Portion for this meal */}
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400">Portion:</span>
              <input
                type="number"
                value={foodData.portion.amount}
                onChange={(e) => updatePortion('amount', Number(e.target.value))}
                className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
              />
              <input
                type="text"
                value={foodData.portion.unit}
                onChange={(e) => updatePortion('unit', e.target.value)}
                className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {portionCalories} cal • {portionProtein}g protein
            </p>
          </div>

          {/* Remove Button */}
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Toggle Image View */}
          {foodData.croppedImageData && foodData.generatedImageData && (
            <button
              onClick={handleToggleImageView}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Layers className="w-3 h-3" />
              {showGeneratedImage ? 'Show Cropped' : 'Show AI'}
            </button>
          )}

          {/* Generate AI Image */}
          {onGenerateAIImage && foodData.croppedImageData && !isGeneratingImage && (
            <button
              onClick={handleGenerateAIImage}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-3 h-3" />
              {foodData.generatedImageData ? 'Regenerate' : 'Generate AI Image'}
            </button>
          )}

          {isGeneratingImage && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-lg">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Generating...
            </div>
          )}

          {/* Edit Bounding Box */}
          {foodData.originalImageData && foodData.boundingBox && (
            <button
              onClick={() => setIsEditingBoundingBox(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Edit Box
            </button>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isExpanded ? 'Less' : 'More'} Details
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            {/* Nutrition Details */}
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nutrition (per {foodData.servingSize}{foodData.servingSizeUnit})
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Calories</label>
                  <input
                    type="number"
                    value={foodData.nutrition.calories}
                    onChange={(e) => updateNutrition('calories', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Protein (g)</label>
                  <input
                    type="number"
                    value={foodData.nutrition.protein}
                    onChange={(e) => updateNutrition('protein', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Carbs (g)</label>
                  <input
                    type="number"
                    value={foodData.nutrition.carbs}
                    onChange={(e) => updateNutrition('carbs', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Fat (g)</label>
                  <input
                    type="number"
                    value={foodData.nutrition.fat}
                    onChange={(e) => updateNutrition('fat', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Fiber (g)</label>
                  <input
                    type="number"
                    value={foodData.nutrition.fiber || 0}
                    onChange={(e) => updateNutrition('fiber', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 dark:text-gray-400">Sugar (g)</label>
                  <input
                    type="number"
                    value={foodData.nutrition.sugar || 0}
                    onChange={(e) => updateNutrition('sugar', Number(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Brand (optional)
              </label>
              <input
                type="text"
                value={foodData.brand || ''}
                onChange={(e) => updateField('brand', e.target.value)}
                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg"
                placeholder="e.g., Perdue"
              />
            </div>

            {/* Save to Pantry Checkbox */}
            <label className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={foodData.saveToPantry}
                onChange={(e) => updateField('saveToPantry', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Save to Pantry
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Add this food to your catalog for future use
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Bounding Box Editor Modal */}
      {isEditingBoundingBox && foodData.originalImageData && foodData.boundingBox && (
        <BoundingBoxEditor
          originalImage={foodData.originalImageData}
          initialBox={foodData.boundingBox}
          onSave={handleSaveBoundingBox}
          onCancel={() => setIsEditingBoundingBox(false)}
        />
      )}
    </>
  )
}
