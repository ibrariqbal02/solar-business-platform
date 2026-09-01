import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  ConfirmationVariant,
  { icon: string; iconBg: string; iconColor: string; confirmVariant: 'danger' | 'primary' | 'secondary' }
> = {
  danger:  { icon: '!',   iconBg: 'bg-red-100',    iconColor: 'text-red-600',    confirmVariant: 'danger'    },
  warning: { icon: '!',   iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  confirmVariant: 'primary'   },
  info:    { icon: 'i',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   confirmVariant: 'primary'   },
};

export default function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay so the element is visible before focus
      const id = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, isLoading, onCancel]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5">
        {/* Close button */}
        <button
          type="button"
          onClick={() => !isLoading && onCancel()}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:pointer-events-none"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold',
                cfg.iconBg,
                cfg.iconColor,
              )}
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1 pr-4">
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold text-gray-900"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="mt-1 text-sm text-gray-500"
              >
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={cfg.confirmVariant}
              size="sm"
              isLoading={isLoading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
