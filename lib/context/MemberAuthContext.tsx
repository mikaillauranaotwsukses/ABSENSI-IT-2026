'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Anggota } from '@/lib/types';

interface MemberAuthContextType {
  member: Anggota | null;
  loading: boolean;
  loginMember: (nrp: string, pass: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; memberData?: Anggota }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  logoutMember: () => void;
  showChangePasswordModal: boolean;
  setShowChangePasswordModal: (v: boolean) => void;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [member, setMember] = useState<Anggota | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('absensi_member_session');
      if (saved) {
        setMember(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse member session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginMember = async (inputNrp: string, inputPass: string) => {
    const cleanNrp = inputNrp.trim();

    if (!cleanNrp) {
      return { success: false, error: 'Masukkan NRP Anda.' };
    }
    if (!inputPass) {
      return { success: false, error: 'Masukkan Password Anda.' };
    }

    try {
      // Fetch member from database
      const { data, error } = await supabase
        .from('anggota')
        .select('*')
        .eq('nrp', cleanNrp)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'NRP tidak ditemukan dalam database anggota.' };
      }

      const dbPassHash = data.password_hash;
      const mustChange = data.must_change_password ?? true;

      // Default valid passwords if not set in DB: nrp (case-insensitive) or absensi2026
      const isValidPassword =
        !dbPassHash
          ? (inputPass === cleanNrp || inputPass.toLowerCase() === cleanNrp.toLowerCase() || inputPass === 'absensi2026')
          : (inputPass === dbPassHash);

      if (!isValidPassword) {
        return { success: false, error: 'Password salah. Password bawaan pertama kali adalah NRP Anda atau "absensi2026".' };
      }

      const memberObj: Anggota = {
        nrp: data.nrp,
        nama: data.nama,
        program_studi: data.program_studi,
        must_change_password: mustChange,
      };

      if (mustChange) {
        setMember(memberObj);
        setShowChangePasswordModal(true);
        return { success: true, mustChangePassword: true, memberData: memberObj };
      }

      setMember(memberObj);
      localStorage.setItem('absensi_member_session', JSON.stringify(memberObj));
      return { success: true, mustChangePassword: false, memberData: memberObj };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Terjadi kesalahan saat login.' };
    }
  };

  const changePassword = async (newPass: string) => {
    if (!member) return { success: false, error: 'Sesi login tidak ditemukan.' };
    if (!newPass || newPass.length < 4) {
      return { success: false, error: 'Password baru minimal 4 karakter.' };
    }

    try {
      // Gunakan API route server-side agar bypass RLS Supabase
      const res = await fetch('/api/member/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp: member.nrp, newPassword: newPass }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.message || 'Gagal menyimpan password baru.' };
      }

      // Simpan sesi baru ke localStorage setelah DB sukses
      const updatedMember: Anggota = {
        ...member,
        must_change_password: false,
      };

      setMember(updatedMember);
      localStorage.setItem('absensi_member_session', JSON.stringify(updatedMember));
      setShowChangePasswordModal(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal memperbarui password.' };
    }
  };

  const logoutMember = () => {
    setMember(null);
    localStorage.removeItem('absensi_member_session');
  };

  return (
    <MemberAuthContext.Provider
      value={{
        member,
        loading,
        loginMember,
        changePassword,
        logoutMember,
        showChangePasswordModal,
        setShowChangePasswordModal,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error('useMemberAuth must be used within MemberAuthProvider');
  }
  return context;
}
