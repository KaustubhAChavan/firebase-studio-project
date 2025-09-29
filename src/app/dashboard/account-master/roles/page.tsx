
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { useAppContext, roleSchema, RoleData } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { permissionGroups, Permission, allPermissions } from '@/config/permissions';
import { withAuthorization } from '@/components/with-authorization';

function ManageRolesPageComponent() {
  const { toast } = useToast();
  const { roles, setRoles, users } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      id: '',
      name: '',
      permissions: [],
    },
  });
  
  const watchedPermissions = form.watch('permissions', []);

  const handleSelectAllForGroup = (groupPermissions: Permission[], checked: boolean) => {
    const currentPermissions = new Set(watchedPermissions);
    groupPermissions.forEach(p => {
        if (checked) currentPermissions.add(p);
        else currentPermissions.delete(p);
    });
    form.setValue('permissions', Array.from(currentPermissions), { shouldDirty: true });
  };
  
  useEffect(() => {
    const allOtherPermissions = allPermissions.filter(p => p !== 'full_access');
    const areAllOthersSelected = allOtherPermissions.every(p => watchedPermissions.includes(p));
    const isFullAccessSelected = watchedPermissions.includes('full_access');

    if (areAllOthersSelected && !isFullAccessSelected) {
        form.setValue('permissions', [...watchedPermissions, 'full_access'], { shouldValidate: true });
    } else if (!areAllOthersSelected && isFullAccessSelected) {
        form.setValue('permissions', watchedPermissions.filter(p => p !== 'full_access'), { shouldValidate: true });
    }
  }, [watchedPermissions, form]);

  function onSubmit(values: z.infer<typeof roleSchema>) {
    if (values.permissions.includes('full_access')) {
        values.permissions = [...allPermissions];
    }

    if (editingIndex !== null) {
      const updatedRoles = [...roles];
      updatedRoles[editingIndex] = { ...values, id: roles[editingIndex].id };
      setRoles(updatedRoles);
      toast({
        title: 'Success!',
        description: 'Role has been updated.',
      });
      setEditingIndex(null);
    } else {
      setRoles((prev) => [...prev, { ...values, id: crypto.randomUUID() }]);
      toast({
        title: 'Success!',
        description: 'New role has been created.',
      });
    }
    form.reset({ id: '', name: '', permissions: [] });
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    form.reset(roles[index]);
  };

  const attemptDelete = (index: number) => {
    const roleToDelete = roles[index];
    const isRoleInUse = users.some(user => user.role === roleToDelete.name);
    if (isRoleInUse) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: `The role "${roleToDelete.name}" is currently assigned to one or more users and cannot be deleted.`,
        });
    } else {
        setDeleteIndex(index);
    }
  };

  const handleDelete = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Role has been deleted.',
    });
    setDeleteIndex(null);
  };
  
  return (
    <>
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="space-y-8">
        <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle>
            {editingIndex !== null ? 'Edit Role' : 'Create New Role'}
            </CardTitle>
            <CardDescription>
            {editingIndex !== null
                ? 'Update the role name and its permissions.'
                : 'Create a new role and define its access permissions.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Site Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormItem>
                    <FormLabel className="text-base">Permissions</FormLabel>
                        <FormDescription>
                        Select the permissions for this role.
                        </FormDescription>
                    <div className="space-y-4 pt-2">
                        {permissionGroups.map((group) => {
                           const groupPermissions = group.permissions.map(p => p.id);
                           const areAllGroupSelected = groupPermissions.every(p => watchedPermissions.includes(p));
                           const isFullAccessGroup = group.permissions.some(p => p.id === 'full_access');

                           return (
                            <Card key={group.category}>
                                <CardHeader className="py-3 px-4 bg-muted/50 border-b flex flex-row items-center justify-between">
                                    <FormLabel className="text-sm font-medium">{group.category}</FormLabel>
                                    {!isFullAccessGroup && (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`select-all-${group.category}`}
                                                checked={areAllGroupSelected}
                                                onCheckedChange={(checked) => handleSelectAllForGroup(groupPermissions, !!checked)}
                                            />
                                            <label htmlFor={`select-all-${group.category}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Select All
                                            </label>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.permissions.map((permission) => (
                                        <FormField
                                            key={permission.id}
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(permission.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (permission.id === 'full_access') {
                                                                    field.onChange(checked ? allPermissions : []);
                                                                } else {
                                                                    const newValue = checked
                                                                        ? [...field.value, permission.id]
                                                                        : field.value?.filter((id) => id !== permission.id);
                                                                    field.onChange(newValue);
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal text-sm">
                                                        {permission.label}
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                           )
                        })}
                    </div>
                    <FormMessage {...form.getFieldState('permissions')} />
                </FormItem>

                <Button type="submit">
                {editingIndex !== null ? 'Update Role' : 'Create Role'}
                </Button>
                {editingIndex !== null && (
                    <Button variant="ghost" onClick={() => { setEditingIndex(null); form.reset({id: '', name: '', permissions: []})}}>Cancel</Button>
                )}
            </form>
            </Form>
        </CardContent>
        </Card>

        {roles.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Existing Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Permissions Summary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role, index) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {role.name}
                      </TableCell>
                       <TableCell>
                        {role.permissions.includes('full_access') 
                            ? 'Full Access' 
                            : `${role.permissions.length} of ${allPermissions.length - 1} permissions`
                        }
                       </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(index)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => attemptDelete(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the role. Users assigned to this role will need to be reassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(deleteIndex!)} className="bg-destructive hover:bg-destructive/90">Yes, delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default withAuthorization(ManageRolesPageComponent);
