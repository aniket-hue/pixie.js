# Right Approach to Maintain Parent-Child Hierarchy

## Core Principles

### 1. **Separation of Concerns**
- **Parent bounds calculation** = Based on children's positions
- **Child matrix updates** = Based on parent's transformation
- These are **separate operations** that should not interfere with each other

### 2. **Update Order Matters**
- When parent moves → update children (top-down)
- When children change → update parent bounds (bottom-up)
- Never do both in the same operation cycle

### 3. **Single Source of Truth**
- **World Matrix** = Absolute position in world space
- **Local Matrix** = Position relative to parent
- Always maintain: `worldMatrix = parentWorldMatrix × localMatrix`

---

## Recommended Architecture

### Approach: Two-Phase Update System

```
Phase 1: Structure Changes (add/remove children)
  → Update parent bounds
  → Convert child world → local space
  
Phase 2: Transform Changes (move parent/child)
  → Update world matrices
  → Propagate to children
```

---

## Implementation Strategy

### Strategy 1: Separate Bounds Update from Matrix Propagation

**Key Idea:** Don't trigger child matrix updates when calculating parent bounds.

```typescript
// children.ts
function updateChildrenCoords(parentId: number) {
  const children = getChildren(parentId);
  
  if (!children.length) {
    // Reset parent to identity
    setLocalMatrix(parentId, m3.identity());
    setWorldMatrixDirect(parentId, m3.identity()); // Direct set, no propagation
    setWidth(parentId, 0);
    setHeight(parentId, 0);
    return;
  }
  
  // Calculate bounds from children's CURRENT world matrices
  const { width, height, localMatrix: parentLocalMatrix } = 
    createBoundingBoxOfchildren(children);
  
  // Set parent local matrix
  setLocalMatrix(parentId, parentLocalMatrix);
  
  // Get parent's parent (if exists) to calculate world matrix
  const parentParent = getParent(parentId);
  if (parentParent) {
    const parentParentWorld = getWorldMatrix(parentParent);
    const parentWorldMatrix = m3.multiply(parentParentWorld, parentLocalMatrix);
    setWorldMatrixDirect(parentId, parentWorldMatrix);
  } else {
    // Root parent: local = world
    setWorldMatrixDirect(parentId, parentLocalMatrix);
  }
  
  setWidth(parentId, width);
  setHeight(parentId, height);
  
  // NOW convert children to local space relative to NEW parent
  convertChildrenToLocalSpace(parentId);
}

function convertChildrenToLocalSpace(parentId: number) {
  const children = getChildren(parentId);
  const parentLocalMatrix = getLocalMatrix(parentId);
  const inverseParentLocal = m3.inverse(parentLocalMatrix);
  
  for (const child of children) {
    const childWorldMatrix = getWorldMatrix(child);
    const childLocalMatrix = m3.multiply(inverseParentLocal, childWorldMatrix);
    
    // Set local matrix directly (no propagation)
    setLocalMatrixDirect(child, childLocalMatrix);
    
    // Recalculate world matrix from parent
    const parentWorldMatrix = getWorldMatrix(parentId);
    const newChildWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
    setWorldMatrixDirect(child, newChildWorldMatrix);
    
    markDirty(child);
  }
}
```

### Strategy 2: Add Direct Set Functions (No Propagation)

```typescript
// matrix.ts

// Direct set - no child updates (for internal use)
function setWorldMatrixDirect(eid: number, matrix: number[]): void {
  WorldMatrix.m00[eid] = matrix[0];
  WorldMatrix.m01[eid] = matrix[1];
  // ... set all components
  // NO call to updateChildMatrices
}

function setLocalMatrixDirect(eid: number, matrix: number[]): void {
  LocalMatrix.m00[eid] = matrix[0];
  // ... set all components
  // NO side effects
}

// Public API - with propagation
export function setWorldMatrix(eid: number, matrix: number[]): void {
  setWorldMatrixDirect(eid, matrix);
  updateChildMatrices(eid); // Propagate to children
}

export function setLocalMatrix(eid: number, matrix: number[]): void {
  setLocalMatrixDirect(eid, matrix);
  
  // Recalculate world matrix from parent
  const parent = getParent(eid);
  if (parent) {
    const parentWorldMatrix = getWorldMatrix(parent);
    const newWorldMatrix = m3.multiply(parentWorldMatrix, matrix);
    setWorldMatrixDirect(eid, newWorldMatrix);
  } else {
    // Root: local = world
    setWorldMatrixDirect(eid, matrix);
  }
  
  updateChildMatrices(eid); // Propagate to children
}
```

---

## Complete Flow for Common Operations

### Operation 1: Add Child to Parent

```typescript
export function addChild(parent: number, child: number) {
  // 1. Add to buffer
  if (Children.count[parent] === 0) {
    Children.offset[parent] = _ptr;
  }
  const idx = Children.offset[parent] + Children.count[parent];
  Children.buffer[idx] = child;
  Children.count[parent]++;
  _ptr++;
  
  // 2. Set parent reference
  updateParent(child, parent);
  
  // 3. Convert child to local space BEFORE calculating parent bounds
  const parentLocalMatrix = getLocalMatrix(parent);
  const parentWorldMatrix = getWorldMatrix(parent);
  const inverseParentLocal = m3.inverse(parentLocalMatrix);
  
  const childWorldMatrix = getWorldMatrix(child);
  const childLocalMatrix = m3.multiply(inverseParentLocal, childWorldMatrix);
  setLocalMatrixDirect(child, childLocalMatrix);
  
  // Recalculate child's world matrix from parent
  const newChildWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
  setWorldMatrixDirect(child, newChildWorldMatrix);
  
  // 4. NOW update parent bounds (children are in correct local space)
  updateChildrenCoords(parent);
  
  // 5. Mark dirty
  markDirty(child);
  markDirty(parent);
}
```

