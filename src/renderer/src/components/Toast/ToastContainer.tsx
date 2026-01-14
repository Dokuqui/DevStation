import { JSX } from 'react'
import { useToastStore } from '../../store/useToastStore'
import styles from './ToastContainer.module.scss'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === 'success' && <CheckCircle size={20} className={styles.icon} />}
          {toast.type === 'error' && <AlertCircle size={20} className={styles.icon} />}
          {toast.type === 'info' && <Info size={20} className={styles.icon} />}

          <div className={styles.content}>
            <p>{toast.message}</p>
          </div>

          <button onClick={() => removeToast(toast.id)} className={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
