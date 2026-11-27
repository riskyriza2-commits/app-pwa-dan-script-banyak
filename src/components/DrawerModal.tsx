import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  tone?: 'default' | 'sage';
}

export const DrawerModal: React.FC<DrawerModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'md:max-w-xl',
  tone = 'sage',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const surfaceClass =
    tone === 'sage'
      ? 'bg-[#a3cf9f] dark:bg-[#142619] text-[#102916] dark:text-[#e8f3ec] border-[#5f8f5b] dark:border-[#294730]'
      : 'bg-white dark:bg-[#15211a] text-[#12261a] dark:text-[#e8f3ec] border-[#e1e9e3] dark:border-[#243329]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/55 backdrop-blur-xs p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} ${surfaceClass} rounded-t-3xl md:rounded-3xl shadow-2xl border-t md:border max-h-[92vh] flex flex-col overflow-hidden transition-transform duration-200`}
      >
        {/* Vivid green top bar matching Figma mobile frames */}
        <div className="h-2.5 bg-[#24c23b] w-full shrink-0" />

        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center rounded-full bg-[#e9f1e8] dark:bg-[#1e3524] border border-[#5f8f5b]/40 px-4 py-1.5 shadow-2xs">
              <h2 className="text-sm md:text-base font-extrabold tracking-tight text-[#102916] dark:text-white truncate">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs font-medium text-[#1e4225] dark:text-[#a8c7af] mt-2 px-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-[#e9f1e8] dark:bg-[#1e3524] text-[#102916] dark:text-white hover:opacity-80 transition-opacity shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-1 pb-safe overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
