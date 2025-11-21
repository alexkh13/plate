// Google Gemini AI Service - Multimodal Food Analysis
// Uses Gemini for image understanding and metadata extraction

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIGeneratedFood } from './food'

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
1. Identify what type of food this is
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
  foodMetadata?: {
    name?: string
    category?: string
  }
): Promise<string> {
  try {
    console.log('🎨 Starting image generation with metadata:', foodMetadata)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    })

    // Build detailed food description from metadata
    const foodDescription = foodMetadata?.name || 'food'
    const category = foodMetadata?.category || 'food'

    const prompt = `Clean up this food image for a nutrition tracking app: ${foodDescription} (${category})

Keep the EXACT appearance from the input image - same cooking style, portion size, and presentation. Just improve the framing and background.

Requirements:
- Pure white background
- Center the food
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

    // Clean the response to remove markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');

    // Extract JSON array from response
    const jsonMatch = cleanedText.match(/[\[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON array from response')
      console.error('Response text:', cleanedText.substring(0, 500))
      throw new Error(`Invalid response format from Gemini. Response: ${cleanedText.substring(0, 200)}`)
    }

    console.log('✅ Extracted JSON:', jsonMatch[0].substring(0, 200))
    const foods = JSON.parse(jsonMatch[0])
    console.log(`✅ Parsed ${foods.length} foods`)

    progressCallback?.('Metadata extraction complete!', 100)

    // Return foods with nutrition metadata including bounding boxes
    return foods.map((food: any) => ({
      name: food.name || 'Food',
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
  foodMetadata?: {
    name?: string
    category?: string
  }
): Promise<string> {
  try {
    progressCallback?.('Generating clean product image...', 10)
    return await generateCleanProductImage(imageDataUrl, progressCallback, foodMetadata)
  } catch (error) {
    console.error('Image generation failed:', error)
    // Return original on failure
    return imageDataUrl
  }
}

/**
 * Extract multiple foods from a single photo
 * Returns array of foods, one for each detected food with AI-generated product images
 */
export async function extractMultipleFoods(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIGeneratedFood[]> {
  try {
    progressCallback?.('Initializing Gemini AI...', 5)

    const ai = initializeGemini()
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192, // More tokens for multiple foods
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

    // Clean the response to remove markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');

    // Extract JSON array from response
    const jsonMatch = cleanedText.match(/[\[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('❌ Failed to extract JSON array from response')
      console.error('Response text:', cleanedText.substring(0, 500))
      throw new Error(`Invalid response format from Gemini. Response: ${cleanedText.substring(0, 200)}`)
    }

    console.log('✅ Extracted JSON:', jsonMatch[0].substring(0, 200))
    const foods = JSON.parse(jsonMatch[0])
    console.log(`✅ Parsed ${foods.length} foods`)
    const originalImageUrl = await fileToDataURL(imageFile)

    // Generate clean product images for each food
    progressCallback?.('Generating product images...', 60)

    const foodItems: AIGeneratedFood[] = []

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
            progressCallback?.(`⚠️ Using cropped image for food ${i + 1}`, progressPercent)
          } else {
            console.log(`🔄 Retrying... (attempt ${attempts + 1}/${maxAttempts})`)
            // Brief delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      foodItems.push({
        name: food.name || `Food ${i + 1}`,
        category: food.category || 'Other',
        tags: food.tags || '',
        notes: food.notes || '',
        confidence: food.confidence || 0.9,
        imageData: generatedImageData, // Use AI-generated product image
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
      })
    }

    progressCallback?.('Complete!', 100)
    return foodItems
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
): Promise<AIGeneratedFood | null> {
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

    // Clean the response to remove markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');

    // Parse JSON response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini')
    }

    const analysis = JSON.parse(jsonMatch[0])

    progressCallback?.('Complete!', 100)

    // Convert to AIGeneratedFood format
    return {
      name: analysis.name || 'Food',
      category: analysis.category || 'Other',
      tags: analysis.tags || '',
      notes: analysis.notes || '',
      confidence: analysis.confidence || 0.9,
      imageData: await fileToDataURL(imageFile),
      calories: analysis.calories || 0,
      protein: analysis.protein || 0,
      carbs: analysis.carbs || 0,
      fat: analysis.fat || 0,
      fiber: analysis.fiber || 0,
      sugar: analysis.sugar || 0,
      sodium: analysis.sodium || 0,
      servingSize: analysis.servingSize || 100,
      servingSizeUnit: analysis.servingSizeUnit || 'g',
      estimatedPortion: analysis.estimatedPortion || `${analysis.servingSize}${analysis.servingSizeUnit}`,
      metadata: {
        brand: analysis.brand,
        preparedState: analysis.preparedState,
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
): Promise<AIGeneratedFood[]> {
  const results: AIGeneratedFood[] = []

  for (let i = 0; i < imageFiles.length; i++) {
    progressCallback?.(i + 1, imageFiles.length, `Analyzing food ${i + 1} of ${imageFiles.length}...`)

    const food = await analyzeFoodWithGemini(imageFiles[i])
    if (food) {
      results.push(food)
    }
  }

  return results
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
 * Generate meal details from a collection of foods
 */
export async function generateMealSuggestion(
  foodNames: string[],
  foodCategories: string[],
): Promise<{
  name: string;
  mealType: string;
  tags?: string;
  notes?: string;
} | null> {
  try {
    const ai = initializeGemini();
    const model = ai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    });

    const foodsList = foodNames
      .map((name, i) => `${i + 1}. ${name} (${foodCategories[i]})`)
      .join('\n');

    const prompt = `You are a professional nutrition consultant. I have the following pantry foods:

${foodsList}

Create a meal using these foods and provide:
1. A creative, catchy name for this meal
2. The meal type (e.g., Breakfast, Lunch, Dinner, Snack)
3. Relevant hashtags/tags
4. A brief description of the meal

Respond ONLY with valid JSON in this exact format:
{
  "name": "Meal name (e.g., 'Sunrise Power Bowl', 'Mediterranean Chicken Salad', 'Quick & Easy Snack Plate')",
  "mealType": "Breakfast|Lunch|Dinner|Snack",
  "tags": "Hashtags (e.g., '#healthy #highprotein #quickmeal')",
  "notes": "Brief description of the meal (1-2 sentences)"
}

Be creative but practical. Consider the food types when suggesting the meal details.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to remove markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');

    // Extract JSON from response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Invalid response format from Gemini');
      return null;
    }

    const meal = JSON.parse(jsonMatch[0]);
    return {
      name: meal.name || 'My Meal',
      mealType: meal.mealType || 'Snack',
      tags: meal.tags,
      notes: meal.notes,
    };
  } catch (error) {
    console.error('Meal suggestion generation failed:', error);
    return null;
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