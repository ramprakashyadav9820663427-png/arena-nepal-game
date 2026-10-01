'use client';

import { useEffect } from 'react';

export default function AdminPWA() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/admin' })
        .catch((err) => console.error('Admin SW error:', err));
    }
  }, []);

  return null;
}

