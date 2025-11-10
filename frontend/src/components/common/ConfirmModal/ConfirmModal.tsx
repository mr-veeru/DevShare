import React, { ReactNode } from 'react';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onClose,
  children,
  confirmDisabled = false
}) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={() => !loading && onClose()}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          {description && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 0, ...(children ? { marginBottom: '1.5rem' } : {}) }}>{description}</p>
          )}
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '12px 0 4px' }}>
            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              {cancelLabel}
            </button>
            <button
              className="btn-danger"
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
              style={{ 
                background: '#ef4444', 
                border: 'none', 
                color: '#fff', 
                padding: '10px 16px', 
                borderRadius: 8, 
                cursor: (loading || confirmDisabled) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                opacity: (loading || confirmDisabled) ? 0.6 : 1
              }}
            >
              {loading ? 'Please wait...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;


