// Google Gemini AI Service - Multimodal Food Analysis
// Uses Gemini for image understanding and metadata extraction

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIGeneratedItem } from './types'

// Load API key from localStorage
function getGeminiAPIKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('google_ai_token') || null
}

let genAI: GoogleGenerativeAI | null = null
let apiKey: string | null = getGeminiAPIKey()

export function setGoogleAIToken(token: string) {
  apiKey = token
  genAI = new GoogleGenerativeAI(token)
  if (typeof window !== 'undefined') {
    localStorage.setItem('google_ai_token', token)
  }
}

// Initialize Gemini
function initializeGemini(): GoogleGenerativeAI {
  if (!apiKey) {
    throw new Error('Google AI API key not set. Please add it in Settings → AI Settings.')
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey)
  }

  return genAI
}

// Master prompt for food analysis
const FOOD_ANALYSIS_PROMPT = `You are an expert nutrition analyst and food recognition specialist. Analyze this image of food and extract detailed nutritional and categorization metadata.

Your task:
1. Identify what type of food item this is
2. Estimate the portion size and serving
3. Calculate approximate nutrition values (calories, protein, carbs, fat)
4. Categorize the food appropriately
5. Suggest relevant tags and notes

Respond ONLY with valid JSON in this exact format:
{
  "name": "Concise food name (e.g., 'Grilled Chicken Breast', 'Medium Apple', 'Cooked Brown Rice')",
  "category": "One of: Protein, Carbs, Vegetables, Fruits, Dairy, Fats, Snacks, Beverages, Prepared",
  "calories": 165,
  "protein": 31,
  "carbs": 0,
  "fat": 3.6,
  "fiber": 0,
  "sugar": 0,
  "sodium": 74,
  "servingSize": 100,
  "servingSizeUnit": "g",
  "estimatedPortion": "3 oz (85g) chicken breast",
  "tags": "#protein #chicken #grilled #lean",
  "notes": "Grilled boneless, skinless chicken breast - high protein, low fat",
  "brand": "",
  "preparedState": "cooked",
  "confidence": 0.9
}

Important guidelines:
- Be accurate with nutrition estimates based on standard USDA food database values
- Estimate portion size from visual cues (compare to common objects if visible)
- servingSize and servingSizeUnit should match standard serving sizes (e.g., 100g, 1 cup, 1 medium, etc.)
- estimatedPortion should be human-readable (e.g., "1 medium apple (182g)", "2 slices bread")
- Choose the most appropriate food category from the list
- Generate useful, searchable food tags (ingredients, preparation method, characteristics)
- Keep notes concise but informative (1-2 sentences)
- Set confidence between 0.0 and 1.0 based on image quality, clarity, and certainty of nutrition estimates
- If you can't accurately estimate nutrition, use conservative estimates and lower confidence
- For packaged foods, try to identify the brand if visible
- preparedState should be one of: raw, cooked, grilled, fried, baked, steamed, boiled, etc.
- All nutrition values should be per serving (based on servingSize and servingSizeUnit)

Category guidelines:
- Protein: Meat, poultry, fish, eggs, tofu, legumes
- Carbs: Bread, pasta, rice, grains, cereals
- Vegetables: All vegetables, leafy greens
- Fruits: All fruits, fresh or dried
- Dairy: Milk, cheese, yogurt, dairy products
- Fats: Oils, butter, nuts, avocado, seeds
- Snacks: Chips, crackers, cookies, candy
- Beverages: Drinks, smoothies, juices
- Prepared: Complete meals, mixed dishes, restaurant food

Return ONLY the JSON object, no additional text.`


/**
 * Crop an image based on pixel bounding box coordinates
 */
async function cropImageByBoundingBox(
  imageDataUrl: string,
  boundingBox: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('✂️ Cropping image with bounding box (pixels):', boundingBox)

      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            throw new Error('Failed to get canvas context')
          }

          // Use pixel coordinates directly, just clamp to image bounds
          const cropX = Math.max(0, Math.floor(boundingBox.x))
          const cropY = Math.max(0, Math.floor(boundingBox.y))
          const cropWidth = Math.min(
            img.width - cropX,
            Math.ceil(boundingBox.width)
          )
          const cropHeight = Math.min(
            img.height - cropY,
            Math.ceil(boundingBox.height)
          )

          console.log(`📐 Image size: ${img.width}x${img.height}px`)
          console.log(`📏 Crop region: (${cropX}, ${cropY}) ${cropWidth}x${cropHeight}px`)
          console.log(`📊 Coverage: ${((cropWidth * cropHeight) / (img.width * img.height) * 100).toFixed(1)}% of original`)

          // Validate crop dimensions
          if (cropWidth <= 0 || cropHeight <= 0) {
            throw new Error('Invalid crop dimensions')
          }

          // Set canvas to cropped dimensions
          canvas.width = cropWidth
          canvas.height = cropHeight

          // Draw the cropped portion
          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,  // Source rectangle
            0, 0, cropWidth, cropHeight            // Destination rectangle
          )

          // Convert to data URL
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95)
          console.log('✅ Image cropped successfully:', croppedDataUrl.length, 'bytes')
          resolve(croppedDataUrl)
        } catch (error) {
          console.error('❌ Error during cropping operation:', error)
          reject(error)
        }
      }

      img.onerror = () => {
        const error = new Error('Failed to load image for cropping')
        console.error('❌', error.message)
        reject(error)
      }

      img.src = imageDataUrl
    } catch (error) {
      console.error('❌ Error setting up image crop:', error)
      reject(error)
    }
  })
}

