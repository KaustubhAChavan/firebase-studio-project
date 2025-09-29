
'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  useAppContext,
  WorkPlanData,
} from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


function CreatePlanComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    flats,
    selectedProject,
    setWorkPlans,
    workPlans,
    allWorkData,
    workTiles,
    defaultTasksByTile,
  } = useAppContext();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const buildingName = searchParams.get('buildingName');
  const contractorName = searchParams.get('contractorName');
  const workTileName = searchParams.get('workTile');

  const tasks = useMemo(() => {
    if (!workTileName) return [];
    
    const allTasksForTile = new Map<string, { id: string; label: string }>();
    const currentWorkTile = workTiles.find(t => t.name === workTileName);
    if (!currentWorkTile) return [];
    const tileId = currentWorkTile.id;

    if (tileId && defaultTasksByTile[tileId]) {
      defaultTasksByTile[tileId].forEach(task => allTasksForTile.set(task.id, task));
    }
    
    const projectWorkItems = allWorkData.filter((w) => w.projectName === selectedProject && w.workTileId === tileId);

    projectWorkItems.forEach((work) => {
        work.customTasks?.forEach((task) => {
            if (!allTasksForTile.has(task.id)) {
                allTasksForTile.set(task.id, task);
            }
        });
    });

    return Array.from(allTasksForTile.values());
  }, [workTileName, selectedProject, workTiles, defaultTasksByTile, allWorkData]);

  const buildingFlats = useMemo(
    () => flats.filter((flat) => flat.buildingName === buildingName && flat.projectName === selectedProject),
    [flats, buildingName, selectedProject]
  );
  
  const taskStatusMap = useMemo(() => {
    const statusMap = new Map<string, 'wip' | 'final_work' | 'billing' | 'billed'>();

    workPlans
      .filter(plan =>
        plan.projectName === selectedProject &&
        plan.buildingName === buildingName &&
        plan.workTile === workTileName
      )
      .forEach(plan => {
        plan.flatPlans.forEach(fp => {
          Object.entries(fp.tasks).forEach(([taskId, taskDetails]) => {
            const key = `${fp.flatNo}-${taskId}`;
            if (taskDetails.billed) {
              statusMap.set(key, 'billed');
            } else if (taskDetails.finalCheckStatus === 'approved') {
              statusMap.set(key, 'billing');
            } else if (taskDetails.progress === 100) {
              statusMap.set(key, 'final_work');
            } else if (taskDetails.progress >= 0) {
              statusMap.set(key, 'wip');
            }
          });
        });
      });

    return statusMap;
  }, [workPlans, selectedProject, buildingName, workTileName]);

  const formSchema = z.object({
    flatPlans: z.array(
      z.object({
        flatNo: z.string(),
        type: z.string(),
        tasks: z.record(z.boolean()),
      })
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flatPlans: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "flatPlans",
  });
  
  useEffect(() => {
    if (buildingFlats.length > 0) {
      const newFlatPlans = buildingFlats.map(flat => ({
        flatNo: flat.flatNo,
        type: flat.type,
        tasks: tasks.reduce((acc, task) => {
          acc[task.id] = false;
          return acc;
        }, {} as Record<string, boolean>)
      }));
      replace(newFlatPlans);
    } else {
      replace([]);
    }
  }, [tasks, buildingFlats, replace]);


  if (!startDate || !endDate || !buildingName || !contractorName || !workTileName) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold text-destructive">Missing planning information.</p>
        <p className="text-muted-foreground">Please go back and select all required fields.</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }
  
  const getStatusBadge = (status: 'wip' | 'final_work' | 'billing' | 'billed' | undefined) => {
    switch(status) {
        case 'billed': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Billed</Badge>;
        case 'billing': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">For Billing</Badge>;
        case 'final_work': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Final Check</Badge>;
        case 'wip': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">WIP</Badge>;
        default: return null;
    }
  }

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const submittedStartDate = parseISO(startDate);
    const submittedEndDate = parseISO(endDate);

    const existingPlanIndex = workPlans.findIndex(plan => 
        plan.projectName === selectedProject &&
        plan.buildingName === buildingName &&
        plan.contractorName === contractorName &&
        plan.workTile === workTileName &&
        new Date(plan.startDate).getTime() === submittedStartDate.getTime() &&
        new Date(plan.endDate).getTime() === submittedEndDate.getTime()
    );

    if (existingPlanIndex !== -1) {
        const updatedPlans = [...workPlans];
        const planToUpdate = { ...updatedPlans[existingPlanIndex] };
        
        data.flatPlans.forEach(submittedFp => {
            const selectedTasks: Record<string, { progress: number; photos?: string[], finalCheckStatus: 'pending' }> = {};
            for (const taskId in submittedFp.tasks) {
                if (submittedFp.tasks[taskId]) {
                    selectedTasks[taskId] = { progress: 0, photos: [], finalCheckStatus: 'pending' };
                }
            }

            const existingFpIndex = planToUpdate.flatPlans.findIndex(fp => fp.flatNo === submittedFp.flatNo);
            if (existingFpIndex !== -1) {
                const existingFp = planToUpdate.flatPlans[existingFpIndex];
                const updatedTasks = { ...existingFp.tasks };
                for (const taskId in selectedTasks) {
                    if (!updatedTasks[taskId]) { 
                        updatedTasks[taskId] = selectedTasks[taskId];
                    }
                }
                 planToUpdate.flatPlans[existingFpIndex] = { ...existingFp, tasks: updatedTasks };
            } else if (Object.keys(selectedTasks).length > 0) {
                planToUpdate.flatPlans.push({
                    flatNo: submittedFp.flatNo,
                    type: submittedFp.type,
                    tasks: selectedTasks
                });
            }
        });
        
        updatedPlans[existingPlanIndex] = planToUpdate;
        setWorkPlans(updatedPlans);

        toast({
            title: "Plan Merged",
            description: `Tasks have been added/updated for the existing plan for ${workTileName}.`
        });

    } else {
        const newPlan: WorkPlanData = {
            id: crypto.randomUUID(),
            projectName: selectedProject!,
            startDate: submittedStartDate,
            endDate: submittedEndDate,
            createdAt: new Date(),
            buildingName,
            contractorName,
            workTile: workTileName!,
            flatPlans: data.flatPlans
                .map(fp => {
                    const selectedTasks: Record<string, { progress: number; photos?: string[], finalCheckStatus: 'pending' }> = {};
                    for (const taskId in fp.tasks) {
                        if (fp.tasks[taskId]) {
                            selectedTasks[taskId] = { progress: 0, photos: [], finalCheckStatus: 'pending' };
                        }
                    }
                    if (Object.keys(selectedTasks).length > 0) {
                        return {
                            flatNo: fp.flatNo,
                            type: fp.type,
                            tasks: selectedTasks
                        };
                    }
                    return null;
                })
                .filter(fp => fp !== null) as WorkPlanData['flatPlans'],
        };
        
        if (newPlan.flatPlans.length === 0) {
            toast({
                variant: "destructive",
                title: "No Tasks Selected",
                description: "Please select at least one task to create a plan."
            });
            return;
        }

        setWorkPlans(prev => [...prev, newPlan]);
        toast({
            title: "Plan Created",
            description: `A new plan for ${workTileName} has been created.`
        });
    }

    router.push('/dashboard/switch/activity/work-in-process/other');
  };

  return (
    <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                 <Card>
                    <CardHeader>
                        <div className='flex justify-between items-start'>
                            <div>
                                <CardTitle>Plan: {workTileName}</CardTitle>
                                <CardDescription>
                                    Select the flats and tasks to include in this plan for project: {selectedProject}.
                                </CardDescription>
                            </div>
                            <Button type="submit">Submit Plan</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-4 text-sm">
                            <div><strong>Building:</strong> {buildingName}</div>
                            <div><strong>Contractor:</strong> {contractorName}</div>
                            <div><strong>Start Date:</strong> {format(parseISO(startDate), 'PP')}</div>
                            <div><strong>End Date:</strong> {format(parseISO(endDate), 'PP')}</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tasks.length > 0 ? (
                             <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 z-20">Flat No.</TableHead>
                                            <TableHead>Type</TableHead>
                                            {tasks.map(task => <TableHead key={task.id}>{task.label}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="sticky left-0 bg-background">{field.flatNo}</TableCell>
                                                <TableCell>{field.type}</TableCell>
                                                {tasks.map(task => {
                                                    const taskStatus = taskStatusMap.get(`${field.flatNo}-${task.id}`);
                                                    return (
                                                        <TableCell key={task.id} className="text-center">
                                                            {taskStatus ? getStatusBadge(taskStatus) : (
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`flatPlans.${index}.tasks.${task.id}`}
                                                                    render={({ field: checkboxField }) => (
                                                                        <FormItem className="flex items-center justify-center">
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={checkboxField.value}
                                                                                    onCheckedChange={checkboxField.onChange}
                                                                                    disabled={!!taskStatus}
                                                                                />
                                                                            </FormControl>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                        ) : (
                            <p className="text-muted-foreground text-center p-4">
                                This work tile has no defined tasks. Please go to 'Assign Work Tiles' to add tasks for '{workTileName}'.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </form>
        </Form>
    </div>
  );
}

export default function CreatePlanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreatePlanComponent />
        </Suspense>
    )
}
