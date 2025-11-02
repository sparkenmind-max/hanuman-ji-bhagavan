/**
 * Comprehensive LaTeX Syntax Cleaner
 * Fixes malformed LaTeX patterns from AI responses
 */

export function cleanLatexSyntax(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // Fix backslash references - CRITICAL FIXES
  cleaned = cleaned
    .replace(/ackslash/g, '\\')
    .replace(/\\backslash([a-zA-Z])/g, '\\$1')
    .replace(/\\backslash\{/g, '\\{')
    .replace(/\\backslash\}/g, '\\}')
    .replace(/\\backslash /g, '\\ ');

  // Fix frac command - CRITICAL
  cleaned = cleaned
    .replace(/([^\\])rac\{/g, '$1\\frac{')
    .replace(/^rac\{/g, '\\frac{')
    .replace(/\srac\{/g, ' \\frac{');

  // Fix all backslash-prefixed Greek letters
  cleaned = cleaned
    .replace(/\\backslashalpha/g, '\\alpha')
    .replace(/\\backslashbeta/g, '\\beta')
    .replace(/\\backslashgamma/g, '\\gamma')
    .replace(/\\backslashdelta/g, '\\delta')
    .replace(/\\backslashepsilon/g, '\\epsilon')
    .replace(/\\backslashzeta/g, '\\zeta')
    .replace(/\\backslasheta/g, '\\eta')
    .replace(/\\backslashtheta/g, '\\theta')
    .replace(/\\backslashtau/g, '\\tau')
    .replace(/\\backslashlambda/g, '\\lambda')
    .replace(/\\backslashmu/g, '\\mu')
    .replace(/\\backslashnu/g, '\\nu')
    .replace(/\\backslashxi/g, '\\xi')
    .replace(/\\backslashpi/g, '\\pi')
    .replace(/\\backslashrho/g, '\\rho')
    .replace(/\\backslashsigma/g, '\\sigma')
    .replace(/\\backslashomega/g, '\\omega')
    .replace(/\\backslashphi/g, '\\phi')
    .replace(/\\backslashpsi/g, '\\psi')
    .replace(/\\backslashchi/g, '\\chi');

  // Fix uppercase Greek
  cleaned = cleaned
    .replace(/\\backslashGamma/g, '\\Gamma')
    .replace(/\\backslashDelta/g, '\\Delta')
    .replace(/\\backslashTheta/g, '\\Theta')
    .replace(/\\backslashLambda/g, '\\Lambda')
    .replace(/\\backslashSigma/g, '\\Sigma')
    .replace(/\\backslashPi/g, '\\Pi')
    .replace(/\\backslashOmega/g, '\\Omega')
    .replace(/\\backslashPhi/g, '\\Phi')
    .replace(/\\backslashPsi/g, '\\Psi');

  // Fix common math commands
  cleaned = cleaned
    .replace(/\\backslashfrac/g, '\\frac')
    .replace(/\\backslashsqrt/g, '\\sqrt')
    .replace(/\\backslashhat/g, '\\hat')
    .replace(/\\backslashvec/g, '\\vec')
    .replace(/\\backslashbar/g, '\\bar')
    .replace(/\\backslashtilde/g, '\\tilde')
    .replace(/\\backslashdot/g, '\\dot')
    .replace(/\\backslashddot/g, '\\ddot')
    .replace(/\\backslashinfty/g, '\\infty')
    .replace(/\\backslashint/g, '\\int')
    .replace(/\\backslashsum/g, '\\sum')
    .replace(/\\backslashprod/g, '\\prod')
    .replace(/\\backslashot/g, '\\lim')
    .replace(/\\backslashlimits/g, '\\limits')
    .replace(/\\backslashpartial/g, '\\partial')
    .replace(/\\backslashnabla/g, '\\nabla');

  // Fix operators
  cleaned = cleaned
    .replace(/\\backslashtimes/g, '\\times')
    .replace(/\\backslashdiv/g, '\\div')
    .replace(/\\backslashcdot/g, '\\cdot')
    .replace(/\\backslashpm/g, '\\pm')
    .replace(/\\backslashmp/g, '\\mp')
    .replace(/\\backslashleq/g, '\\leq')
    .replace(/\\backslashgeq/g, '\\geq')
    .replace(/\\backslashneq/g, '\\neq')
    .replace(/\\backslashapprox/g, '\\approx')
    .replace(/\\backslashequiv/g, '\\equiv')
    .replace(/\\backslashpropto/g, '\\propto');

  // Fix other malformed patterns with Greek symbols
  cleaned = cleaned
    .replace(/Δackslash/g, '\\')
    .replace(/⊗ackslash/g, '\\')
    .replace(/αackslash/g, '\\')
    .replace(/βackslash/g, '\\')
    .replace(/γackslash/g, '\\')
    .replace(/δackslash/g, '\\')
    .replace(/εackslash/g, '\\')
    .replace(/θackslash/g, '\\')
    .replace(/λackslash/g, '\\')
    .replace(/μackslash/g, '\\')
    .replace(/σackslash/g, '\\')
    .replace(/τackslash/g, '\\')
    .replace(/ωackslash/g, '\\')
    .replace(/πackslash/g, '\\')
    .replace(/Σackslash/g, '\\')
    .replace(/Πackslash/g, '\\')
    .replace(/Ωackslash/g, '\\')
    .replace(/Λackslash/g, '\\')
    .replace(/Θackslash/g, '\\')
    .replace(/Γackslash/g, '\\');

  return cleaned;
}

/**
 * Clean LaTeX in an entire question object
 */
export function cleanQuestionLatex(question: any): any {
  if (!question) return question;

  const cleaned = { ...question };

  // Clean question statement
  if (cleaned.question_statement) {
    cleaned.question_statement = cleanLatexSyntax(cleaned.question_statement);
  }

  // Clean options
  if (Array.isArray(cleaned.options)) {
    cleaned.options = cleaned.options.map(opt => opt ? cleanLatexSyntax(opt) : opt);
  }

  // Clean answer
  if (cleaned.answer) {
    cleaned.answer = cleanLatexSyntax(cleaned.answer);
  }

  // Clean solution
  if (cleaned.solution) {
    cleaned.solution = cleanLatexSyntax(cleaned.solution);
  }

  // Clean image description
  if (cleaned.image_description) {
    cleaned.image_description = cleanLatexSyntax(cleaned.image_description);
  }

  return cleaned;
}