/**
 * Generate a clean product image for a food using Gemini 2.5 Flash Image
 * Uses the input image as INSPIRATION to create a perfect product photo
 */
async function generateCleanProductImage(
  croppedImageData: string,
  progressCallback?: (message: string, progress: number) => void,
  itemMetadata?: {
    name?: string
    category?: string
    color?: string
    material?: string
    pattern?: string
  }
): Promise<string> {
  try {
    console.log('🎨 Starting image generation with metadata:', itemMetadata)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    })

    // Build detailed food description from metadata
    const foodDescription = itemMetadata?.name || 'food item'
    const category = itemMetadata?.category || 'food'

    const prompt = `Clean up this food image for a nutrition tracking app: ${foodDescription} (${category})

Keep the EXACT appearance from the input image - same cooking style, portion size, and presentation. Just improve the framing and background.

Requirements:
- Pure white background
- Center the food item
- Square (1:1) format
- Clean, well-lit look
- Preserve the actual appearance, colors, and textures from the original
- Keep the same portion size and preparation style

DO NOT idealize or "perfect" the food - show it as it actually looks in the input image.`

    console.log('📤 Sending image generation request with 1:1 aspect ratio...')

    // Generate faithful to input - preserve actual appearance
    const generationRequest = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: croppedImageData.split(',')[1],
                mimeType: 'image/jpeg',
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2, // Lower temperature for more faithful reproduction
        topK: 20,
        topP: 0.8,
        responseModalities: ['Image'],
        // @ts-ignore - imageConfig not in type definitions yet
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    }

    console.log('📐 Request config:', JSON.stringify(generationRequest.generationConfig, null, 2))

    const result = await model.generateContent(generationRequest)

    const response = await result.response
    console.log('📥 Response received:', response)

    // Extract generated image from response
    const parts = response.candidates?.[0]?.content?.parts || []
    console.log('🔍 Response parts:', parts.length, 'parts')

    for (const part of parts) {
      console.log('Part type:', part)
      if (part.inlineData) {
        console.log('✅ Generated image found!')
        // Convert to data URL
        const generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        console.log('📸 Generated image size:', generatedImage.length, 'bytes')

        // Validate the generated image quality
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            const aspectRatio = img.width / img.height
            const isSquare = Math.abs(aspectRatio - 1) < 0.1

            console.log('📐 Image dimensions:', img.width, 'x', img.height, `(${isSquare ? '✅ Square!' : '⚠️ Not square'})`)

            if (!isSquare) {
              console.warn('⚠️ Generated image is not square - aspect ratio:', aspectRatio.toFixed(2))
            }

            if (img.width < 512 || img.height < 512) {
              console.warn('⚠️ Generated image resolution too low:', img.width, 'x', img.height)
            } else {
              console.log('✅ Image quality validated')
            }

            resolve()
          }
          img.onerror = () => {
            console.error('❌ Failed to load generated image for validation')
            reject(new Error('Image validation failed'))
          }
          img.src = generatedImage
        })

        return generatedImage
      }
    }

    console.warn('⚠️ No image in response, using cropped input')
    // Fallback to cropped input if generation failed
    return croppedImageData
  } catch (error) {
    console.error('❌ Image generation failed, using cropped input:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return croppedImageData
  }
}

/**
 * Extract metadata for multiple foods WITHOUT generating images
 * Returns metadata with bounding boxes for each detected food
 */
