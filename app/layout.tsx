import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { MemberAuthProvider } from '@/lib/context/MemberAuthContext';
import ChangePasswordModal from '@/components/ChangePasswordModal';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Portal IT 26 — Hub Formulir & Kegiatan Mahasiswa Teknologi Informasi',
  description:
    'Platform terpadu untuk pendataan, registrasi lomba, survey, dan kegiatan mahasiswa S1 Teknologi Informasi Angkatan 2026.',
  keywords: ['portal IT 26', 'teknologi informasi', 'formulir angkatan', 'pendataan lomba', 'kegiatan mahasiswa'],
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
