import type { ReactNode } from 'react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export default function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  confirmButtonClass = 'btn-danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">{title}</h2>
        <div className="modal-message">{message}</div>
        <div className="modal-buttons">
          <button 
            className={`modal-button ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button 
            className="modal-button btn-secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}