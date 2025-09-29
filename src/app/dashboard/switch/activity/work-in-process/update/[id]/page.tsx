
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, FileDown, AlertTriangle, Info } from 'lucide-react';
import * as z from 'zod';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, workPlanSchema, WorkPlanData, UpdateLogData, PhotoWithMetaData, ExtraWorkData, extraWorkPlanSchema } from '@/context/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';


function UpdateWorkPlanComponent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { workPlans, setWorkPlans, extraWorkPlans, setExtraWorkPlans, workTiles, defaultTasksByTile, allWorkData, selectedProject, currentUser, companies, finalChecklists } = useAppContext();
  const { hasPermission } = usePermissions();
  const id = params.id as string;
  const planType = searchParams.get('type') || 'standard';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{flatIndex?: number; taskId: string} | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{ type: 'flat'; flatIndex: number } | { type: 'task'; flatIndex: number; taskId: string } | null>(null);
  
  // Local state for the update dialog
  const [updateDescription, setUpdateDescription] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]); // Array of data URIs
  const [currentProgress, setCurrentProgress] = useState(0);
  const [rejectionInfo, setRejectionInfo] = useState<{ remark: string; uncheckedItems: string[] } | null>(null);

  const plan = useMemo(() => 
    planType === 'standard' 
      ? workPlans.find(p => p.id === id)
      : extraWorkPlans.find(p => p.id === id),
  [id, planType, workPlans, extraWorkPlans]);

  const form = useForm<WorkPlanData | ExtraWorkData>({
    resolver: planType === 'standard' ? zodResolver(workPlanSchema) : zodResolver(extraWorkPlanSchema),
    values: plan, 
  });

  const { fields, remove: removeFlat } = useFieldArray({
    control: form.control,
    name: "flatPlans" as never, // This is a bit of a hack for union types
  });
  
  const allTasksForTile = useMemo(() => {
    if (planType !== 'standard' || !plan) return [];
    const workTileName = (plan as WorkPlanData).workTile;
    
    const allTasks = new Map<string, { id: string; label: string }>();
    const currentWorkTile = workTiles.find(t => t.name === workTileName);
    if (!currentWorkTile) return [];
    const tileId = currentWorkTile.id;

    if (tileId && defaultTasksByTile[tileId]) {
      defaultTasksByTile[tileId].forEach(task => allTasks.set(task.id, task));
    }
    
    const projectWorkItems = allWorkData.filter((w) => w.projectName === selectedProject && w.workTileId === tileId);

    projectWorkItems.forEach((work) => {
        work.customTasks?.forEach((task) => {
            if (!allTasks.has(task.id)) {
                allTasks.set(task.id, task);
            }
        });
    });

    return Array.from(allTasks.values());
  }, [plan, planType, workTiles, defaultTasksByTile, allWorkData, selectedProject]);


  const allTaskIdsInPlan = useMemo(() => {
    if (planType !== 'standard' || !plan) return [];
    const taskIds = new Set<string>();
    (plan as WorkPlanData).flatPlans.forEach(fp => {
        Object.keys(fp.tasks).forEach(taskId => taskIds.add(taskId));
    });
    return Array.from(taskIds);
  }, [plan, planType]);

  const taskHeaders = useMemo(() => allTasksForTile.filter(t => allTaskIdsInPlan.includes(t.id)), [allTasksForTile, allTaskIdsInPlan]);

  const openUpdateDialogForStandard = (flatIndex: number, taskId: string) => {
    const taskData = form.getValues(`flatPlans.${flatIndex}.tasks.${taskId}` as any);
    if (!taskData) return;

    const initialProgress = taskData.progress || 0;
    setCurrentProgress(initialProgress);
    
    if (taskData.finalCheckStatus === 'rejected') {
        const workTileId = workTiles.find(t => t.name === (plan as WorkPlanData).workTile)?.id;
        const checklist = workTileId ? finalChecklists[workTileId]?.[taskId] || [] : [];
        const checklistResults = taskData.checklistResults || {};
        const uncheckedItems = checklist.filter(point => !checklistResults[point.id]).map(p => p.point);
        setRejectionInfo({
            remark: taskData.rejectionRemark || 'No remark provided.',
            uncheckedItems: uncheckedItems
        });
    } else {
        setRejectionInfo(null);
    }
    
    setSelectedTask({ flatIndex, taskId });
    setIsDialogOpen(true);
  };

  const openUpdateDialogForExtra = (taskId: string) => {
    const extraPlan = plan as ExtraWorkData;
    const taskData = extraPlan.tasks.find(t => t.id === taskId);
    if (!taskData) return;

    setCurrentProgress(taskData.progress);
    // TODO: Handle rejection for extra work if needed in the future
    setRejectionInfo(null);
    setSelectedTask({ taskId }); // No flat index for extra work
    setIsDialogOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotos(prev => [...prev, reader.result as string]);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogUpdate = () => {
    if (!currentUser || !selectedTask) return;
    
    const photoData: PhotoWithMetaData[] = newPhotos.map(uri => ({
        dataUri: uri,
        timestamp: new Date(),
    }));

    const newUpdate: UpdateLogData = {
        date: new Date(),
        progress: currentProgress,
        description: updateDescription,
        photos: photoData,
        updatedBy: currentUser.fullName,
    };
    
    if (planType === 'standard' && selectedTask.flatIndex !== undefined) {
        const { flatIndex, taskId } = selectedTask;
        const currentUpdates = form.getValues(`flatPlans.${flatIndex}.tasks.${taskId}.updates` as any) || [];
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.updates` as any, [...currentUpdates, newUpdate]);
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.progress` as any, currentProgress);
    } else if (planType === 'extra') {
        const { taskId } = selectedTask;
        const taskIndex = (form.getValues('tasks' as any) as any[]).findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const currentUpdates = form.getValues(`tasks.${taskIndex}.updates` as any) || [];
            form.setValue(`tasks.${taskIndex}.updates` as any, [...currentUpdates, newUpdate], { shouldDirty: true });
            form.setValue(`tasks.${taskIndex}.progress` as any, currentProgress, { shouldDirty: true });
        }
    }
    
    // Reset dialog state
    setNewPhotos([]);
    setUpdateDescription('');
    setIsDialogOpen(false);
    toast({ title: 'Update Logged', description: 'Your progress update has been recorded. Save the form to persist changes.' });
  };
  
  const handleDelete = () => {
    if (!deleteRequest) return;
    
    if (deleteRequest.type === 'flat') {
        removeFlat(deleteRequest.flatIndex);
        toast({ title: 'Flat Removed', description: 'The flat has been removed from this plan. Save to confirm.'});
    } else { // 'task'
        const { flatIndex, taskId } = deleteRequest;
        const currentTasks = form.getValues(`flatPlans.${flatIndex}.tasks` as any);
        delete currentTasks[taskId];
        form.setValue(`flatPlans.${flatIndex}.tasks` as any, currentTasks, { shouldDirty: true });
        toast({ title: 'Task Removed', description: 'The task has been removed from this flat. Save to confirm.'});
    }
    
    setDeleteRequest(null);
  };


  if (!plan) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-semibold text-destructive">Work plan not found.</p>
            <p className="text-muted-foreground">The requested plan does not exist or has been deleted.</p>
            <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
        </div>
    );
  }
  
  const onSubmit = () => {
    const data = form.getValues();
    if(planType === 'standard') {
        const updatedData = { ...data } as WorkPlanData;
         setWorkPlans((prevPlans) => prevPlans.map((p) => (p.id === updatedData.id ? updatedData : p)));
         toast({ title: 'Progress Updated', description: `Work plan for ${updatedData.workTile} has been updated.` });
    } else {
        const updatedData = { ...data } as ExtraWorkData;
        setExtraWorkPlans((prevPlans) => prevPlans.map((p) => (p.id === updatedData.id ? updatedData : p)));
        toast({ title: 'Progress Updated', description: `Extra work plan has been updated.` });
    }
    router.push('/dashboard/switch/activity/work-in-process/other');
  };

  const handleDownloadPlan = () => {
    if (!plan || !companies.length) return;

    const doc = new jsPDF();
    const company = companies[0];

    // Header
    doc.setFontSize(18);
    doc.text(company.companyName, 14, 22);
    doc.setFontSize(11);
    doc.text(`Project: ${plan.projectName}`, 14, 30);

    // Plan Details
    autoTable(doc, {
      startY: 35,
      body: [
        ['Work Type', planType === 'standard' ? (plan as WorkPlanData).workTile : 'Extra Work'],
        ['Contractor', plan.contractorName],
        ['Building', (plan as WorkPlanData).buildingName || 'N/A'],
        ['Start Date', format(plan.startDate, 'PP')],
        ['End Date', format(plan.endDate, 'PP')],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
    });
    
    let tableBody: any[][] = [];

    if (planType === 'standard') {
      tableBody = (plan as WorkPlanData).flatPlans.flatMap(fp => {
        const tasksInFlat = Object.keys(fp.tasks);
        return tasksInFlat.map((taskId, index) => {
          const task = taskHeaders.find(t => t.id === taskId);
          return [
            index === 0 ? fp.flatNo : '', // Show flat number only for the first task of that flat
            task?.label || taskId,
            '', // Placeholder for Progress
            '', // Placeholder for Remarks
          ];
        });
      });
    } else {
       tableBody = (plan as ExtraWorkData).tasks.map(task => ([
           'N/A', // No flat concept for extra work
           task.taskDescription,
            '', // Placeholder
            ''  // Placeholder
       ]));
    }


    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Flat No.', 'Task Description', 'Progress', 'Remarks']],
      body: tableBody,
      theme: 'grid',
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.cell.text[0] === '') {
          doc.setDrawColor(255, 255, 255);
          doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
          doc.setDrawColor(0);
        }
      }
    });

    doc.save(`work_plan_${planType === 'standard' ? (plan as WorkPlanData).workTile : 'extra_work'}.pdf`);
  };
  
  const workItemName = planType === 'standard' ? (plan as WorkPlanData).workTile : 'Extra Work';

  return (
    <>
      <TooltipProvider>
        <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                <div className='flex justify-between items-start'>
                    <div>
                    <CardTitle>Update Progress: {workItemName}</CardTitle>
                    <CardDescription>
                        Update task progress for project: {plan.projectName}.
                    </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={handleDownloadPlan}>
                            <FileDown className="mr-2 h-4 w-4" /> Download Plan
                        </Button>
                        <Button type="submit">Submit Progress</Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-4 text-sm">
                    <div><strong>Building:</strong> {(plan as WorkPlanData).buildingName || 'N/A'}</div>
                    <div><strong>Contractor:</strong> {plan.contractorName}</div>
                    <div><strong>Start Date:</strong> {format(plan.startDate, 'PP')}</div>
                    <div><strong>End Date:</strong> {format(plan.endDate, 'PP')}</div>
                </div>
                </CardHeader>
                <CardContent>
                {planType === 'standard' ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-20">Flat No.</TableHead>
                            <TableHead>Type</TableHead>
                            {taskHeaders.map(task => (
                            <TableHead key={task.id}>{task.label}</TableHead>
                            ))}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {fields.map((field, flatIndex) => (
                            <TableRow key={field.id}>
                                <TableCell className="sticky left-0 bg-background flex items-center gap-2">
                                  {hasPermission('full_access') && (
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteRequest({ type: 'flat', flatIndex })}>
                                      <Trash2 className="h-4 w-4"/>
                                    </Button>
                                  )}
                                  {field.flatNo}
                                </TableCell>
                                <TableCell>{field.type}</TableCell>
                                {taskHeaders.map(task => {
                                    const taskData = form.watch(`flatPlans.${flatIndex}.tasks.${task.id}` as any);
                                    
                                    if (!taskData) {
                                        return <TableCell key={task.id} className="min-w-[150px] text-center"><span className="text-muted-foreground">N/A</span></TableCell>;
                                    }

                                    if (taskData.billed) {
                                        return (
                                            <TableCell key={task.id} className="min-w-[150px] text-center">
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Billed</Badge>
                                            </TableCell>
                                        );
                                    }
                                    
                                    const latestUpdate = (taskData.updates || []).slice(-1)[0];
                                    const photos = latestUpdate?.photos || [];

                                    return (
                                        <TableCell key={task.id} className="min-w-[150px] text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            {hasPermission('full_access') && (
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setDeleteRequest({type: 'task', flatIndex, taskId: task.id})}>
                                                    <Trash2 className="h-3 w-3"/>
                                                </Button>
                                            )}
                                             {taskData.finalCheckStatus === 'rejected' ? (
                                                <Button type="button" variant="destructive" size="sm" className="h-10" onClick={() => openUpdateDialogForStandard(flatIndex, task.id)}>
                                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                                    Rejected
                                                </Button>
                                             ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span>{taskData.progress || 0}%</span>
                                                    {hasPermission('full_access') && (
                                                        <Controller
                                                            name={`flatPlans.${flatIndex}.tasks.${task.id}.progress` as any}
                                                            control={form.control}
                                                            render={({ field: sliderField }) => (
                                                                <Slider
                                                                    value={[sliderField.value || 0]}
                                                                    onValueChange={(val) => sliderField.onChange(val[0])}
                                                                    max={100}
                                                                    step={1}
                                                                    className="w-24"
                                                                />
                                                            )}
                                                        />
                                                    )}
                                                    {photos.length > 0 && (
                                                        <div className="relative w-10 h-10">
                                                            <Image
                                                                src={photos[0].dataUri}
                                                                alt={`Progress for ${task.label}`}
                                                                fill
                                                                style={{ objectFit: 'cover' }}
                                                                className="rounded-md"
                                                            />
                                                            {photos.length > 1 && (
                                                                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                                                                    {photos.length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => openUpdateDialogForStandard(flatIndex, task.id)}
                                                        disabled={hasPermission('full_access')}
                                                    >
                                                        Update
                                                    </Button>
                                                </div>
                                             )}
                                          </div>
                                    </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                ) : (
                   <div className="p-4 space-y-4">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Task Description</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {(form.getValues('tasks') as ExtraWorkData['tasks']).map((task, index) => (
                               <TableRow key={task.id}>
                                   <TableCell className="font-medium">{task.taskDescription}</TableCell>
                                   <TableCell>₹{task.rate.toLocaleString()}</TableCell>
                                   <TableCell><Progress value={task.progress} className="w-24" /></TableCell>
                                   <TableCell className="text-right">
                                       <Button type="button" variant="outline" size="sm" onClick={() => openUpdateDialogForExtra(task.id)}>
                                           Update
                                       </Button>
                                   </TableCell>
                               </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
                )}
                </CardContent>
            </Card>
            </form>
        </Form>
        </div>
      </TooltipProvider>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Progress Update</DialogTitle>
                    <DialogDescription>
                        {selectedTask && planType === 'standard'
                          ? `For "${taskHeaders.find(t => t.id === selectedTask.taskId)?.label}" in Flat ${(plan as WorkPlanData).flatPlans[selectedTask.flatIndex!].flatNo}.`
                          : `For Extra Work: "${(plan as ExtraWorkData)?.tasks?.find(t => t.id === selectedTask?.taskId)?.taskDescription}"`
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    {rejectionInfo && (
                        <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
                            <h4 className="font-semibold text-destructive flex items-center gap-2"><Info className="h-5 w-5"/> Rejection Feedback</h4>
                            <div className="space-y-2 text-sm">
                                <p><strong>Remark:</strong> {rejectionInfo.remark}</p>
                                {rejectionInfo.uncheckedItems.length > 0 && (
                                    <div>
                                        <p><strong>Pending Checklist Items:</strong></p>
                                        <ul className="list-disc pl-5 text-muted-foreground">
                                            {rejectionInfo.uncheckedItems.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Progress</Label>
                            <span className="text-sm font-medium">{currentProgress}%</span>
                        </div>
                        <Slider
                            defaultValue={[currentProgress]}
                            max={100}
                            step={1}
                            onValueChange={(val) => setCurrentProgress(val[0])}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="work-description">Work Description</Label>
                        <Textarea
                            id="work-description"
                            placeholder="Describe the work done in this update..."
                            value={updateDescription}
                            onChange={(e) => setUpdateDescription(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`photo-upload`}>Attach Photos</Label>
                        <Input
                            id={`photo-upload`}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="text-xs h-9"
                            onChange={handleFileChange}
                        />
                            <div className="grid grid-cols-3 gap-2 mt-2">
                            {newPhotos.map((photo, photoIndex) => (
                                <div key={photoIndex} className="relative group">
                                    <Image
                                        src={photo}
                                        alt={`Progress photo ${photoIndex + 1}`}
                                        width={100}
                                        height={100}
                                        className="rounded-md object-cover w-full aspect-square"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== photoIndex))}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleLogUpdate}>Log Update</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={deleteRequest !== null} onOpenChange={() => setDeleteRequest(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {deleteRequest?.type === 'flat'
                        ? `This will remove Flat ${(plan as WorkPlanData).flatPlans[deleteRequest.flatIndex]?.flatNo} and all its tasks from this work plan. This action cannot be undone.`
                        : `This will remove the task "${taskHeaders.find(t => t.id === deleteRequest?.taskId)?.label}" from this flat's plan. This action cannot be undone.`
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteRequest(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Yes, remove</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

export default function UpdatePlanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <UpdateWorkPlanComponent />
        </Suspense>
    )
}
