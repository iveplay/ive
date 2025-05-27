import styles from './Controls.module.scss'

type ControlsProps = {
  show: boolean
  onClose: () => void
  onHover: () => void
}

export const Controls = ({ show, onClose, onHover }: ControlsProps) => {
  return <div className={styles.controls}></div>
}
