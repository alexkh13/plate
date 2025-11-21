import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  Plus,
  X,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Check,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { extractFoodsFromImage, isGeminiConfigured, type AIGeneratedFood } from '@/services/ai'
import { useCreateFood } from '@/hooks/useData'
import { getTempImages, clearTempImages } from '@/utils/tempImageStorage'

export const Route = createFileRoute('/foods/ai-analyze')({ component: AIAnalyzePage })

interface FoodFormData {
  id?: string
  name: string
  category: string
  // Nutrition data
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  servingSize: number
  servingSizeUnit: string
  estimatedPortion: string
  // Optional fields
  brand?: string
  tags: string
  notes: string
  aiGenerated?: boolean
  imageData?: string
  originalImageData?: string // Keep reference to original photo for re-extraction
  originalImageIndex?: number // Track which original image this came from
  croppedImageData?: string // Store cropped image for comparison
  generatedImageData?: string // Store AI-generated image for comparison
  metadata?: {
    brand?: string
    preparedState?: string
    boundingBox?: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  saved?: boolean
  isProcessing?: boolean
  processingMessage?: string
  needsAIGeneration?: boolean // Flag to show "Generate AI Image" button
  confidence?: number // AI detection confidence score (0.0-1.0)
  boundingBoxAdjusted?: boolean // Whether bounding box was auto-adjusted
}

function AIAnalyzePage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const createFood = useCreateFood()

