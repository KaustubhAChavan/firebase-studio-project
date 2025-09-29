
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Pencil, Trash2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  flatFormSchema,
  FlatData,
} from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

const formSchemaForFlat = flatFormSchema.omit({ projectName: true });

function AddFlatPageComponent() {
  const { toast } = useToast();
  const { buildings, floors, flats, setFlats, selectedProject, flatTypes, setFlatTypes } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const router = useRouter();
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  const projectFlats = useMemo(() => flats.filter(f => f.projectName === selectedProject), [flats, selectedProject]);

  const form = useForm<z.infer<typeof formSchemaForFlat>>({
    resolver: zodResolver(formSchemaForFlat),
    defaultValues: {
      buildingName: '',
      floorName: '',
      type: '',
      flatNo: '',
      area: '',
      halls: '',
      bedrooms: '',
      kitchens: '',
      bathrooms: '',
      toilets: '',
      balconies: '',
    },
  });
  
  const selectedBuilding = form.watch('buildingName');

  const availableFloors = useMemo(() => {
    if (!selectedBuilding) return [];
    return floors.filter(
      (f) =>
        f.projectName === selectedProject && f.buildingName === selectedBuilding
    );
  }, [selectedBuilding, floors, selectedProject]);


  function onSubmit(values: z.infer<typeof formSchemaForFlat>) {
    if (!selectedProject) {
      toast({ variant: 'destructive', title: 'Error', description: 'No project selected.' });
      return;
    }
    const completeData: FlatData = { ...values, projectName: selectedProject };

    if (editingIndex !== null) {
      const originalIndex = flats.findIndex(f => f.flatNo === projectFlats[editingIndex].flatNo && f.projectName === selectedProject);
      if(originalIndex !== -1) {
        const updatedFlats = [...flats];
        updatedFlats[originalIndex] = completeData;
        setFlats(updatedFlats);
        toast({
          title: 'Success!',
          description: 'Flat information has been updated.',
        });
      }
      setEditingIndex(null);
    } else {
      setFlats((prevFlats) => [...prevFlats, completeData]);
      toast({
        title: 'Success!',
        description: 'Flat has been added.',
      });
    }
    form.reset();
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const { projectName, ...formData } = projectFlats[index];
    form.reset(formData);
  };

  const handleDelete = (index: number) => {
    const flatToDelete = projectFlats[index];
    setFlats(flats.filter((f) => f.flatNo !== flatToDelete.flatNo || f.projectName !== selectedProject));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Flat has been deleted.',
    });
    setDeleteIndex(null);
  };
  
  const handleAddType = () => {
    if (newTypeName.trim()) {
      if (
        !flatTypes.some(
          (type) =>
            type.toLowerCase() === newTypeName.trim().toLowerCase()
        )
      ) {
        setFlatTypes((prev) => [...prev, newTypeName.trim()]);
        toast({
          title: 'Success!',
          description: 'New flat type added.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'This type already exists.',
        });
      }
      setNewTypeName('');
      setIsTypeDialogOpen(false);
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
              {editingIndex !== null ? 'Edit Flat' : 'Add New Flat'}
            </CardTitle>
            <CardDescription>
              {editingIndex !== null
                ? 'Update the details for the selected flat.'
                : `Fill out the details to add a new flat to project: ${selectedProject}`}
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
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.resetField('floorName');
                          }}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a building" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectBuildings.map((building) => (
                              <SelectItem
                                key={building.buildingName}
                                value={building.buildingName}
                              >
                                {building.buildingName}
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
                    name="floorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor Name</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={!selectedBuilding}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a floor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableFloors.map((floor, index) => (
                              <SelectItem key={`${floor.buildingName}-${floor.floorName}-${index}`} value={floor.floorName}>
                                {floor.floorName}
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
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                         <div className="flex items-center justify-between">
                            <FormLabel>Type</FormLabel>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setIsTypeDialogOpen(true)}
                                    >
                                    <PlusCircle className="h-4 w-4" />
                                    <span className="sr-only">
                                        Add new type
                                    </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Add new type</p>
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
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {flatTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flatNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat No.</FormLabel>
                        <FormControl>
                          <Input placeholder="101" {...field} />
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
                        <FormLabel>Area (sq. ft.)</FormLabel>
                        <FormControl>
                          <Input placeholder="1200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="halls"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Halls</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input placeholder="2" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kitchens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kitchens</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input placeholder="2" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toilets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Toilets</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="balconies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balconies</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit">
                  {editingIndex !== null ? 'Update Flat' : 'Add Flat'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {projectFlats.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Registered Flats for {selectedProject}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20">Actions</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Flat No.</TableHead>
                    <TableHead>Area</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFlats.map((flat, index) => (
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
                        {flat.projectName}
                      </TableCell>
                      <TableCell>{flat.buildingName}</TableCell>
                      <TableCell>{flat.floorName}</TableCell>
                      <TableCell>{flat.type}</TableCell>
                      <TableCell>{flat.flatNo}</TableCell>
                      <TableCell>{flat.area}</TableCell>
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
                flat and remove its data.
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

       <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Flat Type</DialogTitle>
            <DialogDescription>
              Enter the name for the new flat type below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="new-type-name"
              placeholder="e.g., 5-BHK"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddType();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTypeDialogOpen(false);
                setNewTypeName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddType}>Add Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withAuthorization(AddFlatPageComponent);
