# AI-Powered Food Recognition Feature

## Overview

The AI Food Recognition feature automatically identifies food items from photos and generates detailed nutritional information. This helps you quickly log your meals and track your diet.

## Architecture

```
┌─────────────────┐
│  User Photo     │
│  (of a meal)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Stage 1: Vision Model      │
│  • TensorFlow.js            │
│  • COCO-SSD (MobileNet)     │
│  • Object detection         │
│  • Color extraction         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Stage 2: Language Model    │
│  • WebLLM                   │
│  • Phi-3.5-mini (quantized) │
│  • Description generation   │
│  • Nutritional estimation   │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│  Food Metadata  │
│  • Name         │
│  • Calories     │
│  • Macronutrients│
│  • Tags         │
│  • Notes        │
└─────────────────┘
```

## Features

### 1. Smart Scan Mode (Full AI)
- **Vision Detection**: Identifies food items using COCO-SSD.
- **Nutritional Analysis**: Estimates calories, protein, carbs, and fat.
- **AI Descriptions**: Generates natural language descriptions using Phi-3.5-mini.
- **Smart Tagging**: Creates relevant hashtags based on ingredients.
- **Time**: ~10-30 seconds (first load), ~5-10 seconds (subsequent scans)

### 2. Quick Scan Mode (Vision Only)
- **Fast Detection**: Skips LLM processing for speed
- **Basic Metadata**: Food name, color, confidence score
- **Time**: ~1-3 seconds

### 3. Batch Processing
- Detect multiple food items in a single photo.
- Review and edit each detected food item.
- Bulk save to your pantry.

### 4. Offline-Capable
- Models cached in IndexedDB.
- Works without internet after first load.
- ~50-70MB total model size.

## Technical Stack

### Dependencies
```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow-models/coco-ssd": "^2.x",
  "@mlc-ai/web-llm": "^0.x",
  "colorthief": "^2.x"
}
```

### Models Used

#### Vision Model: COCO-SSD
- **Base**: MobileNet V2 Lite
- **Size**: ~5MB
- **Backend**: WebGPU → WebGL → WASM (auto-fallback)
- **Purpose**: Object detection and bounding boxes.

#### Language Model: Phi-3.5-mini
- **Variant**: q4f16_1-MLC (4-bit quantized)
- **Size**: ~2GB (downloads on first use)
- **Backend**: WebGPU for acceleration
- **Purpose**: Natural language generation and nutritional estimation.

### Color Extraction: ColorThief
- **Purpose**: Dominant color and palette extraction.
- **Output**: Hex colors + human-readable names.

## File Structure

```
src/services/ai/
├── index.ts         # Main AI service orchestrator
├── food-recognition.ts # TensorFlow.js vision processing
├── gemini.ts        # Gemini language model
├── utils.ts         # Color extraction & utilities
├── types.ts         # TypeScript type definitions
└── cache.ts         # IndexedDB model caching

src/routes/foods/
└── ai-analyze.tsx      # AI scan UI component
```

## Usage

### As a User

1. Navigate to **Add Food** → **Launch AI Scan**
2. Choose scan mode:
   - **Smart Scan**: Full AI with nutritional analysis
   - **Quick Scan**: Fast detection only
3. Take photo or upload image
4. Click **Scan Foods**
5. Wait for processing (progress bar shown)
6. Review detected food items
7. Edit names, quantities, or other details if needed
8. Click **Save All** to add to your pantry

### As a Developer

```typescript
import {
  initializeAI,
  processImageWithAI,
  quickScan,
  type AIGeneratedFood,
  type AIProgressCallback
} from '@/services/ai'

// Initialize AI models
await initializeAI(
  {
    languageModel: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    minConfidence: 0.5,
    maxDetections: 5,
    useWebGPU: true
  },
  (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`)
  }
)

