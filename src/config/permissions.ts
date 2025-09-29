
export type Permission =
  | 'full_access'
  | 'view_dashboard'
  | 'access_master_view'
  | 'access_activity_view'
  | 'access_billing_view'
  | 'access_material_view'
  | 'access_attendance_view'
  | 'manage_companies'
  | 'manage_users'
  | 'manage_projects'
  | 'manage_roles'
  | 'manage_buildings'
  | 'manage_floors'
  | 'manage_flats'
  | 'manage_work_tiles'
  | 'manage_stock_master'
  | 'manage_planning'
  | 'manage_work_in_process'
  | 'manage_final_work'
  | 'manage_billing'
  | 'manage_inventory'
  | 'manage_purchase_orders'
  | 'manage_indents'
  | 'approve_documents'
  | 'manage_grn'
  | 'manage_material_issue'
  | 'manage_site_transfer'
  | 'manage_attendance';

export const permissionGroups: { category: string; permissions: { id: Permission; label: string }[] }[] = [
    {
        category: 'Global Access',
        permissions: [
            { id: 'full_access', label: 'Full Access (Grants all permissions)' },
            { id: 'view_dashboard', label: 'View Main Dashboard' },
        ],
    },
    {
        category: 'View Access',
        permissions: [
            { id: 'access_master_view', label: 'Access Master View' },
            { id: 'access_activity_view', label: 'Access Activity View' },
            { id: 'access_billing_view', label: 'Access Billing View' },
            { id: 'access_material_view', label: 'Access Material View' },
            { id: 'access_attendance_view', label: 'Access Attendance View' },
        ],
    },
    {
        category: 'Master Management',
        permissions: [
            { id: 'manage_companies', label: 'Manage Companies' },
            { id: 'manage_users', label: 'Manage Users' },
            { id: 'manage_projects', label: 'Manage Projects' },
            { id: 'manage_roles', label: 'Manage Roles' },
            { id: 'manage_buildings', label: 'Manage Buildings' },
            { id: 'manage_floors', label: 'Manage Floors' },
            { id: 'manage_flats', label: 'Manage Flats' },
            { id: 'manage_work_tiles', label: 'Manage Work Tiles' },
            { id: 'manage_stock_master', label: 'Manage Stock Master' },
        ],
    },
    {
        category: 'Activity Management',
        permissions: [
            { id: 'manage_planning', label: 'Manage Planning' },
            { id: 'manage_work_in_process', label: 'Manage Work in Process' },
            { id: 'manage_final_work', label: 'Manage Final Work' },
        ],
    },
    {
        category: 'Material & Store Management',
        permissions: [
            { id: 'manage_inventory', label: 'Manage Inventory' },
            { id: 'manage_purchase_orders', label: 'Manage Purchase Orders' },
            { id: 'manage_indents', label: 'Manage Indents' },
            { id: 'approve_documents', label: 'Approve POs & Indents' },
            { id: 'manage_grn', label: 'Manage GRN' },
            { id: 'manage_material_issue', label: 'Manage Material Issues' },
            { id: 'manage_site_transfer', label: 'Manage Site Transfers' },
        ],
    },
    {
        category: 'Billing & Attendance',
        permissions: [
            { id: 'manage_billing', label: 'Manage Billing' },
            { id: 'manage_attendance', label: 'Manage Attendance' },
        ]
    }
];

export const allPermissions = permissionGroups.flatMap(g => g.permissions).map(p => p.id);
