
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import * as z from 'zod';
import { Permission, allPermissions } from '@/config/permissions';

export const companyFormSchema = z.object({
  id: z.string(),
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  email: z.string().email('Invalid email address'),
  gstNo: z
    .string()
    .min(1, 'GST number is required')
    .length(15, 'GST number must be 15 characters'),
  contactNo: z
    .string()
    .min(1, 'Contact number is required')
    .regex(/^\d{10}$/, 'Contact number must be 10 digits'),
});

export type CompanyData = z.infer<typeof companyFormSchema>;

export const userFormObject = z.object({
  id: z.string().min(1, 'ID is required.'),
  fullName: z.string().min(1, 'Full name is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender.',
  }),
  phoneNo: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  address: z.string().min(1, 'Address is required'),
  role: z.string().min(1, "Please select a role."),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  projects: z.array(z.string()).min(1, 'Please select at least one project.'),
});

export const userFormSchema = userFormObject.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }
);

export type UserData = z.infer<typeof userFormSchema>;

export const roleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Role name is required'),
  permissions: z.array(z.enum(allPermissions as [Permission, ...Permission[]])),
});
export type RoleData = z.infer<typeof roleSchema>;

export const projectFormSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  area: z.string().min(1, 'Area in Sq.Ft. is required'),
  company: z.string({ required_error: 'Please select a company.' }),
  category: z.string({ required_error: 'Please select a category.' }),
  reraRegistration: z.string().min(1, 'RERA Registration is required'),
  address: z.string().min(1, 'Address is required'),
  siteManager: z.string({ required_error: 'Please select a site manager.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  tentativeEndDate: z.date({
    required_error: 'Tentative end date is required.',
  }),
});

export type ProjectData = z.infer<typeof projectFormSchema>;

export const buildingFormSchema = z.object({
  buildingName: z.string().min(1, 'Building name is required'),
  buildupArea: z.string().min(1, 'Buildup area is required'),
  projectName: z.string(),
});

export type BuildingData = z.infer<typeof buildingFormSchema>;

export const floorFormSchema = z.object({
  projectName: z.string(),
  buildingName: z.string({ required_error: 'Please select a building.' }),
  floorName: z.string().min(1, 'Floor name is required'),
});

export type FloorData = z.infer<typeof floorFormSchema>;

export const flatFormSchema = z.object({
  projectName: z.string(),
  buildingName: z.string({ required_error: 'Please select a building.' }),
  floorName: z.string({ required_error: 'Please select a floor.' }),
  type: z.string({ required_error: 'Please select a type.' }),
  flatNo: z.string().min(1, 'Flat number is required'),
  area: z.string().min(1, 'Area is required'),
  halls: z.string().min(1, 'Number of halls is required'),
  bedrooms: z.string().min(1, 'Number of bedrooms is required'),
  kitchens: z.string().min(1, 'Number of kitchens is required'),
  bathrooms: z.string().min(1, 'Number of bathrooms is required'),
  toilets: z.string().min(1, 'Number of toilets is required'),
  balconies: z.string().min(1, 'Number of balconies is required'),
});

export type FlatData = z.infer<typeof flatFormSchema>;

export const projectCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});
export type ProjectCategoryData = z.infer<typeof projectCategorySchema>;

const customTaskSchema = z.array(z.object({
    id: z.string(),
    label: z.string().min(1, "Task label cannot be empty."),
    checked: z.boolean().default(false)
  })).optional();

export const workTileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Tile name is required'),
  tasks: z.array(z.object({ id: z.string(), label: z.string() })).optional(), // To hold all possible tasks
});
export type WorkTileData = z.infer<typeof workTileSchema>;

export const checklistPointSchema = z.object({
  id: z.string(),
  point: z.string().min(1, 'Checklist point cannot be empty.'),
});
export type ChecklistPoint = z.infer<typeof checklistPointSchema>;


export const customWorkDataSchema = z.object({
  projectName: z.string(),
  buildingName: z.string({ required_error: 'Please select a building.' }),
  customTasks: customTaskSchema,
  workTileId: z.string(),
});
export type CustomWorkData = z.infer<typeof customWorkDataSchema>;

export const newCategoryFormSchema = z.object({
  categoryName: z.string().min(1, 'Category name is required'),
});
export type CategoryData = z.infer<typeof newCategoryFormSchema>;

