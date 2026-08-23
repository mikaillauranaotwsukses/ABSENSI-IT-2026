import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MemberAuthProvider } from '@/lib/context/MemberAuthContext';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Absensi IT 26 — Mahasiswa Teknologi Informasi',
  description:
    'Sistem absensi digital untuk anggota organisasi Mahasiswa Teknologi Informasi angkatan 2026.',
  keywords: ['absensi', 'IT', 'teknologi informasi', 'mahasiswa'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <MemberAuthProvider>
          {children}
          <ChangePasswordModal />
        </MemberAuthProvider>
      </body>
    </html>
  );
}
