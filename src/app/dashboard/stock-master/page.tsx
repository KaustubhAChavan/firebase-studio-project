'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PackagePlus, LayoutGrid, Truck, Box } from 'lucide-react';
import { withAuthorization } from '@/components/with-authorization';

const stockMasterTiles = [
  {
    name: 'New Material',
    href: '/dashboard/stock-master/new-material',
    icon: PackagePlus,
    description: 'Register and manage individual materials.',
  },
  {
    name: 'New Category',
    href: '/dashboard/stock-master/new-category',
    icon: LayoutGrid,
    description: 'Organize materials into categories.',
  },
  {
    name: 'Material Kit',
    href: '/dashboard/stock-master/material-kit',
    icon: Box,
    description: 'Create and manage grouped material kits for easy issuance.',
  },
  {
    name: 'Supplier',
    href: '/dashboard/stock-master/supplier',
    icon: Truck,
    description: 'Manage supplier and contractor information.',
  },
];

function StockMasterPageComponent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Stock Master</h2>
        <p className="text-muted-foreground">
          Select a category to manage stock and inventory.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {stockMasterTiles.map((tile) => (
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

export default withAuthorization(StockMasterPageComponent);
