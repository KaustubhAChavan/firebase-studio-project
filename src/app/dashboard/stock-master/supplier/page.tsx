
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  useAppContext,
  supplierFormSchema,
  SupplierData,
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';

const supplierTypes = [
  { id: 'Material', label: 'Material' },
  { id: 'Contractor', label: 'Contractor' },
];

export default function SupplierPage() {
  const { toast } = useToast();
  const { suppliers, setSuppliers } = useAppContext();
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierData | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof supplierFormSchema>>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      id: '',
      supplierName: '',
      contactPerson: '',
      phoneNo: '',
      email: '',
      address: '',
      gstNo: '',
      supplierType: [],
    },
  });

  function onSubmit(values: z.infer<typeof supplierFormSchema>) {
    if (editingSupplier) {
      const updatedSuppliers = suppliers.map(s => s.id === editingSupplier.id ? values : s);
      setSuppliers(updatedSuppliers);
      toast({
        title: 'Success!',
        description: 'Supplier information has been updated.',
      });
      setEditingSupplier(null);
    } else {
      setSuppliers((prev) => [...prev, {...values, id: crypto.randomUUID()}]);
      toast({
        title: 'Success!',
        description: 'New supplier has been added.',
      });
    }
    form.reset({ id: '', supplierName: '', contactPerson: '', phoneNo: '', email: '', address: '', gstNo: '', supplierType: [] });
  }

  const handleEdit = (supplier: SupplierData) => {
    setEditingSupplier(supplier);
    form.reset(supplier);
  };
  
  const handleCancelEdit = () => {
    setEditingSupplier(null);
    form.reset({ id: '', supplierName: '', contactPerson: '', phoneNo: '', email: '', address: '', gstNo: '', supplierType: [] });
  }

  const handleDelete = () => {
    if (!deletingSupplier) return;
    setSuppliers(suppliers.filter((s) => s.id !== deletingSupplier.id));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Supplier has been deleted.',
    });
    setDeletingSupplier(null);
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
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </CardTitle>
            <CardDescription>
              {editingSupplier
                ? 'Update the details for the selected supplier.'
                : 'Fill out the form to add a new supplier.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ABC Hardware" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phoneNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone No.</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ID</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@abchardware.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Industrial Area, City, State 12345"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gstNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST No</FormLabel>
                      <FormControl>
                        <Input placeholder="27ABCDE1234F1Z5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierType"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Supplier Type</FormLabel>
                        <FormDescription>
                          Select what this supplier provides.
                        </FormDescription>
                      </div>
                      <div className="flex gap-4">
                        {supplierTypes.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="supplierType"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValue, item.id])
                                          : field.onChange(
                                              currentValue.filter(
                                                (value) => value !== item.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                    <Button type="submit">
                      {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                    </Button>
                    {editingSupplier && <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {suppliers.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>GST No.</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.supplierName}
                      </TableCell>
                      <TableCell>{supplier.supplierType?.join(', ')}</TableCell>
                      <TableCell>{supplier.contactPerson}</TableCell>
                      <TableCell>{supplier.phoneNo}</TableCell>
                      <TableCell>{supplier.gstNo}</TableCell>
                       <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingSupplier(supplier)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <AlertDialog
          open={deletingSupplier !== null}
          onOpenChange={() => setDeletingSupplier(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                supplier and remove their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingSupplier(null)}>
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
