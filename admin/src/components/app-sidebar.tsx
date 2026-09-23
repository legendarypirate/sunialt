'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Trophy,
  ShoppingBag,
  Tags,
  LogOut,
  Activity,
  Medal,
  ListOrdered,
  Swords,
  Receipt,
  ClipboardList,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import { mn } from '@/lib/mn';

const navItems = [
  { href: '/dashboard', label: mn.dashboard, icon: LayoutDashboard },
  { href: '/users', label: mn.users, icon: Users },
  { href: '/exercises', label: mn.exercises, icon: ClipboardList },
  { href: '/workouts', label: mn.workouts, icon: Dumbbell },
  { href: '/sessions', label: mn.sessions, icon: Activity },
  { href: '/challenges', label: mn.challenges, icon: Trophy },
  { href: '/leaderboard', label: mn.leaderboard, icon: ListOrdered },
  { href: '/duels', label: mn.duels, icon: Swords },
  { href: '/products', label: mn.products, icon: ShoppingBag },
  { href: '/product-categories', label: mn.productCategories, icon: Tags },
  { href: '/orders', label: mn.orders, icon: Receipt },
  { href: '/settings', label: mn.settings, icon: Settings },
  { href: '/badges', label: mn.badges, icon: Medal },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <div>
          <p className="text-lg font-bold tracking-tight">SUNIA</p>
          <p className="text-xs text-muted-foreground">{mn.adminPanel}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{mn.management}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="mb-2 truncate text-sm font-medium">{admin?.name}</div>
        <div className="mb-3 truncate text-xs text-muted-foreground">{admin?.email}</div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut />
              <span>{mn.logout}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