export async function extractMultipleFoodsMetadata(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<Array<any>> {
  try {
    progressCallback?.('Initializing Gemini AI...', 5)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192,
      },
    })

    progressCallback?.('Converting image...', 15)
    const imageData = await fileToBase64(imageFile)

    // Get actual image dimensions
    progressCallback?.('Reading image dimensions...', 20)
    const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = reject
      img.src = imageData
    })

    console.log(`📐 Image dimensions: ${imageDimensions.width}x${imageDimensions.height}px`)

    progressCallback?.('Analyzing photo for foods...', 30)

    const multiFoodPrompt = `You are an expert nutrition AI analyzing food items in photos.

IMAGE DIMENSIONS: ${imageDimensions.width}x${imageDimensions.height} pixels

Detect ALL food items in this image and provide:
1. Precise bounding boxes in PIXELS for each food item
2. Nutrition estimates based on USDA food database
3. Portion size estimates

Return JSON array:
[
  {
    "name": "food name (e.g., 'Grilled Chicken Breast', 'Medium Apple', 'Steamed Broccoli')",
    "category": "Protein|Carbs|Vegetables|Fruits|Dairy|Fats|Snacks|Beverages|Prepared",
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "fiber": 0,
    "sugar": 0,
    "sodium": 74,
    "servingSize": 100,
    "servingSizeUnit": "g",
    "estimatedPortion": "3 oz (85g) chicken breast",
    "brand": "if visible on package",
    "preparedState": "raw|cooked|grilled|fried|baked|steamed|boiled",
    "tags": "#protein #chicken #grilled #lean",
    "notes": "brief nutritional highlights",
    "confidence": 0.0-1.0,
    "boundingBox": {
      "x": 0 to ${imageDimensions.width},
      "y": 0 to ${imageDimensions.height},
      "width": in pixels,
      "height": in pixels
    }
  }
]

CRITICAL RULES:
• Image is ${imageDimensions.width}x${imageDimensions.height}px
• x + width ≤ ${imageDimensions.width}
• y + height ≤ ${imageDimensions.height}
• Provide the TIGHTEST possible bounding box that fully contains the entire food item
• NO padding - box should be as tight as possible while including all visible parts
• For multiple items of the same food (e.g., 2 apples), create ONE entry with adjusted portion
• Integers only for bounding box coordinates
• Nutrition values should be per serving (based on servingSize and servingSizeUnit)
• Use standard USDA nutrition values
• Estimate portion size from visual cues (compare to plate size, utensils, etc.)
• servingSize and servingSizeUnit should be standard (100g, 1 cup, 1 medium, etc.)
• estimatedPortion should be human-readable (e.g., "1 medium apple (182g)", "1 cup cooked rice")
• confidence: 0.9-1.0 perfect, 0.8-0.9 clear, 0.7-0.8 partial/estimated, 0.6-0.7 uncertain

Category guidelines:
- Protein: Meat, poultry, fish, eggs, tofu, legumes
- Carbs: Bread, pasta, rice, grains, cereals
- Vegetables: All vegetables, leafy greens
- Fruits: All fruits, fresh or dried
- Dairy: Milk, cheese, yogurt
- Fats: Oils, butter, nuts, avocado
- Snacks: Chips, crackers, cookies, candy
- Beverages: Drinks, smoothies, juices
- Prepared: Complete meals, mixed dishes

Return ONLY JSON array, no additional text.`

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageFile.type,
        },
      },
      multiFoodPrompt,
    ])

    progressCallback?.('Processing response...', 80)

    const response = await result.response
    console.log('📦 Full response object:', response)
    console.log('🔍 Response candidates:', response.candidates)

    const text = response.text()
    console.log('🔍 Raw Gemini response:', text)
    console.log('📏 Response length:', text.length)

    // Check for blocked content
    if (!text || text.length === 0) {
      console.error('❌ Empty response from Gemini')
      console.error('Response object:', JSON.stringify(response, null, 2))

      // Check if content was blocked
      const candidate = response.candidates?.[0]
      if (candidate?.finishReason) {
        console.error('Finish reason:', candidate.finishReason)
      }
      if (candidate?.safetyRatings) {
        console.error('Safety ratings:', candidate.safetyRatings)
      }

      throw new Error('Gemini returned empty response. Check console for details.')
    }

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON array from response')
      console.error('Response text:', text.substring(0, 500))
      throw new Error(`Invalid response format from Gemini. Response: ${text.substring(0, 200)}`)
    }

    console.log('✅ Extracted JSON:', jsonMatch[0].substring(0, 200))
    const foods = JSON.parse(jsonMatch[0])
    console.log(`✅ Parsed ${foods.length} foods`)

    progressCallback?.('Metadata extraction complete!', 100)

    // Return foods with nutrition metadata including bounding boxes
    return foods.map((food: any) => ({
      name: food.name || 'Food Item',
      category: food.category || 'Other',
      tags: food.tags || '',
      notes: food.notes || '',
      confidence: food.confidence || 0.9,
      // Nutrition data
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      servingSize: food.servingSize || 100,
      servingSizeUnit: food.servingSizeUnit || 'g',
      estimatedPortion: food.estimatedPortion || `${food.servingSize}${food.servingSizeUnit}`,
      metadata: {
        brand: food.brand,
        preparedState: food.preparedState,
        boundingBox: food.boundingBox,
      },
    }))
  } catch (error) {
    console.error('Metadata extraction failed:', error)
    throw error
  }
}

/**
 * Generate clean product image from a data URL (cropped image)
 */
export async function generateCleanProductImageFromData(
  imageDataUrl: string,
  progressCallback?: (message: string, progress: number) => void,
  itemMetadata?: {
    name?: string
    category?: string
    color?: string
    material?: string
    pattern?: string
  }
): Promise<string> {
  try {
    progressCallback?.('Generating clean product image...', 10)
    return await generateCleanProductImage(imageDataUrl, progressCallback, itemMetadata)
  } catch (error) {
    console.error('Image generation failed:', error)
    // Return original on failure
    return imageDataUrl
  }
}

/**
 * Extract multiple foods from a single photo
 * Returns array of items, one for each detected food with AI-generated product images
 */
