import React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemDetails?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = "Delete Confirmation",
  itemName,
  itemDetails,
  message = "This action is permanent and cannot be undone.",
  confirmButtonText = "Delete Permanently",
  cancelButtonText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-5 overflow-hidden relative"
        >
          {/* Close button top right */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100/80 text-red-600 rounded-2xl shrink-0 border border-red-200/60 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mt-0.5">
                Irreversible Action
              </p>
            </div>
          </div>

          {/* Item details card if provided */}
          {itemName && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Target Record
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-slate-900 truncate">
                  {itemName}
                </span>
                {itemDetails && (
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-emerald-200/80 shrink-0">
                    {itemDetails}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Explanation message */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {message}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              {cancelButtonText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-red-600/20"
            >
              <Trash2 className="w-4 h-4" />
              {confirmButtonText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
