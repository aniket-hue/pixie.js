# Issues with Parent-Child System Refactoring

## Overview
After moving parent/child logic from systems to component files, there are several issues with the update flow and matrix calculations.

---

## Issue 1: Missing Parent Updates on Child Removal

**Location:** `src/core/ecs/components/children.ts`

**Problem:**
- `removeChild()` doesn't call `updateChildrenCoords(parent)`
- `clearChildren()` doesn't call `updateChildrenCoords(parent)`

**Impact:**
- When children are removed, parent's bounding box doesn't update
- Parent keeps old size/position even after children are gone
- Visual glitches: parent appears larger than it should

**Fix:**
```typescript
export function removeChild(parent: number, child: number) {
  // ... existing code ...
  clearParent(child);
  updateChildrenCoords(parent); // ADD THIS
  markDirty(parent); // ADD THIS
}

export function clearChildren(parent: number) {
  // ... existing code ...
  Children.count[parent] = 0;
  Children.offset[parent] = 0;
  updateChildrenCoords(parent); // ADD THIS
  markDirty(parent); // ADD THIS
}
```

---

## Issue 2: Circular Update Problem in `addChild`

**Location:** `src/core/ecs/components/children.ts` → `addChild()`

**Problem:**
When adding a child, the flow is:
1. `addChild()` → `updateChildrenCoords(parent)` 
2. Uses child's **world matrix** to calculate parent bounds
3. Calls `setWorldMatrix(parent)` with calculated matrix
4. `setWorldMatrix()` → `updateChildMatrices(parent)`
5. `updateChildMatrices()` recalculates ALL children's local matrices
6. But child's world matrix is still in **world space**, not relative to parent yet!

**Impact:**
- Child's local matrix calculated incorrectly
- Child appears in wrong position relative to parent
- Cascading errors when parent moves

**Root Cause:**
The child's world matrix should be converted to local space **before** calculating parent bounds, but it happens **after**.

**Fix Options:**

### Option A: Convert child to local space BEFORE calculating parent bounds
```typescript
export function addChild(parent: number, child: number) {
  // ... add to buffer ...
  
  updateParent(child, parent);
  
  // Convert child's world matrix to local space relative to parent
  const parentWorldMatrix = getWorldMatrix(parent);
  const parentLocalMatrix = getLocalMatrix(parent);
  const inverseParentLocal = m3.inverse(parentLocalMatrix);
  
  const childWorldMatrix = getWorldMatrix(child);
  const childLocalMatrix = m3.multiply(inverseParentLocal, childWorldMatrix);
  setLocalMatrix(child, childLocalMatrix);
  
  // Now calculate parent bounds (children are in correct local space)
  updateChildrenCoords(parent);
  markDirty(child);
}
```

### Option B: Don't update children matrices when setting parent world matrix during bounds calculation
```typescript
function updateChildrenCoords(parentId: number) {
  const children = getChildren(parentId);
  const { width, height, localMatrix: parentMatrix } = createBoundingBoxOfchildren(children);

  setLocalMatrix(parentId, parentMatrix);
  // Temporarily set world matrix without updating children
  // Then update children separately
  WorldMatrix.m00[parentId] = parentMatrix[0];
  // ... set all matrix components directly ...
  
  // Now update children matrices
  updateChildMatrices(parentId);
  setWidth(parentId, width);
  setHeight(parentId, height);
}
```

---

## Issue 3: Double Matrix Update in `updateChildrenCoords`

**Location:** `src/core/ecs/components/children.ts` → `updateChildrenCoords()`

**Problem:**
```typescript
function updateChildrenCoords(parentId: number) {
  const children = getChildren(parentId);
  const { width, height, localMatrix: parentMatrix } = createBoundingBoxOfchildren(children);

  setLocalMatrix(parentId, parentMatrix);
  setWorldMatrix(parentId, parentMatrix); // This triggers updateChildMatrices
  // ...
}
```

`setWorldMatrix()` calls `updateChildMatrices()`, which recalculates children's matrices. But:
- Children's world matrices were just used to calculate parent bounds
- Now they're being recalculated based on the new parent matrix
- This could cause position drift over time