export const supplierFormSchema = z.object({
  id: z.string(),
  supplierName: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  phoneNo: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  gstNo: z.string().length(15, 'GST number must be 15 characters'),
  supplierType: z.array(z.string()).min(1, 'Please select at least one supplier type.'),
});
export type SupplierData = z.infer<typeof supplierFormSchema>;

export const newMaterialFormSchema = z.object({
  id: z.string(),
  materialName: z.string().min(1, 'Material name is required'),
  category: z.string({ required_error: 'Please select a category.' }),
  unit: z.string({ required_error: 'Please select a unit.' }),
  supplier: z.string({ required_error: 'Please select a supplier.' }),
  gstRate: z.string({ required_error: 'Please select a GST rate.' }),
});
export type NewMaterialData = z.infer<typeof newMaterialFormSchema>;

export const materialKitItemSchema = z.object({
  materialName: z.string().min(1, "Material name is required."),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
});
export type MaterialKitItem = z.infer<typeof materialKitItemSchema>;

export const materialKitSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Kit name is required."),
  items: z.array(materialKitItemSchema).min(1, "A kit must have at least one material."),
});
export type MaterialKitData = z.infer<typeof materialKitSchema>;

export const photoWithMetaSchema = z.object({
  dataUri: z.string(),
  timestamp: z.date(),
});
export type PhotoWithMetaData = z.infer<typeof photoWithMetaSchema>;

export const updateLogSchema = z.object({
  date: z.date(),
  progress: z.number(),
  description: z.string().optional(),
  photos: z.array(photoWithMetaSchema).optional(),
  updatedBy: z.string(),
});
export type UpdateLogData = z.infer<typeof updateLogSchema>;

const extraWorkTaskSchema = z.object({
    id: z.string(),
    taskDescription: z.string().min(1, 'Task description is required.'),
    rate: z.coerce.number().positive('A positive rate is required.'),
    progress: z.number().min(0).max(100),
    finalCheckStatus: z.enum(['pending', 'approved', 'rejected']),
    updates: z.array(updateLogSchema).optional(),
    rejectionRemark: z.string().optional(),
    billed: z.boolean().optional(),
});
export type ExtraWorkTaskData = z.infer<typeof extraWorkTaskSchema>;


export const extraWorkPlanSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  createdAt: z.date(),
  contractorName: z.string({ required_error: 'Please select a contractor.' }),
  tasks: z.array(extraWorkTaskSchema),
  buildingName: z.string().optional(), // For context, even if empty
  flatNo: z.string().optional(), // For context, even if empty
});
export type ExtraWorkData = z.infer<typeof extraWorkPlanSchema>;


export const flatWiseTaskSchema = z.object({
  flatNo: z.string(),
  type: z.string(),
  tasks: z.record(
    z.object({
      progress: z.number().min(0).max(100).default(0),
      updates: z.array(updateLogSchema).optional(),
      billed: z.boolean().optional(),
      finalCheckStatus: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
      checklistResults: z.record(z.boolean()).optional(),
      rejectionRemark: z.string().optional(),
    })
  ),
});

export const workPlanSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date(),
  buildingName: z.string(),
  contractorName: z.string(),
  workTile: z.string(),
  flatPlans: z.array(flatWiseTaskSchema),
});

export type WorkPlanData = z.infer<typeof workPlanSchema>;

export const workRateSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  buildingName: z.string(),
  workTileId: z.string(),
  taskId: z.string(),
  contractorName: z.string(),
  flatType: z.string(),
  rate: z.coerce.number().min(0, 'Rate must be zero or a positive number.'),
});
export type WorkRateData = z.infer<typeof workRateSchema>;

// Schemas for Store Management
const poStatus = z.enum(['Pending', 'Approved', 'Rejected', 'Partially Received', 'Completed']);
const indentStatus = z.enum(['Pending', 'Approved', 'Rejected']);
const transferStatus = z.enum(['In Transit', 'Partially Received', 'Completed']);

export const poItemSchema = z.object({
  materialName: z.string(),
  quantity: z.number().positive(),
  rate: z.number().positive(),
});
export type POItem = z.infer<typeof poItemSchema>;

export const purchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  supplierName: z.string(),
  date: z.date(),
  expectedDeliveryDate: z.date(),
  items: z.array(poItemSchema),
  status: poStatus,
  projectName: z.string(),
});
export type PurchaseOrderData = z.infer<typeof purchaseOrderSchema>;

