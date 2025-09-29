
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, UserPlus, Briefcase, ShieldCheck } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { withAuthorization } from '@/components/with-authorization';

const accountMasterTiles = [
  {
    name: 'Company',
    href: '/dashboard/account-master/company',
    icon: Building2,
    description: 'Manage company profiles and information.',
    permission: 'manage_companies',
  },
  {
    name: 'Register User',
    href: '/dashboard/account-master/register-user',
    icon: UserPlus,
    description: 'Add and manage user accounts and roles.',
    permission: 'manage_users',
  },
  {
    name: 'Manage Roles',
    href: '/dashboard/account-master/roles',
    icon: ShieldCheck,
    description: 'Create and manage user roles and permissions.',
    permission: 'manage_roles',
  },
  {
    name: 'Project',
    href: '/dashboard/account-master/project',
    icon: Briefcase,
    description: 'Create and oversee construction projects.',
    permission: 'manage_projects',
  },
];

function AccountMasterPageComponent() {
  const { hasPermission } = usePermissions();
  
  const accessibleTiles = accountMasterTiles.filter(tile => hasPermission(tile.permission as any));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Account Master</h2>
        <p className="text-muted-foreground">
          Select a category to manage accounts.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {accessibleTiles.map((tile) => (
          <Link
            href={tile.href}
            key={tile.name}
            className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
          >
            <Card className="hover:bg-accent hover:text-accent-foreground transition-colors h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <tile.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{tile.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  {tile.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default withAuthorization(AccountMasterPageComponent);
