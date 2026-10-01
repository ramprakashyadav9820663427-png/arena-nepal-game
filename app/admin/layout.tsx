import type { Metadata } from 'next';
import AdminPWA from './AdminPWA';

export const metadata: Metadata = {
  title: 'Arena Admin',
  manifest: '/admin.webmanifest',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminPWA />
      {children}
    </>
  );
}