  const [analyzedFoods, setAnalyzedFoods] = useState<FoodFormData[]>([])
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)
  const [showGeneratedImage, setShowGeneratedImage] = useState(true) // Toggle between cropped and generated

  // Bounding box editing
  const [editingBoundingBox, setEditingBoundingBox] = useState(false)
  const [editedBoundingBox, setEditedBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [dragMode, setDragMode] = useState<'none' | 'corner' | 'edge' | 'sketch' | 'pinch'>('none')
  const [dragStart, setDragStart] = useState<{ x: number; y: number; bbox: any; corner?: string; edge?: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const touchStartRef = useRef<{ touches: Touch[]; bbox: any } | null>(null)

  // Check if Gemini is configured
  useEffect(() => {
    isGeminiConfigured().then(setHasGeminiKey)
  }, [])

  // Prevent browser zoom and scroll when actively manipulating
  useEffect(() => {
    if (!editingBoundingBox) return

    const preventScrollAndZoom = (e: TouchEvent) => {
      // Prevent scroll/zoom when actively manipulating (not in 'none' mode)
      if (dragMode !== 'none') {
        e.preventDefault()
      }
    }

    // Add listener with passive: false to allow preventDefault
    document.addEventListener('touchmove', preventScrollAndZoom, { passive: false })

    return () => {
      document.removeEventListener('touchmove', preventScrollAndZoom)
    }
  }, [editingBoundingBox, dragMode])

  // Crop image helper
  const cropImage = async (imageDataUrl: string, boundingBox: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          // Use pixel coordinates directly
          const cropX = Math.max(0, Math.floor(boundingBox.x))
          const cropY = Math.max(0, Math.floor(boundingBox.y))
          const cropWidth = Math.min(img.width - cropX, Math.ceil(boundingBox.width))
          const cropHeight = Math.min(img.height - cropY, Math.ceil(boundingBox.height))

          // Detailed logging
          console.log(`   📐 Original image: ${img.width}x${img.height}px`)
          console.log(`   📏 Crop region: (${cropX}, ${cropY}) ${cropWidth}x${cropHeight}px`)
          console.log(`   📊 Coverage: ${((cropWidth * cropHeight) / (img.width * img.height) * 100).toFixed(1)}% of original`)

          // Validate crop dimensions
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

  // Process all images in background
  const processImagesInBackground = async (images: string[]) => {
    if (!(await isGeminiConfigured())) {
      setAnalyzedFoods(foods =>
        foods.map(food => ({
          ...food,
          isProcessing: false,
          processingMessage: 'API key required',
          name: 'Configuration needed',
        }))
      )
      return
    }

    const { extractMultipleFoodsMetadata } = await import('@/services/ai/gemini')

    let totalFoodsCreated = 0

    // Process each image and show foods immediately after each one
    for (let i = 0; i < images.length; i++) {
      try {
        console.log(`📸 Processing image ${i + 1}/${images.length}`)

        // Update placeholder
        setAnalyzedFoods(prevFoods => {
          const newFoods = [...prevFoods]
          if (i < newFoods.length) {
            newFoods[i] = {
              ...newFoods[i],
              processingMessage: `Analyzing image ${i + 1}/${images.length}...`,
            }
          }
          return newFoods
        })

        // Convert data URL to File
        const response = await fetch(images[i])
        const blob = await response.blob()
        const file = new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' })

        // Extract metadata ONLY
        const extractedMetadata = await extractMultipleFoodsMetadata(file, (message, progress) => {
          setAnalyzedFoods(prevFoods => {
            const newFoods = [...prevFoods]
            if (i < newFoods.length) {
              newFoods[i] = {
                ...newFoods[i],
                processingMessage: message,
              }
            }
            return newFoods
          })
        })

        console.log(`✅ Detected ${extractedMetadata.length} foods in image ${i + 1}`)

        // Crop images and create foods immediately for this image
        const newFoodsForThisImage: FoodFormData[] = []

        for (const metadata of extractedMetadata) {
          let croppedImage = images[i]

          if (metadata.metadata?.boundingBox) {
            try {
              const bbox = metadata.metadata.boundingBox
              console.log(`✂️ Cropping "${metadata.name}" (${metadata.category})`)
              console.log(`   Bounding box: x=${bbox.x}px, y=${bbox.y}px, w=${bbox.width}px, h=${bbox.height}px`)

              croppedImage = await cropImage(images[i], bbox)
              console.log(`✅ Cropped successfully`)
            } catch (err) {
              console.warn('Failed to crop image, using original:', err)
            }
          } else {
            console.warn(`⚠️ No bounding box for: ${metadata.name}`)
          }

          // Log confidence score
          const confidence = metadata.confidence || 0.9
          console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`)

          newFoodsForThisImage.push({
            name: metadata.name,
            category: metadata.category,
            // Nutrition data
            calories: metadata.calories || 0,
            protein: metadata.protein || 0,
            carbs: metadata.carbs || 0,
            fat: metadata.fat || 0,
            fiber: metadata.fiber || 0,
            sugar: metadata.sugar || 0,
            sodium: metadata.sodium || 0,
            servingSize: metadata.servingSize || 100,
            servingSizeUnit: metadata.servingSizeUnit || 'g',
            estimatedPortion: metadata.estimatedPortion || `${metadata.servingSize || 100}${metadata.servingSizeUnit || 'g'}`,
            // Optional fields
            brand: metadata.metadata?.brand || metadata.brand,
            tags: metadata.tags || '',
            notes: metadata.notes || '',
            aiGenerated: true,
            imageData: croppedImage, // Current display image (starts as cropped)
            originalImageData: images[i], // Keep original for re-extraction
            originalImageIndex: i, // Track which original image this came from
            croppedImageData: croppedImage, // Store cropped version
            generatedImageData: undefined, // Will be set after AI generation
            metadata: metadata.metadata,
            isProcessing: false,
            processingMessage: '',
            needsAIGeneration: true, // Show AI generation button
            confidence: confidence,
            boundingBoxAdjusted: false,
          })
        }

        // Replace the placeholder with detected foods IMMEDIATELY
        setAnalyzedFoods(prevFoods => {
          const result = [...prevFoods]
          result.splice(i, 1, ...newFoodsForThisImage)
          return result
        })

        console.log(`📦 Added ${newFoodsForThisImage.length} foods from image ${i + 1}`)

        totalFoodsCreated += newFoodsForThisImage.length
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error)
        // Mark placeholder as error
        setAnalyzedFoods(prevFoods => {
          const result = [...prevFoods]
          if (i < result.length) {
            result[i] = {
              ...result[i],
              isProcessing: false,
              processingMessage: 'Analysis failed',
              name: 'Error',
            }
          }
          return result
        })
      }
    }

    console.log(`🎯 Total foods created: ${totalFoodsCreated}`)
  }

  // Generate clean product image for a specific food by position
  const generateImageForFoodByPosition = async (
    position: number,
    croppedImageData: string,
    foodName: string
  ) => {
    try {
      const { generateCleanProductImageFromData } = await import('@/services/ai/gemini')

      const food = analyzedFoods[position]
      console.log(`🎨 Starting image generation for food ${position + 1}: ${foodName}`)

      // Update status
      setAnalyzedFoods(prevFoods => {
        if (position >= prevFoods.length) {
          console.warn(`⚠️ Food position ${position} out of bounds (length: ${prevFoods.length})`)
          return prevFoods
        }
        const newFoods = [...prevFoods]
        newFoods[position] = {
          ...newFoods[position],
          processingMessage: 'Generating product image...',
        }
        return newFoods
      })

      // Pass metadata to help AI understand what to generate
      const foodMetadata = {
        name: food.name,
        category: food.category,
      }

      const generatedImage = await generateCleanProductImageFromData(
        croppedImageData,
        (message, progress) => {
          setAnalyzedFoods(prevFoods => {
            if (position >= prevFoods.length) return prevFoods
            const newFoods = [...prevFoods]
            newFoods[position] = {
              ...newFoods[position],
              processingMessage: message,
            }
            return newFoods
          })
        },
        foodMetadata
      )

      console.log(`✅ Image generated for food ${position + 1}: ${foodName}`)

      // Store generated image separately and update display
      setAnalyzedFoods(prevFoods => {
        if (position >= prevFoods.length) {
          console.warn(`⚠️ Food position ${position} out of bounds when updating generated image`)
          return prevFoods
        }
        const newFoods = [...prevFoods]
        newFoods[position] = {
          ...newFoods[position],
          generatedImageData: generatedImage, // Store generated version
          imageData: generatedImage, // Show generated by default
          isProcessing: false,
          processingMessage: '',
          needsAIGeneration: false, // Hide button after generation
        }
        return newFoods
      })
    } catch (error) {
      console.error(`Failed to generate image for food ${position + 1}:`, error)
      // Keep the cropped image, just mark as done processing
      setAnalyzedFoods(prevFoods => {
        if (position >= prevFoods.length) return prevFoods
        const newFoods = [...prevFoods]
        newFoods[position] = {
          ...newFoods[position],
          isProcessing: false,
          processingMessage: '',
        }
        return newFoods
      })
    }
  }

  // Load images from IndexedDB on mount and immediately create placeholder foods
  useEffect(() => {
    const loadImages = async () => {
      const images = await getTempImages()
      console.log('🔍 Checking for stored images:', images.length > 0 ? 'Found' : 'Not found')
      console.log('🔍 Processing ref:', processingRef.current)
      console.log('🔍 Analyzed foods count:', analyzedFoods.length)

      if (images.length > 0 && !processingRef.current) {
        processingRef.current = true
        console.log('📸 Loaded images:', images.length)

        // Clear temp storage after loading
        await clearTempImages()

        // Create placeholder foods immediately - this triggers re-render to show form
        const placeholderFoods: FoodFormData[] = images.map((img, index) => ({
          name: `Analyzing...`,
          category: '',
          // Placeholder nutrition data
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          servingSize: 100,
          servingSizeUnit: 'g',
          estimatedPortion: '100g',
          brand: '',
          tags: '',
          notes: '',
          aiGenerated: true,
          imageData: img,
          isProcessing: true,
          processingMessage: 'Starting analysis...',
        }))

        console.log('✨ Created placeholder foods:', placeholderFoods.length)
        setAnalyzedFoods(placeholderFoods)

        // Start processing all images in background
        processImagesInBackground(images)
      } else if (images.length === 0 && analyzedFoods.length === 0 && !processingRef.current) {
        console.log('⚠️ No images found and no foods, redirecting to pantry')
        // No images found and no foods created yet, redirect back to pantry
        navigate({ to: '/pantry' })
      } else {
        console.log('ℹ️ Skipping effect - already processing or foods exist')
      }
    }

    loadImages()
  }, [navigate])

  const currentFood = analyzedFoods[currentFoodIndex]

  const updateCurrentFood = (updates: Partial<FoodFormData>) => {
    setAnalyzedFoods(foods =>
      foods.map((food, i) => (i === currentFoodIndex ? { ...food, ...updates } : food))
    )
  }

  const handleSaveFood = async () => {
    if (!currentFood.name?.trim() || !currentFood.category?.trim()) {
      alert('Please fill in the required fields: Name and Category')
      return
    }

    if (!activeProfile) {
      alert('No active profile selected')
      return
    }

    try {
      const savedFood = await createFood.mutateAsync({
        name: currentFood.name.trim(),
        category: currentFood.category.trim(),
        photo: currentFood.imageData || '',
        brand: (currentFood.brand || '').toString().trim(),
        tags: (currentFood.tags || '').toString().trim(),
        notes: (currentFood.notes || '').toString().trim(),
        // Required nutrition fields - using placeholder values
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: 1,
        servingSizeUnit: 'serving',
        isRecipe: false,
        profileId: activeProfile.id,
      })

      // Mark current food as saved
      setAnalyzedFoods(foods =>
        foods.map((food, i) =>
          i === currentFoodIndex
            ? { ...food, id: savedFood.id, saved: true }
            : food
        )
      )

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)

      // Check if all foods are saved
      const allSaved = analyzedFoods.every((food, i) =>
        i === currentFoodIndex || food.saved
      )

      if (allSaved) {
        // All foods saved, show success and allow user to navigate away
        setTimeout(() => {
          if (confirm('All foods saved! Return to pantry?')) {
            navigate({ to: '/pantry' })
          }
        }, 1500)
      }
    } catch (err) {
      console.error('Failed to save food:', err)
      alert('Failed to save food')
    }
  }

  const handleDiscardFood = () => {
    // Remove current food from the list
    const newFoods = analyzedFoods.filter((_, i) => i !== currentFoodIndex)

    if (newFoods.length === 0) {
      // No more foods, go back to pantry
      navigate({ to: '/pantry' })
      return
    }

    setAnalyzedFoods(newFoods)

    // Adjust current index if needed
    if (currentFoodIndex >= newFoods.length) {
      setCurrentFoodIndex(newFoods.length - 1)
    }
  }

  const handleNavigateToFood = (index: number) => {
    setCurrentFoodIndex(index)
    // Reset to show generated image by default when switching foods
    setShowGeneratedImage(true)
  }

  const handleGenerateAIImage = async () => {
    const currentFood = analyzedFoods[currentFoodIndex]
    if (!currentFood.imageData || !currentFood.needsAIGeneration) return

    console.log(`🎨 User triggered AI generation for food ${currentFoodIndex + 1}: ${currentFood.name}`)

    // Update to show it's processing and hide the button
    setAnalyzedFoods(prevFoods => {
      const newFoods = [...prevFoods]
      newFoods[currentFoodIndex] = {
        ...newFoods[currentFoodIndex],
        isProcessing: true,
        needsAIGeneration: false,
        processingMessage: 'Generating product image...',
      }
      return newFoods
    })

    // Start generation using the cropped image
    await generateImageForFoodByPosition(
      currentFoodIndex,
      currentFood.croppedImageData || currentFood.imageData,
      currentFood.name
    )
  }

  const handleReExtractMetadata = async () => {
    const currentFood = analyzedFoods[currentFoodIndex]
    if (!currentFood.originalImageData || currentFood.originalImageIndex === undefined) {
      console.error('No original image data available for re-extraction')
      return
    }

    const originalImageIndex = currentFood.originalImageIndex
    const originalImageData = currentFood.originalImageData

    console.log(`🔄 Re-extracting metadata for original image ${originalImageIndex + 1}`)

    // Find ALL foods that came from this original image
    const foodsFromSameImage = analyzedFoods.filter(
      food => food.originalImageIndex === originalImageIndex
    )
    const foodIndices = analyzedFoods
      .map((food, idx) => (food.originalImageIndex === originalImageIndex ? idx : -1))
      .filter(idx => idx !== -1)

    console.log(`📦 Found ${foodsFromSameImage.length} foods from this original image`)

    // Mark all related foods as processing
    setAnalyzedFoods(prevFoods => {
      const newFoods = [...prevFoods]
      foodIndices.forEach(idx => {
        newFoods[idx] = {
          ...newFoods[idx],
          isProcessing: true,
          processingMessage: 'Re-analyzing original image...',
        }
      })
      return newFoods
    })

    try {
      const { extractMultipleFoodsMetadata } = await import('@/services/ai/gemini')

      // Convert data URL to File
      const response = await fetch(originalImageData)
      const blob = await response.blob()
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })

      // Extract metadata for ALL foods in the image
      const extractedMetadata = await extractMultipleFoodsMetadata(file)

      console.log(`✅ Extracted ${extractedMetadata.length} foods from re-analysis`)

      // Create new foods from extracted metadata
      const newFoodsForThisImage: FoodFormData[] = []

      for (const metadata of extractedMetadata) {
        let croppedImage = originalImageData
        if (metadata.metadata?.boundingBox) {
          try {
            croppedImage = await cropImage(originalImageData, metadata.metadata.boundingBox)
          } catch (err) {
            console.warn('Failed to crop image, using original:', err)
          }
        }

        newFoodsForThisImage.push({
          name: metadata.name,
          category: metadata.category,
          // Nutrition data
          calories: metadata.calories || 0,
          protein: metadata.protein || 0,
          carbs: metadata.carbs || 0,
          fat: metadata.fat || 0,
          fiber: metadata.fiber || 0,
          sugar: metadata.sugar || 0,
          sodium: metadata.sodium || 0,
          servingSize: metadata.servingSize || 100,
          servingSizeUnit: metadata.servingSizeUnit || 'g',
          estimatedPortion: metadata.estimatedPortion || `${metadata.servingSize || 100}${metadata.servingSizeUnit || 'g'}`,
          // Optional fields
          brand: metadata.metadata?.brand || metadata.brand,
          tags: metadata.tags || '',
          notes: metadata.notes || '',
          aiGenerated: true,
          imageData: croppedImage,
          originalImageData: originalImageData,
          originalImageIndex: originalImageIndex,
          croppedImageData: croppedImage,
          generatedImageData: undefined,
          metadata: metadata.metadata,
          isProcessing: false,
          processingMessage: '',
          needsAIGeneration: true,
        })
      }

      // Replace old foods with new foods
      setAnalyzedFoods(prevFoods => {
        // Remove all foods from the same original image
        const filteredFoods = prevFoods.filter(
          food => food.originalImageIndex !== originalImageIndex
        )

        // Find where to insert new foods (at the position of the first old food)
        const firstOldFoodIndex = foodIndices[0]

        // Insert new foods at that position
        const result = [
          ...filteredFoods.slice(0, firstOldFoodIndex),
          ...newFoodsForThisImage,
          ...filteredFoods.slice(firstOldFoodIndex),
        ]

        return result
      })

      // Adjust currentFoodIndex to the first new food
      setCurrentFoodIndex(foodIndices[0])

      console.log('✅ Metadata re-extracted successfully')
    } catch (error) {
      console.error('Failed to re-extract metadata:', error)
      // Remove processing state on error
      setAnalyzedFoods(prevFoods => {
        const newFoods = [...prevFoods]
        foodIndices.forEach(idx => {
          if (idx < newFoods.length) {
            newFoods[idx] = {
              ...newFoods[idx],
              isProcessing: false,
              processingMessage: '',
            }
          }
        })
        return newFoods
      })
    }
  }

  const handleToggleImageView = () => {
    const currentFood = analyzedFoods[currentFoodIndex]
    if (!currentFood.croppedImageData || !currentFood.generatedImageData) return

    const newShowGenerated = !showGeneratedImage

    setAnalyzedFoods(prevFoods => {
      const newFoods = [...prevFoods]
      newFoods[currentFoodIndex] = {
        ...newFoods[currentFoodIndex],
        imageData: newShowGenerated ? currentFood.generatedImageData! : currentFood.croppedImageData!,
      }
      return newFoods
    })

    setShowGeneratedImage(newShowGenerated)
  }

  // Bounding box editing functions
  const handleStartEditBoundingBox = () => {
    const currentFood = analyzedFoods[currentFoodIndex]
    if (!currentFood.originalImageData || !currentFood.metadata?.boundingBox) return

    // Load original image to get dimensions
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height })
      setEditedBoundingBox({ ...currentFood.metadata.boundingBox })
      setEditingBoundingBox(true)
    }
    img.src = currentFood.originalImageData
  }

  const handleCancelEditBoundingBox = () => {
    setEditingBoundingBox(false)
    setEditedBoundingBox(null)
    setImageDimensions(null)
  }

  const handleSaveBoundingBox = async () => {
    if (!editedBoundingBox) return
    const currentFood = analyzedFoods[currentFoodIndex]
    if (!currentFood.originalImageData) return

    try {
      console.log('💾 Saving new bounding box:', editedBoundingBox)

      // Recrop with new bounding box
      const newCroppedImage = await cropImage(currentFood.originalImageData, editedBoundingBox)

      // Update food with new bounding box and cropped image
      setAnalyzedFoods(prevFoods => {
        const newFoods = [...prevFoods]
        newFoods[currentFoodIndex] = {
          ...newFoods[currentFoodIndex],
          metadata: {
            ...newFoods[currentFoodIndex].metadata,
            boundingBox: editedBoundingBox,
          },
          croppedImageData: newCroppedImage,
          imageData: newCroppedImage,
          generatedImageData: undefined, // Clear generated image as crop changed
          needsAIGeneration: true,
        }
        return newFoods
      })

      setEditingBoundingBox(false)
      setEditedBoundingBox(null)
      setImageDimensions(null)
      console.log('✅ Bounding box updated successfully')
    } catch (error) {
      console.error('Failed to update bounding box:', error)
    }
  }

  // Helper function to convert touch coordinates to image coordinates
  const touchToImageCoords = (touch: Touch): { x: number; y: number } | null => {
    if (!imageRef.current || !imageDimensions) return null

    const container = imageRef.current.parentElement
    if (!container) return null

    const containerRect = container.getBoundingClientRect()
    const imageAspect = imageDimensions.width / imageDimensions.height
    const containerAspect = containerRect.width / containerRect.height

    let renderedWidth: number, renderedHeight: number, offsetX: number, offsetY: number

    if (imageAspect > containerAspect) {
      renderedWidth = containerRect.width
      renderedHeight = containerRect.width / imageAspect
      offsetX = 0
      offsetY = (containerRect.height - renderedHeight) / 2
    } else {
      renderedHeight = containerRect.height
      renderedWidth = containerRect.height * imageAspect
      offsetX = (containerRect.width - renderedWidth) / 2
      offsetY = 0
    }

    const touchX = touch.clientX - containerRect.left - offsetX
    const touchY = touch.clientY - containerRect.top - offsetY

    // Convert to image coordinates
    const scaleX = imageDimensions.width / renderedWidth
    const scaleY = imageDimensions.height / renderedHeight

    return {
      x: touchX * scaleX,
      y: touchY * scaleY,
    }
  }

  // Helper function to detect which part of bbox is touched
  const detectTouchTarget = (touchX: number, touchY: number, bbox: any): { type: 'corner' | 'edge' | 'inside' | 'outside'; detail?: string } => {
    const hitRadius = 30 // pixels in image space for touch targets

    // Check corners
    const corners = {
      'top-left': { x: bbox.x, y: bbox.y },
      'top-right': { x: bbox.x + bbox.width, y: bbox.y },
      'bottom-left': { x: bbox.x, y: bbox.y + bbox.height },
      'bottom-right': { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    }

    for (const [name, corner] of Object.entries(corners)) {
      const dist = Math.sqrt(Math.pow(touchX - corner.x, 2) + Math.pow(touchY - corner.y, 2))
      if (dist < hitRadius) {
        return { type: 'corner', detail: name }
      }
    }

    // Check edges
    if (Math.abs(touchX - bbox.x) < hitRadius && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'edge', detail: 'left' }
    }
    if (Math.abs(touchX - (bbox.x + bbox.width)) < hitRadius && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'edge', detail: 'right' }
    }
    if (Math.abs(touchY - bbox.y) < hitRadius && touchX >= bbox.x && touchX <= bbox.x + bbox.width) {
      return { type: 'edge', detail: 'top' }
    }
    if (Math.abs(touchY - (bbox.y + bbox.height)) < hitRadius && touchX >= bbox.x && touchX <= bbox.x + bbox.width) {
      return { type: 'edge', detail: 'bottom' }
    }

    // Check inside
    if (touchX >= bbox.x && touchX <= bbox.x + bbox.width && touchY >= bbox.y && touchY <= bbox.y + bbox.height) {
      return { type: 'inside' }
    }

    return { type: 'outside' }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!editingBoundingBox || !editedBoundingBox || !imageDimensions) return

    // Multi-touch - pinch/pan mode
    if (e.touches.length >= 2) {
      e.preventDefault()
      setDragMode('pinch')
      touchStartRef.current = {
        touches: Array.from(e.touches),
        bbox: { ...editedBoundingBox },
      }
      return
    }

    // Single touch
    const coords = touchToImageCoords(e.touches[0])
    if (!coords) return

    const target = detectTouchTarget(coords.x, coords.y, editedBoundingBox)

    if (target.type === 'corner') {
      e.preventDefault()
      e.stopPropagation()
      setDragMode('corner')
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBoundingBox }, corner: target.detail })
    } else if (target.type === 'edge') {
      e.preventDefault()
      e.stopPropagation()
      setDragMode('edge')
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBoundingBox }, edge: target.detail })
    } else if (target.type === 'inside') {
      // Prevent scrolling when touching inside the box
      e.preventDefault()
      e.stopPropagation()
      // Don't set any drag mode - just prevent scroll
    } else if (target.type === 'outside') {
      // Don't prevent default yet - wait to see if it's scroll or sketch
      // Store initial position for intent detection
      setDragStart({ x: coords.x, y: coords.y, bbox: { ...editedBoundingBox } })
      // Don't set mode yet - will be determined in touchmove
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!editingBoundingBox || !imageDimensions) return

    // Intent detection for single touch when dragMode is not set yet
    if (dragMode === 'none' && dragStart && e.touches.length === 1) {
      const coords = touchToImageCoords(e.touches[0])
      if (!coords) return

      const deltaX = Math.abs(coords.x - dragStart.x)
      const deltaY = Math.abs(coords.y - dragStart.y)
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Wait for minimum movement before deciding intent
      const INTENT_THRESHOLD = 20 // pixels in image space

      if (totalMovement > INTENT_THRESHOLD) {
        // Calculate movement ratio
        const verticalRatio = deltaY / (deltaX + 1) // +1 to avoid divide by zero

        // If mostly vertical movement (ratio > 2), it's likely scroll
        if (verticalRatio > 2) {
          // User wants to scroll - clear drag state and allow scroll
          setDragStart(null)
          return // Don't prevent default, allow scroll
        } else {
          // User wants to sketch - enter sketch mode
          e.preventDefault()
          setDragMode('sketch')
          setEditedBoundingBox({ x: dragStart.x, y: dragStart.y, width: 0, height: 0 })
        }
      } else {
        // Haven't moved enough to determine intent yet
        return // Don't prevent default yet
      }
    }

    // Once mode is determined, prevent default for all active modes
    if (dragMode !== 'none') {
      e.preventDefault()
      e.stopPropagation()
    }

    // Handle pinch mode (2 fingers)
    if (dragMode === 'pinch' && touchStartRef.current && e.touches.length >= 2) {
      const touches = Array.from(e.touches)
      const startTouches = touchStartRef.current.touches
      const startBbox = touchStartRef.current.bbox

      if (startTouches.length < 2) return

      const container = imageRef.current?.parentElement
      const imgElement = imageRef.current
      if (!container || !imgElement) return

      const containerRect = container.getBoundingClientRect()
      const imageAspect = imageDimensions.width / imageDimensions.height
      const containerAspect = containerRect.width / containerRect.height

      let renderedWidth: number, renderedHeight: number, offsetX: number, offsetY: number

      if (imageAspect > containerAspect) {
        renderedWidth = containerRect.width
        renderedHeight = containerRect.width / imageAspect
        offsetX = 0
        offsetY = (containerRect.height - renderedHeight) / 2
      } else {
        renderedHeight = containerRect.height
        renderedWidth = containerRect.height * imageAspect
        offsetX = (containerRect.width - renderedWidth) / 2
        offsetY = 0
      }

      const scaleX = imageDimensions.width / renderedWidth
      const scaleY = imageDimensions.height / renderedHeight

      const getDistance = (t1: Touch, t2: Touch) =>
        Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))

      const startDistance = getDistance(startTouches[0], startTouches[1])
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / startDistance

      const getMidpoint = (t1: Touch, t2: Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      })

      const startMidpoint = getMidpoint(startTouches[0], startTouches[1])
      const currentMidpoint = getMidpoint(touches[0], touches[1])
      const deltaX = (currentMidpoint.x - startMidpoint.x) * scaleX
      const deltaY = (currentMidpoint.y - startMidpoint.y) * scaleY

      const newWidth = Math.max(50, Math.min(imageDimensions.width, startBbox.width * scale))
      const newHeight = Math.max(50, Math.min(imageDimensions.height, startBbox.height * scale))
      const centerX = startBbox.x + startBbox.width / 2
      const centerY = startBbox.y + startBbox.height / 2

      let newX = centerX - newWidth / 2 + deltaX
      let newY = centerY - newHeight / 2 + deltaY

      newX = Math.max(0, Math.min(imageDimensions.width - newWidth, newX))
      newY = Math.max(0, Math.min(imageDimensions.height - newHeight, newY))

      setEditedBoundingBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      })
      return
    }

    // Handle single-finger modes
    if (!dragStart || !editedBoundingBox || e.touches.length !== 1) return

    const coords = touchToImageCoords(e.touches[0])
    if (!coords) return

    const deltaX = coords.x - dragStart.x
    const deltaY = coords.y - dragStart.y

    // Handle sketch mode - diagonal drag to create new box
    if (dragMode === 'sketch') {
      const x1 = Math.min(dragStart.x, coords.x)
      const y1 = Math.min(dragStart.y, coords.y)
      const x2 = Math.max(dragStart.x, coords.x)
      const y2 = Math.max(dragStart.y, coords.y)

      setEditedBoundingBox({
        x: Math.max(0, x1),
        y: Math.max(0, y1),
        width: Math.min(imageDimensions.width - x1, x2 - x1),
        height: Math.min(imageDimensions.height - y1, y2 - y1),
      })
      return
    }

    // Handle corner dragging
    if (dragMode === 'corner') {
      const startBbox = dragStart.bbox
      let newBbox = { ...startBbox }

      switch (dragStart.corner) {
        case 'top-left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'top-right':
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'bottom-left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
        case 'bottom-right':
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
      }

      setEditedBoundingBox(newBbox)
      return
    }

    // Handle edge dragging
    if (dragMode === 'edge') {
      const startBbox = dragStart.bbox
      let newBbox = { ...startBbox }

      switch (dragStart.edge) {
        case 'left':
          newBbox.x = Math.max(0, Math.min(startBbox.x + startBbox.width - 50, startBbox.x + deltaX))
          newBbox.width = startBbox.width + startBbox.x - newBbox.x
          break
        case 'right':
          newBbox.width = Math.min(imageDimensions.width - startBbox.x, Math.max(50, startBbox.width + deltaX))
          break
        case 'top':
          newBbox.y = Math.max(0, Math.min(startBbox.y + startBbox.height - 50, startBbox.y + deltaY))
          newBbox.height = startBbox.height + startBbox.y - newBbox.y
          break
        case 'bottom':
          newBbox.height = Math.min(imageDimensions.height - startBbox.y, Math.max(50, startBbox.height + deltaY))
          break
      }

      setEditedBoundingBox(newBbox)
      return
    }
  }

  const handleTouchEnd = () => {
    touchStartRef.current = null
    setDragMode('none')
    setDragStart(null)
  }

  // If no foods yet, show loading or redirect
  if (analyzedFoods.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading images...</p>
        </div>
      </div>
    )
  }

  // Show food form view after analysis
  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Page Header with Progress */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-16 z-10">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                const unsavedCount = analyzedFoods.filter(i => !i.saved).length
                if (unsavedCount > 0) {
                  if (confirm(`${unsavedCount} unsaved food(s). Are you sure you want to leave?`)) {
                    navigate({ to: '/pantry' })
                  }
                } else {
                  navigate({ to: '/pantry' })
                }
              }}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              Review Foods
            </button>
            <button
              onClick={() => navigate({ to: '/pantry' })}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Done
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
              style={{ width: `${((analyzedFoods.filter(i => i.saved).length) / analyzedFoods.length) * 100}%` }}
            />
          </div>

          {/* Save/Discard Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDiscardFood}
              className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 border border-red-200 dark:border-red-800"
              disabled={createFood.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Discard
            </button>
            <button
              onClick={handleSaveFood}
              disabled={createFood.isPending || currentFood.isProcessing}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createFood.isPending
                ? 'Saving...'
                : currentFood.isProcessing
                ? 'Processing...'
                : showSuccess
                ? '✓ Saved!'
                : 'Save Food'}
            </button>
          </div>

          {currentFood.aiGenerated && (
            <div className="mt-2 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3 h-3" />
              {currentFood.isProcessing
                ? 'AI is generating product image...'
                : currentFood.needsAIGeneration
                ? 'Click the button to generate a clean product image'
                : 'AI-generated • Review and edit before saving'}
            </div>
          )}
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Food Thumbnails Navigation */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Foods ({analyzedFoods.filter(i => i.saved).length}/{analyzedFoods.length} saved)
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {analyzedFoods.map((food, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigateToFood(index)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentFoodIndex
                      ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                >
                  <img
                    src={food.imageData}
                    alt={food.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Processing spinner overlay */}
                  {food.isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}

                  {/* Saved checkmark */}
                  {food.saved && (
                    <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}

                  {/* AI Generation Available Badge */}
                  {food.needsAIGeneration && !food.isProcessing && !food.saved && (
                    <div className="absolute top-1 right-1">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-1">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Low Confidence Warning Badge */}
                  {food.confidence && food.confidence < 0.75 && !food.saved && (
                    <div className="absolute top-1 left-1">
                      <div className="bg-yellow-500 rounded px-1 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        {Math.round(food.confidence * 100)}%
                      </div>
                    </div>
                  )}

                  {/* Bounding Box Adjusted Badge */}
                  {food.boundingBoxAdjusted && !food.saved && (
                    <div className="absolute bottom-1 left-1">
                      <div className="bg-blue-500 rounded-full p-0.5">
                        <RefreshCw className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Current food indicator */}
                  {index === currentFoodIndex && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Food Photo */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
            {currentFood.imageData && (
              <div
                className={`relative w-full ${editingBoundingBox ? 'max-h-[80vh]' : 'aspect-square'}`}
                style={{
                  // Allow scroll only when not actively manipulating the box
                  touchAction: editingBoundingBox
                    ? (dragMode === 'none' ? 'pan-y' : 'none')
                    : 'auto'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  ref={imageRef}
                  src={editingBoundingBox ? currentFood.originalImageData : currentFood.imageData}
                  alt="Food preview"
                  className={`w-full ${editingBoundingBox ? 'object-contain max-h-[80vh]' : 'h-full object-contain'}`}
                />

                {/* Bounding Box Overlay when editing */}
                {editingBoundingBox && editedBoundingBox && imageDimensions && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="relative" style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`
                    }}>
                      <svg className="w-full h-full" viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                        {/* Darken outside bounding box */}
                        <defs>
                          <mask id="bbox-mask">
                            <rect width={imageDimensions.width} height={imageDimensions.height} fill="white" />
                            <rect
                              x={editedBoundingBox.x}
                              y={editedBoundingBox.y}
                              width={editedBoundingBox.width}
                              height={editedBoundingBox.height}
                              fill="black"
                            />
                          </mask>
                        </defs>
                        <rect width={imageDimensions.width} height={imageDimensions.height} fill="black" opacity="0.6" mask="url(#bbox-mask)" />

                        {/* Bounding box rectangle */}
                        <rect
                          x={editedBoundingBox.x}
                          y={editedBoundingBox.y}
                          width={editedBoundingBox.width}
                          height={editedBoundingBox.height}
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="4"
                          strokeDasharray="10,5"
                        />

                        {/* Edge midpoint handles (smaller) */}
                        <circle
                          cx={editedBoundingBox.x}
                          cy={editedBoundingBox.y + editedBoundingBox.height / 2}
                          r="6"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle
                          cx={editedBoundingBox.x + editedBoundingBox.width}
                          cy={editedBoundingBox.y + editedBoundingBox.height / 2}
                          r="6"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle
                          cx={editedBoundingBox.x + editedBoundingBox.width / 2}
                          cy={editedBoundingBox.y}
                          r="6"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle
                          cx={editedBoundingBox.x + editedBoundingBox.width / 2}
                          cy={editedBoundingBox.y + editedBoundingBox.height}
                          r="6"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                        />

                        {/* Corner handles (larger, more prominent) */}
                        <circle cx={editedBoundingBox.x} cy={editedBoundingBox.y} r="12" fill="#8b5cf6" stroke="white" strokeWidth="3" />
                        <circle cx={editedBoundingBox.x + editedBoundingBox.width} cy={editedBoundingBox.y} r="12" fill="#8b5cf6" stroke="white" strokeWidth="3" />
                        <circle cx={editedBoundingBox.x} cy={editedBoundingBox.y + editedBoundingBox.height} r="12" fill="#8b5cf6" stroke="white" strokeWidth="3" />
                        <circle cx={editedBoundingBox.x + editedBoundingBox.width} cy={editedBoundingBox.y + editedBoundingBox.height} r="12" fill="#8b5cf6" stroke="white" strokeWidth="3" />
                      </svg>
                    </div>
                  </div>
                )}

                {currentFood.isProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                    <div className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-lg">
                      {currentFood.processingMessage || 'Processing...'}
                    </div>
                  </div>
                )}

                {/* Edit/Save/Cancel Bounding Box Buttons */}
                {!editingBoundingBox && !currentFood.isProcessing && currentFood.originalImageData && currentFood.metadata?.boundingBox && (
                  <button
                    onClick={handleStartEditBoundingBox}
                    className="absolute bottom-2 left-2 flex items-center gap-2 px-3 py-2 bg-orange-500/90 text-white rounded-lg hover:bg-orange-600 transition-all shadow-lg text-sm"
                    title="Edit bounding box"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Edit Box
                  </button>
                )}

                {editingBoundingBox && (
                  <>
                    <button
                      onClick={handleSaveBoundingBox}
                      className="absolute bottom-2 left-2 flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-lg text-sm font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditBoundingBox}
                      className="absolute bottom-2 left-24 flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}

                {/* AI Generate Button - top left position */}
                {!editingBoundingBox && !currentFood.isProcessing && (currentFood.needsAIGeneration || currentFood.generatedImageData) && (
                  <button
                    onClick={handleGenerateAIImage}
                    className="absolute top-2 left-2 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm"
                    title={currentFood.generatedImageData ? "Re-generate AI product image" : "Generate AI product image"}
                  >
                    <Sparkles className="w-4 h-4" />
                    {currentFood.generatedImageData ? 'Re-generate' : 'Generate AI Image'}
                  </button>
                )}

                {/* Re-extract Metadata Button - always on top */}
                {!editingBoundingBox && !currentFood.isProcessing && currentFood.originalImageData && (
                  <button
                    onClick={handleReExtractMetadata}
                    className="absolute top-2 right-2 p-2 bg-blue-500/90 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg"
                    title="Re-analyze original photo and replace all foods from it"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                {/* Toggle Between Cropped and Generated Button */}
                {!editingBoundingBox && currentFood.croppedImageData && currentFood.generatedImageData && !currentFood.isProcessing && (
                  <button
                    onClick={handleToggleImageView}
                    className="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-2 bg-gray-900/90 text-white rounded-lg hover:bg-gray-800 transition-all shadow-lg text-sm"
                    title="Toggle between cropped and generated"
                  >
                    <Layers className="w-4 h-4" />
                    {showGeneratedImage ? 'Show Cropped' : 'Show Generated'}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Food Details Form */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Food Details</h2>

            {/* AI Detection Info */}
            {currentFood.confidence !== undefined && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    AI Detection Confidence
                  </span>
                  <span className={`text-sm font-bold ${
                    currentFood.confidence >= 0.85
                      ? 'text-green-600 dark:text-green-400'
                      : currentFood.confidence >= 0.75
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {Math.round(currentFood.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      currentFood.confidence >= 0.85
                        ? 'bg-green-500'
                        : currentFood.confidence >= 0.75
                        ? 'bg-blue-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${currentFood.confidence * 100}%` }}
                  />
                </div>
                {currentFood.confidence < 0.75 && (
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    ⚠️ Low confidence detection - please review carefully
                  </p>
                )}
                {currentFood.boundingBoxAdjusted && (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Bounding box was automatically adjusted for better framing
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Food Name *
                </label>
                <input
                  type="text"
                  value={currentFood.name}
                  onChange={(e) => updateCurrentFood({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Blue Grilled Chicken"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={currentFood.category}
                  onChange={(e) => updateCurrentFood({ category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <option value="Prepared Meals">Prepared Meals</option>
                </select>
              </div>

              {/* Portion/Serving Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Portion
                </label>
                <input
                  type="text"
                  value={currentFood.estimatedPortion}
                  onChange={(e) => updateCurrentFood({ estimatedPortion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., 1 cup (200g), 3 oz (85g)"
                />
              </div>

              {/* Macronutrients */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={currentFood.calories}
                    onChange={(e) => updateCurrentFood({ calories: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="165"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={currentFood.protein}
                    onChange={(e) => updateCurrentFood({ protein: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="31"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={currentFood.carbs}
                    onChange={(e) => updateCurrentFood({ carbs: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={currentFood.fat}
                    onChange={(e) => updateCurrentFood({ fat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="3.6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    value={currentFood.fiber}
                    onChange={(e) => updateCurrentFood({ fiber: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sugar (g)
                  </label>
                  <input
                    type="number"
                    value={currentFood.sugar}
                    onChange={(e) => updateCurrentFood({ sugar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sodium (mg)
                  </label>
                  <input
                    type="number"
                    value={currentFood.sodium}
                    onChange={(e) => updateCurrentFood({ sodium: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="74"
                  />
                </div>
              </div>

              {/* Serving Size Details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Serving Size
                  </label>
                  <input
                    type="number"
                    value={currentFood.servingSize}
                    onChange={(e) => updateCurrentFood({ servingSize: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={currentFood.servingSizeUnit}
                    onChange={(e) => updateCurrentFood({ servingSizeUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="oz">oz</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                    <option value="piece">piece</option>
                    <option value="slice">slice</option>
                  </select>
                </div>
              </div>

              {/* Optional Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brand (optional)
                </label>
                <input
                  type="text"
                  value={currentFood.brand || ''}
                  onChange={(e) => updateCurrentFood({ brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Perdue, Dole"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={currentFood.tags}
                  onChange={(e) => updateCurrentFood({ tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., #breakfast #healthy #quick"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={currentFood.notes}
                  onChange={(e) => updateCurrentFood({ notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}