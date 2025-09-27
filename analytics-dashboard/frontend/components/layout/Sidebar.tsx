'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Settings,
  Home,
  DollarSign,
  Bell,
  Menu,
  X,
  Activity,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/', icon: Home, current: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, current: false },
  { name: 'Users', href: '/users', icon: Users, current: false },
  { name: 'Providers', href: '/providers', icon: DollarSign, current: false },
  { name: 'Market Trends', href: '/trends', icon: TrendingUp, current: false },
  { name: 'System Health', href: '/health', icon: Activity, current: false },
  { name: 'Alerts', href: '/alerts', icon: Bell, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
];

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-40 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card border-r border-border">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden">
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <div className="flex flex-shrink-0 items-center px-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-black" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-foreground">
                ETH Analytics
              </h1>
              <p className="text-xs text-muted-foreground">
                Powered by The Graph
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 flex-1 space-y-1 px-3">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                item.current
                  ? 'bg-white text-black shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-all duration-200',
                  item.current 
                    ? 'text-black' 
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.name}
            </a>
          ))}
        </nav>
      </div>
      
      {/* Bottom section */}
      <div className="flex-shrink-0 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black text-sm font-semibold">
              AD
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">
                Analytics v1.0
              </p>
              <p className="text-xs text-muted-foreground">
                Live Dashboard
              </p>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>
      </div>
    </div>
  );
}