**Impact:**
- Potential for numerical errors/accumulation
- Children might slowly drift from correct positions
- Unnecessary computation

**Fix:**
Either:
1. Use a flag to skip child updates during bounds calculation
2. Or restructure so bounds calculation uses local matrices, not world matrices

---

## Issue 4: `updateChildMatrices` Logic Assumes Children Have Valid World Matrices

**Location:** `src/core/ecs/components/matrix.ts` → `updateChildMatrices()`

**Problem:**
```typescript
function updateChildMatrices(eid: number) {
  // ...
  for (const child of children) {
    const childWorldMatrix = getWorldMatrix(child); // Assumes this is valid
    
    const newLocalMatrix = m3.multiply(inverseLocalMatrix, childWorldMatrix);
    // ...
  }
}
```

If a child was just created and added, its world matrix might be:
- Identity matrix (not initialized)
- In world space (not relative to parent)
- Zero matrix

**Impact:**
- Incorrect local matrix calculation
- Child appears at origin or wrong position

**Fix:**
Check if child has a valid world matrix before using it:
```typescript
function updateChildMatrices(eid: number) {
  const children = getChildren(eid);
  if (!children.length) return;

  const worldMatrix = getWorldMatrix(eid);
  const localMatrix = getLocalMatrix(eid);
  const inverseLocalMatrix = m3.inverse(localMatrix);

  for (const child of children) {
    const childWorldMatrix = getWorldMatrix(child);
    
    // Check if child has valid matrix (not identity/zero)
    const isIdentity = m3.isIdentity(childWorldMatrix);
    if (isIdentity) {
      // Use parent's world matrix as base
      const newLocalMatrix = m3.identity();
      setLocalMatrix(child, newLocalMatrix);
      setWorldMatrix(child, worldMatrix);
    } else {
      const newLocalMatrix = m3.multiply(inverseLocalMatrix, childWorldMatrix);
      const newWorldMatrix = m3.multiply(worldMatrix, newLocalMatrix);
      setLocalMatrix(child, newLocalMatrix);
      setWorldMatrix(child, newWorldMatrix);
    }
    
    markDirty(child);
  }
}
```

---

## Issue 5: `createBoundingBoxOfchildren` Uses World Matrices

**Location:** `src/core/utils/createBoundingBoxOfchildren.ts`

**Problem:**
The function uses `getWorldMatrix(child)` to calculate parent bounds. But:
- If children are being added, their world matrices might not be in correct space yet
- Should use local matrices relative to parent, or convert world to local first

**Impact:**
- Incorrect parent bounds calculation
- Parent appears larger/smaller than it should

**Consideration:**
This might be intentional if children are always in world space before being added to parent. But then the conversion needs to happen correctly.

---

## Issue 6: No Handling of Empty Parent

**Location:** `src/core/utils/createBoundingBoxOfchildren.ts`

**Current:**
```typescript
if (!children.length) {
  return {
    localMatrix: m3.identity(),
    width: 0,
    height: 0,
  };
}
```

**Problem:**
When all children are removed, parent should reset to identity, but `removeChild` doesn't call `updateChildrenCoords`, so parent keeps old bounds.

**Fix:**
Already handled in `createBoundingBoxOfchildren`, but `removeChild` needs to call it.

---

## Recommended Fix Order

1. **Fix Issue 1** (Missing updates on remove/clear) - Easiest, high impact
2. **Fix Issue 2** (Circular update in addChild) - Critical for correctness
3. **Fix Issue 3** (Double update) - Performance/accuracy
4. **Fix Issue 4** (Invalid world matrices) - Edge case handling

---

## Testing Checklist

After fixes, test:
- [ ] Add child to parent → child appears in correct position
- [ ] Remove child from parent → parent bounds update correctly
- [ ] Clear all children → parent resets to identity/zero size
- [ ] Move parent → children move correctly
- [ ] Move child → parent bounds update correctly
- [ ] Add multiple children → all positioned correctly
- [ ] Remove middle child → remaining children stay in place