export async function extractMultipleFoods(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIGeneratedItem[]> {
  try {
    progressCallback?.('Initializing Gemini AI...', 5)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192, // More tokens for multiple items
      },
    })

    progressCallback?.('Converting image...', 15)
    const imageData = await fileToBase64(imageFile)

    // Get actual image dimensions
    progressCallback?.('Reading image dimensions...', 20)
    const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = reject
      img.src = imageData
    })

    console.log(`📐 Image dimensions: ${imageDimensions.width}x${imageDimensions.height}px`)

    progressCallback?.('Analyzing photo for foods...', 30)

    const multiFoodPrompt = `You are an expert nutrition AI analyzing food items in photos.

IMAGE DIMENSIONS: ${imageDimensions.width}x${imageDimensions.height} pixels

Detect ALL food items in this image and provide:
1. Precise bounding boxes in PIXELS for each food item
2. Nutrition estimates based on USDA food database
3. Portion size estimates

Return JSON array:
[
  {
    "name": "food name (e.g., 'Grilled Chicken Breast', 'Medium Apple', 'Steamed Broccoli')",
    "category": "Protein|Carbs|Vegetables|Fruits|Dairy|Fats|Snacks|Beverages|Prepared",
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "fiber": 0,
    "sugar": 0,
    "sodium": 74,
    "servingSize": 100,
    "servingSizeUnit": "g",
    "estimatedPortion": "3 oz (85g) chicken breast",
    "brand": "if visible on package",
    "preparedState": "raw|cooked|grilled|fried|baked|steamed|boiled",
    "tags": "#protein #chicken #grilled #lean",
    "notes": "brief nutritional highlights",
    "confidence": 0.0-1.0,
    "boundingBox": {
      "x": 0 to ${imageDimensions.width},
      "y": 0 to ${imageDimensions.height},
      "width": in pixels,
      "height": in pixels
    }
  }
]

CRITICAL RULES:
• Image is ${imageDimensions.width}x${imageDimensions.height}px
• x + width ≤ ${imageDimensions.width}
• y + height ≤ ${imageDimensions.height}
• Provide the TIGHTEST possible bounding box that fully contains the entire food item
• NO padding - box should be as tight as possible while including all visible parts
• For multiple items of the same food (e.g., 2 apples), create ONE entry with adjusted portion
• Integers only for bounding box coordinates
• Nutrition values should be per serving (based on servingSize and servingSizeUnit)
• Use standard USDA nutrition values
• Estimate portion size from visual cues (compare to plate size, utensils, etc.)
• servingSize and servingSizeUnit should be standard (100g, 1 cup, 1 medium, etc.)
• estimatedPortion should be human-readable (e.g., "1 medium apple (182g)", "1 cup cooked rice")
• confidence: 0.9-1.0 perfect, 0.8-0.9 clear, 0.7-0.8 partial/estimated, 0.6-0.7 uncertain

Category guidelines:
- Protein: Meat, poultry, fish, eggs, tofu, legumes
- Carbs: Bread, pasta, rice, grains, cereals
- Vegetables: All vegetables, leafy greens
- Fruits: All fruits, fresh or dried
- Dairy: Milk, cheese, yogurt
- Fats: Oils, butter, nuts, avocado
- Snacks: Chips, crackers, cookies, candy
- Beverages: Drinks, smoothies, juices
- Prepared: Complete meals, mixed dishes

Return ONLY JSON array, no additional text.`

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageFile.type,
        },
      },
      multiFoodPrompt,
    ])

    progressCallback?.('Processing response...', 50)

    const response = await result.response
    const text = response.text()

    console.log('🔍 Raw Gemini response:', text)
    console.log('📏 Response length:', text.length)

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON array from response')
      console.error('Response text:', text.substring(0, 500))
      throw new Error(`Invalid response format from Gemini. Response: ${text.substring(0, 200)}`)
    }

    console.log('✅ Extracted JSON:', jsonMatch[0].substring(0, 200))
    const foods = JSON.parse(jsonMatch[0])
    console.log(`✅ Parsed ${foods.length} foods`)
    const originalImageUrl = await fileToDataURL(imageFile)

    // Generate clean product images for each food
    progressCallback?.('Generating product images...', 60)

    const items: AIGeneratedItem[] = []

    for (let i = 0; i < foods.length; i++) {
      const food = foods[i]

      const progressPercent = 60 + Math.floor((i / foods.length) * 35)
      progressCallback?.(`Generating image ${i + 1}/${foods.length}...`, progressPercent)

      // Crop the image to focus on this specific food if bounding box is available
      let croppedImageData = originalImageUrl

      if (food.boundingBox) {
        try {
          console.log(`🎯 Cropping food ${i + 1}: ${food.name}`)
          console.log(`📦 Bounding box:`, food.boundingBox)
          croppedImageData = await cropImageByBoundingBox(originalImageUrl, food.boundingBox)
          console.log(`✅ Using cropped image for unbiased extraction`)
        } catch (cropError) {
          console.warn(`⚠️ Failed to crop image for food ${i + 1}, using original:`, cropError)
          // Fall back to original image
          croppedImageData = originalImageUrl
        }
      } else {
        console.log(`ℹ️ No bounding box for food ${i + 1}, using full image`)
      }

      // Generate clean product image using Gemini 2.5 Flash Image with retry logic
      // Input is ONLY the cropped image - no metadata to avoid bias
      let generatedImageData = croppedImageData
      let attempts = 0
      const maxAttempts = 2

      while (attempts < maxAttempts) {
        try {
          generatedImageData = await generateCleanProductImage(
            croppedImageData,
            progressCallback
          )
          break // Success!
        } catch (error) {
          attempts++
          console.warn(`🔄 Image generation attempt ${attempts} failed for food ${i + 1}:`, error)
          if (attempts >= maxAttempts) {
            console.error('❌ All generation attempts failed, using cropped image')
            progressCallback?.(`⚠️ Using cropped image for item ${i + 1}`, progressPercent)
          } else {
            console.log(`🔄 Retrying... (attempt ${attempts + 1}/${maxAttempts})`)
            // Brief delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      items.push({
        name: food.name || `Food Item ${i + 1}`,
        category: food.category || 'Other',
        color: food.color || 'Unknown',
        tags: food.tags || '',
        notes: food.notes || '',
        confidence: food.confidence || 0.9,
        imageData: generatedImageData, // Use AI-generated product image
        metadata: {
          style: food.style,
          occasion: food.occasion,
          season: food.season,
          material: food.material,
          pattern: food.pattern,
          secondaryColors: food.secondaryColors,
        },
      })
    }

    progressCallback?.('Complete!', 100)
    return items
  } catch (error) {
    console.error('Multi-food extraction failed:', error)

    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Please add your Google AI API key in Settings → AI Settings')
    }

    throw error
  }
}

