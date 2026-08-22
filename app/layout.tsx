import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Absensi IT 26 — Mahasiswa Teknologi Informasi',
  description:
    'Sistem absensi digital untuk anggota organisasi Mahasiswa Teknologi Informasi angkatan 2026.',
  keywords: ['absensi', 'IT', 'teknologi informasi', 'mahasiswa'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
