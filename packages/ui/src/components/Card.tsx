import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', hoverable = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`glass-panel overflow-hidden ${hoverable ? 'glass-card cursor-pointer' : ''
                    } ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';