/**
 * Analyze food image with Gemini's multimodal capabilities
 * (Single food analysis - legacy support)
 */
export async function analyzeFoodWithGemini(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIGeneratedItem | null> {
  try {
    progressCallback?.('Initializing Gemini AI...', 10)

    const ai = initializeGemini()

    // Use Gemini 2.0 Flash for fast multimodal analysis
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-latest',
      generationConfig: {
        temperature: 0, // Zero temperature for deterministic metadata extraction
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    })

    progressCallback?.('Converting image...', 30)

    // Convert image to base64
    const imageData = await fileToBase64(imageFile)

    progressCallback?.('Analyzing food with Gemini...', 50)

    // Generate content with image and prompt
    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
          mimeType: imageFile.type,
        },
      },
      FOOD_ANALYSIS_PROMPT,
    ])

    progressCallback?.('Processing response...', 80)

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini')
    }

    const analysis = JSON.parse(jsonMatch[0])

    progressCallback?.('Complete!', 100)

    // Convert to AIGeneratedItem format
    return {
      name: analysis.name || 'Food Item',
      category: analysis.category || 'Other',
      color: analysis.color || 'Unknown',
      tags: analysis.tags || '',
      notes: analysis.notes || '',
      confidence: analysis.confidence || 0.9,
      imageData: await fileToDataURL(imageFile),
      // Store additional metadata in notes
      metadata: {
        style: analysis.style,
        occasion: analysis.occasion,
        season: analysis.season,
        material: analysis.material,
        pattern: analysis.pattern,
        secondaryColors: analysis.secondaryColors,
      },
    }
  } catch (error) {
    console.error('Gemini analysis failed:', error)

    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Please add your Google AI API key in Settings → AI Settings')
    }

    return null
  }
}

/**
 * Batch analyze multiple food items
 */
export async function analyzeBatchWithGemini(
  imageFiles: File[],
  progressCallback?: (current: number, total: number, message: string) => void
): Promise<AIGeneratedItem[]> {
  const results: AIGeneratedItem[] = []

  for (let i = 0; i < imageFiles.length; i++) {
    progressCallback?.(i + 1, imageFiles.length, `Analyzing item ${i + 1} of ${imageFiles.length}...`)

    const item = await analyzeFoodWithGemini(imageFiles[i])
    if (item) {
      results.push(item)
    }
  }

  return results
}

/**
 * Advanced: Generate a clean food image using Gemini + Imagen
 * This removes backgrounds and creates a professional product shot
 */
export async function generateCleanFoodImage(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<Blob | null> {
  try {
    progressCallback?.('Analyzing original image...', 20)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // First, analyze what the food looks like
    const imageData = await fileToBase64(imageFile)

    const analysisPrompt = `Describe this food item in detail for image generation. Focus on:
- Type of food
- Colors
- Patterns/textures
- Style details
- Material appearance

Keep it concise (1-2 sentences) but descriptive.`

    const analysisResult = await model.generateContent([
      {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageFile.type,
        },
      },
      analysisPrompt,
    ])

    const description = (await analysisResult.response).text()

    progressCallback?.('Generating clean product image...', 60)

    // Generate prompt for clean product shot
    const imageGenPrompt = `Professional product photography: ${description}.
Clean white background, centered, well-lit studio lighting, high quality, product catalog style, no person wearing it, flat lay or mannequin display.`

    // Note: Actual image generation would require Imagen API
    // For now, return null as this requires additional setup
    progressCallback?.('Image generation requires Imagen API (not yet implemented)', 100)

    return null
  } catch (error) {
    console.error('Image generation failed:', error)
    return null
  }
}

