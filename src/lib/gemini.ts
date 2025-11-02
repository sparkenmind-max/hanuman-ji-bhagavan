// Gemini AI Integration
// Using Google Gemini for better reasoning capabilities

/**
 * Comprehensive JSON sanitization utility
 * Fixes all common JSON parsing errors from LLM responses
 */
function sanitizeJsonString(jsonString: string): string {
  // Step 1: Remove markdown code blocks - AGGRESSIVE
  let cleaned = jsonString
    .replace(/```json/gi, '')
    .replace(/```javascript/gi, '')
    .replace(/```js/gi, '')
    .replace(/```/g, '')
    .replace(/^\s*json\s*/gi, '')
    .trim();

  // Step 2: Remove ALL actual control characters (not escaped ones)
  // This includes \x00-\x1F and \x7F (DEL)
  // But we must preserve escaped sequences like \\n, \\t, etc.

  // First, temporarily protect already-escaped sequences
  const escapeProtector = '___ESCAPE___';
  cleaned = cleaned
    .replace(/\\n/g, escapeProtector + 'n')
    .replace(/\\r/g, escapeProtector + 'r')
    .replace(/\\t/g, escapeProtector + 't')
    .replace(/\\f/g, escapeProtector + 'f')
    .replace(/\\b/g, escapeProtector + 'b')
    .replace(/\\"/g, escapeProtector + 'quote')
    .replace(/\\\\/g, escapeProtector + 'backslash');

  // Now remove/replace actual control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ' ');

  // Handle actual newlines, tabs, and carriage returns by replacing with space
  cleaned = cleaned
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ');

  // Restore protected escape sequences
  cleaned = cleaned
    .replace(new RegExp(escapeProtector + 'n', 'g'), '\\n')
    .replace(new RegExp(escapeProtector + 'r', 'g'), '\\r')
    .replace(new RegExp(escapeProtector + 't', 'g'), '\\t')
    .replace(new RegExp(escapeProtector + 'f', 'g'), '\\f')
    .replace(new RegExp(escapeProtector + 'b', 'g'), '\\b')
    .replace(new RegExp(escapeProtector + 'quote', 'g'), '\\"')
    .replace(new RegExp(escapeProtector + 'backslash', 'g'), '\\\\');

  // Step 3: Fix smart quotes and similar characters
  cleaned = cleaned
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...');

  // Step 4: Fix Unicode escape sequences - NUCLEAR OPTION
  // Valid Unicode escapes: \uXXXX where XXXX is exactly 4 hex digits
  // Everything else gets removed completely

  // First, protect valid Unicode sequences temporarily
  const validUnicodePattern = /\\u[0-9a-fA-F]{4}/g;
  const validUnicodes: string[] = [];
  cleaned = cleaned.replace(validUnicodePattern, (match) => {
    const index = validUnicodes.length;
    validUnicodes.push(match);
    return `___VALID_UNICODE_${index}___`;
  });

  // Now remove ALL remaining \u patterns (they're all invalid)
  cleaned = cleaned.replace(/\\u[^_]/g, 'u');
  cleaned = cleaned.replace(/\\u$/g, 'u');

  // Restore valid Unicode sequences
  validUnicodes.forEach((unicode, index) => {
    cleaned = cleaned.replace(`___VALID_UNICODE_${index}___`, unicode);
  });

  // Step 5: Remove trailing commas before closing brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Step 6: Normalize multiple spaces to single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Step 7: Fix common broken escape sequences
  // Remove invalid escape sequences that aren't valid JSON
  // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  cleaned = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '$1');

  // Step 8: Final safety - remove any remaining problematic patterns
  cleaned = cleaned
    .replace(/\\x[0-9a-fA-F]{0,2}/g, '') // Remove hex escapes
    .replace(/\\[0-7]{1,3}/g, '') // Remove octal escapes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove remaining control chars

  return cleaned;
}

/**
 * Robust JSON parser with multiple fallback strategies
 * Returns parsed object or throws detailed error
 */
function parseJsonRobust(response: string, expectedType: 'array' | 'object' = 'array'): any {
  const strategies = [
    // Strategy 1: Direct extraction and sanitization
    () => {
      const pattern = expectedType === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
      const match = response.match(pattern);
      if (!match) throw new Error('No JSON found in response');
      return JSON.parse(sanitizeJsonString(match[0]));
    },

    // Strategy 2: Remove everything before first bracket
    () => {
      const startChar = expectedType === 'array' ? '[' : '{';
      const startIdx = response.indexOf(startChar);
      if (startIdx === -1) throw new Error('No opening bracket found');
      const substring = response.substring(startIdx);
      return JSON.parse(sanitizeJsonString(substring));
    },

    // Strategy 3: Extract between first and last matching brackets
    () => {
      const [openChar, closeChar] = expectedType === 'array' ? ['[', ']'] : ['{', '}'];
      const firstIdx = response.indexOf(openChar);
      const lastIdx = response.lastIndexOf(closeChar);
      if (firstIdx === -1 || lastIdx === -1 || lastIdx <= firstIdx) {
        throw new Error('Invalid bracket positions');
      }
      const substring = response.substring(firstIdx, lastIdx + 1);
      return JSON.parse(sanitizeJsonString(substring));
    },

    // Strategy 4: Ultra-aggressive cleaning with markdown removal
    () => {
      let cleaned = response
        .replace(/```json/gi, '')
        .replace(/```javascript/gi, '')
        .replace(/```js/gi, '')
        .replace(/```/g, '')
        .replace(/^json\\s*/gi, '')
        .trim();

      // Protect valid escape sequences
      const escapeMap: Record<string, string> = {
        '\\n': '___NEWLINE___',
        '\\r': '___RETURN___',
        '\\t': '___TAB___',
        '\\"': '___QUOTE___',
        '\\\\': '___BACKSLASH___',
        '\\f': '___FORMFEED___',
        '\\b': '___BACKSPACE___'
      };

      for (const [escaped, placeholder] of Object.entries(escapeMap)) {
        cleaned = cleaned.split(escaped).join(placeholder);
      }

      // Remove ALL control characters and problematic chars
      cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');

      // Restore escape sequences
      for (const [escaped, placeholder] of Object.entries(escapeMap)) {
        cleaned = cleaned.split(placeholder).join(escaped);
      }

      // Replace smart quotes
      cleaned = cleaned
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/…/g, '...');

      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ');

      const pattern = expectedType === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
      const match = cleaned.match(pattern);
      if (!match) throw new Error('No JSON after aggressive cleaning');

      return JSON.parse(match[0]);
    },

    // Strategy 5: Nuclear option - rebuild JSON byte by byte
    () => {
      const [openChar, closeChar] = expectedType === 'array' ? ['[', ']'] : ['{', '}'];
      const firstIdx = response.indexOf(openChar);
      const lastIdx = response.lastIndexOf(closeChar);

      if (firstIdx === -1 || lastIdx === -1) {
        throw new Error('Cannot find JSON boundaries');
      }

      let str = response.substring(firstIdx, lastIdx + 1);

      // Step 1: Protect all already-escaped sequences
      const protectionMap = new Map<string, string>();
      let protectionCounter = 0;

      // Protect \" sequences
      str = str.replace(/\\"/g, () => {
        const placeholder = `___PROTECTED_${protectionCounter++}___`;
        protectionMap.set(placeholder, '\\"');
        return placeholder;
      });

      // Protect \\ sequences
      str = str.replace(/\\\\/g, () => {
        const placeholder = `___PROTECTED_${protectionCounter++}___`;
        protectionMap.set(placeholder, '\\\\');
        return placeholder;
      });

      // Protect other escape sequences
      ['\\n', '\\r', '\\t', '\\f', '\\b'].forEach(seq => {
        str = str.replace(new RegExp(seq.replace('\\', '\\\\'), 'g'), () => {
          const placeholder = `___PROTECTED_${protectionCounter++}___`;
          protectionMap.set(placeholder, seq);
          return placeholder;
        });
      });

      // Step 2: Remove all control characters and bad chars
      str = str.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ');

      // Step 3: Clean up formatting
      str = str
        .replace(/\s+/g, ' ')                // Normalize whitespace
        .replace(/,\s*([}\]])/g, '$1')       // Remove trailing commas
        .replace(/"\s+:/g, '":')             // Fix spacing around colons
        .replace(/:\s+"/g, ':"')             // Fix spacing after colons
        .replace(/,\s+"/g, ',"')             // Fix spacing after commas
        .replace(/{\s+"/g, '{"')             // Fix spacing after opening brace
        .replace(/\[\s+/g, '[')              // Fix spacing after opening bracket
        .replace(/\s+\]/g, ']')              // Fix spacing before closing bracket
        .replace(/\s+}/g, '}');              // Fix spacing before closing brace

      // Step 4: Restore protected sequences
      protectionMap.forEach((original, placeholder) => {
        str = str.split(placeholder).join(original);
      });

      return JSON.parse(str);
    },

    // Strategy 6: Smart extraction with bracket balancing
    () => {
      const [openChar, closeChar] = expectedType === 'array' ? ['[', ']'] : ['{', '}'];

      // Find the first opening bracket
      let startIdx = response.indexOf(openChar);
      if (startIdx === -1) throw new Error('No opening bracket found');

      // Balance brackets to find the matching closing bracket
      let depth = 0;
      let endIdx = -1;

      for (let i = startIdx; i < response.length; i++) {
        if (response[i] === openChar) depth++;
        if (response[i] === closeChar) depth--;

        if (depth === 0) {
          endIdx = i;
          break;
        }
      }

      if (endIdx === -1) throw new Error('No matching closing bracket found');

      let jsonStr = response.substring(startIdx, endIdx + 1);

      // Apply sanitization
      jsonStr = sanitizeJsonString(jsonStr);

      return JSON.parse(jsonStr);
    }
  ];

  const errors: string[] = [];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      return result;
    } catch (error) {
      errors.push(`Strategy ${i + 1}: ${error.message}`);
    }
  }

  // All strategies failed - log minimal info for debugging
  console.error('JSON parsing failed after all strategies');

  throw new Error(`Failed to parse AI response. Please try again.`);
}