export const indentItemSchema = z.object({
  materialName: z.string(),
  quantity: z.number().positive(),
});
export type IndentItem = z.infer<typeof indentItemSchema>;

export const indentSchema = z.object({
  id: z.string(),
  indentNumber: z.string(),
  requestingProject: z.string(),
  date: z.date(),
  items: z.array(indentItemSchema),
  status: indentStatus,
  poCreated: z.boolean().optional(),
});
export type IndentData = z.infer<typeof indentSchema>;

export const inventoryItemSchema = z.object({
  materialName: z.string(),
  category: z.string(),
  unit: z.string(),
  currentStock: z.number().default(0),
  project: z.string(),
});
export type InventoryData = z.infer<typeof inventoryItemSchema>;

export const grnItemSchema = z.object({
  materialName: z.string(),
  orderedQuantity: z.number(),
  receivedQuantity: z.number(),
});
export type GRNItemData = z.infer<typeof grnItemSchema>;

export const grnSchema = z.object({
  id: z.string(),
  grnNumber: z.string(),
  sourceId: z.string(),
  sourceType: z.enum(['PO', 'Transfer']),
  sourceNumber: z.string(),
  supplierName: z.string(),
  date: z.date(),
  items: z.array(grnItemSchema),
  remarks: z.string().optional(),
  photos: z.array(z.string()).optional(), // Array of data URIs
  projectName: z.string(),
});
export type GRNData = z.infer<typeof grnSchema>;

export const issueRecordItemSchema = z.object({
  materialName: z.string(),
  quantity: z.number(),
});
export type IssueRecordItemData = z.infer<typeof issueRecordItemSchema>;

export const issueRecordSchema = z.object({
  id: z.string(),
  date: z.date(),
  contractorName: z.string(),
  buildingName: z.string(),
  flatNo: z.string(),
  items: z.array(issueRecordItemSchema),
  remarks: z.string().optional(),
  projectName: z.string(),
});
export type IssueRecordData = z.infer<typeof issueRecordSchema>;

export const siteTransferItemSchema = z.object({
  materialName: z.string(),
  quantity: z.number(),
  rate: z.number(), // Rate is always 0 for transfers, but needed for type consistency
});
export type SiteTransferItemData = z.infer<typeof siteTransferItemSchema>;

export const siteTransferSchema = z.object({
  id: z.string(),
  transferNumber: z.string(),
  date: z.date(),
  fromProject: z.string(),
  toProject: z.string(),
  items: z.array(siteTransferItemSchema),
  status: transferStatus,
  remarks: z.string().optional(),
});
export type SiteTransferData = z.infer<typeof siteTransferSchema>;


// Schemas for Billing
export const billedItemSchema = z.object({
  planId: z.string(),
  workTile: z.string(),
  flatNo: z.string(),
  taskId: z.string(),
  taskLabel: z.string(),
  rate: z.number(),
  photos: z.array(z.string()).optional(),
});
export type BilledItemData = z.infer<typeof billedItemSchema>;

export const contractorBillSchema = z.object({
  id: z.string(),
  billNumber: z.string(),
  contractorName: z.string(),
  projectName: z.string(),
  date: z.date(),
  billedItems: z.array(billedItemSchema),
  totalAmount: z.number(),
  advancePayment: z.number(),
  penalty: z.number(),
  holdAmount: z.number(),
  netPayable: z.number(),
});
export type ContractorBillData = z.infer<typeof contractorBillSchema>;

export const holdReleaseSchema = z.object({
  id: z.string(),
  contractorName: z.string(),
  projectName: z.string(),
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});
export type HoldReleaseData = z.infer<typeof holdReleaseSchema>;

export const advancePaymentSchema = z.object({
  id: z.string(),
  contractorName: z.string(),
  projectName: z.string(),
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});
export type AdvancePaymentData = z.infer<typeof advancePaymentSchema>;

// Schemas for Attendance
export const companyLaborSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Laborer name is required.'),
  phoneNo: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  wages: z.coerce.number().min(0, 'Daily wages must be a positive number.'),
});
export type CompanyLaborData = z.infer<typeof companyLaborSchema>;

const laborCountSchema = z.object({
    mistri: z.number().min(0).default(0),
    helper: z.number().min(0).default(0),
    female: z.number().min(0).default(0),
});