/**
 * Smart food extraction from person photos
 * Uses Gemini to identify food, then provides extraction
 */
export async function extractFoodFromPhoto(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIGeneratedItem | null> {
  try {
    progressCallback?.('Analyzing photo...', 20)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const imageData = await fileToBase64(imageFile)

    const extractionPrompt = `${FOOD_ANALYSIS_PROMPT}

IMPORTANT: This image shows a person wearing clothes. Focus on the main food item visible (usually upper body food like shirt, jacket, or dress). Ignore the person's face and background.`

    progressCallback?.('Extracting food details...', 60)

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: imageFile.type,
        },
      },
      extractionPrompt,
    ])

    const response = await result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format')
    }

    const analysis = JSON.parse(jsonMatch[0])

    progressCallback?.('Complete!', 100)

    return {
      name: analysis.name || 'Food Item',
      category: analysis.category || 'Other',
      color: analysis.color || 'Unknown',
      tags: analysis.tags || '',
      notes: `${analysis.notes || ''} (Extracted from photo)`,
      confidence: analysis.confidence || 0.85,
      imageData: await fileToDataURL(imageFile),
      metadata: {
        style: analysis.style,
        occasion: analysis.occasion,
        season: analysis.season,
        material: analysis.material,
        pattern: analysis.pattern,
        secondaryColors: analysis.secondaryColors,
      },
    }
  } catch (error) {
    console.error('Extraction failed:', error)
    return null
  }
}

/**
 * Check if Gemini API is configured and available
 */
export async function isGeminiAvailable(): Promise<boolean> {
  try {
    if (!apiKey) return false

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Quick test
    await model.generateContent('Test')
    return true
  } catch {
    return false
  }
}

/**
 * Generate meal details from a collection of items
 */
export async function generateMealSuggestion(
  itemNames: string[],
  itemColors: string[],
  itemCategories: string[]
): Promise<{
  name: string
  season: string
  occasion?: string
  weather?: string
  tags?: string
  notes?: string
} | null> {
  try {
    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    })

    const itemsList = itemNames.map((name, i) =>
      `${i + 1}. ${name} (${itemCategories[i]}, ${itemColors[i]})`
    ).join('\n')

    const prompt = `You are a professional nutrition consultant. I have the following pantry items:

${itemsList}

Create an meal using these items and provide:
1. A creative, catchy name for this meal
2. The best season for this meal
3. The occasion this meal is suitable for
4. Weather conditions this meal works in
5. Relevant hashtags/tags
6. A brief styling note or description

Respond ONLY with valid JSON in this exact format:
{
  "name": "Meal name (e.g., 'Casual Weekend Look', 'Business Chic', 'Summer Breeze')",
  "season": "Season (Spring/Summer, Fall, Winter, All Season)",
  "occasion": "Occasion (e.g., 'Casual', 'Work', 'Date Night', 'Party')",
  "weather": "Weather (e.g., 'Warm', 'Cool', 'Mild', 'Cold', 'Any')",
  "tags": "Hashtags (e.g., '#casual #comfortable #weekend')",
  "notes": "Styling tip or brief description (1-2 sentences)"
}

Be creative but practical. Consider the color combinations and item types when suggesting the meal details.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Invalid response format from Gemini')
      return null
    }

    const meal = JSON.parse(jsonMatch[0])
    return {
      name: meal.name || 'My Meal',
      season: meal.season || 'All Season',
      occasion: meal.occasion,
      weather: meal.weather,
      tags: meal.tags,
      notes: meal.notes,
    }
  } catch (error) {
    console.error('Meal suggestion generation failed:', error)
    return null
  }
}

// Helper functions
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToDataURL(file: File): Promise<string> {
  return fileToBase64(file)
}

/**
 * Helper: Create a composite image from multiple food items
 * This helps the AI understand all items as a single meal
 */
async function createFoodComposite(itemDataUrls: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (itemDataUrls.length === 1) {
        resolve(itemDataUrls[0])
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Load all images first
      const imagePromises = itemDataUrls.map(dataUrl => {
        return new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image()
          img.onload = () => res(img)
          img.onerror = rej
          img.src = dataUrl
        })
      })

      Promise.all(imagePromises).then(images => {
        // Calculate grid layout
        const cols = Math.min(2, images.length)
        const rows = Math.ceil(images.length / cols)
        const itemSize = 512 // Standard size for each item

        canvas.width = itemSize * cols
        canvas.height = itemSize * rows

        // Fill with white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw each image in grid
        images.forEach((img, index) => {
          const col = index % cols
          const row = Math.floor(index / cols)
          const x = col * itemSize
          const y = row * itemSize

          // Calculate scaling to fit in square
          const scale = Math.min(itemSize / img.width, itemSize / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const offsetX = x + (itemSize - scaledWidth) / 2
          const offsetY = y + (itemSize - scaledHeight) / 2

          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
        })

        const compositeDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        console.log(`✅ Created composite image with ${images.length} items`)
        resolve(compositeDataUrl)
      }).catch(reject)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Convert SVG to PNG data URL
 */
async function svgToPng(svgDataUrl: string, width: number = 800, height: number = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Fill with white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)

        // Draw SVG
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to PNG
        const pngDataUrl = canvas.toDataURL('image/png', 1.0)
        resolve(pngDataUrl)
      }

      img.onerror = () => {
        reject(new Error('Failed to load SVG image'))
      }

      img.src = svgDataUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate AI meal composite - Template-based mannequin approach
 * Uses a consistent mannequin template and dresses it with the meal items
 * This ensures all meals have the same consistent look and accurate item representation
 */
export async function generateMealComposite(
  mealFoods: Array<{ name: string; category: string; color?: string; brand?: string; tags?: string; photo: string }>,
  progressCallback?: (message: string, progress: number) => void,
  aspectRatio: string = '3:4' // Optimal aspect ratio for meal display
): Promise<string> {
  try {
    progressCallback?.('Initializing meal composite generation...', 10)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    })

    progressCallback?.('Loading mannequin template...', 20)

    // Get or generate mannequin template with matching aspect ratio
    const { getMannequinTemplate } = await import('./mannequin-template')
    const MANNEQUIN_TEMPLATE = await getMannequinTemplate(apiKey, (msg, prog) => {
      // Scale progress from 20-40 range
      const scaledProgress = 20 + (prog * 0.2)
      progressCallback?.(msg, scaledProgress)
    }, aspectRatio)

    progressCallback?.('Preparing meal items...', 40)

    // Build detailed, structured item descriptions
    const itemDescriptions = mealFoods.map((item, index) => {
      const details: string[] = [
        `${index + 1}. ${item.category}: "${item.name}"`
      ]

      if (item.color) details.push(`   Color: ${item.color}`)
      if (item.brand) details.push(`   Brand: ${item.brand}`)
      if (item.tags) {
        // Extract style keywords from tags
        const styleTags = item.tags.split(' ').filter(tag =>
          tag.includes('casual') || tag.includes('formal') || tag.includes('sporty') ||
          tag.includes('elegant') || tag.includes('vintage') || tag.includes('modern')
        ).join(', ')
        if (styleTags) details.push(`   Style: ${styleTags}`)
      }

      return details.join('\n')
    }).join('\n\n')

    console.log('👔 Meal items for composite:\n', itemDescriptions)

    // Simplified, focused prompt for accurate item placement
    const prompt = `Dress the mannequin in this meal. The mannequin is in the first image, food items in the second image.