// Process image with full AI
const imageFile: File = ... // from file input
const foods: AIGeneratedFood[] = await processImageWithAI(
  imageFile,
  (progress) => {
    console.log(progress.message)
  }
)

// Quick scan (vision only)
const quickFoods = await quickScan(imageFile)

// Use generated foods
foods.forEach(food => {
  console.log(food.name)       // "A bowl of oatmeal"
  console.log(food.calories)   // 150
  console.log(food.protein)    // 5
  console.log(food.carbs)      // 27
  console.log(food.fat)        // 3
  console.log(food.tags)       // "#oatmeal #breakfast #healthy"
  console.log(food.confidence) // 0.87
})
```

## Performance Optimization

### 1. Lazy Loading
- Models only load when AI scan feature is accessed.
- Main app bundle stays lightweight.

### 2. Model Caching
- Vision model: Cached automatically by TensorFlow.js
- Language model: Cached by WebLLM in IndexedDB
- Subsequent loads are near-instant.

### 3. Progressive Enhancement
- Quick scan available immediately.
- Full AI requires model download (one-time).
- Graceful degradation to rule-based fallback.

### 4. Backend Optimization
- WebGPU for hardware acceleration (if available).
- Automatic fallback to WebGL or WASM.
- Efficient 4-bit quantized models.

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Vision (TensorFlow.js) | ✅ | ✅ | ✅ | ✅ |
| WebGL Backend | ✅ | ✅ | ✅ | ✅ |
| WebGPU Backend | ✅ (113+) | 🚧 (Beta) | ❌ | ✅ (113+) |
| WebLLM | ✅ | ✅* | ⚠️** | ✅ |

\* Firefox: WebGPU support in development
\** Safari: Limited WebGPU support, may require fallback

## Limitations & Future Improvements

### Current Limitations
- COCO-SSD is trained on general objects, not specifically food.
- Nutritional estimation is a rough guide, not a substitute for professional advice.
- May struggle with complex, mixed dishes.
- LLM download is large (~2GB) on first use.

### Planned Improvements
1. **Fine-tuned Food Model**: Train/use a model specifically for food items.
2. **Portion Size Estimation**: Use depth sensors or other techniques to estimate portion sizes.
3. **Barcode Scanning**: Integrate a barcode scanner for packaged foods.
4. **Smaller LLM**: Use Llama-3.2-1B for faster loading.
5. **Multi-photo Support**: Scan multiple photos in batch.
6. **Meal Suggestions**: Recommend meals based on your pantry.

## Privacy & Security

- **100% On-Device**: All processing happens in the browser.
- **No Data Uploaded**: Photos and food data never leave your device.
- **Offline-Capable**: Works without internet connection.
- **No Tracking**: No analytics or telemetry.

## Performance Benchmarks

Tested on modern mobile device (iPhone 14 Pro / Pixel 7 Pro equivalent):

| Operation | First Load | Subsequent |
|-----------|-----------|------------|
| Vision Model Load | ~2-3s | ~100ms |
| Language Model Load | ~30-60s | ~500ms |
| Single Food Detection | ~1s | ~500ms |
| LLM Description | ~3-5s | ~2-3s |
| **Total Smart Scan** | **~40-70s** | **~5-10s** |
| **Total Quick Scan** | **~3-5s** | **~1-2s** |

Desktop (M1 MacBook / modern laptop):
- Smart Scan: ~20-30s (first), ~3-5s (cached)
- Quick Scan: ~1-2s

## Troubleshooting

### "Failed to load model"
- Check internet connection for first-time download.
- Clear browser cache and retry.
- Try quick scan mode first.

### "No food items detected"
- Ensure good lighting and clear photo.
- Try closer shot with food centered.
- Use quick scan mode for faster retry.

### "Out of memory"
- Close other browser tabs.
- Restart browser.
- Use quick scan mode (lighter).

## API Reference

See TypeScript definitions in `src/services/ai/types.ts` for full API documentation.