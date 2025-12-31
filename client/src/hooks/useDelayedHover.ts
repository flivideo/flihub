import { useState, useRef, useCallback } from 'react'

/**
 * FR-117: Hook for hover state with configurable delays
 * - Enter delay: Prevents accidental hover triggers
 * - Leave delay: Keeps element visible briefly after mouse leaves (prevents flicker)
 */
export function useDelayedHover(
  enterDelay = 0,
  leaveDelay = 150
): {
  isHovered: boolean
  handleMouseEnter: () => void
  handleMouseLeave: () => void
} {
  const [isHovered, setIsHovered] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    // Clear any pending leave timer
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }

    if (enterDelay > 0) {
      enterTimer.current = setTimeout(() => {
        setIsHovered(true)
      }, enterDelay)
    } else {
      setIsHovered(true)
    }
  }, [enterDelay])

  const handleMouseLeave = useCallback(() => {
    // Clear any pending enter timer
    if (enterTimer.current) {
      clearTimeout(enterTimer.current)
      enterTimer.current = null
    }

    if (leaveDelay > 0) {
      leaveTimer.current = setTimeout(() => {
        setIsHovered(false)
      }, leaveDelay)
    } else {
      setIsHovered(false)
    }
  }, [leaveDelay])

  return { isHovered, handleMouseEnter, handleMouseLeave }
}

/**
 * FR-117: Hook for managing hover state over multiple related elements
 * Used when hovering from trigger to target (like chapter → segment panel)
 */
export function useDelayedHoverValue<T>(
  enterDelay = 0,
  leaveDelay = 200
): {
  value: T | null
  setValue: (val: T | null) => void
  handleEnter: (val: T) => void
  handleLeave: () => void
  cancelPendingEnter: () => void  // FR-117: Cancel enter timer without starting leave timer
} {
  const [value, setValueState] = useState<T | null>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = useCallback((val: T) => {
    // Clear any pending leave timer
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }

    // Clear any pending enter timer (for different value)
    if (enterTimer.current) {
      clearTimeout(enterTimer.current)
      enterTimer.current = null
    }

    if (enterDelay > 0) {
      enterTimer.current = setTimeout(() => {
        setValueState(val)
      }, enterDelay)
    } else {
      setValueState(val)
    }
  }, [enterDelay])

  const handleLeave = useCallback(() => {
    // Clear any pending enter timer
    if (enterTimer.current) {
      clearTimeout(enterTimer.current)
      enterTimer.current = null
    }

    if (leaveDelay > 0) {
      leaveTimer.current = setTimeout(() => {
        setValueState(null)
      }, leaveDelay)
    } else {
      setValueState(null)
    }
  }, [leaveDelay])

  // FR-117: Cancel pending enter without affecting current value or starting leave timer
  // Used when mouse passes through an element quickly (e.g., crossing chapters to reach segment panel)
  const cancelPendingEnter = useCallback(() => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current)
      enterTimer.current = null
    }
  }, [])

  const setValue = useCallback((val: T | null) => {
    // Direct set, clear all timers
    if (enterTimer.current) {
      clearTimeout(enterTimer.current)
      enterTimer.current = null
    }
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setValueState(val)
  }, [])

  return { value, setValue, handleEnter, handleLeave, cancelPendingEnter }
}
