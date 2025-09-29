
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Users,
  Construction,
  ClipboardCheck,
  Warehouse,
  ListChecks,
} from 'lucide-react';
import { withAuthorization } from '@/components/with-authorization';
import { usePermissions } from '@/hooks/use-permissions';

const mainMenuItems = [
  {
    title: 'Account Master',
    description: 'Manage companies, users, and projects.',
    href: '/dashboard/account-master',
    icon: Users,
    permission: 'access_master_view'
  },
  {
    title: 'Builder Master',
    description: 'Manage buildings, floors, and flats.',
    href: '/dashboard/builder-master',
    icon: Construction,
    permission: 'access_master_view'
  },
  {
    title: 'Assign Work Tiles',
    description: 'Assign and track work for various tasks.',
    href: '/dashboard/assign-work-tiles',
    icon: ClipboardCheck,
    permission: 'manage_work_tiles'
  },
  {
    title: 'Assign Final Work Check',
    description: 'Assign and manage final work checklists.',
    href: '/dashboard/assign-final-work-check',
    icon: ListChecks,
    permission: 'manage_final_work'
  },
  {
    title: 'Stock Master',
    description: 'Manage materials, categories, and suppliers.',
    href: '/dashboard/stock-master',
    icon: Warehouse,
    permission: 'manage_stock_master'
  },
];

function DashboardPageComponent() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const accessibleItems = mainMenuItems.filter(item => hasPermission(item.permission as any));

  return (
    <>
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to KCCINFRASOFT. Here's a quick overview of your workspace.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {accessibleItems.map((item) => (
            <Link
              href={item.href}
              key={item.title}
              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            >
              <Card className="hover:bg-accent hover:text-accent-foreground transition-colors h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default withAuthorization(DashboardPageComponent);
