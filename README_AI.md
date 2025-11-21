# AI-Powered Food Logging

## Overview

The AI feature is now **directly integrated** into the food logging flow for a seamless experience.

## How It Works

1. **Upload/Take Photo** - Select a photo of your meal.
2. **Click "AI Analyze Photo"** - Gemini 1.5 Flash analyzes and extracts ALL food items from the photo.
3. **Review Multiple Items** - If multiple food items are detected, navigate between them using dot indicators.
4. **Edit & Save** - Review AI-generated details, edit as needed, and save each food item.

## Features

### Multi-Food Detection
- Automatically detects multiple food items in a single photo.
- Creates separate entries for each detected food (e.g., chicken, rice, broccoli).
- Navigate between items using intuitive dot indicators in the header.

### Rich Nutritional Extraction
For each food item, Gemini AI provides:
- **Name**: "Grilled Chicken Breast"
- **Calories**: Estimated calories
- **Protein**: Estimated protein in grams
- **Carbohydrates**: Estimated carbohydrates in grams
- **Fat**: Estimated fat in grams
- **Tags**: Auto-generated hashtags

### Progressive Saving
- Save food items one at a time.
- After saving, automatically move to the next item.
- Return to your pantry when all items are saved.

## Setup

1. Get a free Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Go to **Settings → AI Settings**
3. Paste your API key
4. Start logging your meals!

## Usage Tips

### Best Photos
- ✅ Clear, well-lit images
- ✅ Photos of entire meals
- ✅ Close-ups of individual food items

### Not Ideal
- ❌ Blurry/dark photos
- ❌ Heavy filters
- ❌ Extreme angles
- ❌ Multiple meals overlapping

## Technical Details

### Architecture
```
User Photo → Gemini 1.5 Flash (Analysis) → Multiple Food Items → Separate Forms → Save Each
```

**Single-Stage AI Pipeline:**
1. **Gemini 1.5 Flash** - Analyzes the photo and extracts food metadata.

### API Usage
- **Gemini 1.5 Flash**: 15 requests/minute, 1,500/day (free tier)
- **Speed**:
  - Analysis: ~2-3 seconds per photo
- **Cost**: Free for analysis.

### Privacy
- Images sent to Google AI API for processing.
- Not stored by Google (processed and discarded).
- All food items saved locally in your browser's IndexedDB.

## Files

- `/src/routes/foods/new.tsx` - Food logging page with integrated AI.
- `/src/routes/foods/ai-analyze.tsx` - The AI analysis UI.
- `/src/services/ai/gemini.ts` - Gemini AI integration.
- `/src/services/ai/index.ts` - Main AI service.
- `/src/services/ai/types.ts` - TypeScript definitions.

## Examples

### Single Food Photo
1. Upload photo of a banana.
2. Click "AI Analyze Photo".
3. AI analyzes: "Banana", calories: 105, etc.
4. Review and save.

### Multiple Foods (Meal Photo)
1. Upload photo of a plate with chicken, rice, and broccoli.
2. Click "AI Analyze Photo".
3. Gemini detects 3 items.
4. Navigate between items using dots (1/3, 2/3, 3/3).
5. Review "Grilled Chicken Breast", save.
6. Auto-advance to "White Rice", save.
7. Auto-advance to "Steamed Broccoli", save.
8. All three items are now in your pantry.

## Troubleshooting

### "Please add your Google AI API key"
- Go to Settings → AI Settings.
- Add your key from Google AI Studio.

### "No food items detected"
- Try a clearer photo.
- Ensure the food is visible.
- Check lighting.

### "AI analysis failed"
- Check internet connection.
- Verify API key is correct.
- Try again (could be temporary API issue).

## Benefits Over Manual Entry

| Feature | Manual | With AI |
|---------|--------|---------|
| **Time per item** | ~1 min | ~5 sec |
| **Nutritional fields** | 1-2 | 5+ |
| **Multi-item** | 1 at a time | All detected |
| **Accuracy** | Variable | Consistent |
| **Tags** | Manual | Auto-generated |

## Future Enhancements

Planned improvements:
- ✨ Portion size estimation from photos.
- ✨ Barcode scanning for packaged foods.
- ✨ Recipe generation from meal photos.
- ✨ Meal planning recommendations.
- ✨ Virtual coaching based on your diet.