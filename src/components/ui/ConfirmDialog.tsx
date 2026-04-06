import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from './index';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  icon,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-800 border border-surface-700">
        <div className="flex-shrink-0 mt-0.5">
          {icon || <AlertTriangle className="h-5 w-5 text-amber-400" />}
        </div>
        <p className="text-sm text-surface-300">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
