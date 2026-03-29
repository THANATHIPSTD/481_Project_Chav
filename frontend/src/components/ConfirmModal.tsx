import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isDangerous = true
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl p-6"
        >
          <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isDangerous ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertCircle className={`h-6 w-6 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <h2 className="mb-2 text-xl font-bold text-zinc-900">{title}</h2>
          <p className="mb-6 text-sm text-zinc-500 leading-relaxed">{message}</p>
          
          <div className="flex gap-3">
             <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-900 hover:bg-zinc-800'}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}