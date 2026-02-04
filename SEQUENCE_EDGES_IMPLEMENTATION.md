# Sequence Edges (Overhang) Implementation

## Overview
This implementation adds support for DNA sequence overhangs (5' and 3' ends) to the SeqViz library. Overhangs create jagged edges in the sequence visualization, representing sticky ends or single-stranded overhanging nucleotides.

## Changes Made

### 1. Type Definitions (`src/core/elements.ts`)
Added new interfaces for sequence edge information:

```typescript
export interface SequenceEdgeOverhang {
  overhangSeq: string;
  onComplement: boolean;
}

export interface SequenceEdges {
  fivePrime?: SequenceEdgeOverhang;
  threePrime?: SequenceEdgeOverhang;
}
```

### 2. SeqViz Component (`src/SeqViz.tsx`)

#### Added Property to SeqVizProps
```typescript
/** sequence edge information including 5' and 3' overhangs for visualization */
sequenceEdges?: SequenceEdges;
```

#### Added to SeqVizState
```typescript
sequenceEdges?: SequenceEdges;
```

#### Implemented `processSequenceEdges` Method
This method processes the overhangs according to these rules:

**For main strand overhangs (onComplement: false):**
- Prepend the overhang sequence to the main strand
- Replace the beginning of the complement strand with spaces (removing it)

**For complement strand overhangs (onComplement: true):**
- Prepend the overhang to the complement strand
- Replace the beginning of the main strand with spaces (leaving it empty)

**Same logic applies for 3' prime overhangs (at the end)**

### 3. SeqViewerContainer (`src/SeqViewerContainer.tsx`)
- Added `SequenceEdges` import and type
- Added `sequenceEdges` property to `SeqViewerContainerProps`
- Updated all prop builder calls to pass `sequenceEdges` through

### 4. Prop Builders (`src/seqViewerInnerProps.ts`)
Updated all three prop builders to include `sequenceEdges` parameter:
- `createLinearPropsBuilder`
- `createCircularPropsBuilder`  
- `createLinearMapPropsBuilder`

### 5. Viewer Components
Updated the following to include `sequenceEdges` in their props interfaces:
- `src/viewers/Linear/Linear.tsx`
- `src/viewers/Circular/Circular.tsx`
- `src/viewers/LinearMap/LinearMap.tsx`

## How It Works

### The "Jagged Edge" Visualization
The implementation creates jagged edges by inserting space characters into the sequence at positions where overhangs exist:

1. When `processSequenceEdges` is called in SeqViz.render(), it modifies the sequences
2. Space characters (U+0020) are inserted to replace removed bases on the complement strand
3. These spaces are rendered by the viewers but appear invisible, creating the visual offset

### Linear Viewer
In `SeqBlock.tsx`, each base pair is rendered individually using `seqTextSpan`. Spaces will render as empty tspans, preserving character width positioning but appearing transparent.

### Circular Viewer
In `Circular/Index.tsx`, the `renderBasepairs` method renders each base character. Spaces will render as invisible characters at their rotational positions.

## Usage Example

```typescript
import SeqViz, { SequenceEdges } from '@slavisharper/seqviz';

const sequenceEdges: SequenceEdges = {
  fivePrime: {
    overhangSeq: 'AATT',
    onComplement: false  // overhang on main strand
  },
  threePrime: {
    overhangSeq: 'GGCC',
    onComplement: true   // overhang on complement strand
  }
};

<SeqViz
  seq="ATGCGATCG"
  compSeq="TACGCTAGC"
  sequenceEdges={sequenceEdges}
  viewer="both"
/>
```

## Example Results

### Scenario 1: 5' Overhang on Main Strand (4 bases)
```
Main:       [AATT]ATGCGATCG
Complement:     TACGCTAGC----  (removed, replaced with spaces)
```

### Scenario 2: 3' Overhang on Complement Strand (4 bases)
```
Main:       ATGCGATCG----  (spaces added, left empty)
Complement: TACGCTAGC[GGCC]
```

## Implementation Details

### Overhang Processing Rules
The `processSequenceEdges` method follows these rules:

1. **5' Prime Overhang (onComplement: false)**
   - Prepend overhang to main sequence
   - Remove same length from start of complement and fill with spaces

2. **5' Prime Overhang (onComplement: true)**
   - Prepend overhang to complement sequence
   - Remove same length from start of main and fill with spaces

3. **3' Prime Overhang (onComplement: false)**
   - Append overhang to main sequence
   - Remove same length from end of complement and fill with spaces

4. **3' Prime Overhang (onComplement: true)**
   - Append overhang to complement sequence
   - Remove same length from end of main and fill with spaces

### Component Data Flow
```
SeqViz (processSequenceEdges)
  ↓
SeqViewerContainer (passes through)
  ↓
Prop Builders (createLinearPropsBuilder, createCircularPropsBuilder, createLinearMapPropsBuilder)
  ↓
Viewers (Linear, Circular, LinearMap)
  ↓
Child Components (SeqBlock, Index, etc.)
```

## Files Modified
1. `src/core/elements.ts` - Added type definitions
2. `src/SeqViz.tsx` - Added prop, state, and processing logic
3. `src/SeqViewerContainer.tsx` - Updated prop passing
4. `src/seqViewerInnerProps.ts` - Updated prop builders
5. `src/viewers/Linear/Linear.tsx` - Added to props interface
6. `src/viewers/Circular/Circular.tsx` - Added to props interface
7. `src/viewers/LinearMap/LinearMap.tsx` - Added to props interface

## Backward Compatibility
The implementation is fully backward compatible:
- `sequenceEdges` is an optional property
- When not provided, the viewer behaves exactly as before
- Existing code requires no changes
