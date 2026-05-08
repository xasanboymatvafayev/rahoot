/**
 * Parses a PDF file and extracts quiz questions in Rahoot format.
 *
 * Expected PDF format:
 *
 * Quiz Title: My Quiz
 *
 * 1. Question text?
 * A) Wrong answer
 * B) Correct answer *
 * C) Wrong answer
 * D) Wrong answer
 * Time: 30
 * Cooldown: 5
 *
 * Rules:
 * - Question: "N. text" (number + dot)
 * - Answers: A) B) C) D) — correct one marked with "*" at end
 * - Time and Cooldown are optional (defaults: 30s / 5s)
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

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> }
      GlobalWorkerOptions: { workerSrc: string }
    }
  }
}

type PdfDoc = {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
}

type PdfPage = {
  getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }>
}

function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        resolve()
      } else {
        reject(new Error("pdf.js failed to load"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load pdf.js from CDN"))
    document.head.appendChild(script)
  })
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  await loadPdfJs()

  const pdf = await window.pdfjsLib!.getDocument({ data: arrayBuffer }).promise
  const lines: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    let lineText = ""
    for (const item of content.items) {
      lineText += item.str
      if (item.hasEOL) {
        const trimmed = lineText.trim()
        if (trimmed) lines.push(trimmed)
        lineText = ""
      }
    }
    if (lineText.trim()) lines.push(lineText.trim())
  }

  return lines.join("\n")
}

export function parseQuizzText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { success: false, error: "PDF appears to be empty" }
  }

  // Extract title
  let subject = "Imported Quiz"
  let startLine = 0

  const titleMatch = lines[0].match(
    /^(?:quiz\s*title|title|mavzu|sarlavha)\s*[:\-]\s*(.+)$/i,
  )
  if (titleMatch) {
    subject = titleMatch[1].trim()
    startLine = 1
  }

  const questions: ParsedQuestion[] = []
  let currentQuestion: Partial<ParsedQuestion> | null = null

  const answerPrefixRegex = /^[A-Da-d][).\s]\s*/

  const pushCurrent = () => {
    if (
      currentQuestion &&
      currentQuestion.question &&
      currentQuestion.answers &&
      currentQuestion.answers.length >= 2
    ) {
      if (!currentQuestion.solutions || currentQuestion.solutions.length === 0) {
        currentQuestion.solutions = [0]
      }
      questions.push(currentQuestion as ParsedQuestion)
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]

    // Question: "1. text" or "1) text"
    const questionMatch = line.match(/^(\d+)[.)]\s+(.+)$/)
    if (questionMatch) {
      pushCurrent()
      currentQuestion = {
        question: questionMatch[2].trim(),
        answers: [],
        solutions: [],
        time: 30,
        cooldown: 5,
      }
      continue
    }

    if (!currentQuestion) continue

    // Time
    const timeMatch = line.match(/^(?:time|vaqt)\s*[:\-]\s*(\d+)$/i)
    if (timeMatch) {
      const t = parseInt(timeMatch[1])
      if (t >= 5 && t <= 120) currentQuestion.time = t
      continue
    }

    // Cooldown
    const cooldownMatch = line.match(/^(?:cooldown|kechikish)\s*[:\-]\s*(\d+)$/i)
    if (cooldownMatch) {
      const c = parseInt(cooldownMatch[1])
      if (c >= 3 && c <= 15) currentQuestion.cooldown = c
      continue
    }

    // Answer: A) text  or  A) text *
    if (answerPrefixRegex.test(line) && currentQuestion.answers!.length < 4) {
      const withoutPrefix = line.replace(answerPrefixRegex, "")
      const isCorrect = /\s*\*\s*$/.test(withoutPrefix)
      const answerText = withoutPrefix.replace(/\s*\*\s*$/, "").trim()

      if (answerText) {
        const idx = currentQuestion.answers!.length
        currentQuestion.answers!.push(answerText)
        if (isCorrect) {
          currentQuestion.solutions!.push(idx)
        }
      }
    }
  }

  pushCurrent()

  if (questions.length === 0) {
    return {
      success: false,
      error:
        "No questions found in PDF. Please use the correct format:\n1. Question text\nA) Answer 1\nB) Answer 2 *\nC) Answer 3\n(mark correct answers with *)",
    }
  }

  return { success: true, data: { subject, questions } }
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
        error:
          e instanceof Error
            ? e.message
            : "Failed to read PDF. Make sure it contains selectable text (not a scanned image).",
      }
    }

    if (!text.trim()) {
      return {
        success: false,
        error: "Could not extract text from PDF. Make sure it contains selectable text.",
      }
    }

    return parseQuizzText(text)
  } catch {
    return { success: false, error: "Failed to process PDF file" }
  }
}
