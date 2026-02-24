import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const baseStyles = 'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-neon disabled:pointer-events-none disabled:opacity-50 uppercase tracking-widest';

        const variants = {
            primary: 'bg-retro-neon text-black border-4 border-retro-neon shadow-[4px_4px_0px_0px_rgba(57,255,20,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(57,255,20,0.6)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none',
            secondary: 'bg-black text-retro-neon border-4 border-retro-neon shadow-[4px_4px_0px_0px_rgba(57,255,20,0.4)] hover:bg-retro-neon/10 hover:shadow-[6px_6px_0px_0px_rgba(57,255,20,0.6)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none',
            ghost: 'hover:bg-retro-neon/20 hover:text-retro-neon text-retro-text border-2 border-transparent hover:border-retro-neon/50',
            icon: 'bg-black border-2 border-retro-neon text-retro-neon shadow-[2px_2px_0px_0px_rgba(57,255,20,0.4)] hover:bg-retro-neon hover:text-black active:translate-y-0.5 active:shadow-none'
        };

        const sizes = {
            sm: 'h-8 px-3 text-[10px]',
            md: 'h-10 px-4 py-2 text-xs',
            lg: 'h-12 px-8 text-sm',
            icon: 'h-10 w-10 flex items-center justify-center'
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';
