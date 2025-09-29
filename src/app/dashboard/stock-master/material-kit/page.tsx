
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Pencil, Trash2, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, materialKitSchema, MaterialKitData } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const formSchema = materialKitSchema.omit({ id: true });

export default function MaterialKitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { materials, materialKits, setMaterialKits } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [deletingKitId, setDeletingKitId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      items: [{ materialName: '', quantity: 1 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const openDialog = (kitId?: string) => {
    if (kitId) {
      const kitToEdit = materialKits.find(k => k.id === kitId);
      if (kitToEdit) {
        setEditingKitId(kitId);
        form.reset({
          name: kitToEdit.name,
          items: kitToEdit.items,
        });
      }
    } else {
      setEditingKitId(null);
      form.reset({ name: '', items: [{ materialName: '', quantity: 1 }] });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingKitId) {
      setMaterialKits(prev => prev.map(k => k.id === editingKitId ? { id: editingKitId, ...data } : k));
      toast({ title: 'Success!', description: 'Material kit has been updated.' });
    } else {
      setMaterialKits(prev => [...prev, { id: crypto.randomUUID(), ...data }]);
      toast({ title: 'Success!', description: 'New material kit has been created.' });
    }
    setIsDialogOpen(false);
    setEditingKitId(null);
  };

  const handleDelete = () => {
    if (!deletingKitId) return;
    setMaterialKits(prev => prev.filter(k => k.id !== deletingKitId));
    toast({ variant: 'destructive', title: 'Deleted!', description: 'Material kit has been deleted.' });
    setDeletingKitId(null);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Kit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Material Kits</CardTitle>
          <CardDescription>Manage your grouped material kits for easy issuance.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kit Name</TableHead>
                <TableHead>Number of Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialKits.length > 0 ? (
                materialKits.map(kit => (
                  <TableRow key={kit.id}>
                    <TableCell className="font-medium">{kit.name}</TableCell>
                    <TableCell>{kit.items.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(kit.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingKitId(kit.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">No material kits created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingKitId ? 'Edit' : 'Create'} Material Kit</DialogTitle>
            <DialogDescription>Define a reusable group of materials and their quantities.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kit Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Basic Plumbing Kit" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                    <FormField control={form.control} name={`items.${index}.materialName`} render={({ field }) => (
                      <FormItem className="col-span-7">
                        <FormLabel>Material</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger></FormControl>
                          <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.materialName}>{m.materialName}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="col-span-2 flex items-end h-full">
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: '', quantity: 1 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Material
              </Button>
              <DialogFooter>
                <Button type="submit">{editingKitId ? 'Save Changes' : 'Create Kit'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingKitId} onOpenChange={() => setDeletingKitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the material kit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingKitId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
