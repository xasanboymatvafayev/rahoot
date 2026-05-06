import { EVENTS } from "@rahoot/common/constants"
import AlertDialog from "@rahoot/web/components/AlertDialog"
import Button from "@rahoot/web/components/Button"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socket-context"
import { useConfig } from "@rahoot/web/features/manager/contexts/config-context"
import { parsePdfQuizz } from "@rahoot/web/features/quizz/utils/parsePdfQuizz"
import { useNavigate } from "@tanstack/react-router"
import { FileJson, FileText, SquarePen, Trash2, Upload } from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

type ImportMode = "json" | "pdf"

const ConfigManageQuizz = () => {
  const { quizz } = useConfig()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const [importLoading, setImportLoading] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)

  useEvent(EVENTS.QUIZZ.ERROR, (message) => {
    toast.error(t(message))
  })

  const handleDelete = (id: string) => () => {
    socket?.emit(EVENTS.QUIZZ.DELETE, id)
    toast.success(t("manager:quizz.deleted"))
  }

  const handleJsonImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        socket?.emit(EVENTS.QUIZZ.SAVE, data)
        toast.success(t("manager:quizz.importedJson"))
      } catch {
        toast.error(t("manager:quizz.invalidJson"))
      }
    }
    reader.readAsText(file)
    e.target.value = ""
    setShowImportMenu(false)
  }

  const handlePdfImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setShowImportMenu(false)

    try {
      const result = await parsePdfQuizz(file)

      if (!result.success) {
        toast.error(result.error, { duration: 6000 })
        return
      }

      socket?.emit(EVENTS.QUIZZ.SAVE, result.data)
      toast.success(
        t("manager:quizz.importedPdf", {
          count: result.data.questions.length,
          subject: result.data.subject,
        }),
        { duration: 5000 },
      )
    } catch {
      toast.error(t("manager:quizz.pdfError"))
    } finally {
      setImportLoading(false)
      e.target.value = ""
    }
  }

  const triggerImport = (mode: ImportMode) => {
    if (mode === "json") jsonInputRef.current?.click()
    else pdfInputRef.current?.click()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 gap-2">
        <Button
          className="flex-1"
          onClick={() => navigate({ to: "/manager/quizz" })}
        >
          {t("manager:quizz.create")}
        </Button>

        <div className="relative">
          <Button
            className="bg-gray-100 px-3 text-gray-600"
            onClick={() => setShowImportMenu((v) => !v)}
            title={t("manager:quizz.import")}
            disabled={importLoading}
          >
            {importLoading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Upload className="size-4" />
            )}
          </Button>

          {showImportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowImportMenu(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => triggerImport("json")}
                >
                  <FileJson className="size-4 text-blue-500" />
                  {t("manager:quizz.importJson")}
                </button>
                <div className="mx-3 border-t border-gray-100" />
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => triggerImport("pdf")}
                >
                  <FileText className="size-4 text-red-500" />
                  {t("manager:quizz.importPdf")}
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleJsonImport}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handlePdfImport}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-0.5">
        {quizz.map((q) => (
          <div
            key={q.id}
            className="flex h-12 w-full items-center justify-between rounded-md pr-1.5 pl-3 outline outline-gray-300"
          >
            <p className="truncate">{q.subject}</p>
            <div className="flex gap-0.5">
              <button
                className="rounded-sm p-2 text-gray-600 hover:bg-gray-600/10"
                onClick={() =>
                  navigate({
                    to: "/manager/quizz/$quizzId",
                    params: { quizzId: q.id },
                  })
                }
              >
                <SquarePen className="size-4" />
              </button>

              <AlertDialog
                trigger={
                  <button className="rounded-sm p-2 hover:bg-red-600/10">
                    <Trash2 className="size-4 stroke-red-500" />
                  </button>
                }
                title={t("manager:quizz.delete")}
                description={t("manager:quizz.deleteConfirm", {
                  name: q.subject,
                })}
                confirmLabel={t("common:delete")}
                onConfirm={handleDelete(q.id)}
              />
            </div>
          </div>
        ))}
        {quizz.length === 0 && (
          <p className="my-8 text-center text-gray-500">
            {t("manager:quizz.none")}
          </p>
        )}
      </div>
    </div>
  )
}

export default ConfigManageQuizz
