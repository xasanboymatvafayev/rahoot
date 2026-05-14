import * as XLSX from "xlsx"

export function excelToQuizz(file: File): Promise<object> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as string[][]

        // Row 0,1 = title/info, Row 2 = headers, Row 3+ = data
        const dataRows = rows.slice(3).filter((r) => r[1])

        if (dataRows.length === 0) {
          reject(new Error("Excel da savol topilmadi"))
          return
        }

        const subject = String(dataRows[0][0] || "Viktorina")

        const questions = dataRows.map((row) => {
          const answers = [row[2], row[3], row[4], row[5]]
            .map(String)
            .filter((a) => a.trim() !== "")

          const correctIndex = Math.max(0, Number(row[6]) - 1) // 1-based → 0-based
          const time = Number(row[7]) || 30

          return {
            question: String(row[1]),
            answers,
            solutions: [correctIndex],
            cooldown: 5,
            time: Math.min(120, Math.max(5, time)),
          }
        })

        resolve({ subject, questions })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error("Fayl o'qib bo'lmadi"))
    reader.readAsArrayBuffer(file)
  })
}