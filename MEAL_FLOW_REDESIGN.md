# Integrated AI Meal Creation Flow - Design Document

## Overview
This redesign integrates AI food detection directly into the meal creation workflow, allowing users to scan a meal photo and immediately create a meal with detected foods while optionally saving foods to their pantry catalog.

## User Flow

### 1. Entry Point: `/meals/new`
- User starts at meal creation page
- **NEW**: Image capture button at the top (optional)
- If image provided → AI analysis starts immediately
- If no image → traditional manual meal creation

### 2. AI Analysis Phase (if image provided)
```
User uploads meal photo
  ↓
AI detects multiple foods in image
  ↓
Each food gets:
  - Bounding box coordinates
  - Cropped image preview
  - AI-estimated nutrition
  - Name, category, serving size
  ↓
Foods populate in meal form as "pending" items
```

### 3. Food Review & Matching Phase
For each detected food, user can:

#### Option A: Match to Existing Food
- Click "Find Similar" button
- System searches pantry for similar foods using:
  - Fuzzy name matching (e.g., "Grilled Chicken" matches "Chicken Breast")
  - Category matching
  - Nutrition similarity
- Show top 3-5 matches with confidence scores
- User selects match → use existing food in meal
- Portion amount pre-filled from AI estimation

#### Option B: Create as New Food
- Edit AI-detected details inline:
  - Name, category, nutrition
  - Bounding box adjustment (if needed)
  - AI image generation (optional)
- Mark "Save to Pantry" checkbox
  - If checked: Creates permanent food item in catalog
  - If unchecked: Creates temporary food just for this meal
- User confirms → food ready for meal

#### Option C: Remove from Meal
- Click remove button
- Food discarded from meal

### 4. Food Enhancement Options

Each food item supports:

**Bounding Box Editing:**
- Edit button opens overlay on original image
- Touch interactions:
  - Drag corners: resize
  - Drag edges: adjust sides
  - Pinch: scale
  - Sketch: draw new box
- Save → Re-crop image with new box
- Re-generate AI image option appears

**AI Image Generation:**
- "Generate Clean Image" button
- Uses cropped food image
- Creates white-background product photo
- Toggle between cropped and generated views
- Can regenerate if not satisfied

**Nutrition Editing:**
- All nutrition fields editable
- Real-time validation
- Serving size adjustable
- Per-serving and per-portion calculations

### 5. Meal Assembly
- All confirmed foods show in "Foods" section
- Each food shows:
  - Preview image (cropped or AI-generated)
  - Name and category
  - Portion controls (amount + unit)
  - Nutrition for that portion
  - Actions: edit, remove
- Real-time nutrition totals at bottom
- Meal metadata: name, type, tags, notes

### 6. Save Flow
```
User clicks Save
  ↓
For each food marked "Save to Pantry":
  - Create new Food document in database
  ↓
For foods matched to existing:
  - Use existing Food ID
  ↓
For temporary foods (not saved to pantry):
  - Create Food document but mark as temporary
  - Could add `isTemporary: true` flag
  ↓
Create Meal document
  ↓
Create MealFood associations for all foods
  ↓
Navigate to meal detail page
```

## Component Architecture

### New Components

#### 1. `FoodMatcher.tsx`
```typescript
interface FoodMatcherProps {
  detectedFood: {
    name: string
    category: string
    calories: number
    protein: number
    // ...
  }
  existingFoods: Food[]
  onSelectMatch: (food: Food) => void
  onCreateNew: () => void
}
```

**Features:**
- Fuzzy search algorithm (Levenshtein distance)
- Nutrition similarity scoring
- Category filtering
- Confidence percentage per match
- Visual comparison of nutrition

#### 2. `InlineFoodEditor.tsx`
```typescript
interface InlineFoodEditorProps {
  foodData: DetectedFoodData
  originalImage: string
  onSave: (food: FoodFormData) => void
  onCancel: () => void
  mode: 'create' | 'edit'
}
```

**Features:**
- All nutrition fields editable
- Bounding box editor integration
- AI image generation
- Image toggle (cropped vs generated)
- Save to pantry checkbox
- Category dropdown
- Serving size customization

#### 3. `BoundingBoxEditor.tsx` (extracted from ai-analyze)
```typescript
interface BoundingBoxEditorProps {
  originalImage: string
  initialBox: BoundingBox
  onSave: (box: BoundingBox) => void
  onCancel: () => void
}
```

**Features:**
- All current touch interactions
- Corner/edge/pinch dragging
- Visual overlay
- Dimension validation

#### 4. `DetectedFoodItem.tsx`
```typescript
interface DetectedFoodItemProps {
  food: DetectedFood
  onMatch: () => void
  onEdit: () => void
  onRemove: () => void
  onGenerateImage: () => void
  onEditBox: () => void
}
```

**Features:**
- Compact card view
- Quick actions
- Status indicators (matched, new, edited)
- Confidence badge
- Preview image

### Updated Components

#### `meals/new.tsx` - Major Rewrite
New state management:
```typescript
interface MealFormState {
  // Basic meal info
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: number
  tags: string
  notes: string
  mealImage: string

  // AI-detected foods
  detectedFoods: DetectedFood[]

  // Confirmed foods (matched or created)
  confirmedFoods: ConfirmedFood[]

  // Processing states
  isAnalyzing: boolean
  analysisProgress: number
}

interface DetectedFood {
  id: string // temp ID
  name: string
  category: string
  imageData: string // cropped
  originalImageData: string
  boundingBox: BoundingBox
  nutrition: NutritionData
  servingSize: number
  servingSizeUnit: string
  estimatedPortion: string
  confidence: number
  status: 'pending' | 'matched' | 'creating' | 'confirmed' | 'removed'
  matchedFoodId?: string // if matched to existing
  saveToPantry: boolean
  generatedImageData?: string
}

interface ConfirmedFood {
  foodId?: string // existing food ID or undefined for new
  foodData: FoodFormData // if creating new
  portion: {
    amount: number
    unit: string
  }
  isTemporary: boolean // not saved to pantry
}
```

