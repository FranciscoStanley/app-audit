import {
  toast,
  type Id,
  type ToastContent,
  type ToastOptions,
  type TypeOptions,
  type UpdateOptions,
} from 'react-toastify';

const DEFAULT_OPTIONS: ToastOptions = {
  position: 'top-right',
  autoClose: 6000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

function mergeOptions(options?: ToastOptions): ToastOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}

function show(type: TypeOptions, content: ToastContent, options?: ToastOptions): Id {
  return toast(content, { ...mergeOptions(options), type });
}

function updateToast(
  id: Id,
  type: TypeOptions,
  content: ToastContent,
  options?: UpdateOptions,
): void {
  toast.update(id, {
    render: content,
    type,
    isLoading: false,
    autoClose: type === 'default' ? false : 6000,
    ...options,
  });
}

export const notificationService = {
  success(content: ToastContent, options?: ToastOptions): Id {
    return show('success', content, options);
  },

  error(content: ToastContent, options?: ToastOptions): Id {
    return show('error', content, { autoClose: 8000, ...mergeOptions(options) });
  },

  warning(content: ToastContent, options?: ToastOptions): Id {
    return show('warning', content, { autoClose: 8000, ...mergeOptions(options) });
  },

  info(content: ToastContent, options?: ToastOptions): Id {
    return show('info', content, options);
  },

  loading(content: ToastContent, options?: ToastOptions): Id {
    return toast.loading(content, {
      ...mergeOptions(options),
      autoClose: false,
      closeOnClick: false,
    });
  },

  updateSuccess(id: Id, content: ToastContent, options?: UpdateOptions): void {
    updateToast(id, 'success', content, options);
  },

  updateWarning(id: Id, content: ToastContent, options?: UpdateOptions): void {
    updateToast(id, 'warning', content, options);
  },

  updateError(id: Id, content: ToastContent, options?: UpdateOptions): void {
    updateToast(id, 'error', content, options);
  },

  dismiss(id?: Id): void {
    toast.dismiss(id);
  },
};
