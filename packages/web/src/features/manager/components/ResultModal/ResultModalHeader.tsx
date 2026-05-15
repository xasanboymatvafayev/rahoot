import { useResultModal } from "@rahoot/web/features/manager/contexts/result-modal-context"
import clsx from "clsx"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useTranslation } from "react-i18next"

type Props = {
  activeTab: "questions" | "all"
  onTabChange: (tab: "questions" | "all") => void
}

const ResultModalHeader = ({ activeTab, onTabChange }: Props) => {
  const { result, questionIndex, total, goNext, goPrev, onClose } =
    useResultModal()
  const { t } = useTranslation()

  return (
    <div className="flex shrink-0 flex-col border-b border-gray-200">
      {/* Yuqori qator */}
      <div className="flex items-center gap-3 px-5 py-3">
        <h2 className="flex-1 truncate text-base font-bold text-gray-900">
          {result.subject}
        </h2>

        {/* Savol navigatsiyasi — faqat questions tabda */}
        {activeTab === "questions" && (
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-sm text-gray-400">
              {questionIndex + 1}
              {t("manager:result.paginationOf")}
              {total}
            </span>
            <button
              disabled={questionIndex === 0}
              onClick={goPrev}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              disabled={questionIndex === total - 1}
              onClick={goNext}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Tab tugmalari */}
      <div className="flex gap-0 border-t border-gray-100 px-5">
        <button
          onClick={() => onTabChange("questions")}
          className={clsx(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "questions"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-500 hover:text-gray-700",
          )}
        >
          Savollar
        </button>
        <button
          onClick={() => onTabChange("all")}
          className={clsx(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "all"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-500 hover:text-gray-700",
          )}
        >
          All
        </button>
      </div>
    </div>
  )
}

export default ResultModalHeader