## Food Matching Algorithm

### Similarity Scoring
```typescript
function calculateFoodSimilarity(detected: DetectedFood, existing: Food): number {
  const weights = {
    name: 0.4,
    category: 0.2,
    nutrition: 0.4
  }

  // Name similarity (Levenshtein distance normalized)
  const nameScore = fuzzyMatch(detected.name, existing.name)

  // Category exact match
  const categoryScore = detected.category === existing.category ? 1.0 : 0.0

  // Nutrition similarity (weighted difference)
  const nutritionScore = calculateNutritionSimilarity(
    detected.nutrition,
    {
      calories: existing.calories,
      protein: existing.protein,
      carbs: existing.carbs,
      fat: existing.fat
    }
  )

  return (
    nameScore * weights.name +
    categoryScore * weights.category +
    nutritionScore * weights.nutrition
  )
}

function fuzzyMatch(str1: string, str2: string): number {
  // Levenshtein distance implementation
  // Returns 0-1 where 1 is exact match
}

function calculateNutritionSimilarity(n1, n2): number {
  // Compare calories, protein, carbs, fat
  // Allow 20% variance
  // Returns 0-1 similarity score
}
```

### Matching Threshold
- Show matches with score >= 0.6 (60% similarity)
- Sort by score descending
- Show top 5 matches max
- Display confidence percentage

## UI/UX Enhancements

### Progressive Disclosure
1. **Initial State**: Image upload area prominent
2. **Analyzing State**: Loading indicator with progress
3. **Review State**: Detected foods shown one at a time or all at once (user preference)
4. **Assembly State**: Confirmed foods in meal builder

### Visual Indicators
- **Pending**: Yellow border, "Review" badge
- **Matched**: Green checkmark, shows matched food name
- **Creating New**: Blue border, "New" badge
- **Removed**: Faded, strikethrough

### Batch Operations
- "Accept All" button: Creates all as new foods
- "Remove All" button: Clears all detected foods
- "Auto-Match All" button: Attempts to match all foods automatically

### Error Handling
- AI analysis fails → Allow manual food addition
- No matches found → Directly create new food
- Network issues → Show retry option
- Invalid nutrition data → Show validation errors

## Database Schema Changes

### Option 1: Add `isTemporary` flag to Food
```typescript
interface Food {
  // ... existing fields
  isTemporary?: boolean // true for foods not in pantry
}
```

### Option 2: Separate collection
Keep current schema, mark as non-temporary by default

**Recommendation**: Option 1 - simpler, allows cleanup of temporary foods later

## Migration Strategy

### Phase 1: New Route (Recommended)
- Create `/meals/ai-scan` as new route
- Keep `/meals/new` for manual creation
- Keep `/foods/ai-analyze` for food-only scanning
- Link from meals page: "Create Meal" vs "Scan Meal"

### Phase 2: Integration
- Add "Scan Photo" button to `/meals/new`
- Keep both flows in same page
- User chooses workflow

### Phase 3: Consolidation (Optional)
- Merge `/foods/ai-analyze` functionality into new flow
- Single AI scanning experience

## Performance Considerations

### Image Handling
- Compress uploaded images before AI processing
- Cache cropped images in IndexedDB
- Generate AI images on-demand, not automatically

### AI Processing
- Process one image at a time
- Show clear progress indicators
- Allow cancellation
- Background processing with service worker (future)

### Database Operations
- Batch create foods before meal
- Single transaction for meal + associations
- Optimistic UI updates

## Accessibility

- ARIA labels for all buttons
- Keyboard navigation support
- Screen reader announcements for AI progress
- High contrast mode support
- Touch target sizes >= 44px

## Testing Checklist

- [ ] Upload single food image → detect correctly
- [ ] Upload multi-food meal → detect all foods
- [ ] Match existing food → uses correct ID
- [ ] Create new food → saves to pantry
- [ ] Temporary food → not in pantry list
- [ ] Edit bounding box → recrop works
- [ ] Generate AI image → displays correctly
- [ ] Remove food → not in meal
- [ ] Adjust portions → nutrition updates
- [ ] Save meal → all associations created
- [ ] No image → manual flow works
- [ ] AI fails → graceful fallback
- [ ] Cancel mid-process → cleanup occurs

## Future Enhancements

1. **Barcode Scanning**: Instant food lookup
2. **Voice Input**: Speak food names
3. **Smart Suggestions**: Based on meal history
4. **Recipe Detection**: Identify complete dishes
5. **Allergen Warnings**: Auto-detect from ingredients
6. **Nutrition Goals**: Real-time goal tracking
7. **Meal Templates**: Save frequent combinations
8. **Social Sharing**: Share meal compositions

---

## Implementation Priority

### Phase 1 (MVP)
1. Redesigned `/meals/new` with image input
2. AI food detection integration
3. Basic inline food creation
4. Simple food matching (exact name/category)
5. Save flow with new foods

### Phase 2 (Enhanced)
1. Fuzzy matching algorithm
2. Bounding box editing
3. AI image generation
4. Confidence scoring
5. Batch operations

### Phase 3 (Polish)
1. Advanced matching (nutrition similarity)
2. Temporary foods flag
3. Performance optimizations
4. Accessibility improvements
5. Error recovery

---

**Status**: Ready for implementation
**Estimated Effort**: 2-3 days for Phase 1, 1-2 days for Phase 2, 1 day for Phase 3
