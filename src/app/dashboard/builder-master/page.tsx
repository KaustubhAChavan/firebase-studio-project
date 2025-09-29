'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building, Layers, Home } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { withAuthorization } from '@/components/with-authorization';

const builderMasterTiles = [
  {
    name: 'Add Building',
    href: '/dashboard/builder-master/add-building',
    icon: Building,
    description: 'Register new buildings within projects.',
    permission: 'manage_buildings'
  },
  {
    name: 'Add Floor',
    href: '/dashboard/builder-master/add-floor',
    icon: Layers,
    description: 'Define floors for each building.',
    permission: 'manage_floors'
  },
  {
    name: 'Add Flat',
    href: '/dashboard/builder-master/add-flat',
    icon: Home,
    description: 'Add individual flats or units to floors.',
    permission: 'manage_flats'
  },
];

function BuilderMasterPageComponent() {
  const { hasPermission } = usePermissions();
  const accessibleTiles = builderMasterTiles.filter(tile => hasPermission(tile.permission as any));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Builder Master</h2>
        <p className="text-muted-foreground">
          Select a category to manage builder data.
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

export default withAuthorization(BuilderMasterPageComponent);
