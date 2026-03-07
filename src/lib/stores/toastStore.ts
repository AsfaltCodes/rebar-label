import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  timeout: number;
}

let nextId = 0;

export const toasts = writable<Toast[]>([]);

export function addToast(message: string, type: Toast['type'] = 'info', timeout = 3000) {
  const id = nextId++;
  toasts.update(t => [...t, { id, message, type, timeout }]);

  if (timeout > 0) {
    setTimeout(() => {
      removeToast(id);
    }, timeout);
  }
}

export function removeToast(id: number) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}
