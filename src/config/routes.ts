
import type { Permission } from './permissions';

export const routePermissions: Record<string, Permission> = {
  // Master View
  '/dashboard': 'view_dashboard',
  '/dashboard/account-master': 'access_master_view',
  '/dashboard/account-master/company': 'manage_companies',
  '/dashboard/account-master/register-user': 'manage_users',
  '/dashboard/account-master/roles': 'manage_roles',
  '/dashboard/account-master/project': 'manage_projects',
  '/dashboard/builder-master': 'access_master_view',
  '/dashboard/builder-master/add-building': 'manage_buildings',
  '/dashboard/builder-master/add-floor': 'manage_floors',
  '/dashboard/builder-master/add-flat': 'manage_flats',
  '/dashboard/assign-work-tiles': 'manage_work_tiles',
  '/dashboard/assign-final-work-check': 'manage_work_tiles', // Assuming same permission
  '/dashboard/stock-master': 'manage_stock_master',
  '/dashboard/stock-master/new-material': 'manage_stock_master',
  '/dashboard/stock-master/new-category': 'manage_stock_master',
  '/dashboard/stock-master/material-kit': 'manage_stock_master',
  '/dashboard/stock-master/supplier': 'manage_stock_master',

  // Activity View
  '/dashboard/switch/activity': 'access_activity_view',
  '/dashboard/switch/activity/planning/other-work': 'manage_planning',
  '/dashboard/switch/activity/work-in-process/other': 'manage_work_in_process',
  '/dashboard/switch/activity/final-work': 'manage_final_work',
  
  // Billing View
  '/dashboard/switch/billing': 'access_billing_view',
  '/dashboard/switch/billing/set-work-amount/other': 'manage_billing',
  '/dashboard/switch/billing/contractor/other': 'manage_billing',
  '/dashboard/switch/billing/contractor/bills': 'manage_billing',
  '/dashboard/switch/billing/ledger': 'manage_billing',

  // Material View
  '/dashboard/switch/material': 'access_material_view',
  '/dashboard/switch/material/current-inventory': 'manage_inventory',
  '/dashboard/switch/material/indents': 'manage_indents',
  '/dashboard/switch/material/purchase-order': 'manage_purchase_orders',
  '/dashboard/switch/material/approvals': 'approve_documents',
  '/dashboard/switch/material/purchase': 'manage_grn',
  '/dashboard/switch/material/issue-to-contractor': 'manage_material_issue',
  '/dashboard/switch/material/site-transfer': 'manage_site_transfer',
  
  // Attendance View
  '/dashboard/switch/attendance': 'access_attendance_view',
};

// This function needs to handle dynamic routes like /custom/[id]
export const getRequiredPermission = (path: string): Permission | undefined => {
    if (routePermissions[path]) {
        return routePermissions[path];
    }
    // Handle dynamic routes
    if (path.startsWith('/dashboard/assign-work-tiles/custom/')) {
        return 'manage_work_tiles';
    }
    if (path.startsWith('/dashboard/switch/activity/work-in-process/update/')) {
        return 'manage_work_in_process';
    }
    if (path.startsWith('/dashboard/switch/activity/final-work/verify/')) {
        return 'manage_final_work';
    }
    // Add other dynamic route checks here
    return undefined;
};
