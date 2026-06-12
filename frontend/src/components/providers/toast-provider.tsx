'use client';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function ToastProvider() {
  return (
    <ToastContainer
      theme="dark"
      position="top-right"
      autoClose={6000}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      className="app-audit-toast-container"
      toastClassName="app-audit-toast"
      progressClassName="app-audit-toast-progress"
    />
  );
}
