/*
  # Add Diagram Support to Questions Tables
  
  1. New Columns Added
    - `diagram_json` (jsonb[]) - Array of Excalidraw diagram JSON objects for question statement
    - `options_diagrams` (jsonb[]) - Array of diagram JSON objects for each option
    - `answer_diagram` (jsonb) - Single diagram JSON for answer visualization
    - `solution_diagram` (jsonb) - Single diagram JSON for solution visualization
  
  2. Changes Made
    - Added diagram columns to `questions` table (PYQs)
    - Added diagram columns to `new_questions` table (Generated questions)
    - `questions_topic_wise` table (Topic-wise PYQs)
  
  3. Important Notes
    - Diagrams stored as JSONB for efficient querying
    - Multiple diagrams in question statement supported
    - All diagram fields are nullable
*/

ALTER TABLE questions ADD COLUMN IF NOT EXISTS diagram_json jsonb[] DEFAULT NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options_diagrams jsonb[] DEFAULT NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_diagram jsonb DEFAULT NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS solution_diagram jsonb DEFAULT NULL;

ALTER TABLE new_questions ADD COLUMN IF NOT EXISTS diagram_json jsonb[] DEFAULT NULL;
ALTER TABLE new_questions ADD COLUMN IF NOT EXISTS options_diagrams jsonb[] DEFAULT NULL;
ALTER TABLE new_questions ADD COLUMN IF NOT EXISTS answer_diagram jsonb DEFAULT NULL;
ALTER TABLE new_questions ADD COLUMN IF NOT EXISTS solution_diagram jsonb DEFAULT NULL;

ALTER TABLE questions_topic_wise ADD COLUMN IF NOT EXISTS diagram_json jsonb[] DEFAULT NULL;
ALTER TABLE questions_topic_wise ADD COLUMN IF NOT EXISTS options_diagrams jsonb[] DEFAULT NULL;
ALTER TABLE questions_topic_wise ADD COLUMN IF NOT EXISTS answer_diagram jsonb DEFAULT NULL;
ALTER TABLE questions_topic_wise ADD COLUMN IF NOT EXISTS solution_diagram jsonb DEFAULT NULL;
