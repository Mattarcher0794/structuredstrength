
## Fix: Exercise API results not rendering

### Problem
The API returns `{ results: { success: true, data: [...] } }` but the frontend expects `results` to be an array directly. Line 74 checks `Array.isArray(data.results)` which is `false` because `data.results` is an object, so results always defaults to `[]`.

### Solution
Update the parsing logic in `src/pages/ExerciseApiSearch.tsx`:

**Line 73-75** -- Change from:
```typescript
const data = await res.json();
const list = Array.isArray(data.results) ? data.results : [];
setResults(list);
```

To:
```typescript
const data = await res.json();
console.log("Exercise API response:", data);
const list = Array.isArray(data?.results?.data) ? data.results.data : [];
setResults(list);
```

**Update the ExerciseResult interface** to include `imageUrl` (the field returned by this API) alongside `gifUrl`:
```typescript
interface ExerciseResult {
  exerciseId?: string;
  id?: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  imageUrl?: string;
  instructions?: string[];
  secondaryMuscles?: string[];
}
```

**Update result card rendering** to:
- Use `imageUrl` as fallback when `gifUrl` is not present
- Show `exerciseId` as small muted debug text below name

**Update detail sheet** to also use `imageUrl` fallback.

### Files changed
- `src/pages/ExerciseApiSearch.tsx` only (no edge function changes)
