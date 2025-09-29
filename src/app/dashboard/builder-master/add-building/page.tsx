
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
  useAppContext,
  buildingFormSchema,
  BuildingData,
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

const formSchemaForBuilding = buildingFormSchema.omit({ projectName: true });

function AddBuildingPageComponent() {
  const { toast } = useToast();
  const { buildings, setBuildings, selectedProject } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const router = useRouter();

  const projectBuildings = useMemo(() => {
    return buildings.filter(building => building.projectName === selectedProject);
  }, [buildings, selectedProject]);

  const form = useForm<z.infer<typeof formSchemaForBuilding>>({
    resolver: zodResolver(formSchemaForBuilding),
    defaultValues: {
      buildingName: '',
      buildupArea: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchemaForBuilding>) {
     if (!selectedProject) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No project selected. Please log in again.",
        });
        return;
    }
    const completeData: BuildingData = { ...values, projectName: selectedProject };

    if (editingIndex !== null) {
      const originalIndex = buildings.findIndex(b => b.buildingName === projectBuildings[editingIndex].buildingName && b.projectName === selectedProject);
      if (originalIndex !== -1) {
        const updatedBuildings = [...buildings];
        updatedBuildings[originalIndex] = completeData;
        setBuildings(updatedBuildings);
        toast({
          title: 'Success!',
          description: 'Building information has been updated.',
        });
      }
      setEditingIndex(null);
    } else {
      setBuildings((prevBuildings) => [...prevBuildings, completeData]);
      toast({
        title: 'Success!',
        description: 'Building has been added.',
      });
    }
    form.reset();
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const { projectName, ...formData } = projectBuildings[index];
    form.reset(formData);
  };

  const handleDelete = (index: number) => {
    const buildingToDelete = projectBuildings[index];
    setBuildings(buildings.filter((b) => b.buildingName !== buildingToDelete.buildingName || b.projectName !== selectedProject));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Building has been deleted.',
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
              {editingIndex !== null ? 'Edit Building' : 'Add New Building'}
            </CardTitle>
            <CardDescription>
              {editingIndex !== null
                ? 'Update the details for the selected building.'
                : `Fill out the details to add a new building to project: ${selectedProject}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="buildingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Tower A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buildupArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buildup Area (sq. ft.)</FormLabel>
                        <FormControl>
                          <Input placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit">
                  {editingIndex !== null ? 'Update Building' : 'Add Building'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {projectBuildings.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Buildings for {selectedProject}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20">Actions</TableHead>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Buildup Area</TableHead>
                    <TableHead>Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectBuildings.map((building, index) => (
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
                        {building.buildingName}
                      </TableCell>
                      <TableCell>{building.buildupArea}</TableCell>
                      <TableCell>{building.projectName}</TableCell>
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
                building and remove its data from this project.
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

export default withAuthorization(AddBuildingPageComponent);