export interface ExtractedQuestion {
  question_statement: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT' | 'Subjective';
  options?: string[];
  answer?: string;
  solution?: string;
  question_number?: string;
  page_number?: number;
  has_image?: boolean;
  image_description?: string;
  is_continuation?: boolean;
  spans_multiple_pages?: boolean;
  uploaded_image?: string;
  topic_id?: string;
  is_wrong?: boolean;
  validation_reason?: string;
}

// Gemini API Keys - Smart Round Robin System with Error Tracking
interface ApiKeyState {
  key: string;
  usageCount: number;
  errorCount: number;
  lastError: string | null;
  lastUsedAt: number | null;
  isActive: boolean;
}

let API_KEY_STATES: ApiKeyState[] = [];
let currentKeyIndex = 0;

// Set API keys from user input with validation
export function setGeminiApiKeys(keys: string[]) {
  const validKeys = keys.filter(key => key.trim() !== '');

  // Checkpoint: Validate API keys are set
  if (validKeys.length === 0) {
    console.error('CHECKPOINT FAILED: No valid API keys provided');
    throw new Error('No valid API keys provided');
  }

  // Initialize API key states
  API_KEY_STATES = validKeys.map(key => ({
    key: key.trim(),
    usageCount: 0,
    errorCount: 0,
    lastError: null,
    lastUsedAt: null,
    isActive: true
  }));

  currentKeyIndex = 0;
  console.log(`CHECKPOINT PASSED: ${API_KEY_STATES.length} API key(s) configured successfully`);
}