MEAL TO CREATE:
${itemDescriptions}

CRITICAL REQUIREMENTS:

1. ACCURATE ITEM PLACEMENT:
   - Place each food item EXACTLY on the mannequin's body
   - Top items (shirts, t-shirts, jackets) → upper body/torso
   - Bottom items (pants, skirts, shorts) → hips and legs
   - Outerwear (jackets, coats) → over other food
   - Shoes → on feet
   - Accessories → appropriate body location

2. PRESERVE ITEM APPEARANCE:
   - Keep EXACT colors from the original items (no color changes)
   - Maintain ALL patterns, prints, logos, and design details
   - Preserve textures and fabric appearance
   - Each item must be clearly recognizable from the original photo

3. REALISTIC FOOD ARRANGEMENT:
   - Items should fit naturally on the mannequin's body
   - Show realistic fabric folds and draping
   - Food items arranged naturally
   - Professional food display quality

4. VISUAL CONSISTENCY:
   - Pure white background (#FFFFFF)
   - Same mannequin pose and position
   - Professional studio lighting
   - Clean, high-quality food catalog aesthetic
   - Vertical portrait format

5. COMPLETENESS:
   - Include ALL ${mealFoods.length} items in the meal
   - Each item fully visible and properly positioned
   - Items should layer correctly (underwear → base → outerwear)

Generate the meal composite now with perfect accuracy.`

    progressCallback?.('Generating meal composite...', 70)

    // Prepare multi-image input: mannequin template + all meal item photos
    const parts: any[] = [
      // First: Mannequin template as the base
      {
        inlineData: {
          data: MANNEQUIN_TEMPLATE.split(',')[1],
          mimeType: MANNEQUIN_TEMPLATE.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        },
      },
    ]

    // Add all meal item photos
    for (const item of mealFoods) {
      parts.push({
        inlineData: {
          data: item.photo.split(',')[1],
          mimeType: 'image/jpeg',
        },
      })
    }

    // Add text prompt last
    parts.push({
      text: prompt,
    })

    const generationRequest = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.4, // Balanced: consistent but allows natural draping
        topK: 40,
        topP: 0.9,
        responseModalities: ['Image'],
        // @ts-ignore - imageConfig not in type definitions yet
        imageConfig: {
          aspectRatio: aspectRatio, // Configurable aspect ratio
        },
      },
    }

    console.log(`📤 Sending template-based composite request (mannequin + ${mealFoods.length} items)...`)

    const result = await model.generateContent(generationRequest)
    const response = await result.response

    progressCallback?.('Processing composite...', 85)

    // Extract generated image from response
    const responseParts = response.candidates?.[0]?.content?.parts || []
    console.log('🔍 Response parts:', responseParts.length, 'part(s)')

    for (const part of responseParts) {
      if (part.inlineData) {
        console.log('✅ Meal composite generated with template!')
        const generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`

        progressCallback?.('Composite complete!', 100)
        return generatedImage
      }
    }

    throw new Error('No image generated in response')
  } catch (error) {
    console.error('❌ Meal composite generation failed:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Please add your Google AI API key in Settings → AI Settings.')
      }
      throw error
    }

    throw new Error('Meal composite generation failed. Please try again.')
  }
}

