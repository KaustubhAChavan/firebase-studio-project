
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  PackageCheck,
  PackageMinus,
  ArrowRightLeft,
  FileText,
  BadgeCheck,
  Truck,
  Boxes,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const materialTiles = [
  {
    name: 'Current Inventory',
    href: '/dashboard/switch/material/current-inventory',
    icon: Warehouse,
    description: 'View current stock levels of all materials.',
  },
   {
    name: 'Indents',
    href: '/dashboard/switch/material/indents',
    icon: ClipboardList,
    description: 'Request materials from the central store.',
  },
  {
    name: 'Purchase Order',
    href: '/dashboard/switch/material/purchase-order',
    icon: ShoppingCart,
    description: 'Create and manage purchase orders for suppliers.',
  },
  {
    name: 'Approvals',
    href: '/dashboard/switch/material/approvals',
    icon: BadgeCheck,
    description: 'Approve or reject pending POs and indents.',
  },
  {
    name: 'GRN (Purchase In-Flow)',
    href: '/dashboard/switch/material/purchase',
    icon: PackageCheck,
    description: 'Record received materials against purchase orders.',
  },
  {
    name: 'Issue to Contractor (Out-Flow)',
    href: '/dashboard/switch/material/issue-to-contractor',
    icon: PackageMinus,
    description: 'Record materials issued to contractors or sites.',
  },
  {
    name: 'Site to Site Transfer',
    href: '/dashboard/switch/material/site-transfer',
    icon: ArrowRightLeft,
    description: 'Transfer materials between different projects.',
  },
   {
    name: 'Upcoming Deliveries',
    href: '/dashboard/switch/material/upcoming-deliveries',
    icon: Truck,
    description: 'Track expected material deliveries.',
  },
  {
    name: 'Reports',
    href: '/dashboard/switch/material/reports',
    icon: FileText,
    description: 'Generate various inventory and material reports.',
  },
];

export default function MaterialPage() {
  const router = useRouter();
  const { selectedProject, inventory, indents, purchaseOrders } = useAppContext();

  const dashboardData = useMemo(() => {
    if (!selectedProject) return null;
    
    const projectInventory = inventory.filter(i => i.project === selectedProject);
    const pendingIndentsCount = indents.filter(i => i.requestingProject === selectedProject && i.status === 'Pending').length;
    const pendingPOsCount = purchaseOrders.filter(po => po.projectName === selectedProject && po.status === 'Pending').length;
    const upcomingDeliveriesCount = purchaseOrders.filter(po => po.projectName === selectedProject && (po.status === 'Approved' || po.status === 'Partially Received')).length;

    const topStockedItems = [...projectInventory]
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10);
      
    const stockByCategory = projectInventory.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = 0;
        }
        acc[item.category] += item.currentStock;
        return acc;
    }, {} as Record<string, number>);

    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    const stockByCategoryData = Object.entries(stockByCategory)
      .map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] }))
      .filter(d => d.value > 0);

    return {
      totalMaterials: projectInventory.length,
      pendingIndentsCount,
      pendingPOsCount,
      upcomingDeliveriesCount,
      topStockedItems,
      stockByCategoryData,
    };

  }, [selectedProject, inventory, indents, purchaseOrders]);

  const topStockedChartConfig = {
    stock: {
      label: "Stock",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  const stockByCategoryChartConfig = {
    stock: {
      label: "Stock",
    },
  } satisfies ChartConfig;

  if (!dashboardData) {
      return <p>Loading dashboard...</p>
  }
  
  const { totalMaterials, pendingIndentsCount, pendingPOsCount, upcomingDeliveriesCount, topStockedItems, stockByCategoryData } = dashboardData;

  const formatNumber = (value: number) => value.toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div>
        <h2 className="text-2xl font-semibold">Store & Material Management</h2>
        <p className="text-muted-foreground">
          An overview of inventory and procurement for project: {selectedProject}.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalMaterials}</div>
                <p className="text-xs text-muted-foreground">Unique items in inventory</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Indents</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{pendingIndentsCount}</div>
                <p className="text-xs text-muted-foreground">Requests needing approval</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
                <BadgeCheck className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{pendingPOsCount}</div>
                <p className="text-xs text-muted-foreground">Purchase orders awaiting approval</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Deliveries</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{upcomingDeliveriesCount}</div>
                <p className="text-xs text-muted-foreground">Approved and open purchase orders</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Stocked Items</CardTitle>
            <CardDescription>Highest quantity items currently in inventory.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={topStockedChartConfig} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStockedItems} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" tickFormatter={formatNumber} />
                      <YAxis dataKey="materialName" type="category" width={150} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatNumber(value as number)} />} />
                      <Bar dataKey="currentStock" name="Stock" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
            <CardDescription>Total stock quantity distribution.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={stockByCategoryChartConfig} className="mx-auto aspect-square h-80">
              <PieChart>
                <RechartsTooltip content={<ChartTooltipContent formatter={(value, name) => `${name}: ${formatNumber(value as number)}`} hideLabel />} />
                <Pie data={stockByCategoryData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                    {stockByCategoryData.map((entry) => ( <Cell key={`cell-${entry.name}`} fill={entry.fill} /> ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Material Management Links</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {materialTiles.map((tile) => (
              <Link
                href={tile.href}
                key={tile.name}
                className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
              >
                <Card className="hover:bg-accent hover:text-accent-foreground transition-colors h-full flex items-center p-4">
                  <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg">
                          <tile.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{tile.name}</p>
                        <p className="text-sm text-muted-foreground">{tile.description}</p>
                      </div>
                  </div>
                </Card>
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

    