// Get next API key in round-robin fashion, skipping recently errored keys
function getNextGeminiKey(): { key: string; index: number } {
  // Checkpoint: Validate API keys exist
  if (API_KEY_STATES.length === 0) {
    console.error('CHECKPOINT FAILED: No Gemini API keys configured');
    throw new Error('No Gemini API keys configured. Please add API keys first.');
  }

  // Find next active key
  let attempts = 0;
  let selectedIndex = currentKeyIndex;

  while (attempts < API_KEY_STATES.length) {
    const keyState = API_KEY_STATES[selectedIndex];

    if (keyState.isActive) {
      // Update usage tracking
      keyState.usageCount++;
      keyState.lastUsedAt = Date.now();

      // Move to next key for round-robin
      currentKeyIndex = (selectedIndex + 1) % API_KEY_STATES.length;

      console.log(`CHECKPOINT PASSED: Using API key ${selectedIndex + 1}/${API_KEY_STATES.length} (used ${keyState.usageCount} times)`);
      return { key: keyState.key, index: selectedIndex };
    }

    // Try next key
    selectedIndex = (selectedIndex + 1) % API_KEY_STATES.length;
    attempts++;
  }

  // All keys are inactive, reset all and try again
  console.warn('All API keys marked as inactive, resetting...');
  API_KEY_STATES.forEach(state => {
    state.isActive = true;
    state.errorCount = 0;
  });

  return getNextGeminiKey();
}

// Mark API key as errored
function markKeyError(keyIndex: number, errorMessage: string) {
  if (keyIndex >= 0 && keyIndex < API_KEY_STATES.length) {
    const keyState = API_KEY_STATES[keyIndex];
    keyState.errorCount++;
    keyState.lastError = errorMessage;

    // Deactivate key after 3 consecutive errors
    if (keyState.errorCount >= 3) {
      keyState.isActive = false;
      console.warn(`API key ${keyIndex + 1} deactivated after ${keyState.errorCount} consecutive errors`);
    }

    console.log(`API key ${keyIndex + 1} error count: ${keyState.errorCount}`);
  }
}

// Reset error count for successful API call
function markKeySuccess(keyIndex: number) {
  if (keyIndex >= 0 && keyIndex < API_KEY_STATES.length) {
    API_KEY_STATES[keyIndex].errorCount = 0;
    API_KEY_STATES[keyIndex].lastError = null;
  }
}

// Get API key statistics
export function getApiKeyStats() {
  return API_KEY_STATES.map((state, index) => ({
    index: index + 1,
    usageCount: state.usageCount,
    errorCount: state.errorCount,
    lastError: state.lastError,
    isActive: state.isActive,
    lastUsedAt: state.lastUsedAt ? new Date(state.lastUsedAt).toLocaleString() : 'Never'
  }));
}

