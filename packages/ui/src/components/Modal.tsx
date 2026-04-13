import * as React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, width = 'md' }: ModalProps) => {
    if (!isOpen) return null;

    const widthClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div
                className={`relative w-full ${widthClasses[width]} bg-[var(--retro-darker)] border-4 border-[var(--retro-neon)] shadow-[8px_8px_0px_0px_rgba(57,255,20,0.3)] flex flex-col overflow-hidden animate-fade-in`}
                style={{ animationDuration: '0.2s', transformOrigin: 'center', animationName: 'pop-in' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-4 border-[var(--retro-neon)] bg-[var(--retro-neon)]/10">
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase text-shadow-glow">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {children}
                </div>
            </div>
        </div>
    );
};
