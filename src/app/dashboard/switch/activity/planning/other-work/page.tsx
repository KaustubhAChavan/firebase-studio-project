
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useAppContext,
  ExtraWorkData,
  extraWorkPlanSchema,
} from '@/context/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const planningSelectionSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  buildingName: z.string().min(1, 'Please select a building.'),
  contractorName: z.string().min(1, 'Please select a contractor.'),
});


type FormSchemaType = z.infer<typeof planningSelectionSchema>;

const extraWorkItemSchema = z.object({
  taskDescription: z.string().min(1, 'Task description is required.'),
  rate: z.coerce.number().positive('A positive rate is required.'),
});

const extraWorkDialogSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  contractorName: z.string({ required_error: 'Please select a contractor.' }),
  buildingName: z.string().optional(),
  flatNo: z.string().optional(),
  items: z.array(extraWorkItemSchema).min(1, 'Please add at least one task.'),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be on or after the start date.",
  path: ["endDate"],
});


export default function OtherWorkPlanningPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    selectedProject,
    buildings,
    suppliers,
    workTiles,
    setExtraWorkPlans,
    extraWorkPlans,
  } = useAppContext();

  const [isExtraWorkDialogOpen, setIsExtraWorkDialogOpen] = useState(false);

  const projectBuildings = useMemo(
    () => buildings.filter((b) => b.projectName === selectedProject),
    [buildings, selectedProject]
  );
  const projectContractors = useMemo(
    () => suppliers.filter((s) => s.supplierType.includes('Contractor')),
    [suppliers]
  );

  const allWorkTiles = useMemo(
    () => workTiles,
    [workTiles]
  );

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(planningSelectionSchema),
    defaultValues: {
      startDate: undefined,
      endDate: undefined,
      buildingName: '',
      contractorName: '',
    },
  });

  const extraWorkForm = useForm<z.infer<typeof extraWorkDialogSchema>>({
    resolver: zodResolver(extraWorkDialogSchema),
    defaultValues: {
      items: [{ taskDescription: '', rate: 0 }],
      startDate: new Date(),
      endDate: new Date(),
      contractorName: ''
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: extraWorkForm.control,
    name: "items",
  });

  const watchedValues = form.watch();
  const isFormValid = planningSelectionSchema.safeParse(watchedValues).success;

  const buildPlanUrl = (workTileId: string) => {
    if (!isFormValid) return '#';
    const params = new URLSearchParams({
      startDate: watchedValues.startDate!.toISOString(),
      endDate: watchedValues.endDate!.toISOString(),
      buildingName: watchedValues.buildingName,
      contractorName: watchedValues.contractorName,
      workTile: workTiles.find(t => t.id === workTileId)?.name || '',
    });
    return `/dashboard/switch/activity/planning/other-work/create?${params.toString()}`;
  };

  const onExtraWorkSubmit = (data: z.infer<typeof extraWorkDialogSchema>) => {
    if (!selectedProject) {
      toast({ variant: 'destructive', title: 'Error', description: 'No project selected.' });
      return;
    }
    
    const submittedStartDate = data.startDate;
    const submittedEndDate = data.endDate;

    const existingPlanIndex = extraWorkPlans.findIndex(plan => 
        plan.projectName === selectedProject &&
        plan.contractorName === data.contractorName &&
        new Date(plan.startDate).getTime() === submittedStartDate.getTime() &&
        new Date(plan.endDate).getTime() === submittedEndDate.getTime()
    );
    
    const newTasks: ExtraWorkData['tasks'] = data.items.map(item => ({
      id: crypto.randomUUID(),
      taskDescription: item.taskDescription,
      rate: item.rate,
      progress: 0,
      finalCheckStatus: 'pending',
      updates: [],
    }));

    if (existingPlanIndex !== -1) {
      const updatedPlans = [...extraWorkPlans];
      const planToUpdate = updatedPlans[existingPlanIndex];
      planToUpdate.tasks.push(...newTasks);
      setExtraWorkPlans(updatedPlans);
      toast({ title: 'Tasks Added', description: `New tasks have been added to an existing extra work plan.` });
    } else {
       const newPlan: ExtraWorkData = {
        id: crypto.randomUUID(),
        projectName: selectedProject,
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: new Date(),
        contractorName: data.contractorName,
        tasks: newTasks,
        buildingName: data.buildingName || '',
        flatNo: data.flatNo || '',
      };
      setExtraWorkPlans(prev => [...prev, newPlan]);
      toast({ title: 'Extra Work Plan Created', description: `A new plan has been created.` });
    }

    setIsExtraWorkDialogOpen(false);
    extraWorkForm.reset({ items: [{ taskDescription: '', rate: 0 }], startDate: new Date(), endDate: new Date(), contractorName: '', buildingName: '', flatNo: '' });
  };

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Create New Work Plan</CardTitle>
              <CardDescription>
                Select the date range, building, and contractor to start planning
                for project: {selectedProject}.
              </CardDescription>
            </div>
            <Dialog open={isExtraWorkDialogOpen} onOpenChange={setIsExtraWorkDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Plan Extra Work
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Plan Miscellaneous/Extra Work</DialogTitle>
                        <DialogDescription>
                            Use this for one-off tasks. If a plan with the same contractor and dates exists, tasks will be merged.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...extraWorkForm}>
                        <form onSubmit={extraWorkForm.handleSubmit(onExtraWorkSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={extraWorkForm.control}
                                    name="contractorName"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contractor</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a contractor" /></SelectTrigger></FormControl>
                                            <SelectContent>{projectContractors.map(c => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={extraWorkForm.control}
                                    name="buildingName"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Building (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger></FormControl>
                                            <SelectContent>{projectBuildings.map(b => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={extraWorkForm.control} name="startDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )} />
                                <FormField control={extraWorkForm.control} name="endDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>End Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-4">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                                        <FormField
                                            control={extraWorkForm.control}
                                            name={`items.${index}.taskDescription`}
                                            render={({ field }) => (
                                                <FormItem className="col-span-8"><FormLabel>Task Description</FormLabel><FormControl><Textarea placeholder="e.g., Demolish temporary wall in lobby" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={extraWorkForm.control}
                                            name={`items.${index}.rate`}
                                            render={({ field }) => (
                                                <FormItem className="col-span-3"><FormLabel>Rate</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}
                                        />
                                        <div className="col-span-1 flex items-end h-full">
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ taskDescription: '', rate: 0 })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                            </Button>

                            <DialogFooter>
                                <Button type="submit">Create / Merge Plan</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-8">
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="buildingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectBuildings.map((b) => (
                            <SelectItem
                              key={b.buildingName}
                              value={b.buildingName}
                            >
                              {b.buildingName}
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
                  name="contractorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contractor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contractor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectContractors.map((c) => (
                            <SelectItem
                              key={c.supplierName}
                              value={c.supplierName}
                            >
                              {c.supplierName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isFormValid && (
        <Card>
            <CardHeader>
                <CardTitle>Select Work Tile</CardTitle>
                <CardDescription>Click a tile to create a detailed plan for that work type.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allWorkTiles.map((tile) => (
                        <Button
                            key={tile.id}
                            variant="outline"
                            className="h-24 whitespace-normal p-4 text-center text-sm"
                            asChild
                        >
                            <Link href={buildPlanUrl(tile.id)}>{tile.name}</Link>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
