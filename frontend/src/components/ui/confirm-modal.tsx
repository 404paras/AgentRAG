import { type ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, X } from 'lucide-react';
import '../../styles/modal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    const variantStyles = {
        danger: {
            iconBg: 'modal-icon-danger',
            confirmBtn: 'modal-btn-danger'
        },
        warning: {
            iconBg: 'modal-icon-warning',
            confirmBtn: 'modal-btn-warning'
        },
        info: {
            iconBg: 'modal-icon-info',
            confirmBtn: 'modal-btn-info'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-container">
                <button 
                    className="modal-close-btn" 
                    onClick={onClose}
                    disabled={isLoading}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="modal-content">
                    <div className={`modal-icon ${styles.iconBg}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div className="modal-text">
                        <h3 className="modal-title">{title}</h3>
                        <p className="modal-message">{message}</p>
                    </div>
                </div>

                <div className="modal-actions">
                    <Button
                        variant="outline"
                        className="modal-btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        className={`${styles.confirmBtn} cursor-pointer`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="modal-spinner"></span>
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;