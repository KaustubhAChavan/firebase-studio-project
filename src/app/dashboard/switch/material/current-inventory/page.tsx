
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, FileDown, Boxes, List } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

type ProducibleKitInfo = {
  id: string;
  name: string;
  producibleCount: number;
  pendingItems: {
    materialName: string;
    needed: number;
    inStock: number;
  }[];
};

export default function CurrentInventoryPage() {
  const router = useRouter();
  const { inventory, categories, selectedProject, materialKits, materials } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState("inventory");
  const [currentPage, setCurrentPage] = useState(1);

  const projectInventory = useMemo(() =>
    inventory.filter(item => item.project === selectedProject),
    [inventory, selectedProject]
  );

  const filteredInventory = useMemo(() => {
    return projectInventory
      .filter(item => {
        if (filterCategory === 'all') return true;
        return item.category === filterCategory;
      })
      .filter(item =>
        item.materialName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [projectInventory, searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredInventory.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredInventory, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const producibleKits = useMemo((): ProducibleKitInfo[] => {
    const inventoryMap = new Map(projectInventory.map(item => [item.materialName, item.currentStock]));

    return materialKits.map(kit => {
      let producibleCount = Infinity;
      const pendingItems: ProducibleKitInfo['pendingItems'] = [];

      kit.items.forEach(item => {
        const stock = inventoryMap.get(item.materialName) || 0;
        const possibleCount = Math.floor(stock / item.quantity);
        if (possibleCount < producibleCount) {
          producibleCount = possibleCount;
        }
      });
      
      if (producibleCount === Infinity) producibleCount = 0;

      kit.items.forEach(item => {
        const stock = inventoryMap.get(item.materialName) || 0;
        const neededForNextKit = (producibleCount + 1) * item.quantity;
        if (stock < neededForNextKit) {
            pendingItems.push({
                materialName: item.materialName,
                needed: neededForNextKit - stock,
                inStock: stock
            });
        }
      });

      return {
        id: kit.id,
        name: kit.name,
        producibleCount,
        pendingItems,
      };
    });
  }, [materialKits, projectInventory]);

  const handleExport = () => {
    const worksheetData = filteredInventory.map(item => ({
      'Material Name': item.materialName,
      'Category': item.category,
      'Current Stock': item.currentStock,
      'Unit': item.unit,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, `inventory_${selectedProject}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || '';
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
         <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Download Excel
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory"><List className="mr-2" /> Current Inventory</TabsTrigger>
            <TabsTrigger value="kits"><Boxes className="mr-2" /> Producible Kits</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
            <Card>
                <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>
                    View current stock levels for all materials in project: {selectedProject}.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by material name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                        <SelectItem key={cat.categoryName} value={cat.categoryName}>
                            {cat.categoryName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Unit</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedInventory.length > 0 ? (
                        paginatedInventory.map((item) => (
                        <TableRow key={item.materialName}>
                            <TableCell className="font-medium">{item.materialName}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.currentStock}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No inventory found for this project.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                 <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="kits">
             <Card>
                <CardHeader>
                <CardTitle>Producible Material Kits</CardTitle>
                <CardDescription>
                    Analysis of how many complete kits can be made from current inventory.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kit Name</TableHead>
                                <TableHead>Producible Count</TableHead>
                                <TableHead>Pending for Next Kit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {producibleKits.length > 0 ? (
                                producibleKits.map(kit => (
                                    <TableRow key={kit.id}>
                                        <TableCell className="font-medium">{kit.name}</TableCell>
                                        <TableCell>{kit.producibleCount}</TableCell>
                                        <TableCell>
                                            {kit.pendingItems.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {kit.pendingItems.map(item => (
                                                        <Badge key={item.materialName} variant="secondary">
                                                          {item.materialName}: Need {item.needed} {getUnitForMaterial(item.materialName)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-green-600 border-green-600">Sufficient Stock</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No material kits have been defined yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