// Gemini API call function with smart retry logic and automatic key switching
async function callGeminiAPI(prompt: string, imageBase64?: string, temperature: number = 0.1, maxTokens: number = 4000): Promise<string> {
  const maxTotalRetries = API_KEY_STATES.length * 3; // Try each key up to 3 times
  let attemptCount = 0;

  // Checkpoint: Validate prompt
  if (!prompt || prompt.trim() === '') {
    console.error('CHECKPOINT FAILED: Empty prompt provided');
    throw new Error('Prompt cannot be empty');
  }

  console.log('CHECKPOINT PASSED: Starting Gemini API call', {
    promptLength: prompt.length,
    hasImage: !!imageBase64,
    temperature,
    maxTokens,
    availableKeys: API_KEY_STATES.length
  });

  while (attemptCount < maxTotalRetries) {
    attemptCount++;

    // Get next API key
    const { key: apiKey, index: keyIndex } = getNextGeminiKey();
    console.log(`🔑 Using API key ${keyIndex + 1}/${API_KEY_STATES.length} (attempt ${attemptCount}/${maxTotalRetries})`);

    try {
      const callStartTime = Date.now();
      const requestBody: any = {
        contents: [{
          parts: []
        }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        }
      };

      // Add text prompt
      requestBody.contents[0].parts.push({
        text: prompt
      });

      // Add image if provided
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: "image/png",
            data: base64Data
          }
        });
      }

      console.log(`📤 Sending request to Gemini API...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const fetchElapsed = Date.now() - callStartTime;
      console.log(`📥 Response received in ${(fetchElapsed / 1000).toFixed(1)}s, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorText;
        } catch (e) {
          // If parsing fails, use raw error text
        }

        console.error(`API call failed with key ${keyIndex + 1}`, {
          status: response.status,
          errorMessage,
          attempt: attemptCount
        });

        // Mark this key as errored
        markKeyError(keyIndex, errorMessage);

        // Check if this is a 403 error (unregistered callers)
        if (response.status === 403 && errorMessage.includes('unregistered callers')) {
          console.warn(`Key ${keyIndex + 1} failed with 403 error. Switching to next key after 10s delay...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
          continue; // Try next key
        }

        // Handle invalid API key (400)
        if (response.status === 400 && errorMessage.includes('API key not valid')) {
          console.warn(`Key ${keyIndex + 1} is invalid. Switching to next key...`);
          continue; // Try next key immediately
        }

        // Handle rate limiting (429) or server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          console.warn(`Key ${keyIndex + 1} hit rate limit or server error. Waiting 10s before trying next key...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
          continue; // Try next key
        }

        // For other errors, wait and try next key
        console.warn(`Key ${keyIndex + 1} encountered error ${response.status}. Waiting 10s before trying next key...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      console.log('CHECKPOINT PASSED: Gemini API response received successfully');

      const data = await response.json();

      // Checkpoint: Validate response structure
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('CHECKPOINT FAILED: Invalid response structure', { data });

        // Handle content safety blocks
        if (data.promptFeedback?.blockReason) {
          throw new Error(`Content blocked by Gemini: ${data.promptFeedback.blockReason}`);
        }

        // Try next key after delay
        console.warn('Invalid response structure. Trying next key after 10s...');
        markKeyError(keyIndex, 'Invalid response structure');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      // Checkpoint: Validate text content exists
      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]?.text) {
        console.error('CHECKPOINT FAILED: No text content in response');
        console.warn('No text content in response. Trying next key after 10s...');
        markKeyError(keyIndex, 'No text content in response');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      const responseText = data.candidates[0].content.parts[0].text;
      console.log('CHECKPOINT PASSED: Valid response text received', {
        textLength: responseText.length
      });

      // Mark key as successful
      markKeySuccess(keyIndex);

      return responseText;

    } catch (error) {
      console.error(`CHECKPOINT FAILED: API call exception with key ${keyIndex + 1}`, error);
      markKeyError(keyIndex, error.message);

      // Wait 10 seconds before trying next key
      if (attemptCount < maxTotalRetries) {
        console.log(`Waiting 10 seconds before trying next key... (attempt ${attemptCount}/${maxTotalRetries})`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  // All attempts exhausted
  throw new Error(`Failed to generate content after ${attemptCount} attempts across all API keys. Please check your API keys and try again.`);
}

// Convert PDF to images using PDF.js
export async function convertPdfToImages(file: File): Promise<string[]> {
  // Import PDF.js library
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source to local copy
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  }).promise;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.5; // Higher scale for better quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    const imageDataUrl = canvas.toDataURL('image/png');
    images.push(imageDataUrl);
  }

  return images;
}

// Extract questions from PDF page using Gemini
export async function performExtraction(
  imageBase64: string, 
  pageNumber: number, 
  previousContext: string = '',
  pageMemory: Map<number, string> = new Map()
): Promise<ExtractedQuestion[]> {
  
  const contextInfo = previousContext ? `\n\nPrevious page context: ${previousContext.slice(-500)}` : '';
  const memoryInfo = pageMemory.size > 0 ? 
    `\n\nPage memory: ${Array.from(pageMemory.entries()).map(([p, content]) => `Page ${p}: ${content.slice(0, 200)}`).join('\n')}` : '';

  const prompt = `You are an expert at extracting questions from academic exam papers. Analyze this page image and extract ALL questions with perfect accuracy.

CRITICAL INSTRUCTIONS FOR LATEX/KATEX:
1. ALL mathematical expressions MUST be wrapped in $ for inline math or $$ for display math
2. Use proper LaTeX commands - NEVER use \\backslash or \\ackslash prefixes
3. Examples of CORRECT LaTeX:
   - Greek letters: $\\alpha$, $\\beta$, $\\gamma$, $\\delta$, $\\epsilon$, $\\theta$, $\\lambda$, $\\mu$, $\\sigma$, $\\pi$
   - Fractions: $\\frac{a}{b}$
   - Powers: $x^2$, $e^{-x}$
   - Square roots: $\\sqrt{x}$, $\\sqrt[3]{x}$
   - Limits: $\\lim_{x \\to \\infty}$
   - Integrals: $\\int_a^b f(x) dx$
   - Summation: $\\sum_{i=1}^{n}$
   - Subscripts: $x_1$, $x_i$
4. NEVER write things like "\\backslashhat" or "Δackslash" - use $\\hat{x}$ or $\\Delta$ instead
5. Every mathematical symbol, variable, or expression must be in LaTeX format

EXTRACTION INSTRUCTIONS:
1. Extract EVERY question from this page, no matter how small or partial
2. For each question, determine the correct question type: MCQ, MSQ, NAT, or Subjective
3. Extract ONLY the question statement and options - DO NOT extract answers or solutions
4. Extract all options exactly as written with proper LaTeX for all math
5. If there are diagrams, charts, or images, describe them clearly
6. Handle multi-page questions by noting continuation
7. ALL mathematical content must use proper LaTeX syntax wrapped in $ or $$

Question Type Guidelines:
- MCQ: Single correct answer from multiple options (typically 4 options: A, B, C, D)
- MSQ: Multiple correct answers possible from options (typically 4 options: A, B, C, D)
- NAT: Numerical answer type (no options, answer is a number)
- Subjective: Descriptive/essay type questions (no options)

IMPORTANT - What to Extract:
✅ DO Extract: Question statement, options (A, B, C, D), question number, diagrams/images description
❌ DO NOT Extract: Answers, solutions, explanations, answer keys

For Images/Diagrams in Questions:
- If there's a mathematical diagram: Describe it clearly (e.g., "A circle with center O and radius r")
- If there's a graph: Describe axes, curves, points (e.g., "Graph showing y = x^2 with vertex at origin")
- If there's a circuit: Describe components and connections
- If there's a Venn diagram: Describe sets and their relationships
- Use LaTeX notation for mathematical elements when possible

${contextInfo}${memoryInfo}

Return a JSON array of questions in this exact format:
[
  {
    "question_statement": "Complete question text with all mathematical notation in LaTeX format. [IMAGE: description if present]",
    "question_type": "MCQ|MSQ|NAT|Subjective",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"] or null for NAT/Subjective,
    "question_number": "Question number if visible",
    "has_image": true/false,
    "image_description": "Detailed description of diagram/figure in the question",
    "is_continuation": true/false,
    "spans_multiple_pages": true/false
  }
]

EXAMPLE OUTPUT:
[
  {
    "question_statement": "A circle with center O has radius 5 cm. [IMAGE: Circle with center O, radius r, and point P on circumference]. If point P is on the circumference, what is the area?",
    "question_type": "MCQ",
    "options": ["25π cm²", "10π cm²", "5π cm²", "15π cm²"],
    "question_number": "1",
    "has_image": true,
    "image_description": "Circle with center O, radius r labeled, and point P marked on the circumference",
    "is_continuation": false,
    "spans_multiple_pages": false
  }
]

If no questions are found, return an empty array [].
Focus on accuracy and completeness. Extract ONLY questions and options, NOT answers.`;

  try {
    const response = await callGeminiAPI(prompt, imageBase64, 0.1, 4000);
    
    // Store page content in memory
    pageMemory.set(pageNumber, response.slice(0, 1000));
    
    // Parse JSON response using robust parser
    let questions: ExtractedQuestion[] = [];
    try {
      questions = parseJsonRobust(response, 'array') as ExtractedQuestion[];
    } catch (parseError) {
      console.warn('Failed to extract questions from this page');
      return [];
    }

    // Add page number to each question
    questions = questions.map(q => ({
      ...q,
      page_number: pageNumber
    }));

    console.log(`Extracted ${questions.length} questions from page ${pageNumber}`);
    return questions;

  } catch (error) {
    console.error(`Error extracting questions from page ${pageNumber}:`, error);
    throw new Error(`Failed to extract questions from page ${pageNumber}: ${error.message}`);
  }
}

// Generate new questions for a topic using Gemini
export async function generateQuestionsForTopic(
  topic: any,
  examName: string,
  courseName: string,
  questionType: 'MCQ' | 'MSQ' | 'NAT' | 'Subjective',
  pyqs: any[],
  existingQuestionsContext: string,
  recentQuestions: string[],
  count: number = 1,
  topicNotes: string = ''
): Promise<ExtractedQuestion[]> {
  const maxRetries = 8;
  let attempt = 0;
  let lastError: Error | null = null;

  const pyqContext = pyqs.length > 0 ?
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 PREVIOUS YEAR QUESTIONS - INSPIRATION SOURCE ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These PYQs are from the SAME topic, course, slot, part, and question type you're generating for.
Study their PATTERN, DIFFICULTY, and STYLE - but DO NOT copy or slightly modify them.
Use them as reference to understand exam expectations, but create COMPLETELY NEW questions.

Total PYQs provided: ${pyqs.length}
${pyqs.map((q, i) =>
      `\n📝 PYQ ${i+1} (Year: ${q.year}, Slot: ${q.slot || 'N/A'}, Part: ${q.part || 'N/A'}, Type: ${q.question_type}):\nQuestion: ${q.question_statement}${q.options && q.options.length > 0 ? `\nOptions:\n  A. ${q.options[0] || ''}\n  B. ${q.options[1] || ''}\n  C. ${q.options[2] || ''}\n  D. ${q.options[3] || ''}` : ''}${q.answer ? `\nCorrect Answer: ${q.answer}` : ''}${q.solution ? `\nSolution: ${q.solution.slice(0, 300)}` : ''}`
    ).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : '';

  const existingContext = existingQuestionsContext ?
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ALREADY GENERATED QUESTIONS - MUST NOT REPEAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These questions have been ALREADY generated for this exact configuration (topic, type, slot, part).
You MUST create questions that are COMPLETELY DIFFERENT from these.
Check every aspect: question statement, options, concepts tested, scenarios used.
If your generated question is similar to any below, REJECT it and create a fresh one.

Total already generated: ${existingQuestionsContext.split('\n\n').length}
${existingQuestionsContext.slice(-2000)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : '';

  const recentContext = recentQuestions.length > 0 ?
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ JUST GENERATED IN THIS SESSION - AVOID IMMEDIATELY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These questions were just generated moments ago. Ensure maximum freshness by being especially different from these.
${recentQuestions.slice(-3).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : '';

  const notesContext = topicNotes ?
    `\n\nTOPIC NOTES (Use these methods/concepts for the solution):\n${topicNotes.slice(0, 2000)}` : '';

  while (attempt < maxRetries) {
    attempt++;
    const startTime = Date.now();
    console.log(`\n🔄 Question generation attempt ${attempt}/${maxRetries} for topic: ${topic.name}`);
    console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);

  const prompt = `You are an expert professor creating ${examName} ${courseName} ${questionType} entrance exam questions. This is a competitive exam preparation, so maintain HIGHEST quality standards.

CRITICAL LATEX/KATEX REQUIREMENTS:
1. ALL mathematical expressions MUST be wrapped in $ for inline or $$ for display
2. Use ONLY proper LaTeX commands - examples:
   - Greek: $\\alpha$, $\\beta$, $\\gamma$, $\\delta$, $\\epsilon$, $\\theta$, $\\lambda$, $\\mu$, $\\sigma$, $\\pi$, $\\tau$, $\\omega$
   - Uppercase Greek: $\\Gamma$, $\\Delta$, $\\Theta$, $\\Lambda$, $\\Sigma$, $\\Pi$, $\\Omega$
   - Operations: $\\times$, $\\div$, $\\pm$, $\\mp$, $\\cdot$
   - Relations: $\\leq$, $\\geq$, $\\neq$, $\\approx$, $\\equiv$
   - Fractions: $\\frac{numerator}{denominator}$
   - Powers/Subscripts: $x^2$, $x_i$, $x^{2n}$, $x_{i,j}$
   - Roots: $\\sqrt{x}$, $\\sqrt[n]{x}$
   - Limits: $\\lim_{x \\to \\infty}$
   - Integrals: $\\int_a^b f(x)\\,dx$
   - Summations: $\\sum_{i=1}^{n} x_i$
   - Vectors: $\\vec{v}$, $\\hat{v}$
3. NEVER use malformed commands like \\backslashhat, \\ackslash, Δackslash, etc.
4. Test: If $\\hat{\\beta}$ is correct, write it as $\\hat{\\beta}$ NOT as \\ackslashhat\\ackslashbeta

EXAM CONTEXT:
- Exam: ${examName}
- Course: ${courseName}
- Topic: ${topic.name}
- Weightage: ${((topic.weightage || 0.02) * 100).toFixed(1)}%
- Question Type: ${questionType}

SELF-VALIDATION REQUIREMENT:
After generating each question, critically review it yourself:
- For MCQ: Is there EXACTLY ONE correct answer? Are all options clear?
- For MSQ: Are there 2-3 correct answers? Are the correct answers accurate?
- For NAT: Is the numerical answer correct and calculable?
- For Subjective: Is the question clear and the answer comprehensive?
- Is the question statement complete and unambiguous?
- Does the solution logically lead to the answer?

If you detect ANY issues (wrong answer, missing correct option, unclear question, mathematical error):
- Set "is_wrong": true
- Provide clear reason in "validation_reason" field

Otherwise set "is_wrong": false or omit it (defaults to false)

${notesContext}
${pyqContext}
${existingContext}
${recentContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR TASK - CRITICAL INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: ANALYZE THE INSPIRATION (PYQs)
- Carefully study the Previous Year Questions provided above
- Understand the PATTERN: How questions are structured, what concepts are tested
- Analyze DIFFICULTY LEVEL: Complexity of calculations, depth of concepts
- Note EXAM STYLE: Format, wording, presentation style used in actual exam
- Identify KEY TOPICS: Which sub-topics within "${topic.name}" are covered

STEP 2: CHECK WHAT'S ALREADY GENERATED
- Review ALL questions in the "ALREADY GENERATED" section
- These are questions for the EXACT SAME configuration (topic, type, slot, part)
- Note which concepts, scenarios, and variations have been used
- Identify what approaches are exhausted and what's still available

STEP 3: CREATE FRESH QUESTIONS
Generate ${count} COMPLETELY NEW question(s) following these rules:

✅ DO:
- Take INSPIRATION from PYQ patterns, difficulty, and style
- Create questions testing the SAME LEVEL of understanding
- Use similar exam format and professional language
- Test important concepts within "${topic.name}"
- Vary the scenarios, numbers, and contexts used

❌ DON'T:
- Copy or slightly modify any PYQ
- Repeat concepts/scenarios from already generated questions
- Create questions too similar to recent questions
- Use exact same numerical values or examples from PYQs

STEP 4: ENSURE ORIGINALITY
Before finalizing each question:
- Compare with PYQs: Is this too similar? If yes, redesign completely
- Compare with already generated: Have we tested this exact scenario? If yes, choose different approach
- Check uniqueness: Would a student notice this is repetitive? If yes, start fresh

STEP 5: VALIDATE & OUTPUT
- Use ONLY authentic scientific concepts and proven methods from Topic Notes
- Ensure questions test deep conceptual understanding suitable for ${examName}
- Make questions challenging but fair - maintain exam-level difficulty
- Self-validate using the criteria mentioned earlier

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL REQUIREMENTS for ${questionType} questions:

${questionType === 'MCQ' ? `
MCQ Requirements:
- Create exactly 4 options (A, B, C, D)
- EXACTLY ONE option must be correct
- Other 3 options must be plausible but incorrect
- Question must test conceptual understanding
- Provide clear, unambiguous correct answer
` : ''}

${questionType === 'MSQ' ? `
MSQ Requirements:
- Create exactly 4 options (A, B, C, D)
- 2-3 options should be correct (never just 1 or all 4)
- Incorrect options must be plausible distractors
- Question should test multiple concepts
- Clearly identify all correct options
` : ''}

${questionType === 'NAT' ? `
NAT Requirements:
- Question must have a numerical answer
- Answer should be a specific number (integer or decimal)
- No options needed
- Include proper units if applicable
- Ensure answer is calculable and unique
` : ''}

${questionType === 'Subjective' ? `
Subjective Requirements:
- Create comprehensive descriptive question
- Should test deep understanding
- Include multiple parts if appropriate
- Provide detailed solution approach
- No options needed
` : ''}

QUALITY STANDARDS FOR ${examName} ENTRANCE EXAM:
1. Questions must be 100% original - inspired by PYQs but never duplicates
2. Use proper academic terminology and mathematical notation
3. Solutions MUST use authentic concepts from Topic Notes (not alternative approaches)
4. Match the ${examName} difficulty level and exam pattern EXACTLY
5. Write professionally like an exam paper, not like AI
6. Ensure questions have clear, unambiguous answers
7. Make questions challenging enough to test top students
8. Avoid repetitive patterns - each question should feel unique

SOLUTION WRITING GUIDELINES:
1. Keep solutions concise (max 500 characters)
2. Use authentic, proven scientific methods only
3. Write in single continuous line (no line breaks)
4. If solution gets too long, STOP and summarize
5. Avoid infinite loops - if stuck, restart with different approach
6. Double-check all calculations before finalizing
7. Verify answer is mathematically/logically correct

ABSOLUTE JSON REQUIREMENTS (NON-NEGOTIABLE):
1. Return ONLY the JSON array - NOTHING before or after
2. NEVER use markdown code blocks (no \`\`\`json, no \`\`\`, no code fences)
3. NEVER include actual line breaks in string values (use spaces instead)
4. NEVER use control characters (\\n, \\r, \\t, etc.) inside strings
5. NEVER use smart quotes (""), always use straight quotes (")
6. NEVER use Unicode escape sequences (\\uXXXX)
7. NEVER use hex escapes (\\xXX) or octal escapes (\\nnn)
8. Keep all text as ONE continuous line - use periods to separate steps
9. Start output directly with [ and end with ] - nothing else

CORRECT JSON FORMAT:
[{"question_statement":"What is X?","question_type":"${questionType}",${questionType === 'MCQ' || questionType === 'MSQ' ? '"options":["Option A","Option B","Option C","Option D"],' : '"options":null,'}"answer":"${questionType === 'MCQ' ? 'A' : questionType === 'MSQ' ? 'A, C' : questionType === 'NAT' ? '42.5' : 'Detailed answer'}","solution":"Step 1. Do X. Step 2. Calculate Y. Step 3. Conclude Z.","is_wrong":false}]

If you find an issue with your generated question:
[{"question_statement":"What is X?","question_type":"${questionType}",${questionType === 'MCQ' || questionType === 'MSQ' ? '"options":["Option A","Option B","Option C","Option D"],' : '"options":null,'}"answer":"${questionType === 'MCQ' ? 'A' : questionType === 'MSQ' ? 'A, C' : questionType === 'NAT' ? '42.5' : 'Detailed answer'}","solution":"Step 1. Do X. Step 2. Calculate Y. Step 3. Conclude Z.","is_wrong":true,"validation_reason":"Correct answer not in options"}]

INCORRECT (will cause errors):
\`\`\`json
[...]
\`\`\`

Generate exactly ${count} question(s). Output only pure JSON. No markdown, no line breaks in strings.`;

  try {
    console.log(`📊 CHECKPOINT: Starting question generation (attempt ${attempt}/${maxRetries})`, {
      topicName: topic.name,
      questionType,
      count,
      pyqsCount: pyqs.length,
      hasNotes: !!topicNotes,
      existingQuestionsCount: existingQuestionsContext.split('\n\n').filter(Boolean).length
    });

    console.log(`🌐 Calling Gemini API with prompt length: ${prompt.length} characters...`);
    const response = await callGeminiAPI(prompt, undefined, 0.3, 4096);
    const elapsed = Date.now() - startTime;
    console.log(`✅ API call completed in ${(elapsed / 1000).toFixed(1)}s`);

    // Checkpoint: Validate response received
    if (!response || response.trim() === '') {
      console.error('❌ CHECKPOINT FAILED: Empty response from Gemini');
      throw new Error('Empty response from Gemini API');
    }

    console.log('✅ CHECKPOINT PASSED: Response received', { responseLength: response.length, timeElapsed: `${(elapsed / 1000).toFixed(1)}s` });

    // Parse JSON response using robust parser
    let questions: ExtractedQuestion[] = [];
    try {
      questions = parseJsonRobust(response, 'array') as ExtractedQuestion[];

      // Checkpoint: Validate questions structure
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error('CHECKPOINT FAILED: Invalid questions array', { questions });
        throw new Error('Invalid questions array returned');
      }

      console.log('CHECKPOINT PASSED: Valid questions array', { count: questions.length });

      // Checkpoint: Validate each question has required fields
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_statement || !q.question_type || !q.answer) {
          console.error('CHECKPOINT FAILED: Question missing required fields', {
            questionIndex: i,
            hasStatement: !!q.question_statement,
            hasType: !!q.question_type,
            hasAnswer: !!q.answer
          });
          throw new Error('Question missing required fields (question_statement, question_type, or answer)');
        }

        // Validate options for MCQ/MSQ
        if ((q.question_type === 'MCQ' || q.question_type === 'MSQ') && (!q.options || q.options.length !== 4)) {
          console.error('CHECKPOINT FAILED: MCQ/MSQ must have exactly 4 options', {
            questionIndex: i,
            optionsCount: q.options?.length || 0
          });
          throw new Error(`${q.question_type} question must have exactly 4 options`);
        }
      }

      console.log('CHECKPOINT PASSED: All questions validated successfully');

    } catch (parseError) {
      throw new Error(`AI response format error. Retrying...`);
    }

    // Add topic_id to each question
    questions = questions.map(q => ({
      ...q,
      topic_id: topic.id
    }));

    console.log(`CHECKPOINT PASSED: Generated ${questions.length} ${questionType} questions for topic: ${topic.name}`);
    return questions;

  } catch (error) {
    console.error(`CHECKPOINT FAILED: Attempt ${attempt}/${maxRetries} failed:`, error.message);
    lastError = error;

    if (attempt < maxRetries) {
      const waitTime = Math.min(3000 * attempt, 15000);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
  }
  }

  throw new Error(`Failed to generate questions after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Generate solutions for PYQs using Gemini
export async function generateSolutionsForPYQs(
  pyqs: any[],
  topicNotes: string = ''
): Promise<{ answer: string; solution: string }[]> {

  if (pyqs.length === 0) return [];

  const maxRetries = 5;
  let attempt = 0;
  let lastError: Error | null = null;

  const notesContext = topicNotes ?
    `\n\nTOPIC NOTES (Use these concepts and methods to solve):\n${topicNotes.slice(0, 2500)}` : '';

  while (attempt < maxRetries) {
    attempt++;
    console.log(`PYQ solution generation attempt ${attempt}/${maxRetries}`);

  const prompt = `You are an expert professor solving ${pyqs[0].topics?.name || 'academic'} questions with 100% accuracy using authentic scientific concepts and methods.
${notesContext}

CRITICAL LATEX/KATEX REQUIREMENTS FOR SOLUTIONS:
1. ALL mathematical expressions MUST be wrapped in $ for inline or $$ for display
2. Use proper LaTeX: $\\alpha$, $\\beta$, $\\frac{a}{b}$, $x^2$, $\\sqrt{x}$, $\\int$, $\\sum$
3. NEVER use malformed commands like \\backslashhat, \\ackslash, Δackslash
4. Write solutions with clear LaTeX: "$F = ma$" NOT "F = ma" or "\\ackslashF = ma"

IMPORTANT FOR PYQ SOLUTIONS:
These are Previous Year Questions that have been professionally verified by professors. The options provided are CORRECT. If you think your calculated answer is not among the options, you MUST:
1. Re-check your calculations and methodology
2. Try a different solving approach
3. Trust that one of the given options IS correct
4. NEVER conclude that the question has an error - focus on finding YOUR error

CRITICAL ACCURACY REQUIREMENTS:
1. Use ONLY authentic, proven scientific methods and formulas
2. Triple-check every calculation before finalizing
3. For MCQ: Write answer as single letter: A, B, C, or D (exactly ONE correct)
4. For MSQ: Write answer as comma-separated letters: A, B or A, C, D (2-3 correct options)
5. For NAT: Write answer as exact numerical value (integer or decimal)
6. For Subjective: Provide comprehensive step-by-step answer
7. Use the concepts from Topic Notes when available
8. If your answer doesn't match options, YOU made an error - try again with different approach
9. Keep solutions concise (max 500 characters) - don't go into infinite explanations

ANSWER FORMAT EXAMPLES:
- MCQ: "A" or "B" or "C" or "D" (single letter only)
- MSQ: "A, C" or "B, D" or "A, B, C" (comma-separated letters)
- NAT: "42" or "3.14" or "-25.5" (numerical value only)
- Subjective: "Detailed answer explaining the concept..."

SOLUTION WRITING RULES:
1. Write in a single continuous line (no line breaks)
2. Use periods to separate steps
3. Keep it concise - aim for 3-5 key steps
4. Don't repeat yourself or go in circles
5. If the solution gets too long (>500 chars), STOP and summarize

SELF-CHECK BEFORE SUBMITTING:
- For MCQ: Is my answer A, B, C, or D? Does it match one of the given options?
- For MSQ: Are all my selected options among A, B, C, D?
- For NAT: Is my answer a clear number?
- Did I use correct formulas and methods?
- If answer seems wrong, did I try an alternative approach?

Questions to solve:
${pyqs.map((q, i) => `
Question ${i+1}:
Statement: ${q.question_statement}
Type: ${q.question_type}
${q.options ? `Options:\n${q.options.map((opt, idx) => `  ${String.fromCharCode(65+idx)}. ${opt}`).join('\n')}` : ''}
`).join('\n')}

For each question provide:
- CORRECT answer in the exact format specified above (must be one of the given options)
- Concise solution (max 500 characters, single line)

ABSOLUTE JSON REQUIREMENTS (NON-NEGOTIABLE):
1. Return ONLY the JSON array - NOTHING before or after
2. NEVER use markdown code blocks (no \`\`\`json, no \`\`\`, no code fences)
3. NEVER include actual line breaks in string values (use spaces instead)
4. NEVER use control characters (\\n, \\r, \\t, etc.) inside strings
5. NEVER use smart quotes (""), always use straight quotes (")
6. NEVER use Unicode escape sequences (\\uXXXX)
7. Keep solution text as ONE continuous line - use periods to separate steps
8. Start output directly with [ and end with ] - nothing else
9. Keep each solution under 500 characters

CORRECT JSON FORMAT:
[{"answer":"A","solution":"Step 1. Calculate force using F=ma. Step 2. Apply values F=10*5=50N. Step 3. Therefore answer is A (50N)."}]

INCORRECT (will cause errors):
\`\`\`json
[...]
\`\`\`

Remember: These are professionally verified questions. The right answer IS in the options. If you can't find it, try a different solving approach.`;

  try {
    const response = await callGeminiAPI(prompt, undefined, 0.1, 3000);

    // Parse JSON response using robust parser
    let solutions: { answer: string; solution: string }[] = [];
    try {
      solutions = parseJsonRobust(response, 'array') as { answer: string; solution: string }[];
    } catch (parseError) {
      throw new Error(`AI response format error. Retrying...`);
    }

    // Validate that solutions have proper format
    for (const solution of solutions) {
      if (!solution.answer || !solution.solution) {
        throw new Error('Solution missing answer or solution text');
      }
    }

    console.log(`Generated solutions for ${solutions.length} PYQs (attempt ${attempt})`);
    return solutions;

  } catch (error) {
    console.error(`PYQ solution attempt ${attempt} failed:`, error);
    lastError = error;

    if (attempt < maxRetries) {
      const waitTime = Math.min(3000 * attempt, 15000);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
  }
  }

  throw new Error(`Failed to generate PYQ solutions after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Comprehensive question validation using Gemini AI
export async function validateQuestionWithGeminiAI(question: any): Promise<{ isWrong: boolean; reason: string }> {
  const prompt = `You are an expert question validator. Analyze this question thoroughly and determine if it's WRONG or CORRECT based on these strict criteria:

Question Details:
- Statement: ${question.question_statement}
- Type: ${question.question_type}
- Options: ${question.options ? question.options.join(', ') : 'None'}
- Provided Answer: ${question.answer || 'None'}

VALIDATION RULES:

For MCQ (Single Correct):
- WRONG if: No options are correct, multiple options are correct, or provided answer doesn't match any correct option
- CORRECT if: Exactly one option is correct and matches the provided answer

For MSQ (Multiple Correct):
- WRONG if: No options are correct, or provided answer doesn't include all correct options
- CORRECT if: One or more options are correct and provided answer matches all correct options

For NAT (Numerical Answer):
- WRONG if: Answer is not numerical, question is unsolvable, or provided answer is mathematically incorrect
- CORRECT if: Question is solvable and provided answer is mathematically correct

For Subjective:
- Always CORRECT (no validation needed)

ANALYSIS PROCESS:
1. Solve the question independently
2. Check if provided answer matches your solution
3. For MCQ/MSQ: Verify each option's correctness
4. For NAT: Verify numerical accuracy

CRITICAL JSON OUTPUT REQUIREMENTS:
1. Return ONLY the JSON object - no text before or after
2. Do NOT use markdown code blocks (no \`\`\`json or \`\`\`)
3. Do NOT include line breaks in strings - keep all text single-line
4. Use simple ASCII quotes only

JSON FORMAT (all text must be single-line):
{
  "isWrong": true,
  "reason": "Single line explanation without line breaks",
  "correctAnswer": "Correct answer if applicable"
}

Be extremely thorough and accurate in your analysis.`;

  try {
    const response = await callGeminiAPI(prompt, undefined, 0.1, 2000);
    
    // Parse JSON response using robust parser
    let validation: { isWrong: boolean; reason: string; correctAnswer?: string };
    try {
      validation = parseJsonRobust(response, 'object') as { isWrong: boolean; reason: string; correctAnswer?: string };
    } catch (parseError) {
      return { isWrong: false, reason: 'Validation skipped - marked as correct' };
    }

    console.log(`Question validation result: ${validation.isWrong ? 'WRONG' : 'CORRECT'} - ${validation.reason}`);
    return validation;

  } catch (error) {
    console.error('Error validating question:', error);
    // Fallback: assume question is correct if validation fails
    return { isWrong: false, reason: `Validation failed: ${error.message} - marked as correct by default` };
  }
}

// Simple client-side validation (kept for backward compatibility)
export function validateQuestionAnswer(question: ExtractedQuestion): { isValid: boolean; reason: string } {
  if (!question.question_statement || question.question_statement.trim().length === 0) {
    return { isValid: false, reason: 'Empty question statement' };
  }

  if (!question.question_type || !['MCQ', 'MSQ', 'NAT', 'Subjective'].includes(question.question_type)) {
    return { isValid: false, reason: 'Invalid question type' };
  }

  // For MCQ and MSQ, options are required
  if ((question.question_type === 'MCQ' || question.question_type === 'MSQ') && 
      (!question.options || question.options.length === 0)) {
    return { isValid: false, reason: 'MCQ/MSQ questions require options' };
  }

  // Basic validation passed
  return { isValid: true, reason: 'Question passes basic validation' };
}

// Export the API key management functions for external use
export { getNextGeminiKey, callGeminiAPI };