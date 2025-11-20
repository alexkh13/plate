# Transformation Plan: Aura → Plate

## Overview
Transform wardrobe management app "Aura" into meal and nutrition tracking app "Plate"

---

## 1. CONCEPTUAL MAPPING

| Current (Wardrobe) | New (Nutrition) |
|-------------------|-----------------|
| Items (clothing) | Foods (ingredients/products) |
| Outfits (clothing combos) | Meals (food combinations) |
| Wardrobe page | Pantry/Foods page |
| Calendar (outfit planning) | Calendar (meal planning) |
| Discover (fashion) | Discover (recipes) |
| Virtual try-on | Meal plate visualization |
| Garment detection | Food recognition |
| Outfit suggestions | Meal suggestions |

---

## 2. DATABASE SCHEMA TRANSFORMATION

### Foods Collection (formerly Items)
```typescript
{
  id: string // UUID
  name: string // "Chicken Breast", "Brown Rice", etc.
  photo: string // base64 data URL
  brand?: string // Brand or restaurant name
  tags: string // #protein #keto #glutenfree
  notes: string

  // NUTRITION DATA (per serving)
  calories: number // kcal
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber?: number // grams
  sugar?: number // grams
  sodium?: number // mg

  servingSize: number // e.g., 100
  servingSizeUnit: string // g, ml, oz, cup, piece, etc.

  // CATEGORIZATION
  category: string // Protein, Carbs, Vegetables, Fruits, Dairy, Fats, Snacks, Beverages, Prepared
  allergens?: string[] // milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans

  // META
  isRecipe: boolean // false for simple foods, true for recipes
  barcode?: string // for packaged foods

  profileId: string
  createdAt: number
  updatedAt: number
}
```

### Meals Collection (formerly Outfits)
```typescript
{
  id: string // UUID
  name: string // "Grilled Chicken Salad", "Breakfast Bowl"

  // MEAL COMPONENTS
  foodPortions: Array<{
    foodId: string
    amount: number // quantity
    unit: string // g, ml, oz, cup, piece
  }>

  // COMPUTED NUTRITION (sum of all foods × portions)
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber?: number

  // MEAL METADATA
  mealType: string // breakfast, lunch, dinner, snack
  timestamp?: number // when consumed (for logging)
  mealImage?: string // photo of the complete meal

  tags: string // #healthy #quick #highprotein
  notes: string

  profileId: string
  createdAt: number
  updatedAt: number
}
```

### Calendar Entries (minimal changes)
```typescript
{
  id: string // YYYY-MM-DD format
  date: string
  mealId?: string // formerly outfitId
  notes: string
  createdAt: number
  updatedAt: number
}
```

### Profiles (no changes needed)
```typescript
{
  id: string
  name: string
  isDefault: boolean
  avatar?: string
  description?: string

  // OPTIONAL: Add nutrition goals
  dailyCalorieGoal?: number
  dailyProteinGoal?: number
  dailyCarbGoal?: number
  dailyFatGoal?: number

  createdAt: number
  updatedAt: number
}
```

---

## 3. AI SERVICE TRANSFORMATION

### Current Capabilities:
- `extractMultipleGarments()` - Detect clothing items
- `generateOutfitDetails()` - Suggest outfit metadata
- `generateVirtualTryOn()` - Visualize outfit on user
- `generateOutfitComposite()` - Mannequin visualization

### New Capabilities:

#### extractMultipleFoods(imageData: string)
```typescript
// Input: Photo of food(s)
// Output: Array of detected foods with nutrition data
{
  foods: Array<{
    name: string
    category: string
    boundingBox: { x, y, width, height }
    confidence: number
    imageData: string // cropped food item

    // ESTIMATED NUTRITION (per detected portion)
    estimatedPortion: { amount: number, unit: string }
    calories: number
    protein: number
    carbs: number
    fat: number

    metadata?: {
      allergens: string[]
      tags: string[]
      preparationMethod: string
      ingredients: string[]
    }
  }>
}
```

**Implementation:**
1. Use Gemini Vision to analyze image
2. Detect and segment food items (bounding boxes)
3. Identify each food item
4. Estimate portion sizes using visual cues
5. Query nutrition database OR use Gemini's knowledge
6. Return structured data

#### generateMealDetails(foods: Food[])
```typescript
// Input: Array of foods in a meal
// Output: Suggested meal metadata
{
  name: string // e.g., "Mediterranean Chicken Bowl"
  mealType: string // breakfast/lunch/dinner/snack
  tags: string[] // #healthy #balanced #highprotein
  notes: string // Cooking tips, pairing suggestions

  totalNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }

  suggestions?: {
    additions: string[] // "Add spinach for more fiber"
    substitutions: string[] // "Swap white rice for quinoa"
  }
}
```

#### analyzeMealPhoto(imageData: string)
```typescript
// Input: Photo of complete meal
// Output: Full meal analysis with all foods and total nutrition
{
  detectedFoods: Food[]
  totalNutrition: Macros
  mealType: string
  estimatedMealName: string
}
```

---

## 4. NUTRITION DATA SOURCE

### Option A: USDA FoodData Central API (FREE)
- Comprehensive nutrition database
- 400,000+ foods
- Free API access
- Updated regularly
- **RECOMMENDED for cost-effectiveness**

API endpoint: `https://api.nal.usda.gov/fdc/v1/`

