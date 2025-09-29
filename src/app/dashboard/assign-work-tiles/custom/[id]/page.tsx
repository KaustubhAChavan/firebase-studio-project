
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Check, X, Pencil, Trash2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import {
  useAppContext,
  customWorkDataSchema,
  CustomWorkData,
} from '@/context/AppContext';
import { withAuthorization } from '@/components/with-authorization';

const formSchemaForWork = customWorkDataSchema.omit({ projectName: true, workTileId: true });

function CustomWorkPageComponent() {
  const router = useRouter();
  const params = useParams();
  const workTileId = (params.id as string) || '';

  const { toast } = useToast();
  const { buildings, workTiles, setWorkTiles, allWorkData, setAllWorkData, selectedProject } =
    useAppContext();
    
  const workTile = useMemo(() => workTiles.find(t => t.id === workTileId), [workTiles, workTileId]);
  const WORK_TITLE = workTile?.name || 'Work';

  const [editingWork, setEditingWork] = useState<CustomWorkData | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customTaskName, setCustomTaskName] = useState('');

  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  const projectWork = useMemo(() => allWorkData.filter(w => w.projectName === selectedProject && w.workTileId === workTileId), [allWorkData, selectedProject, workTileId]);

  const tasksForTile = useMemo(() => workTile?.tasks || [], [workTile]);

  const form = useForm<z.infer<typeof formSchemaForWork>>({
    resolver: zodResolver(formSchemaForWork),
    defaultValues: {
      buildingName: '',
      customTasks: tasksForTile.map(task => ({ ...task, checked: false })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'customTasks',
  });

  const allCustomTaskLabels = useMemo(() => {
    const labels = new Set<string>();
    tasksForTile.forEach(task => labels.add(task.label));
    projectWork.forEach((work) => {
      work.customTasks?.forEach((task) => {
        labels.add(task.label);
      });
    });
    return Array.from(labels);
  }, [projectWork, tasksForTile]);
  
  const selectedBuildingName = form.watch('buildingName');
  
  useEffect(() => {
    if (selectedBuildingName) {
      const existingWorkForBuilding = projectWork.find(w => w.buildingName === selectedBuildingName);
      if (existingWorkForBuilding) {
        setEditingWork(existingWorkForBuilding);
        const { projectName, workTileId, ...formData } = existingWorkForBuilding;
        
        // Merge existing tasks with all possible tasks for the tile
        const allTasksForForm = [...tasksForTile];
        existingWorkForBuilding.customTasks?.forEach(savedTask => {
            if (!allTasksForForm.some(t => t.id === savedTask.id)) {
                allTasksForForm.push({ id: savedTask.id, label: savedTask.label });
            }
        });
        
        const tasksWithCheckedState = allTasksForForm.map(task => {
            const savedTask = existingWorkForBuilding.customTasks?.find(t => t.id === task.id);
            return { ...task, checked: savedTask?.checked || false };
        });

        form.reset({ ...formData, customTasks: tasksWithCheckedState });
      } else {
        setEditingWork(null);
        form.reset({
          buildingName: selectedBuildingName,
          customTasks: tasksForTile.map(task => ({...task, checked: false}))
        });
      }
    } else {
      setEditingWork(null);
      form.reset({
        buildingName: '',
        customTasks: tasksForTile.map(task => ({...task, checked: false}))
      });
    }
  }, [selectedBuildingName, projectWork, tasksForTile, form]);


  function onSubmit(values: z.infer<typeof formSchemaForWork>) {
     if (!selectedProject) {
      toast({ variant: 'destructive', title: 'Error', description: 'No project selected.' });
      return;
    }
    const completeData: CustomWorkData = { ...values, projectName: selectedProject, workTileId };

    if (editingWork) {
      const globalIndex = allWorkData.findIndex(w => 
        w.buildingName === editingWork.buildingName && 
        w.projectName === selectedProject &&
        w.workTileId === workTileId
      );
      if (globalIndex !== -1) {
        const updatedWork = [...allWorkData];
        updatedWork[globalIndex] = completeData;
        setAllWorkData(updatedWork);
        toast({
          title: 'Success!',
          description: `${WORK_TITLE} has been updated for ${values.buildingName}.`,
        });
      }
    } else {
      setAllWorkData((prev) => [...prev, completeData]);
      toast({
        title: 'Success!',
        description: `${WORK_TITLE} has been assigned for ${values.buildingName}.`,
      });
    }
    form.reset({
      buildingName: '',
      customTasks: tasksForTile.map(task => ({...task, checked: false}))
    });
    setEditingWork(null);
  }

  const handleEditClick = (index: number) => {
    const workToEdit = projectWork[index];
    form.setValue('buildingName', workToEdit.buildingName);
  }

  const handleDelete = (index: number) => {
    const workToDelete = projectWork[index];
    setAllWorkData(allWorkData.filter((w) => 
        w.buildingName !== workToDelete.buildingName || 
        w.projectName !== selectedProject || 
        w.workTileId !== workTileId
    ));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Assigned work has been deleted.',
    });
    setDeleteIndex(null);
  };

  const handleAddTask = () => {
    if (customTaskName.trim() && workTile) {
      const newTask = {
        id: crypto.randomUUID(),
        label: customTaskName.trim(),
      };
      
      // Update the main workTiles context
      setWorkTiles(prevWorkTiles => {
        return prevWorkTiles.map(tile => {
          if (tile.id === workTileId) {
            return {
              ...tile,
              tasks: [...(tile.tasks || []), newTask]
            };
          }
          return tile;
        });
      });
      
      // Append to the current form's field array
      append({ ...newTask, checked: false });

      setCustomTaskName('');
      setIsDialogOpen(false);
      toast({ title: "Custom task added", description: `"${newTask.label}" is now available for all assignments of this work tile.` });
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
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle>
              {editingWork
                ? `Edit ${WORK_TITLE}`
                : `Assign ${WORK_TITLE}`}
            </CardTitle>
            <CardDescription>
              {editingWork
                ? `Update the tasks for ${form.getValues('buildingName')}.`
                : `Select a building to assign tasks for project: ${selectedProject}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="buildingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Name</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!editingWork}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectBuildings.map((building, index) => (
                            <SelectItem
                              key={index}
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base font-medium">
                      Tasks
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Custom Task
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`customTasks.${index}.checked`}
                        render={({ field: checkboxField }) => (
                          <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox
                                  checked={checkboxField.value}
                                  onCheckedChange={checkboxField.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {(form.watch('customTasks')?.[index] as any)?.label || ''}
                              </FormLabel>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit">
                  {editingWork ? 'Update Work' : 'Assign Work'}
                </Button>
                 {editingWork && (
                    <Button variant="ghost" onClick={() => {
                        setEditingWork(null);
                        form.reset({
                            buildingName: '',
                            customTasks: tasksForTile.map(task => ({...task, checked: false}))
                        });
                    }}>Cancel</Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {projectWork.length > 0 && (
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle>Assigned {WORK_TITLE} Status for {selectedProject}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center sticky left-0 z-20">Actions</TableHead>
                    <TableHead className="text-center">Building Name</TableHead>
                    {allCustomTaskLabels.map((label) => (
                      <TableHead className="text-center" key={label}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectWork.map((work, index) => (
                    <TableRow key={index}>
                      <TableCell className="sticky left-0 bg-background">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(index)}
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
                      <TableCell className="font-medium text-center">
                        {work.buildingName}
                      </TableCell>
                      {allCustomTaskLabels.map((label) => {
                        const customTask = work.customTasks?.find(
                          (t) => t.label === label
                        );
                        return (
                          <TableCell
                            key={`${work.buildingName}-${label}`}
                            className="text-center"
                          >
                            {customTask?.checked ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              customTask ? <X className="h-5 w-5 text-destructive mx-auto" /> : '-'
                            )}
                          </TableCell>
                        );
                      })}
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
                assigned work status.
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Task</DialogTitle>
              <DialogDescription>
                Enter the name for the new task below. This task will be saved for this work tile and will be available for other buildings.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                id="custom-task-name"
                placeholder="e.g., Final cleanup"
                value={customTaskName}
                onChange={(e) => setCustomTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setCustomTaskName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTask}>Add Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default withAuthorization(CustomWorkPageComponent);