/**
 * Virtual try-on: Show how meal items would look on a user
 * Takes user's photo and meal items with metadata, generates composite result
 */
export async function generateVirtualTryOn(
  userPhotoDataUrl: string,
  mealFoods: Array<{ name: string; category: string; color?: string; brand?: string; tags?: string; photo: string }>,
  progressCallback?: (message: string, progress: number) => void
): Promise<string> {
  try {
    progressCallback?.('Initializing virtual try-on...', 10)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    })

    progressCallback?.('Preparing meal items...', 20)

    // Extract photo URLs
    const mealFoodsDataUrls = mealFoods.map(item => item.photo)

    // Create a composite image if multiple items - this helps the AI understand the complete meal
    let foodImage: string
    if (mealFoodsDataUrls.length > 1) {
      console.log(`🔄 Creating composite from ${mealFoodsDataUrls.length} items...`)
      foodImage = await createFoodComposite(mealFoodsDataUrls)
    } else {
      foodImage = mealFoodsDataUrls[0]
    }

    progressCallback?.('Analyzing photos...', 40)

    // Build detailed item descriptions from metadata
    const itemDescriptions = mealFoods.map((item, index) => {
      const parts = [
        `${index + 1}. ${item.category}: "${item.name}"`
      ]
      if (item.color) parts.push(`Color: ${item.color}`)
      if (item.brand) parts.push(`Brand: ${item.brand}`)
      if (item.tags) parts.push(`Style/Details: ${item.tags}`)
      return parts.join(' | ')
    }).join('\n')

    console.log('👔 Meal items:', itemDescriptions)

    // Build a more explicit prompt that emphasizes replacing ALL food with detailed metadata
    const prompt = `You are performing a complete food replacement. Replace ALL of the person's food in the first photo with the meal items shown in the second photo.

MEAL DETAILS - Pay close attention to these specific items:
${itemDescriptions}

CRITICAL - Replace ALL food with the items described above:
- Top/shirt/blouse/jacket (completely replace all upper body food)
- Bottom/pants/skirt/shorts (completely replace all lower body food)
- Shoes/footwear (if visible in meal items)
- Any accessories shown (hats, scarves, bags, etc.)

Requirements:
- Replace EVERY piece of visible food - do not keep ANY original food
- Use the exact colors specified in the meal details above
- Match the style and category of each item (e.g., if it says "casual t-shirt", make it look casual)
- The person's face, hair, skin, body shape, and pose must stay EXACTLY the same
- Maintain the original photo's background, lighting, and shadows
- Make the new clothes fit naturally on their body with realistic fabric draping and wrinkles
- Match all colors, patterns, textures, and brand aesthetics from the meal items exactly
- Pay special attention to small details like buttons, zippers, logos, prints
- The final image must look photorealistic as if the person is actually wearing these clothes

Generate the image now with all food completely replaced according to the meal details above.`

    progressCallback?.('Generating virtual try-on...', 60)

    // Prepare the request with user photo and food composite
    const parts: any[] = [
      {
        inlineData: {
          data: userPhotoDataUrl.split(',')[1],
          mimeType: 'image/jpeg',
        },
      },
      {
        inlineData: {
          data: foodImage.split(',')[1],
          mimeType: 'image/jpeg',
        },
      },
    ]

    // Add text prompt
    parts.push({
      text: prompt,
    })

    const generationRequest = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent food replacement
        topK: 40,
        topP: 0.95,
        responseModalities: ['Image'],
      },
    }

    console.log(`📤 Sending virtual try-on request (${mealFoods.length} items → 1 composite)...`)
    console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...')
    console.log('📝 Full prompt length:', prompt.length, 'characters')

    const result = await model.generateContent(generationRequest)
    const response = await result.response

    progressCallback?.('Processing result...', 85)

    // Extract generated image from response
    const responseParts = response.candidates?.[0]?.content?.parts || []
    console.log('🔍 Response parts:', responseParts.length, 'part(s)')

    for (const part of responseParts) {
      if (part.inlineData) {
        console.log('✅ Virtual try-on image generated!')
        const generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`

        progressCallback?.('Virtual try-on complete!', 100)
        return generatedImage
      }
    }

    throw new Error('No image generated in response')
  } catch (error) {
    console.error('❌ Virtual try-on failed:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Please add your Google AI API key in Settings → AI Settings.')
      }
      throw error
    }

    throw new Error('Virtual try-on failed. Please try again.')
  }
}
