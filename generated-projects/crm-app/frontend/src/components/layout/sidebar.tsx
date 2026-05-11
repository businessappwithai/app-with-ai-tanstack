/**
 * Sidebar Navigation Component
 *
 * Generated: 2026-05-09T16:10:52.357Z
 */

import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShoppingCart,
  Package,
  Receipt,
  Heart,
  UserCircle,
  Calendar,
  FileCheck,
  TestTube,
  Activity,
  Pill,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
  requireAdmin?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and statistics',
  },
  {
    title: 'Company',
    href: '/bus_company',
    icon: FileText,
    description: 'Manage Company',
  },
  {
    title: 'Contact',
    href: '/bus_contact',
    icon: FileText,
    description: 'Manage Contact',
  },
  {
    title: 'Deal',
    href: '/bus_deal',
    icon: FileText,
    description: 'Manage Deal',
  },
  {
    title: 'Pipeline',
    href: '/bus_pipeline',
    icon: FileText,
    description: 'Manage Pipeline',
  },
  {
    title: 'Activity',
    href: '/bus_activity',
    icon: FileText,
    description: 'Manage Activity',
  },
  {
    title: 'Note',
    href: '/bus_note',
    icon: FileText,
    description: 'Manage Note',
  },
  {
    title: 'Task',
    href: '/bus_task',
    icon: FileText,
    description: 'Manage Task',
  },
  {
    title: 'Product',
    href: '/bus_product',
    icon: Package,
    description: 'Manage Product',
  },
  {
    title: 'Quote',
    href: '/bus_quote',
    icon: FileText,
    description: 'Manage Quote',
  },
  {
    title: 'User',
    href: '/bus_user',
    icon: FileText,
    description: 'Manage User',
  },
];

const adminItems: NavItem[] = [
  {
    title: 'Dictionary',
    href: '/admin',
    icon: Database,
    description: 'Application Dictionary',
    requireAdmin: true,
  },
  {
    title: 'Field Layout',
    href: '/admin/fields',
    icon: Settings,
    description: 'Field layout editor',
    requireAdmin: true,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
    requireAdmin: true,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { isAdmin: checkIsAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = checkIsAdmin();

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-background',
        isCollapsed ? 'w-16' : 'w-64',
        'transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">my-app</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-6">
          {/* Main Navigation */}
          {!isCollapsed && (
            <div className="px-2">
              <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                Main Menu
              </p>
            </div>
          )}
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItemComponent key={item.href} item={item} isActive={pathname === item.href} isCollapsed={isCollapsed} />
            ))}
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              {!isCollapsed && (
                <div className="px-2 mt-6">
                  <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                    Administration
                  </p>
                </div>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavItemComponent key={item.href} item={item} isActive={pathname === item.href} isCollapsed={isCollapsed} />
                ))}
              </div>
            </>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavItemComponent({ item, isActive, isCollapsed }: NavItemComponentProps) {
  const Icon = item.icon;

  return (
    <Link to={item.href}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-2',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && item.title.charAt(0)}
      </Button>
    </Link>
  );
}
