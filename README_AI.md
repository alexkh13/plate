# AI-Powered Item Creation

## Overview

The AI feature is now **directly integrated** into the item creation flow for a seamless experience.

## How It Works

1. **Upload/Take Photo** - Select a photo of clothing items
2. **Click "AI Analyze Photo"** - Gemini 2.0 Flash analyzes and extracts ALL garments from the photo
3. **AI Generates Clean Images** - Gemini 2.5 Flash Image (Nano Banana 🍌) creates professional product shots for each garment
4. **Review Multiple Items** - If multiple garments detected, navigate between them using dot indicators
5. **Edit & Save** - Review AI-generated details and images, edit as needed, and save each item

## Features

### Multi-Garment Detection
- Automatically detects multiple garments in a single photo
- Creates separate items for each detected garment (shirt, pants, jacket, etc.)
- Navigate between items using intuitive dot indicators in the header

### Rich Metadata Extraction
For each garment, Gemini AI provides:
- **Name**: "Navy Blue Denim Jacket"
- **Category**: Top, Bottom, Dress, Outerwear, Shoes, etc.
- **Color**: Primary color
- **Style**: casual, formal, sporty, elegant
- **Occasion**: everyday, work, party, gym
- **Season**: summer, winter, all-season
- **Material**: denim, cotton, leather, wool
- **Pattern**: solid, striped, floral, checkered
- **Tags**: Auto-generated hashtags

### Progressive Saving
- Save items one at a time
- After saving, automatically move to next item
- Return to wardrobe when all items are saved

## Setup

1. Get a free Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Go to **Settings → AI Settings**
3. Paste your API key
4. Start adding items!

## Usage Tips

### Best Photos
- ✅ Clear, well-lit images
- ✅ Photos of people wearing clothes (extracts each garment)
- ✅ Flat-lay photos showing multiple items
- ✅ Product shots
- ✅ Full outfit photos

### Not Ideal
- ❌ Blurry/dark photos
- ❌ Heavy filters
- ❌ Extreme angles
- ❌ Multiple people wearing similar clothes

## Technical Details

### Architecture
```
User Photo → Gemini 2.0 Flash (Analysis) → Gemini 2.5 Flash Image (Product Images) → Multiple Garments → Separate Forms → Save Each
```

**Two-Stage AI Pipeline:**
1. **Gemini 2.0 Flash** - Analyzes photo and extracts garment metadata
2. **Gemini 2.5 Flash Image (Nano Banana)** - Generates clean, professional product images for each garment

### API Usage
- **Gemini 2.0 Flash**: 15 requests/minute, 1,500/day (free tier)
- **Gemini 2.5 Flash Image**: ~$0.04 per generated image (1290 tokens @ $30/1M tokens)
- **Speed**:
  - Analysis: ~2-3 seconds per photo
  - Image generation: ~3-5 seconds per garment
  - Total: ~5-8 seconds per garment detected
- **Cost**: Free for analysis, minimal cost for image generation (~$0.04 per item)

### Privacy
- Images sent to Google AI API for processing
- Not stored by Google (processed and discarded)
- All items saved locally in your browser's IndexedDB

## Files

- `/src/routes/items/new.tsx` - Item creation page with integrated AI
- `/src/services/ai/gemini.ts` - Gemini AI integration
- `/src/services/ai/index.ts` - Main AI service
- `/src/services/ai/types.ts` - TypeScript definitions

## Examples

### Single Garment Photo
1. Upload photo of a jacket
2. Click "AI Analyze Photo"
3. AI analyzes: "Blue Denim Jacket", category: "Outerwear", etc.
4. AI generates clean product image with white background
5. Review and save

### Multiple Garments (Person Photo)
1. Upload photo of person wearing shirt + pants
2. Click "AI Analyze Photo"
3. Gemini detects 2 items and generates clean images for each
4. Navigate between items using dots (1/2, 2/2)
5. Review "White T-Shirt" with AI-generated product shot, save
6. Auto-advance to "Blue Jeans" with AI-generated product shot, save
7. Both items now in wardrobe with professional images!

### Flat-Lay Photo
1. Upload photo showing multiple clothing items laid out
2. Click "AI Analyze Photo"
3. Gemini detects all separate items
4. AI generates professional product images for each
5. Review and save each one with clean, catalog-style photos

## Troubleshooting

### "Please add your Google AI API key"
- Go to Settings → AI Settings
- Add your key from Google AI Studio

### "No garments detected"
- Try a clearer photo
- Ensure clothing is visible
- Check lighting

### "AI analysis failed"
- Check internet connection
- Verify API key is correct
- Try again (could be temporary API issue)

## Benefits Over Manual Entry

| Feature | Manual | With AI |
|---------|--------|---------|
| **Time per item** | ~2 min | ~10 sec |
| **Metadata fields** | 3-4 | 10+ |
| **Multi-item** | 1 at a time | All detected |
| **Accuracy** | Variable | Consistent |
| **Tags** | Manual | Auto-generated |
| **Images** | Original photo | Clean product shots |
| **Background** | As-is | Professional white/neutral |

## Future Enhancements

Planned improvements:
- ✅ Background removal for cleaner product shots (DONE via Gemini 2.5 Flash Image)
- ✨ Brand/logo detection
- ✨ Size estimation from photos
- ✨ Price suggestions
- ✨ Care instruction generation
- ✨ Outfit matching recommendations
- ✨ Virtual try-on using generated images
