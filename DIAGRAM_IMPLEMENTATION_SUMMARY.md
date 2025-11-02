# Diagram Support Implementation Summary

## Completed Changes

### 1. Database Types Updated (src/lib/supabase.ts)
Added diagram columns to `new_questions` table type:
- `diagram_json`: Excalidraw JSON for question diagrams (supports multiple)
- `options_diagrams`: Array of Excalidraw JSONs for option diagrams
- `answer_diagram`: Excalidraw JSON for answer diagram
- `solution_diagram`: Excalidraw JSON for solution diagram
- `is_wrong`: Boolean flag for question validation

### 2. LaTeX Cleaning (src/lib/latexCleaner.ts)
Already exists and handles:
- ✅ `ackslash` → `\` conversion
- ✅ ` rac` → `\frac` conversion
- ✅ All Greek letter fixes
- ✅ Comprehensive malformed LaTeX fixes

### 3. Remaining Tasks

#### A. Update gemini.ts
**Location**: src/lib/gemini.ts

**Changes Needed**:
1. Import LaTeX cleaner
2. Update `ExtractedQuestion` interface to include diagram fields
3. Update PDF extraction prompt to request Excalidraw-format diagrams
4. Update question generation prompt to create diagrams when needed
5. Apply LaTeX cleaning to all extracted/generated text
6. Parse diagram JSON from AI responses

**Key Addition**:
```typescript
import { cleanLatexSyntax, cleanQuestionLatex } from './latexCleaner';

export interface ExtractedQuestion {
  // ... existing fields ...
  diagram_json?: any | any[];  // Can be single or multiple diagrams
  options_diagrams?: any[];
  answer_diagram?: any;
  solution_diagram?: any;
}

// Apply cleaning in extraction:
questions = questions.map(q => cleanQuestionLatex(q));
```

#### B. Update QuestionPreview.tsx
**Location**: src/components/QuestionPreview.tsx

**Changes Needed**:
1. Import DiagramRenderer component
2. Apply LaTeX cleaning before rendering
3. Render diagrams using DiagramRenderer
4. Handle multiple diagrams in question statement

**Key Addition**:
```typescript
import { DiagramRenderer } from './DiagramRenderer';
import { cleanQuestionLatex } from '../lib/latexCleaner';

// In component:
const cleanedQuestion = cleanQuestionLatex(question);

// Render diagrams:
{cleanedQuestion.diagram_json && (
  Array.isArray(cleanedQuestion.diagram_json)
    ? cleanedQuestion.diagram_json.map((diagram, idx) => (
        <DiagramRenderer key={idx} diagramData={diagram} />
      ))
    : <DiagramRenderer diagramData={cleanedQuestion.diagram_json} />
)}
```

#### C. Update PDFScanner.tsx
**Location**: src/components/PDFScanner.tsx

**Changes Needed**:
1. Save diagram fields when saving questions to database
2. Apply LaTeX cleaning before display

**Key Change in `savePdfQuestions`**:
```typescript
const questionsToInsert = questions.map(q => {
  const cleaned = cleanQuestionLatex(q);
  return {
    // ... existing fields ...
    diagram_json: cleaned.diagram_json || null,
    options_diagrams: cleaned.options_diagrams || null,
    answer_diagram: cleaned.answer_diagram || null,
    solution_diagram: cleaned.solution_diagram || null,
  };
});
```

#### D. Update QuestionGenerator.tsx
**Location**: src/components/QuestionGenerator.tsx

**Changes Needed**:
1. Include diagram fields when saving generated questions
2. Apply LaTeX cleaning to generated questions
3. Pass diagram context to AI when generating from PYQs with diagrams

**Key Change in `generateNewQuestions`**:
```typescript
const questionToSave = {
  // ... existing fields ...
  diagram_json: question.diagram_json || null,
  options_diagrams: question.options_diagrams || null,
  answer_diagram: question.answer_diagram || null,
  solution_diagram: question.solution_diagram || null,
};
```

## AI Prompting Strategy

### For PDF Extraction
The AI should:
1. Detect when a diagram is present in the question
2. Extract diagram as Excalidraw-compatible JSON
3. Include diagram references in question statement
4. Use proper LaTeX for all math (never `ackslash` or ` rac`)

### For Question Generation
The AI should:
1. When referencing PYQs with diagrams, understand the diagram context
2. Generate new diagrams when appropriate (geometry, circuits, graphs, etc.)
3. Output diagrams in Excalidraw format
4. Use proper LaTeX syntax

### Excalidraw Format Example
```json
[
  {
    "type": "ellipse",
    "x": 100,
    "y": 100,
    "width": 80,
    "height": 80,
    "strokeColor": "#000000",
    "backgroundColor": "transparent",
    "strokeWidth": 2
  },
  {
    "type": "text",
    "x": 135,
    "y": 135,
    "text": "O",
    "fontSize": 16,
    "strokeColor": "#000000"
  }
]
```

## Testing Checklist

- [ ] PDF with diagram extracts correctly
- [ ] LaTeX is cleaned (no `ackslash`, no ` rac`)
- [ ] Diagrams render using DiagramRenderer
- [ ] Multiple diagrams in one question work
- [ ] Option diagrams render separately
- [ ] Generated questions can include diagrams
- [ ] PYQs with diagrams are used as reference correctly
- [ ] Database saves/loads diagram JSON properly

## Migration Needed

Run this migration to add columns to existing tables:

```sql
ALTER TABLE new_questions
ADD COLUMN IF NOT EXISTS diagram_json jsonb,
ADD COLUMN IF NOT EXISTS options_diagrams jsonb,
ADD COLUMN IF NOT EXISTS answer_diagram jsonb,
ADD COLUMN IF NOT EXISTS solution_diagram jsonb,
ADD COLUMN IF NOT EXISTS is_wrong boolean DEFAULT false;

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS diagram_json jsonb,
ADD COLUMN IF NOT EXISTS options_diagrams jsonb,
ADD COLUMN IF NOT EXISTS answer_diagram jsonb,
ADD COLUMN IF NOT EXISTS solution_diagram jsonb;

ALTER TABLE questions_topic_wise
ADD COLUMN IF NOT EXISTS diagram_json jsonb,
ADD COLUMN IF NOT EXISTS options_diagrams jsonb,
ADD COLUMN IF NOT EXISTS answer_diagram jsonb,
ADD COLUMN IF NOT EXISTS solution_diagram jsonb;
```
