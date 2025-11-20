// Mannequin Template for AI Composite Generation
// Auto-generated and cached for consistent meal previews

import { GoogleGenerativeAI } from '@google/generative-ai'

const MANNEQUIN_CACHE_KEY = 'aura_mannequin_template'
const MANNEQUIN_VERSION_KEY = 'aura_mannequin_version'
const CURRENT_VERSION = '1.0'

/**
 * Generate a professional mannequin template using Gemini AI
 */
export async function generateMannequinTemplate(
  apiKey: string,
  progressCallback?: (message: string, progress: number) => void,
  aspectRatio: string = '3:4' // Optimal for food item display
): Promise<string> {
  try {
    progressCallback?.('Initializing AI generation...', 10)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
    })

    progressCallback?.('Generating mannequin template...', 30)

    const prompt = `Create a professional food display template for displaying food.

SPECIFICATIONS:

1. MANNEQUIN DESIGN:
   - Front-facing, centered in frame
   - Neutral standing pose (arms slightly away from body, relaxed)
   - Full body visible from head to feet
   - Professional food display template style
   - Neutral beige/tan skin tone (#E8D5C4)
   - Featureless face (no facial features)
   - Realistic plate presentation style

2. BODY DETAILS:
   - Wearing minimal form-fitting neutral base layer (beige/nude bodysuit)
   - Shows natural body contours for realistic food display
   - Smooth, clean 3D mannequin rendering
   - Subtle shading for depth and dimension
   - Professional studio mannequin appearance

3. BACKGROUND & COMPOSITION:
   - Pure white background (#FFFFFF)
   - Vertical portrait orientation
   - Mannequin centered, occupying 75-80% of vertical space
   - Professional studio lighting (soft, even, no harsh shadows)
   - High resolution, sharp details

4. QUALITY:
   - Professional food catalog quality
   - Clean edges and smooth surfaces
   - Suitable for AI food overlay
   - Consistent and reusable

Create this professional mannequin template now.`

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2, // Low for consistency
        topK: 40,
        topP: 0.9,
        responseModalities: ['Image'],
        // @ts-ignore
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    })

    progressCallback?.('Processing generated mannequin...', 80)

    const response = await result.response
    const parts = response.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      if (part.inlineData) {
        const mannequinDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`

        progressCallback?.('Saving mannequin template...', 95)

        // Cache the template
        if (typeof window !== 'undefined') {
          localStorage.setItem(MANNEQUIN_CACHE_KEY, mannequinDataUrl)
          localStorage.setItem(MANNEQUIN_VERSION_KEY, CURRENT_VERSION)
        }

        progressCallback?.('Complete!', 100)
        console.log('✅ Mannequin template generated and cached')

        return mannequinDataUrl
      }
    }

    throw new Error('No image generated in response')
  } catch (error) {
    console.error('❌ Mannequin generation failed:', error)
    throw error
  }
}

/**
 * Get cached mannequin template or return null if not available
 */
export function getCachedMannequinTemplate(): string | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(MANNEQUIN_CACHE_KEY)
  const version = localStorage.getItem(MANNEQUIN_VERSION_KEY)

  // Return cached template if version matches
  if (cached && version === CURRENT_VERSION) {
    return cached
  }

  return null
}

/**
 * Get mannequin template - returns cached or generates new one
 */
export async function getMannequinTemplate(
  apiKey?: string,
  progressCallback?: (message: string, progress: number) => void,
  aspectRatio?: string
): Promise<string> {
  // Try to get cached version first
  const cached = getCachedMannequinTemplate()
  if (cached) {
    console.log('📦 Using cached mannequin template')
    return cached
  }

  // No cache - need to generate
  if (!apiKey) {
    throw new Error('Mannequin template not cached and no API key provided')
  }

  console.log('🎨 Generating new mannequin template...')
  return await generateMannequinTemplate(apiKey, progressCallback, aspectRatio)
}

/**
 * Check if mannequin template is cached
 */
export function hasMannequinTemplate(): boolean {
  return getCachedMannequinTemplate() !== null
}

/**
 * Clear cached mannequin template (forces regeneration)
 */
export function clearMannequinTemplate(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MANNEQUIN_CACHE_KEY)
    localStorage.removeItem(MANNEQUIN_VERSION_KEY)
    console.log('🗑️ Mannequin template cache cleared')
  }
}
