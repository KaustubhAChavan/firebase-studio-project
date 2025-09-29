
'use client';

import { useState, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppContext, UserData, userFormObject } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

const passwordOptionalSchema = userFormObject.extend({
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});


function RegisterUserPageComponent() {
  const { toast } = useToast();
  const { users, setUsers, roles, projects: allProjects } = useAppContext();
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof passwordOptionalSchema>>({
    resolver: zodResolver(passwordOptionalSchema),
    defaultValues: {
      id: '',
      fullName: '',
      phoneNo: '',
      address: '',
      projects: [],
      role: '',
      password: '',
      confirmPassword: '',
    },
  });

  function onSubmit(values: z.infer<typeof passwordOptionalSchema>) {
    if (editingUser) {
        const updatedUsers = users.map(user => {
            if (user.id === editingUser.id) {
                 const updatedUser = { ...user, ...values };
                 if (!values.password) {
                    delete (updatedUser as any).password;
                    delete (updatedUser as any).confirmPassword;
                 } else if (values.password.length < 8) {
                    form.setError("password", { message: "Password must be at least 8 characters."});
                    toast({ variant: 'destructive', title: 'Error', description: 'Password is too short.' });
                    return user; // return original user on error
                 }
                 return updatedUser;
            }
            return user;
        });
        setUsers(updatedUsers);
        toast({
            title: 'Success!',
            description: 'User information has been updated.',
        });
        setEditingUser(null);
    } else {
       if (users.some(u => u.phoneNo === values.phoneNo)) {
          form.setError("phoneNo", { message: "A user with this phone number already exists." });
          toast({ variant: 'destructive', title: 'Error', description: 'User with this phone number already exists.' });
          return;
       }
       if (!values.password || values.password.length < 8) {
           form.setError("password", { message: "Password must be at least 8 characters."});
           toast({ variant: 'destructive', title: 'Error', description: 'A valid password is required for a new user.' });
           return;
       }
      const completeData: UserData = { ...values, id: crypto.randomUUID() } as UserData;
      setUsers((prevUsers) => [...prevUsers, completeData]);
      toast({
        title: 'Success!',
        description: 'User has been registered.',
      });
    }
    form.reset({
      id: '', fullName: '', phoneNo: '', address: '', password: '', confirmPassword: '', projects: [], role: '',
    });
    setShowPasswordFields(false);
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    form.reset({ ...user, password: '', confirmPassword: '' });
    setShowPasswordFields(false);
  };

  const handleDelete = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'User has been deleted.',
    });
    setDeletingUserId(null);
  };
  
  const handleCancelEdit = () => {
    setEditingUser(null);
    form.reset({
      id: '', fullName: '', phoneNo: '', address: '', password: '', confirmPassword: '', projects: [], role: '',
    });
    setShowPasswordFields(false);
  }

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
              {editingUser ? 'Edit User' : 'Register New User'}
            </CardTitle>
            <CardDescription>
              {editingUser
                ? 'Update the details for the selected user.'
                : `Fill out the details to register a new user.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone No.</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} disabled={!!editingUser}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="other" />
                              </FormControl>
                              <FormLabel className="font-normal">Other</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {roles.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          placeholder="123 Main St, Anytown, USA 12345"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="projects"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assigned Projects</FormLabel>
                        <FormDescription>Select all projects this user should have access to.</FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-md border p-4">
                        {allProjects.map((project) => (
                          <FormField
                            key={project.projectName}
                            control={form.control}
                            name="projects"
                            render={({ field }) => {
                              return (
                                <FormItem key={project.projectName} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(project.projectName)}
                                      onCheckedChange={(checked) => {
                                        const currentProjects = field.value || [];
                                        return checked
                                          ? field.onChange([...currentProjects, project.projectName])
                                          : field.onChange(
                                              currentProjects.filter(
                                                (value) => value !== project.projectName
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {project.projectName}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                  )}
                />

                {(!editingUser || showPasswordFields) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                 {editingUser && !showPasswordFields && (
                    <Button type="button" variant="secondary" onClick={() => setShowPasswordFields(true)}>
                        Reset Password
                    </Button>
                )}


                <div className="flex gap-2">
                    <Button type="submit">
                      {editingUser ? 'Update User' : 'Register User'}
                    </Button>
                    {editingUser && (
                        <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                    )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {users.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Phone No.</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName}
                      </TableCell>
                      <TableCell>{user.phoneNo}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.projects.join(', ')}</TableCell>
                       <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingUserId(user.id)}
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
          open={deletingUserId !== null}
          onOpenChange={() => setDeletingUserId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                user and remove their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingUserId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(deletingUserId!)}
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

export default withAuthorization(RegisterUserPageComponent);
