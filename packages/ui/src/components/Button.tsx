import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-neon disabled:pointer-events-none disabled:opacity-50';

        const variants = {
            primary: 'bg-retro-neon text-retro-dark hover:bg-retro-neon/90 shadow-[0_0_15px_rgba(0,255,204,0.3)]',
            secondary: 'bg-retro-card/50 text-retro-text hover:bg-retro-card border border-retro-neon/20 backdrop-blur-md',
            ghost: 'hover:bg-retro-neon/10 hover:text-retro-neon text-retro-text',
            icon: 'bg-transparent hover:bg-white/10 text-white rounded-full'
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2',
            lg: 'h-12 px-8 text-lg',
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
