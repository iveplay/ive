import { InputHTMLAttributes, useEffect, useRef } from 'react'
import styles from './RangeSlider.module.scss'

interface RangeSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  className?: string
}

const updateRangeFill = (target: HTMLInputElement | null) => {
  if (target) {
    const min = parseFloat(target.min) || 0
    const max = parseFloat(target.max) || 100
    const val = parseFloat(target.value) || 0
    const percentage = ((val - min) / (max - min)) * 100
    target.style.setProperty('--value', `${percentage}%`)
    target.setAttribute('aria-valuenow', val.toString())
  }
}

export const RangeSlider = ({
  className = '',
  onInput,
  ...props
}: RangeSliderProps) => {
  const localRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    updateRangeFill(localRef.current)
  }, [props.value])

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRangeFill(event.target)
    onInput?.(event)
  }

  return (
    <div className={`${styles.progressContainer} ${className}`}>
      <div className={styles.progressArea}>
        <input
          ref={localRef}
          type='range'
          className={styles.inputRange}
          onInput={handleInput}
          {...props}
        />
      </div>
    </div>
  )
}
