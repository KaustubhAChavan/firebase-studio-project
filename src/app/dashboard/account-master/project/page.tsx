
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, CalendarIcon, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useAppContext,
  projectFormSchema,
  ProjectData,
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

function ProjectPageComponent() {
  const { toast } = useToast();
  const {
    users,
    setUsers,
    currentUser,
    companies,
    projects,
    setProjects,
    projectCategories,
    setProjectCategories,
  } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const router = useRouter();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: '',
      area: '',
      reraRegistration: '',
      address: '',
    },
  });

  function onSubmit(values: z.infer<typeof projectFormSchema>) {
    if (editingIndex !== null) {
      const updatedProjects = [...projects];
      updatedProjects[editingIndex] = values;
      setProjects(updatedProjects);
      toast({
        title: 'Success!',
        description: 'Project information has been updated.',
      });
      setEditingIndex(null);
    } else {
      setProjects((prevProjects) => [...prevProjects, values]);
      
      // Auto-assign the new project to the current user
      if (currentUser) {
        setUsers(prevUsers => prevUsers.map(user => {
          if (user.id === currentUser.id) {
            const updatedProjects = user.projects ? [...user.projects, values.projectName] : [values.projectName];
            return { ...user, projects: updatedProjects };
          }
          return user;
        }));
      }

      toast({
        title: 'Success!',
        description: 'Project has been registered.',
      });
    }
    form.reset();
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    form.reset(projects[index]);
  };

  const handleDelete = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Project has been deleted.',
    });
    setDeleteIndex(null);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      if (
        !projectCategories.some(
          (cat) =>
            cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
        )
      ) {
        setProjectCategories((prev) => [
          ...prev,
          { name: newCategoryName.trim() },
        ]);
        toast({
          title: 'Success!',
          description: 'New project category added.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'This category already exists.',
        });
      }
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
    }
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
            {editingIndex !== null ? 'Edit Project' : 'Register New Project'}
            </CardTitle>
            <CardDescription>
            {editingIndex !== null
                ? 'Update the details for the selected project.'
                : 'Fill out the details to register a new project.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g. Kothari Heights" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Area (Sq.Ft.)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g. 100000" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {companies.length > 0 ? (
                            companies.map((company) => (
                                <SelectItem
                                key={company.id}
                                value={company.companyName}
                                >
                                {company.companyName}
                                </SelectItem>
                            ))
                            ) : (
                            <SelectItem value="no-companies" disabled>
                                No companies registered
                            </SelectItem>
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center justify-between">
                        <FormLabel>Category</FormLabel>
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsCategoryDialogOpen(true)}
                                >
                                <PlusCircle className="h-4 w-4" />
                                <span className="sr-only">
                                    Add new category
                                </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Add new category</p>
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        </div>
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {projectCategories.map((cat, index) => (
                            <SelectItem key={index} value={cat.name}>
                                {cat.name}
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
                name="reraRegistration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>RERA Registration</FormLabel>
                    <FormControl>
                        <Input placeholder="P52100000000" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Site Address, City, State, Pincode"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="siteManager"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Site Manager</FormLabel>
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {users.length > 0 ? (
                            users.map((user) => (
                                <SelectItem
                                key={user.id}
                                value={user.fullName}
                                >
                                {user.fullName}
                                </SelectItem>
                            ))
                            ) : (
                            <SelectItem value="no-users" disabled>
                                No users registered
                            </SelectItem>
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                {field.value ? (
                                format(field.value, 'PPP')
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="tentativeEndDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Tentative End Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                {field.value ? (
                                format(field.value, 'PPP')
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>

                <Button type="submit">
                {editingIndex !== null
                    ? 'Update Project'
                    : 'Register Project'}
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>

        {projects.length > 0 && (
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 text-left">Actions</TableHead>
                    <TableHead className="text-left">Project Name</TableHead>
                    <TableHead className="text-left">Area (Sq.Ft.)</TableHead>
                    <TableHead className="text-left">Company</TableHead>
                    <TableHead className="text-left">Category</TableHead>
                    <TableHead className="text-left">Site Manager</TableHead>
                    <TableHead className="text-left">Start Date</TableHead>
                    <TableHead className="text-left">End Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project, index) => (
                    <TableRow key={index}>
                      <TableCell className="sticky left-0 bg-background">
                            <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(index)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteIndex(index)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </div>
                        </TableCell>
                      <TableCell className="font-medium">
                        {project.projectName}
                      </TableCell>
                      <TableCell>{project.area}</TableCell>
                      <TableCell>{project.company}</TableCell>
                      <TableCell>{project.category}</TableCell>
                      <TableCell>{project.siteManager}</TableCell>
                      <TableCell>{format(project.startDate, 'PPP')}</TableCell>
                      <TableCell>
                        {format(project.tentativeEndDate, 'PPP')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <AlertDialog
          open={deleteIndex !== null}
          onOpenChange={() => setDeleteIndex(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                project and remove its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteIndex(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(deleteIndex!)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Project Category</DialogTitle>
            <DialogDescription>
              Enter the name for the new project category below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="new-category-name"
              placeholder="e.g., Mixed-Use"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCategoryDialogOpen(false);
                setNewCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withAuthorization(ProjectPageComponent);