export const contractorAttendanceSchema = z.object({
    id: z.string(),
    projectName: z.string(),
    date: z.date(),
    contractorName: z.string(),
    laborCount: laborCountSchema,
});
export type ContractorAttendanceData = z.infer<typeof contractorAttendanceSchema>;

export const contractorRateSchema = z.object({
    projectName: z.string(),
    contractorName: z.string(),
    rates: laborCountSchema.omit({ mistri: true, helper: true, female: true }).extend({
        mistri: z.number().min(0).default(0),
        helper: z.number().min(0).default(0),
        female: z.number().min(0).default(0),
    })
});
export type ContractorRateData = z.infer<typeof contractorRateSchema>;


export const companyAttendanceSchema = z.object({
    id: z.string(),
    projectName: z.string(),
    date: z.date(),
    attendance: z.record(z.enum(['Present', 'Absent', 'Half Day'])), // Key is company laborer id
});
export type CompanyAttendanceData = z.infer<typeof companyAttendanceSchema>;

// Ledger Entry Type
export type LedgerEntry = {
  id: string;
  date: Date;
  partyName: string;
  partyType: 'Contractor' | 'Supplier';
  description: string;
  debit: number;
  credit: number;
};


interface AppContextType {
  users: UserData[];
  setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
  companies: CompanyData[];
  setCompanies: React.Dispatch<React.SetStateAction<CompanyData[]>>;
  projects: ProjectData[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  buildings: BuildingData[];
  setBuildings: React.Dispatch<React.SetStateAction<BuildingData[]>>;
  floors: FloorData[];
  setFloors: React.Dispatch<React.SetStateAction<FloorData[]>>;
  flats: FlatData[];
  setFlats: React.Dispatch<React.SetStateAction<FlatData[]>>;
  flatTypes: string[];
  setFlatTypes: React.Dispatch<React.SetStateAction<string[]>>;
  workTiles: WorkTileData[];
  setWorkTiles: React.Dispatch<React.SetStateAction<WorkTileData[]>>;
  allWorkData: CustomWorkData[];
  setAllWorkData: React.Dispatch<React.SetStateAction<CustomWorkData[]>>;
  materials: NewMaterialData[];
  setMaterials: React.Dispatch<React.SetStateAction<NewMaterialData[]>>;
  categories: CategoryData[];
  setCategories: React.Dispatch<React.SetStateAction<CategoryData[]>>;
  suppliers: SupplierData[];
  setSuppliers: React.Dispatch<React.SetStateAction<SupplierData[]>>;
  projectCategories: ProjectCategoryData[];
  setProjectCategories: React.Dispatch<React.SetStateAction<ProjectCategoryData[]>>;
  selectedProject: string | null;
  setSelectedProject: React.Dispatch<React.SetStateAction<string | null>>;
  currentUser: UserData | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserData | null>>;
  currentUserPermissions: Permission[];
  workPlans: WorkPlanData[];
  setWorkPlans: React.Dispatch<React.SetStateAction<WorkPlanData[]>>;
  extraWorkPlans: ExtraWorkData[];
  setExtraWorkPlans: React.Dispatch<React.SetStateAction<ExtraWorkData[]>>;
  roles: RoleData[];
  setRoles: React.Dispatch<React.SetStateAction<RoleData[]>>;
  purchaseOrders: PurchaseOrderData[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrderData[]>>;
  indents: IndentData[];
  setIndents: React.Dispatch<React.SetStateAction<IndentData[]>>;
  inventory: InventoryData[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryData[]>>;
  workRates: WorkRateData[];
  setWorkRates: React.Dispatch<React.SetStateAction<WorkRateData[]>>;
  contractorBills: ContractorBillData[];
  setContractorBills: React.Dispatch<React.SetStateAction<ContractorBillData[]>>;
  holdReleases: HoldReleaseData[];
  setHoldReleases: React.Dispatch<React.SetStateAction<HoldReleaseData[]>>;
  advancePayments: AdvancePaymentData[];
  setAdvancePayments: React.Dispatch<React.SetStateAction<AdvancePaymentData[]>>;
  defaultTasksByTile: Record<string, { id: string; label: string }[]>;
  finalChecklists: Record<string, Record<string, ChecklistPoint[]>>;
  setFinalChecklists: React.Dispatch<React.SetStateAction<Record<string, Record<string, ChecklistPoint[]>>>>;
  materialKits: MaterialKitData[];
  setMaterialKits: React.Dispatch<React.SetStateAction<MaterialKitData[]>>;
  grns: GRNData[];
  setGrns: React.Dispatch<React.SetStateAction<GRNData[]>>;
  issueRecords: IssueRecordData[];
  setIssueRecords: React.Dispatch<React.SetStateAction<IssueRecordData[]>>;
  siteTransfers: SiteTransferData[];
  setSiteTransfers: React.Dispatch<React.SetStateAction<SiteTransferData[]>>;
  contractorAttendance: ContractorAttendanceData[];
  setContractorAttendance: React.Dispatch<React.SetStateAction<ContractorAttendanceData[]>>;
  companyLaborers: CompanyLaborData[];
  setCompanyLaborers: React.Dispatch<React.SetStateAction<CompanyLaborData[]>>;
  companyAttendance: CompanyAttendanceData[];
  setCompanyAttendance: React.Dispatch<React.SetStateAction<CompanyAttendanceData[]>>;
  contractorRates: ContractorRateData[];
  setContractorRates: React.Dispatch<React.SetStateAction<ContractorRateData[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [companies, setCompanies] = useState<CompanyData[]>([
      {
        id: 'comp-kcc',
        companyName: 'Kothari Construction Company',
        companyAddress: '123 KCC Lane, Pune, 411001',
        email: 'contact@kccinfrasoft.com',
        gstNo: '27ABCDE1234F1Z5',
        contactNo: '9876543210',
      }
  ]);
   const [projects, setProjects] = useState<ProjectData[]>([
    {
        projectName: 'Learning Project',
        area: '100000',
        company: 'Kothari Construction Company',
        category: 'Residential',
        reraRegistration: 'P00000000000',
        address: '123 Learning Lane, Knowledge City, 54321',
        siteManager: 'Admin User',
        startDate: new Date(),
        tentativeEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    }
  ]);
  const [roles, setRoles] = useState<RoleData[]>([
    {
      id: 'admin-role',
      name: 'Admin',
      permissions: ['full_access'],
    },
    {
      id: 'manager-role',
      name: 'Manager',
      permissions: [
        'view_dashboard', 'access_master_view', 'access_activity_view',
        'access_billing_view', 'access_material_view', 'access_attendance_view',
        'manage_users', 'manage_projects', 'manage_buildings', 'manage_floors',
        'manage_flats', 'manage_work_tiles', 'manage_planning',
        'manage_work_in_process', 'manage_final_work', 'approve_documents',
      ],
    },
     {
      id: 'user-role',
      name: 'User',
      permissions: ['view_dashboard', 'access_activity_view'],
    },
  ]);
  const [users, setUsers] = useState<UserData[]>([
    {
      id: 'user-admin',
      fullName: 'Admin User',
      gender: 'male',
      phoneNo: '1234567890',
      address: 'KCC Office, Pune',
      role: 'Admin',
      password: 'password123',
      confirmPassword: 'password123',
      projects: ['Learning Project']
    },
    {
      id: 'user-manager',
      fullName: 'Manager User',
      gender: 'female',
      phoneNo: '9876543210',
      address: 'KCC Office, Pune',
      role: 'Manager',
      password: 'password123',
      confirmPassword: 'password123',
      projects: ['Learning Project']
    },
    {
      id: 'user-regular',
      fullName: 'Regular User',
      gender: 'male',
      phoneNo: '8765432109',
      address: 'KCC Site Office, Pune',
      role: 'User',
      password: 'password123',
      confirmPassword: 'password123',
      projects: ['Learning Project']
    }
  ]);
  const [buildings, setBuildings] = useState<BuildingData[]>([
    {
      buildingName: 'A1',
      buildupArea: '50000',
      projectName: 'Learning Project',
    },
  ]);
  const [floors, setFloors] = useState<FloorData[]>([
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'First Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Second Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Third Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Fourth Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Fifth Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Sixth Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Seventh Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Eighth Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Ninth Floor' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Tenth Floor' },
  ]);
  const [flats, setFlats] = useState<FlatData[]>([
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'First Floor', type: '1BHK', flatNo: '101', area: '800', halls: '1', bedrooms: '1', kitchens: '1', bathrooms: '1', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Second Floor', type: '2BHK', flatNo: '201', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Third Floor', type: '3BHK', flatNo: '301', area: '1500', halls: '1', bedrooms: '3', kitchens: '1', bathrooms: '3', toilets: '2', balconies: '2' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Fourth Floor', type: '2BHK', flatNo: '401', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Fifth Floor', type: '2BHK', flatNo: '501', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Sixth Floor', type: '2BHK', flatNo: '601', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Seventh Floor', type: '2BHK', flatNo: '701', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Eighth Floor', type: '2BHK', flatNo: '801', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Ninth Floor', type: '2BHK', flatNo: '901', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
    { projectName: 'Learning Project', buildingName: 'A1', floorName: 'Tenth Floor', type: '2BHK', flatNo: '1001', area: '1200', halls: '1', bedrooms: '2', kitchens: '1', bathrooms: '2', toilets: '1', balconies: '1' },
  ]);
  const [flatTypes, setFlatTypes] = useState<string[]>(['1BHK', '2BHK', '3BHK', '4BHK', 'Shop']);
  const defaultTasksByTile: Record<string, { id: string; label: string }[]> = {
    'electrical-work': [
        { id: 'slab-piping', label: 'Slab Piping' },
        { id: 'ziri-cutting', label: 'Ziri Cutting+Pipe fitting' },
        { id: 'conselled-box', label: 'Conselled box fitting' },
        { id: 'switch-plate', label: 'Switch Plate fitting' },
        { id: 'block-wiring', label: 'Block Wiring' },
        { id: 'testing-repair', label: 'Testing Repair & Finish' },
        { id: 'final-testing', label: 'Final Testing' },
    ],
    'electrical-line': [
        { id: 'pipe-fitting', label: 'Block to parking meter panel pipe fitting' },
        { id: 'wiring', label: 'Block to parking meter panel wiring' },
        { id: 'panel-fitting', label: 'Block Panel Fitting' },
        { id: 'testing', label: 'Testing' },
    ],
  };
  const [workTiles, setWorkTiles] = useState<WorkTileData[]>([
    { id: 'electrical-work', name: 'Electrical Work', tasks: defaultTasksByTile['electrical-work'] },
    { id: 'electrical-line', name: 'Electrical Line', tasks: defaultTasksByTile['electrical-line'] },
    { id: 'inside-plaster-gypsum', name: 'Inside plaster / Gypsum', tasks: [] },
    { id: 'plumbing-work', name: 'Plumbing Work', tasks: [] },
    { id: 'waterproofing', name: 'Waterproofing', tasks: [] },
    { id: 'internal-plaster', name: 'Internal Plaster', tasks: [] },
    { id: 'loft', name: 'Loft', tasks: [] },
    { id: 'tile-work', name: 'Tile work', tasks: [] },
    { id: 'painting-work', name: 'Painting Work', tasks: [] },
    { id: 'door-panel-fitting', name: 'Door Panel Fitting', tasks: [] },
    { id: 'aluminium-work', name: 'Aluminium Work', tasks: [] },
    { id: 'fabrication-work', name: 'Fabrication Work', tasks: [] },
  ]);
  const [allWorkData, setAllWorkData] = useState<CustomWorkData[]>([]);
  const [materials, setMaterials] = useState<NewMaterialData[]>([
    { id: 'mat-001', materialName: 'UltraTech Cement', category: 'Cement', unit: 'bag', supplier: 'ABC Hardware', gstRate: '28' },
    { id: 'mat-002', materialName: 'TATA TMT Steel 12mm', category: 'Steel', unit: 'kg', supplier: 'ABC Hardware', gstRate: '18' },
    { id: 'mat-003', materialName: 'Anchor 1.5mm Wire', category: 'Electrical Components', unit: 'piece', supplier: 'ABC Hardware', gstRate: '18' },
    { id: 'mat-004', materialName: 'Supreme PVC Pipe 1 inch', category: 'Plumbing Supplies', unit: 'piece', supplier: 'ABC Hardware', gstRate: '12' },
    { id: 'mat-005', materialName: 'Crushed Stone 20mm', category: 'Aggregates', unit: 'ton', supplier: 'ABC Hardware', gstRate: '5' },
    { id: 'mat-006', materialName: 'Anchor Switch Plate', category: 'Electrical Components', unit: 'piece', supplier: 'ABC Hardware', gstRate: '18' },
    { id: 'mat-007', materialName: 'Jaguar Faucet', category: 'Plumbing Supplies', unit: 'piece', supplier: 'ABC Hardware', gstRate: '12' },
  ]);
  const [categories, setCategories] = useState<CategoryData[]>([
    { categoryName: 'Cement' },
    { categoryName: 'Steel' },
    { categoryName: 'Electrical Components' },
    { categoryName: 'Plumbing Supplies' },
    { categoryName: 'Aggregates' },
  ]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([
    {
        id: 'sup-001',
        supplierName: 'Main Contractor',
        contactPerson: 'Rajesh Kumar',
        phoneNo: '9988776655',
        email: 'rajesh@maincontractor.com',
        address: '123 Supplier St, Pune',
        gstNo: '27ZYXWV9876G1Z1',
        supplierType: ['Contractor']
    },
    {
        id: 'sup-002',
        supplierName: 'ABC Hardware',
        contactPerson: 'Sunita Patil',
        phoneNo: '9876543211',
        email: 'sunita@abchardware.com',
        address: '456 Hardware Rd, Pune',
        gstNo: '27ABCDE1234F1Z6',
        supplierType: ['Material']
    }
  ]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategoryData[]>([
    { name: 'Residential' },
    { name: 'Commercial' },
    { name: 'Industrial' },
  ]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<Permission[]>([]);
  const [workPlans, setWorkPlans] = useState<WorkPlanData[]>([]);
  const [extraWorkPlans, setExtraWorkPlans] = useState<ExtraWorkData[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderData[]>([]);
  const [indents, setIndents] = useState<IndentData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [workRates, setWorkRates] = useState<WorkRateData[]>([]);
  const [contractorBills, setContractorBills] = useState<ContractorBillData[]>([]);
  const [holdReleases, setHoldReleases] = useState<HoldReleaseData[]>([]);
  const [advancePayments, setAdvancePayments] = useState<AdvancePaymentData[]>([]);
  const [finalChecklists, setFinalChecklists] = useState<Record<string, Record<string, ChecklistPoint[]>>>({});
  const [materialKits, setMaterialKits] = useState<MaterialKitData[]>([]);
  const [grns, setGrns] = useState<GRNData[]>([]);
  const [issueRecords, setIssueRecords] = useState<IssueRecordData[]>([]);
  const [siteTransfers, setSiteTransfers] = useState<SiteTransferData[]>([]);
  const [contractorAttendance, setContractorAttendance] = useState<ContractorAttendanceData[]>([]);
  const [companyLaborers, setCompanyLaborers] = useState<CompanyLaborData[]>([]);
  const [companyAttendance, setCompanyAttendance] = useState<CompanyAttendanceData[]>([]);
  const [contractorRates, setContractorRates] = useState<ContractorRateData[]>([]);

  useEffect(() => {
    if (currentUser) {
      const userRole = roles.find(r => r.name === currentUser.role);
      if (userRole) {
        setCurrentUserPermissions(userRole.permissions);
      } else {
        setCurrentUserPermissions([]);
      }
    } else {
      setCurrentUserPermissions([]);
    }
  }, [currentUser, roles]);

  return (
    <AppContext.Provider
      value={{
        users,
        setUsers,
        companies,
        setCompanies,
        projects,
        setProjects,
        buildings,
        setBuildings,
        floors,
        setFloors,
        flats,
        setFlats,
        flatTypes,
        setFlatTypes,
        workTiles,
        setWorkTiles,
        allWorkData,
        setAllWorkData,
        materials,
        setMaterials,
        categories,
        setCategories,
        suppliers,
        setSuppliers,
        projectCategories,
        setProjectCategories,
        selectedProject,
        setSelectedProject,
        currentUser,
        setCurrentUser,
        currentUserPermissions,
        workPlans,
        setWorkPlans,
        extraWorkPlans,
        setExtraWorkPlans,
        roles,
        setRoles,
        purchaseOrders,
        setPurchaseOrders,
        indents,
        setIndents,
        inventory,
        setInventory,
        workRates,
        setWorkRates,
        contractorBills,
        setContractorBills,
        holdReleases,
        setHoldReleases,
        advancePayments,
        setAdvancePayments,
        defaultTasksByTile,
        finalChecklists,
        setFinalChecklists,
        materialKits,
        setMaterialKits,
        grns,
        setGrns,
        issueRecords,
        setIssueRecords,
        siteTransfers,
        setSiteTransfers,
        contractorAttendance,
        setContractorAttendance,
        companyAttendance,
        setCompanyAttendance,
        contractorRates,
        setContractorRates,
        companyLaborers,
        setCompanyLaborers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
