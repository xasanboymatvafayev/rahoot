/**
 * Parses a PDF file and extracts quiz questions in Rahoot format.
 *
 * Expected PDF format (plain text inside PDF):
 *
 * Quiz Title: My Quiz
 *
 * 1. What is the capital of France?
 * A) London
 * B) Paris *
 * C) Berlin
 * D) Rome
 * Time: 30
 * Cooldown: 5
 *
 * 2. 2 + 2 = ?
 * A) 3
 * B) 4 *
 * C) 5
 * D) 6 *
 *
 * Rules:
 * - Question starts with "N." (number + dot)
 * - Answers: A) B) C) D) — correct ones marked with "*" at end
 * - Optional: Time: X (5–120), Cooldown: X (3–15)
 * - Quiz title: "Quiz Title: ..." or first line
 */

export type ParsedQuestion = {
  question: string
  answers: string[]
  solutions: number[]
  time: number
  cooldown: number
}

export type ParsedQuizz = {
  subject: string
  questions: ParsedQuestion[]
}

export type ParseResult =
  | { success: true; data: ParsedQuizz }
  | { success: false; error: string }

function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use pdf.js from CDN if available, otherwise try basic extraction
    const uint8 = new Uint8Array(arrayBuffer)
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(uint8)

    // Extract text from PDF streams (basic approach)
    const textParts: string[] = []

    // Match BT...ET blocks (PDF text blocks)
    const btEtRegex = /BT([\s\S]*?)ET/g
    let match
    while ((match = btEtRegex.exec(rawText)) !== null) {
      const block = match[1]
      // Extract strings in parentheses: (text) Tj or [(text)] TJ
      const strRegex = /\(([^)]*)\)\s*(?:Tj|TJ|'|")/g
      let strMatch
      while ((strMatch = strRegex.exec(block)) !== null) {
        const str = strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
        if (str.trim()) textParts.push(str)
      }
    }

    // Fallback: extract all parenthesized strings if no BT/ET blocks
    if (textParts.length === 0) {
      const fallbackRegex = /\(([^\n\r()]{2,200})\)/g
      let fb
      while ((fb = fallbackRegex.exec(rawText)) !== null) {
        const s = fb[1].trim()
        if (s && !/^[\x00-\x08\x0e-\x1f\x7f-\x9f]/.test(s)) {
          textParts.push(s)
        }
      }
    }

    const result = textParts.join("\n")
    if (result.trim().length < 10) {
      reject(new Error("Could not extract text from PDF. Make sure the PDF contains selectable text (not scanned image)."))
    } else {
      resolve(result)
    }
  })
}

export async function parsePdfQuizz(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    let text: string

    try {
      text = await extractTextFromPdf(arrayBuffer)
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Failed to read PDF",
      }
    }

    return parseQuizzText(text)
  } catch {
    return { success: false, error: "Failed to process PDF file" }
  }
}

export function parseQuizzText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { success: false, error: "PDF appears to be empty" }
  }

  // Extract subject / title
  let subject = "Imported Quiz"
  let startLine = 0

  const titleMatch = lines[0].match(/^(?:quiz\s*title|title|mavzu|sarlavha)\s*[:\-]\s*(.+)$/i)
  if (titleMatch) {
    subject = titleMatch[1].trim()
    startLine = 1
  }

  // Parse questions
  const questions: ParsedQuestion[] = []
  let currentQuestion: Partial<ParsedQuestion> | null = null
  let currentTime = 30
  let currentCooldown = 5

  const answerPrefixes = /^[A-Da-d][).\s]\s*/

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]

    // Question line: starts with number+dot e.g. "1." or "1)"
    const questionMatch = line.match(/^(\d+)[.)]\s+(.+)$/)
    if (questionMatch) {
      if (currentQuestion && currentQuestion.question && currentQuestion.answers && currentQuestion.answers.length >= 2) {
        if (!currentQuestion.solutions || currentQuestion.solutions.length === 0) {
          currentQuestion.solutions = [0] // default first answer
        }
        questions.push(currentQuestion as ParsedQuestion)
      }
      currentQuestion = {
        question: questionMatch[2].trim(),
        answers: [],
        solutions: [],
        time: currentTime,
        cooldown: currentCooldown,
      }
      continue
    }

    if (!currentQuestion) continue

    // Time setting: "Time: 30" or "Vaqt: 30"
    const timeMatch = line.match(/^(?:time|vaqt)\s*:\s*(\d+)$/i)
    if (timeMatch) {
      const t = parseInt(timeMatch[1])
      if (t >= 5 && t <= 120) currentQuestion.time = t
      continue
    }

    // Cooldown setting: "Cooldown: 5"
    const cooldownMatch = line.match(/^(?:cooldown|kechikish)\s*:\s*(\d+)$/i)
    if (cooldownMatch) {
      const c = parseInt(cooldownMatch[1])
      if (c >= 3 && c <= 15) currentQuestion.cooldown = c
      continue
    }

    // Answer line: A) Answer text * (star = correct)
    if (answerPrefixes.test(line)) {
      const withoutPrefix = line.replace(answerPrefixes, "")
      const isCorrect = withoutPrefix.endsWith("*")
      const answerText = withoutPrefix.replace(/\s*\*\s*$/, "").trim()

      if (answerText && currentQuestion.answers!.length < 4) {
        const idx = currentQuestion.answers!.length
        currentQuestion.answers!.push(answerText)
        if (isCorrect) {
          currentQuestion.solutions!.push(idx)
        }
      }
    }
  }

  // Push last question
  if (currentQuestion && currentQuestion.question && currentQuestion.answers && currentQuestion.answers.length >= 2) {
    if (!currentQuestion.solutions || currentQuestion.solutions.length === 0) {
      currentQuestion.solutions = [0]
    }
    questions.push(currentQuestion as ParsedQuestion)
  }

  if (questions.length === 0) {
    return {
      success: false,
      error:
        "No questions found in PDF. Please use the correct format:\n1. Question text\nA) Answer 1\nB) Answer 2 *\nC) Answer 3\n(mark correct answers with *)",
    }
  }

  return { success: true, data: { subject, questions } }
}
