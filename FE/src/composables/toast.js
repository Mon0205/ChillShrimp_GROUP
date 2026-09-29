import { reactive } from 'vue'

const toast = reactive({ visible: false, message: '', color: 'success' })
let reopenTimer

export function showToast(message, type = 'success') {
  if (!message) return
  clearTimeout(reopenTimer)
  toast.visible = false
  toast.message = message
  toast.color = { error: 'error', warning: 'warning', info: 'info', success: 'success' }[type] || 'success'
  reopenTimer = setTimeout(() => { toast.visible = true }, 20)
}

export function useToast() { return toast }