### Option B: Gemini Knowledge Base
- Use Gemini's built-in nutrition knowledge
- Less accurate but no additional API needed
- Good for estimates

### Hybrid Approach (BEST):
1. Use Gemini to identify foods
2. Query USDA API for accurate nutrition data
3. Fall back to Gemini estimates if not found

---

## 5. ROUTE TRANSFORMATION

| Current Route | New Route | Purpose |
|--------------|-----------|---------|
| `/wardrobe` | `/pantry` | List all foods |
| `/items/new` | `/foods/new` | Add new food (AI scan) |
| `/items/$itemId` | `/foods/$foodId` | Food detail view |
| `/outfits` | `/meals` | List all meals |
| `/outfits/new` | `/meals/new` | Create new meal |
| `/outfits/$outfitId` | `/meals/$mealId` | Meal detail |
| `/outfits/$outfitId/edit` | `/meals/$mealId/edit` | Edit meal |
| `/calendar` | `/calendar` | Meal planning calendar |
| `/discover` | `/discover` | Recipe discovery |
| `/settings/*` | `/settings/*` | Settings (unchanged) |

**New Routes:**
- `/dashboard` - Daily nutrition summary, goals, charts
- `/log` - Quick meal logging
- `/stats` - Nutrition statistics over time

---

## 6. COMPONENT UPDATES

### New Components Needed:

#### NutritionLabel.tsx
Display nutrition facts in FDA-style label format

#### MacroRing.tsx / MacroBar.tsx
Circular or bar chart showing protein/carbs/fat breakdown

#### DailyProgress.tsx
Show progress toward daily nutrition goals

#### FoodCard.tsx (replaces ItemCard)
Display food item with mini nutrition summary

#### MealCard.tsx (replaces OutfitCard)
Display meal with total macros

#### PortionInput.tsx
Input for selecting portion size with unit selector

#### NutritionSummary.tsx
Summary panel showing total macros for a meal

### Updated Components:

- **Header** - Update title handling for new routes
- **BottomNav** - Update icons and labels (Wardrobe→Pantry, Outfits→Meals)
- **ActionDrawer** - Update quick actions (Add Food, Log Meal)
- All form components - Update fields for nutrition data

---

## 7. BRANDING TRANSFORMATION

### App Name
**Aura** → **Plate**

### Visual Identity
- **Primary color**: Blue → Green (#10b981, emerald-500) or Orange (#f97316, orange-500)
- **Accent color**: Food-themed warm tones
- **Icons**:
  - Replace Shirt icon with Utensils/Apple
  - Update all navigation icons to food-related

### Text Updates
- Update all UI strings
- Update meta tags, manifest
- Update package.json name and description

---

## 8. KEY FEATURES

### Core Features (MVP)
✅ Scan food photos to detect and add foods
✅ Build meals from foods with portion control
✅ Calculate total macros (calories, protein, carbs, fat)
✅ Calendar-based meal planning
✅ Daily nutrition summary

### Enhanced Features (Phase 2)
- Barcode scanning for packaged foods
- Recipe management
- Grocery list generation
- Nutrition goals and tracking
- Weight tracking
- Water intake tracking
- Export nutrition data
- Meal templates/favorites

---

## 9. IMPLEMENTATION ORDER

### Phase 1: Data Layer
1. Update database schema in `src/db/index.ts`
2. Add RxDB migrations
3. Update types in `src/types/index.ts`
4. Update data hooks in `src/hooks/useData.ts`

### Phase 2: AI & Services
1. Create nutrition API service (`src/services/nutrition/`)
2. Update AI service for food recognition
3. Create macro calculation utilities

### Phase 3: Routes & Navigation
1. Rename route files
2. Update route logic
3. Update navigation (BottomNav, ActionDrawer)
4. Update route tree

### Phase 4: Components
1. Create nutrition components
2. Update form components
3. Update card components
4. Create dashboard

### Phase 5: Branding
1. Update app name everywhere
2. Update colors and theme
3. Update icons
4. Update package.json

### Phase 6: Testing & Polish
1. Test all flows
2. Fix bugs
3. Optimize performance
4. Add loading states

---

## 10. MIGRATION STRATEGY

Since this is a transformation (not preserving old data):
- Clear existing RxDB database on first load
- OR provide migration script to demo data
- Start fresh with new schema

---

## 11. TECHNICAL DECISIONS

### Nutrition Data Accuracy
- AI estimates for homemade/restaurant foods
- USDA API for packaged/common foods
- User can manually override

### Portion Detection
- AI visual estimation (less accurate)
- User confirmation/adjustment required
- Provide common serving size presets

### Offline Support
- Cache USDA food data locally
- Sync when online
- Store all user data in IndexedDB (RxDB)

### Image Storage
- Continue using base64 data URLs
- Consider WebP compression for smaller sizes

---

## 12. SUCCESS METRICS

Transformation complete when:
- ✅ All routes renamed and functional
- ✅ Database schema updated with migrations
- ✅ AI can detect foods and estimate nutrition
- ✅ Can create meals and calculate macros
- ✅ Calendar works with meals
- ✅ No references to "wardrobe", "outfit", "item" in UI
- ✅ App branded as "Plate"
- ✅ All existing features work in new domain

---

## READY TO IMPLEMENT ✨

This plan provides complete implementation details. All architectural decisions are made. Ready to execute transformation.
