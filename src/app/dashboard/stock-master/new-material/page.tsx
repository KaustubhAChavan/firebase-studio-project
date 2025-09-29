
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Pencil, Search, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAppContext,
  newMaterialFormSchema,
  NewMaterialData
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

export default function NewMaterialPage() {
  const { toast } = useToast();
  const {
    materials,
    setMaterials,
    categories,
    suppliers,
  } = useAppContext();
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<z.infer<typeof newMaterialFormSchema>>({
    resolver: zodResolver(newMaterialFormSchema),
    defaultValues: {
      id: '',
      materialName: '',
      category: '',
      unit: '',
      supplier: '',
      gstRate: '',
    },
  });

  function onSubmit(values: z.infer<typeof newMaterialFormSchema>) {
    if (editingMaterialId) {
       const updatedMaterials = materials.map(m => 
        m.id === editingMaterialId ? { ...values, id: editingMaterialId } : m
      );

      if (updatedMaterials.some(m => m.id !== editingMaterialId && m.materialName.toLowerCase() === values.materialName.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Duplicate Material",
            description: "A material with this name already exists.",
        });
        return;
      }
      setMaterials(updatedMaterials);
      toast({
        title: 'Success!',
        description: 'Material has been updated.',
      });
      setEditingMaterialId(null);
    } else {
      if (materials.some(m => m.materialName.toLowerCase() === values.materialName.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Duplicate Material",
            description: "A material with this name already exists.",
        });
        return;
      }
      setMaterials((prev) => [...prev, { ...values, id: crypto.randomUUID() }]);
      toast({
        title: 'Success!',
        description: 'New material has been added.',
      });
    }
    form.reset({ id: '', materialName: '', category: '', unit: '', supplier: '', gstRate: '' });
  }

  const handleEdit = (material: NewMaterialData) => {
    setEditingMaterialId(material.id);
    form.reset(material);
  };

  const handleDelete = () => {
    if (!deletingMaterialId) return;
    setMaterials(materials.filter(m => m.id !== deletingMaterialId));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Material has been deleted.',
    });
    setDeletingMaterialId(null);
  };
  
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((material) => {
        if (filterCategory === 'all') return true;
        return material.category === filterCategory;
      })
      .filter((material) =>
        material.materialName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [materials, searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredMaterials.length / PAGE_SIZE);
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredMaterials.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredMaterials, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


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
      <div className="space-y-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {editingMaterialId ? 'Edit Material' : 'Register New Material'}
            </CardTitle>
            <CardDescription>
              {editingMaterialId
                ? 'Update the details for the selected material.'
                : 'Fill out the form to register a new material.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="materialName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., UltraTech Cement" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat, index) => (
                              <SelectItem key={index} value={cat.categoryName}>
                                {cat.categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">Kg</SelectItem>
                              <SelectItem value="gram">Gram</SelectItem>
                              <SelectItem value="liter">Liter</SelectItem>
                              <SelectItem value="ml">ML</SelectItem>
                              <SelectItem value="piece">Piece</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                               <SelectItem value="ton">Ton</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((sup, index) => (
                                <SelectItem key={index} value={sup.supplierName}>
                                  {sup.supplierName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gstRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Rate</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select GST %" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                <Button type="submit">
                  {editingMaterialId ? 'Update Material' : 'Save Material'}
                </Button>
                 {editingMaterialId && (
                    // <Button variant="ghost" onClick={() => { setEditingMaterialId(null); form.reset({id: '', name: '', permissions: []})}}>Cancel</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingMaterialId(null);
                      form.reset({ id: '', materialName: '', category: '', unit: '', supplier: '', gstRate: '' });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {materials.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Materials</CardTitle>
              <CardDescription>
                A list of all registered materials in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex justify-between items-center mb-4 gap-4">
                  <div className="relative w-full md:w-1/2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by material name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat, index) => (
                            <SelectItem key={index} value={cat.categoryName}>
                                {cat.categoryName}
                            </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
               </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20">Actions</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>GST Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="sticky left-0 bg-background">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(material)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingMaterialId(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {material.materialName}
                      </TableCell>
                      <TableCell>{material.category}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell>{material.supplier}</TableCell>
                      <TableCell>{material.gstRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </CardContent>
          </Card>
        )}
        <AlertDialog
          open={deletingMaterialId !== null}
          onOpenChange={() => setDeletingMaterialId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                material and remove its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingMaterialId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
