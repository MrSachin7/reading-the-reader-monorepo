"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type StepperContextValue = {
  value: number
  onChange?: (value: number) => void
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepperContext() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("Stepper components must be used inside Stepper")
  }
  return context
}

function Stepper({
  value,
  onChange,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value: number
  onChange?: (value: number) => void
}) {
  return (
    <StepperContext.Provider value={{ value, onChange }}>
      <div
        data-slot="stepper"
        role="tablist"
        aria-orientation="horizontal"
        className={cn("flex items-center", className)}
        {...props}
      />
    </StepperContext.Provider>
  )
}

function StepperItem({
  value,
  disabled,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  value: number
}) {
  const context = useStepperContext()
  const isActive = context.value === value
  const isCompleted = context.value > value

  return (
    <button
      type="button"
      data-slot="stepper-item"
      data-state={isActive ? "active" : isCompleted ? "completed" : "inactive"}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          context.onChange?.(value)
        }
      }}
      className={cn("text-left", className)}
      aria-current={isActive ? "step" : undefined}
      {...props}
    >
      {children}
    </button>
  )
}

function StepperHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-header"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function StepperIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stepper-icon"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    />
  )
}

function StepperSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stepper-separator"
      className={cn("h-px bg-border", className)}
      {...props}
    />
  )
}

export { Stepper, StepperHeader, StepperIcon, StepperItem, StepperSeparator }
