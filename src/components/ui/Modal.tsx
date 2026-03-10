import * as React from "react"
import { X } from "lucide-react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                role="presentation"
            />

            {/* Dialog */}
            <div className="relative z-50 w-full max-w-lg rounded-2xl flex flex-col bg-slate-900/60 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 sm:max-w-xl max-h-[90vh]">
                <div className="flex items-center justify-between mb-5 shrink-0 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-semibold tracking-wide text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-300 active:scale-[0.95]"
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                <div className="overflow-y-auto pr-2 -mr-2 flex-1">
                    {children}
                </div>
            </div>
        </div>
    )
}
