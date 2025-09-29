
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Construction,
  ClipboardCheck,
  Warehouse,
  Building,
  Briefcase,
  UserPlus,
  Building2,
  ChevronDown,
  Layers,
  Home,
  PackagePlus,
  LayoutGrid,
  Truck,
  Activity,
  Receipt,
  Box,
  UserCheck,
  LayoutDashboard,
  DraftingCompass,
  TrendingUp,
  CheckCircle2,
  LogOut,
  ListChecks,
  ShoppingCart,
  ClipboardList,
  PackageCheck,
  PackageMinus,
  ArrowRightLeft,
  FileText,
  BadgeCheck,
  ShieldCheck,
  Calculator,
  HardHat,
  BookText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/config/permissions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentView, setCurrentView] = useState('Master');
  const { selectedProject, setSelectedProject, currentUser, setCurrentUser } = useAppContext();
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (!selectedProject || !currentUser) {
      router.push('/');
    }
  }, [selectedProject, currentUser, router]);

  // Sync the dropdown with the current URL path
  useEffect(() => {
    if (pathname.startsWith('/dashboard/switch')) {
      const segment = pathname.split('/')[3] || ''; // e.g., 'activity'
      const view = segment.charAt(0).toUpperCase() + segment.slice(1);
      if (['Activity', 'Billing', 'Material', 'Attendance'].includes(view)) {
        setCurrentView(view);
      } else {
        setCurrentView('Master');
      }
    } else {
      setCurrentView('Master');
    }
  }, [pathname]);


  const accountMasterSubItems = useMemo(() => [
    { href: '/dashboard/account-master/company', label: 'Company', icon: Building2, permission: 'manage_companies' },
    { href: '/dashboard/account-master/register-user', label: 'Register User', icon: UserPlus, permission: 'manage_users' },
    { href: '/dashboard/account-master/project', label: 'Project', icon: Briefcase, permission: 'manage_projects' },
    { href: '/dashboard/account-master/roles', label: 'Manage Roles', icon: ShieldCheck, permission: 'manage_roles' },
  ], []);

  const builderMasterSubItems = useMemo(() => [
    { href: '/dashboard/builder-master/add-building', label: 'Add Building', icon: Building, permission: 'manage_buildings' },
    { href: '/dashboard/builder-master/add-floor', label: 'Add Floor', icon: Layers, permission: 'manage_floors' },
    { href: '/dashboard/builder-master/add-flat', label: 'Add Flat', icon: Home, permission: 'manage_flats' },
  ], []);

  const stockMasterSubItems = useMemo(() => [
    { href: '/dashboard/stock-master/new-material', label: 'New Material', icon: PackagePlus, permission: 'manage_stock_master' },
    { href: '/dashboard/stock-master/new-category', label: 'New Category', icon: LayoutGrid, permission: 'manage_stock_master' },
    { href: '/dashboard/stock-master/material-kit', label: 'Material Kit', icon: Box, permission: 'manage_stock_master' },
    { href: '/dashboard/stock-master/supplier', label: 'Supplier', icon: Truck, permission: 'manage_stock_master' },
  ], []);
  
  const masterMenuItems = useMemo(() => [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
    { label: 'Account Master', icon: Users, subItems: accountMasterSubItems, permission: 'access_master_view' },
    { label: 'Builder Master', icon: Construction, subItems: builderMasterSubItems, permission: 'access_master_view' },
    { href: '/dashboard/assign-work-tiles', label: 'Assign Work Tiles', icon: ClipboardCheck, permission: 'manage_work_tiles' },
    { href: '/dashboard/assign-final-work-check', label: 'Assign Final Work Check', icon: ListChecks, permission: 'manage_final_work' },
    { label: 'Stock Master', icon: Warehouse, subItems: stockMasterSubItems, permission: 'manage_stock_master' },
  ], [accountMasterSubItems, builderMasterSubItems, stockMasterSubItems]);

  const activityMenuItems = useMemo(() => [
    { href: '/dashboard/switch/activity', label: 'Dashboard', icon: LayoutDashboard, permission: 'access_activity_view' },
    {
      label: 'Planning',
      icon: DraftingCompass,
      permission: 'manage_planning',
      subItems: [
        { href: '/dashboard/switch/activity/planning/rcc-work', label: 'RCC Work', icon: ListChecks, permission: 'manage_planning' },
        { href: '/dashboard/switch/activity/planning/other-work', label: 'Other Work', icon: ListChecks, permission: 'manage_planning' },
      ],
    },
    {
      label: 'Work in Process',
      icon: TrendingUp,
      permission: 'manage_work_in_process',
      subItems: [
        { href: '/dashboard/switch/activity/work-in-process/rcc', label: 'RCC WIP', icon: Building, permission: 'manage_work_in_process' },
        { href: '/dashboard/switch/activity/work-in-process/other', label: 'Other Work WIP', icon: Construction, permission: 'manage_work_in_process' },
      ],
    },
    { href: '/dashboard/switch/activity/final-work', label: 'Final Work', icon: CheckCircle2, permission: 'manage_final_work' },
    {
      label: 'Status',
      icon: Activity,
      permission: 'access_activity_view',
      subItems: [
        { href: '/dashboard/switch/activity/status/rcc', label: 'RCC Status', icon: ListChecks, permission: 'access_activity_view' },
        { href: '/dashboard/switch/activity/status/other', label: 'Other Work Status', icon: ListChecks, permission: 'access_activity_view' },
        { href: '/dashboard/switch/activity/status/flat-work-status', label: 'Flat Work Status', icon: Home, permission: 'access_activity_view' },
      ],
    },
    { href: '/dashboard/switch/activity/reports', label: 'Reports', icon: FileText, permission: 'access_activity_view' },
  ], []);

  const billingMenuItems = useMemo(() => [
    { href: '/dashboard/switch/billing', label: 'Billing Dashboard', icon: LayoutDashboard, permission: 'access_billing_view' },
    {
      label: 'Set Work Amount',
      icon: Calculator,
      permission: 'manage_billing',
      subItems: [
        { href: '/dashboard/switch/billing/set-work-amount/rcc', label: 'RCC Amount', icon: Building, permission: 'manage_billing' },
        { href: '/dashboard/switch/billing/set-work-amount/other', label: 'Other Work Amount', icon: Construction, permission: 'manage_billing' },
      ],
    },
    {
      label: 'Contractor Billing',
      icon: HardHat,
      permission: 'manage_billing',
      subItems: [
        { href: '/dashboard/switch/billing/contractor/rcc', label: 'RCC', icon: Building, permission: 'manage_billing' },
        { href: '/dashboard/switch/billing/contractor/other', label: 'Other', icon: Construction, permission: 'manage_billing' },
        { href: '/dashboard/switch/billing/contractor/bills', label: 'Bill History', icon: FileText, permission: 'manage_billing' },
      ],
    },
     {
      label: 'Inventory',
      icon: Warehouse,
      permission: 'manage_inventory',
      subItems: [
        { href: '/dashboard/switch/material/approvals', label: 'Approvals', icon: BadgeCheck, permission: 'approve_documents' },
      ],
    },
    { href: '/dashboard/switch/billing/ledger', label: 'Ledger', icon: BookText, permission: 'manage_billing' },
  ], []);
  
  const materialMenuItems = useMemo(() => [
    { href: '/dashboard/switch/material', label: 'Dashboard', icon: LayoutDashboard, permission: 'access_material_view' },
    { href: '/dashboard/switch/material/current-inventory', label: 'Current Inventory', icon: Warehouse, permission: 'manage_inventory' },
    { href: '/dashboard/switch/material/indents', label: 'Indents', icon: ClipboardList, permission: 'manage_indents' },
    { href: '/dashboard/switch/material/approvals', label: 'Approvals', icon: BadgeCheck, permission: 'approve_documents' },
    { href: '/dashboard/switch/material/purchase', label: 'GRN (In-Flow)', icon: PackageCheck, permission: 'manage_grn' },
    { href: '/dashboard/switch/material/issue-to-contractor', label: 'Issue (Out-Flow)', icon: PackageMinus, permission: 'manage_material_issue' },
    { href: '/dashboard/switch/material/site-transfer', label: 'Site Transfer', icon: ArrowRightLeft, permission: 'manage_site_transfer' },
    { href: '/dashboard/switch/material/upcoming-deliveries', label: 'Upcoming Deliveries', icon: Truck, permission: 'manage_inventory' },
    { href: '/dashboard/switch/material/reports', label: 'Reports', icon: FileText, permission: 'access_material_view' },
  ], []);

  const attendanceMenuItems = useMemo(() => [
    { href: '/dashboard/switch/attendance/mark', label: 'Mark Attendance', icon: UserCheck, permission: 'manage_attendance' },
    { href: '/dashboard/switch/attendance/reports', label: 'Reports', icon: FileText, permission: 'access_attendance_view' },
  ], []);

  const viewOptions = useMemo(() => [
    { value: 'Master', label: 'Master', permission: 'access_master_view' },
    { value: 'Activity', label: 'Activity', permission: 'access_activity_view' },
    { value: 'Billing', label: 'Billing', permission: 'access_billing_view' },
    { value: 'Material', label: 'Material', permission: 'access_material_view' },
    { value: 'Attendance', label: 'Attendance', permission: 'access_attendance_view' },
  ], []);
  
  const availableViews = useMemo(() => viewOptions.filter(v => hasPermission(v.permission as Permission)), [hasPermission, viewOptions]);

  const getMenuItems = useCallback(() => {
    switch (currentView) {
      case 'Master':
        return masterMenuItems;
      case 'Activity':
        return activityMenuItems;
      case 'Billing':
        return billingMenuItems;
      case 'Material':
        return materialMenuItems;
      case 'Attendance':
        return attendanceMenuItems;
      default:
        return masterMenuItems;
    }
  }, [currentView, masterMenuItems, activityMenuItems, billingMenuItems, materialMenuItems, attendanceMenuItems]);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    switch (view) {
      case 'Master':
        router.push('/dashboard');
        break;
      case 'Activity':
        router.push('/dashboard/switch/activity');
        break;
      case 'Billing':
        router.push('/dashboard/switch/billing');
        break;
      case 'Material':
        router.push('/dashboard/switch/material');
        break;
      case 'Attendance':
        router.push('/dashboard/switch/attendance');
        break;
      default:
        router.push('/dashboard');
    }
  };
  
  const flattenItems = (items: any[]): any[] => {
    return items.flatMap(item => (item.subItems ? [item, ...flattenItems(item.subItems)] : item));
  };
  
  const pageLabel = useMemo(() => {
    const allPossibleNavItems = flattenItems([
        ...masterMenuItems,
        ...activityMenuItems,
        ...billingMenuItems,
        ...materialMenuItems,
        ...attendanceMenuItems
    ]);
    const currentPage = allPossibleNavItems.find(i => pathname === i.href);
    return currentPage?.label || currentView || 'Dashboard';
  }, [pathname, currentView, masterMenuItems, activityMenuItems, billingMenuItems, materialMenuItems, attendanceMenuItems]);

  const hasAccessToSubItems = useCallback((items: any[]): boolean => {
    return items.some(item => 
      (item.href && hasPermission(item.permission as Permission)) || 
      (item.subItems && hasAccessToSubItems(item.subItems))
    );
  }, [hasPermission]);

  const renderNavMenu = useCallback((items: any[], isSub: boolean = false) => {
    return items
    .filter(item => {
        if(item.subItems) return hasPermission(item.permission as Permission) && hasAccessToSubItems(item.subItems)
        return hasPermission(item.permission as Permission)
    })
    .map((item) => (
      item.subItems ? (
        <SidebarMenuItem key={item.label}>
          <Collapsible className="group/collapsible" defaultOpen={hasAccessToSubItems(item.subItems) && pathname.includes(item.label.toLowerCase().replace(' ', '-'))}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="justify-between w-full" isActive={hasAccessToSubItems(item.subItems) && pathname.includes(item.label.toLowerCase().replace(' ', '-'))} tooltip={item.label}>
                <div className="flex items-center gap-2">
                  <item.icon />
                  <span>{item.label}</span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:-rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {renderNavMenu(item.subItems, true)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label} size={isSub ? "sm" : "default"}>
            <Link href={item.href!}>
              {item.icon && <item.icon />}
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    ))
  }, [hasPermission, hasAccessToSubItems, pathname]);
  
  const handleLogout = () => {
    setSelectedProject(null);
    setCurrentUser(null);
    router.push('/');
  }

  if (!selectedProject || !currentUser) {
    return null; // Or a loading spinner while redirecting
  }

  return (
    <SidebarProvider>
      <Sidebar className="print:hidden">
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center p-2">
            <Image
              src="/logo.png"
              width={150}
              height={60}
              alt="KCC Logo"
              data-ai-hint="company logo"
              className="object-contain duration-200 group-data-[collapsible=icon]:hidden"
            />
            <Image
              src="/logo.png"
              width={32}
              height={32}
              alt="KCC Icon"
              data-ai-hint="logo monogram"
              className="hidden object-contain group-data-[collapsible=icon]:block"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {renderNavMenu(getMenuItems())}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto">
          <Separator className="my-2" />
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <div className='flex items-center gap-4'>
            <SidebarTrigger />
            <Select value={currentView} onValueChange={handleViewChange}>
              <SelectTrigger className="w-[180px]">
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  {availableViews.map(view => (
                    <SelectItem key={view.value} value={view.value}>{view.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <h1 className="font-semibold">{pageLabel}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{selectedProject}</span>
            </div>
          </div>
        </header>
        <main className="p-6 print:p-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
