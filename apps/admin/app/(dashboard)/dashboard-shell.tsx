'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  Image as ImageIcon,
  Megaphone,
  Bus,
  Users,
  Store,
  ShoppingBag,
  PiggyBank,
  BarChart3,
  Settings,
  Smartphone,
  LogOut,
  Banknote,
  Droplets,
  Zap,
  CreditCard,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase';
import { cn } from '@/lib/cn';

const navGroups = [
  {
    title: 'Genel',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Pazarlama',
    items: [
      { href: '/push', label: 'Push Bildirim', icon: Bell },
      { href: '/banners', label: 'Reklam Banner', icon: ImageIcon },
      { href: '/campaigns', label: 'Kampanyalar', icon: Megaphone },
    ],
  },
  {
    title: 'Şehir Hizmetleri',
    items: [
      { href: '/transport', label: 'Otobüs / Tren', icon: Bus },
      { href: '/atms', label: "ATM'ler", icon: Banknote },
      { href: '/water-fountains', label: 'Su Vezneleri', icon: Droplets },
      { href: '/charging-stations', label: 'Şarj İstasyonları', icon: Zap },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { href: '/users', label: 'Kullanıcılar', icon: Users },
      { href: '/restaurants', label: 'Restoranlar', icon: Store },
      { href: '/orders', label: 'Siparişler', icon: ShoppingBag },
      { href: '/commissions', label: 'Komisyon & Abonelik', icon: PiggyBank },
      { href: '/payment-settings', label: 'Ödeme Ayarları', icon: CreditCard },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/reports', label: 'Raporlar', icon: BarChart3 },
      { href: '/app-versions', label: 'Versiyon Kontrol', icon: Smartphone },
      { href: '/settings', label: 'Ayarlar', icon: Settings },
    ],
  },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function onLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-6 py-6">
          <h1 className="text-lg font-bold text-slate-900">Karaman.com</h1>
          <p className="text-xs text-slate-500">Admin Paneli</p>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button onClick={onLogout} className="btn-outline w-full">
            <LogOut className="mr-2 h-4 w-4" /> Çıkış
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  );
}