### Operation 2: Remove Child from Parent

```typescript
export function removeChild(parent: number, child: number) {
  const children = getChildren(parent);
  const index = children.indexOf(child);
  
  if (index === -1) return;
  
  // 1. Remove from buffer
  // Shift remaining children
  for (let i = index; i < children.length - 1; i++) {
    Children.buffer[Children.offset[parent] + i] = 
      Children.buffer[Children.offset[parent] + i + 1];
  }
  
  Children.count[parent]--;
  
  if (Children.count[parent] === 0) {
    Children.offset[parent] = 0;
  }
  
  // 2. Clear parent reference
  clearParent(child);
  
  // 3. Convert child back to world space (no parent)
  const childLocalMatrix = getLocalMatrix(child);
  const parentWorldMatrix = getWorldMatrix(parent);
  const childWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
  setWorldMatrixDirect(child, childWorldMatrix);
  setLocalMatrixDirect(child, childWorldMatrix); // Local = world when no parent
  
  // 4. Update parent bounds
  updateChildrenCoords(parent);
  
  // 5. Mark dirty
  markDirty(child);
  markDirty(parent);
}
```

### Operation 3: Move Parent (Transform Change)

```typescript
// When parent's world matrix changes (e.g., dragging)
export function setWorldMatrix(eid: number, matrix: number[]): void {
  setWorldMatrixDirect(eid, matrix);
  
  // Propagate to children (top-down)
  updateChildMatrices(eid);
}

function updateChildMatrices(eid: number) {
  const children = getChildren(eid);
  if (!children.length) return;
  
  const parentWorldMatrix = getWorldMatrix(eid);
  
  for (const child of children) {
    const childLocalMatrix = getLocalMatrix(child);
    const newChildWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
    
    setWorldMatrixDirect(child, newChildWorldMatrix);
    markDirty(child);
    
    // Recursively update grandchildren
    updateChildMatrices(child);
  }
}
```

### Operation 4: Move Child (Transform Change)

```typescript
// When child's world matrix changes (e.g., dragging)
export function setWorldMatrix(eid: number, matrix: number[]): void {
  const parent = getParent(eid);
  
  if (parent) {
    // Child has parent: convert world → local
    const parentWorldMatrix = getWorldMatrix(parent);
    const inverseParentWorld = m3.inverse(parentWorldMatrix);
    const newLocalMatrix = m3.multiply(inverseParentWorld, matrix);
    
    setLocalMatrixDirect(eid, newLocalMatrix);
    setWorldMatrixDirect(eid, matrix);
    
    // Update parent bounds (bottom-up)
    updateChildrenCoords(parent);
  } else {
    // Root entity: local = world
    setWorldMatrixDirect(eid, matrix);
    setLocalMatrixDirect(eid, matrix);
  }
  
  // Propagate to children
  updateChildMatrices(eid);
}
```

---

## Alternative: Event-Driven Approach

If you want to keep it simpler, use a dirty flag system:

```typescript
// Mark parent as needing bounds update
function markParentBoundsDirty(child: number) {
  const parent = getParent(child);
  if (parent) {
    markBoundsDirty(parent);
    markParentBoundsDirty(parent); // Recursive up the tree
  }
}

// Mark children as needing matrix update
function markChildrenMatricesDirty(parent: number) {
  const children = getChildren(parent);
  for (const child of children) {
    markMatrixDirty(child);
    markChildrenMatricesDirty(child); // Recursive down the tree
  }
}

// Then in your update loop:
function updateDirtyEntities() {
  // Phase 1: Update matrices (top-down)
  for (const eid of entitiesWithDirtyMatrices) {
    if (hasParent(eid)) {
      const parentWorld = getWorldMatrix(getParent(eid));
      const local = getLocalMatrix(eid);
      setWorldMatrixDirect(eid, m3.multiply(parentWorld, local));
    }
    markChildrenMatricesDirty(eid);
  }
  
  // Phase 2: Update bounds (bottom-up)
  for (const eid of entitiesWithDirtyBounds) {
    updateChildrenCoords(eid);
    markParentBoundsDirty(eid);
  }
}
```

---

## Recommended Solution

**Use Strategy 1 + Direct Set Functions:**

1. ✅ **Separate bounds calculation from matrix propagation**
2. ✅ **Convert child to local space BEFORE calculating parent bounds**
3. ✅ **Use direct set functions internally to avoid circular updates**
4. ✅ **Always update parent bounds when children change**
5. ✅ **Always propagate matrix changes to children**

### Key Functions Needed:

```typescript
// Internal (no propagation)
- setWorldMatrixDirect()
- setLocalMatrixDirect()

// Public API (with propagation)
- setWorldMatrix() → updates children
- setLocalMatrix() → updates world, then children

// Hierarchy operations
- addChild() → convert to local, then update parent bounds
- removeChild() → convert to world, then update parent bounds
- updateChildrenCoords() → calculate bounds, convert children to local
```

---

## Benefits of This Approach

1. **No Circular Updates**: Bounds calculation doesn't trigger child updates
2. **Correct Order**: Child converted to local space before parent bounds calculated
3. **Clear Separation**: Structure changes vs transform changes handled differently
4. **Predictable**: Each operation has a clear, single responsibility
5. **Efficient**: No redundant calculations

---

## Testing Checklist

After implementation:
- [ ] Add child → child appears in correct position relative to parent
- [ ] Remove child → parent bounds shrink correctly
- [ ] Move parent → children move with parent
- [ ] Move child → parent bounds update, child stays relative
- [ ] Add multiple children → all positioned correctly
- [ ] Nested hierarchy (parent → child → grandchild) → all update correctly
- [ ] Clear all children → parent resets to identity

