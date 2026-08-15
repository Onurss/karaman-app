'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
} from '@/components/ui';
import { useSupabase } from '@/lib/hooks/use-supabase';
import { BRAND } from '@karaman/utils';

const ADMIN_VERSION = '0.1.0';

export default function SettingsPage() {
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
      setName((data.user?.user_metadata?.full_name as string) ?? '');
    });
  }, [supabase]);

  const handleUpdateProfile = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profil güncellendi.');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      toast.warning('Şifre en az 8 karakter olmalı.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Şifre güncellendi.');
      setNewPassword('');
    }
  };

  return (
    <div>
      <PageHeader title="Ayarlar" description="Hesap ayarları ve sistem bilgileri." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hesap Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="E-posta" value={email} disabled />
            <Input label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={handleUpdateProfile}>Kaydet</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Şifre Değiştir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Yeni şifre"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="En az 8 karakter"
            />
            <Button onClick={handleUpdatePassword}>Şifreyi Güncelle</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sistem Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Uygulama</p>
                <p className="font-medium">{BRAND.name} Admin Paneli</p>
              </div>
              <div>
                <p className="text-gray-500">Sürüm</p>
                <p className="font-mono">v{ADMIN_VERSION}</p>
              </div>
              <div>
                <p className="text-gray-500">Geliştirici</p>
                <p className="font-medium">{BRAND.developer}</p>
              </div>
              <div>
                <p className="text-gray-500">İletişim</p>
                <p>{BRAND.developerEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
