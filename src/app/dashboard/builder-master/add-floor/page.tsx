
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAppContext,
  floorFormSchema,
  FloorData,
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

const formSchemaForFloor = floorFormSchema.omit({ projectName: true });

function AddFloorPageComponent() {
  const { toast } = useToast();
  const { buildings, floors, setFloors, selectedProject } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const router = useRouter();

  const projectBuildings = useMemo(() => {
    return buildings.filter(b => b.projectName === selectedProject);
  }, [buildings, selectedProject]);

  const projectFloors = useMemo(() => {
    return floors.filter(f => f.projectName === selectedProject);
  }, [floors, selectedProject]);

  const form = useForm<z.infer<typeof formSchemaForFloor>>({
    resolver: zodResolver(formSchemaForFloor),
    defaultValues: {
      buildingName: '',
      floorName: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchemaForFloor>) {
    if (!selectedProject) {
      toast({ variant: "destructive", title: "Error", description: "No project selected." });
      return;
    }
    const completeData: FloorData = { ...values, projectName: selectedProject };
    
    if (editingIndex !== null) {
      const originalIndex = floors.findIndex(f => f.floorName === projectFloors[editingIndex].floorName && f.buildingName === projectFloors[editingIndex].buildingName && f.projectName === selectedProject);
      if (originalIndex !== -1) {
        const updatedFloors = [...floors];
        updatedFloors[originalIndex] = completeData;
        setFloors(updatedFloors);
        toast({
          title: 'Success!',
          description: 'Floor information has been updated.',
        });
      }
      setEditingIndex(null);
    } else {
      setFloors((prevFloors) => [...prevFloors, completeData]);
      toast({
        title: 'Success!',
        description: 'Floor has been added.',
      });
    }
    form.reset();
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const { projectName, ...formData } = projectFloors[index];
    form.reset(formData);
  };

  const handleDelete = (index: number) => {
    const floorToDelete = projectFloors[index];
    setFloors(floors.filter((f) => f.floorName !== floorToDelete.floorName || f.buildingName !== floorToDelete.buildingName || f.projectName !== selectedProject));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Floor has been deleted.',
    });
    setDeleteIndex(null);
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
              {editingIndex !== null ? 'Edit Floor' : 'Add New Floor'}
            </CardTitle>
            <CardDescription>
              {editingIndex !== null
                ? 'Update the details for the selected floor.'
                : `Fill out the details to add a new floor to project: ${selectedProject}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                    control={form.control}
                    name="buildingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Name</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a building" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectBuildings.length > 0 ? (
                              projectBuildings.map((building, index) => (
                                <SelectItem
                                  key={index}
                                  value={building.buildingName}
                                >
                                  {building.buildingName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-buildings" disabled>
                                No buildings for this project
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
                    name="floorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First Floor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <Button type="submit">
                  {editingIndex !== null ? 'Update Floor' : 'Add Floor'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {projectFloors.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Floors for {selectedProject}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20">Actions</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Floor Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFloors.map((floor, index) => (
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
                        {floor.projectName}
                      </TableCell>
                      <TableCell>{floor.buildingName}</TableCell>
                      <TableCell>{floor.floorName}</TableCell>
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
                floor and remove its data from this project.
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
    </>
  );
}

export default withAuthorization(AddFloorPageComponent);
