import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', hoverable = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`glass-panel rounded-xl overflow-hidden ${hoverable ? 'transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-pointer' : ''
                    } ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';
