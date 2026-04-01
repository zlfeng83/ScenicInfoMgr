import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const buttonVariants = {
    variant: {
        default: "bg-primary text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:bg-primary/90 active:scale-[0.98] transition-all duration-300",
        destructive: "bg-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:bg-red-500 active:scale-[0.98] transition-all duration-300",
        outline: "border border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white active:scale-[0.98] transition-all duration-300",
        secondary: "bg-white/10 text-white shadow-sm border border-white/5 hover:bg-white/20 active:scale-[0.98] transition-all duration-300",
        ghost: "hover:bg-white/10 text-white/80 hover:text-white active:scale-[0.98] transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-300",
    },
    size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    buttonVariants.variant[variant],
                    buttonVariants.size[size],
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
