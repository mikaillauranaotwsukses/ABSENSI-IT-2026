import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { MemberAuthProvider } from '@/lib/context/MemberAuthContext';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

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
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <MemberAuthProvider>
          {children}
          <ChangePasswordModal />
        </MemberAuthProvider>
      </body>
    </html>
  );
}
