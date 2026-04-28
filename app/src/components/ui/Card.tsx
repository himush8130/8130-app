import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-card rounded-lg border border-border shadow-sm ${className}`}
      {...rest}
    />
  )
}

export function CardHeader({ className = '', ...rest }: CardProps) {
  return <div className={`p-4 border-b border-border ${className}`} {...rest} />
}

export function CardBody({ className = '', ...rest }: CardProps) {
  return <div className={`p-4 ${className}`} {...rest} />
}
