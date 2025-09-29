
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { ArrowLeft, ThumbsDown, ThumbsUp, AlertTriangle, Info } from 'lucide-react';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, workPlanSchema, ExtraWorkData, extraWorkPlanSchema, ChecklistPoint, PhotoWithMetaData } from '@/context/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function VerifyWorkPlanComponent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { workPlans, setWorkPlans, extraWorkPlans, setExtraWorkPlans, workTiles, finalChecklists } = useAppContext();
  const id = params.id as string;
  const planType = searchParams.get('type') || 'standard';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<{flatIndex?: number; taskId: string} | null>(null);

  const plan = useMemo(() => 
    planType === 'standard' 
      ? workPlans.find(p => p.id === id)
      : extraWorkPlans.find(p => p.id === id),
  [id, planType, workPlans, extraWorkPlans]);

  const form = useForm({
    resolver: planType === 'standard' ? zodResolver(workPlanSchema) : zodResolver(extraWorkPlanSchema),
    values: plan, 
  });
  
  const { fields, update } = useFieldArray({
    control: form.control,
    name: "flatPlans" as never,
  });

   const extraWorkTaskFields = (form.getValues() as ExtraWorkData).tasks || [];
  
  const workTile = useMemo(() => {
    if (planType !== 'standard' || !plan) return null;
    return workTiles.find(t => t.name === (plan as any).workTile);
  }, [workTiles, plan, planType]);
  
  const taskHeaders = useMemo(() => {
    if (planType !== 'standard' || !plan || !workTile) return [];
    const taskIdsInPlan = new Set<string>();
    (plan as any).flatPlans.forEach((fp: any) => {
        Object.keys(fp.tasks).forEach(taskId => taskIdsInPlan.add(taskId));
    });

    return (workTile.tasks || []).filter(t => taskIdsInPlan.has(t.id));
  }, [plan, workTile, planType]);
  
  const getChecklistForTask = (taskId: string): ChecklistPoint[] => {
    if (!workTile) return [];
    const workTileId = workTile?.id;
    return finalChecklists[workTileId]?.[taskId] || [];
  };
  
  const allPhotosForActiveTask = useMemo(() => {
    if (!plan) return [];
    if (planType === 'standard' && activeTask && activeTask.flatIndex !== undefined) {
        const { flatIndex, taskId } = activeTask;
        const updates = (plan as any).flatPlans[flatIndex].tasks[taskId].updates || [];
        return updates.flatMap((update: any) => update.photos || []);
    }
    if (planType === 'extra' && activeTask) {
        const { taskId } = activeTask;
        const taskData = (plan as ExtraWorkData).tasks.find(t => t.id === taskId);
        return taskData?.updates?.flatMap((update: any) => update.photos || []) || [];
    }
    return [];
  }, [activeTask, plan, planType]);


  const handleApprove = () => {
    if (planType === 'standard' && activeTask && activeTask.flatIndex !== undefined) {
        const { flatIndex, taskId } = activeTask;
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.rejectionRemark` as any, '', { shouldDirty: true });
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.finalCheckStatus` as any, 'approved', { shouldDirty: true });
        toast({ title: 'Task Approved' });
    } else if (planType === 'extra' && activeTask) {
        const { taskId } = activeTask;
        const taskIndex = (plan as ExtraWorkData).tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            form.setValue(`tasks.${taskIndex}.rejectionRemark` as any, '', { shouldDirty: true });
            form.setValue(`tasks.${taskIndex}.finalCheckStatus` as any, 'approved', { shouldDirty: true });
            toast({ title: 'Extra Work Approved' });
        }
    }
    setIsDialogOpen(false);
  };
  
  const handleReject = () => {
    if (planType === 'standard' && activeTask && activeTask.flatIndex !== undefined) {
        const { flatIndex, taskId } = activeTask;
        const rejectionRemark = form.getValues(`flatPlans.${flatIndex}.tasks.${taskId}.rejectionRemark` as any);
        if (!rejectionRemark || rejectionRemark.trim() === '') {
            form.setError(`flatPlans.${flatIndex}.tasks.${taskId}.rejectionRemark` as any, { type: 'manual', message: 'A remark is required for rejection.' });
            toast({ variant: 'destructive', title: 'Remark Required', description: 'Please provide a reason for rejecting this task.' });
            return;
        }
        form.clearErrors(`flatPlans.${flatIndex}.tasks.${taskId}.rejectionRemark` as any);
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.finalCheckStatus` as any, 'rejected', { shouldDirty: true });
        form.setValue(`flatPlans.${flatIndex}.tasks.${taskId}.progress` as any, 50, { shouldDirty: true });
        toast({ title: 'Task Rejected', description: 'Progress has been set to 50%.' });
    } else if (planType === 'extra' && activeTask) {
        const { taskId } = activeTask;
        const taskIndex = (plan as ExtraWorkData).tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const rejectionRemark = form.getValues(`tasks.${taskIndex}.rejectionRemark` as any);
            if (!rejectionRemark || rejectionRemark.trim() === '') {
                form.setError(`tasks.${taskIndex}.rejectionRemark` as any, { type: 'manual', message: 'A remark is required for rejection.' });
                toast({ variant: 'destructive', title: 'Remark Required', description: 'Please provide a reason for rejecting this work.' });
                return;
            }
            form.clearErrors(`tasks.${taskIndex}.rejectionRemark` as any);
            form.setValue(`tasks.${taskIndex}.finalCheckStatus` as any, 'rejected', { shouldDirty: true });
            form.setValue(`tasks.${taskIndex}.progress` as any, 50, { shouldDirty: true });
            toast({ title: 'Extra Work Rejected', description: 'Progress has been set to 50%.' });
        }
    }
    setIsDialogOpen(false);
};
  
  const onSubmit = () => {
    const data = form.getValues();
    if (planType === 'standard') {
        setWorkPlans((prevPlans) => prevPlans.map((p) => (p.id === data.id ? data as any : p)));
        toast({ title: "Verification Saved", description: `Changes for ${(plan as any)?.workTile} have been saved.` });
    } else {
        setExtraWorkPlans((prevPlans) => prevPlans.map((p) => (p.id === data.id ? data as any : p)));
        toast({ title: "Verification Saved", description: `Changes for extra work have been saved.` });
    }
    router.push('/dashboard/switch/activity/final-work');
  };

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold text-destructive">Work plan not found.</p>
        <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
      </div>
    );
  }
  
  const getStatusBadge = (status: string, remark?: string) => {
      let badge;
      switch(status) {
          case 'approved': 
              badge = <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50">Approved</Badge>;
              break;
          case 'rejected':
              badge = <Badge variant="destructive">Rejected</Badge>;
              break;
          default:
              badge = <Badge variant="secondary">Pending</Badge>;
              break;
      }
      if (status === 'rejected' && remark) {
          return (
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>{badge}</TooltipTrigger>
                      <TooltipContent><p className="max-w-xs">{remark}</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          )
      }
      return badge;
  }

  const renderExtraWorkVerification = () => {
    const extraPlan = plan as ExtraWorkData;
    return (
      <Card>
        <CardHeader>
          <div className='flex justify-between items-start'>
            <div>
                <CardTitle>Verify Extra Work</CardTitle>
                <CardDescription>Project: {extraPlan.projectName} | Contractor: {extraPlan.contractorName}</CardDescription>
            </div>
            <Button type="button" onClick={onSubmit}>Save Changes</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {extraWorkTaskFields.map((task, index) => {
                        const taskData = (form.watch() as any).tasks[index];
                         if (taskData.progress < 100) return null; // Only show completed tasks
                         return (
                            <TableRow key={task.id}>
                                <TableCell>{task.taskDescription}</TableCell>
                                <TableCell>₹{task.rate.toLocaleString()}</TableCell>
                                <TableCell>
                                {getStatusBadge(taskData.finalCheckStatus, taskData.rejectionRemark)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="outline" size="sm" onClick={() => { setActiveTask({ taskId: task.id }); setIsDialogOpen(true); }}>
                                        Verify
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    );
  };
  
  const renderStandardWorkVerification = () => (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-start'>
          <div><CardTitle>Verify Work: {(plan as any).workTile}</CardTitle><CardDescription>Project: {(plan as any).projectName}</CardDescription></div>
          <Button type="button" onClick={onSubmit}>Save Changes</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="sticky left-0 z-20">Flat No.</TableHead>{taskHeaders.map(task => <TableHead key={task.id}>{task.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {fields.map((field, flatIndex) => (
                <TableRow key={field.id}>
                  <TableCell className="sticky left-0 bg-background">{field.flatNo}</TableCell>
                  {taskHeaders.map(task => {
                    const taskData = (field as any).tasks[task.id];
                    if (!taskData || taskData.billed) {
                      return (
                        <TableCell key={task.id} className="min-w-[150px] text-center">
                          {taskData?.billed ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Billed</Badge> : '-'}
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={task.id} className="min-w-[150px] text-center">
                        {taskData.progress === 100 ? (
                          <div className="flex flex-col items-center gap-2">
                             {getStatusBadge((form.watch() as any).flatPlans[flatIndex].tasks[task.id].finalCheckStatus, (form.watch() as any).flatPlans[flatIndex].tasks[task.id].rejectionRemark)}
                            <Button type="button" variant="outline" size="sm" onClick={() => { setActiveTask({ flatIndex, taskId: task.id }); setIsDialogOpen(true); }}>
                                Verify
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{taskData.progress}%</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>

      <Form {...form}>
        <form>
          {planType === 'standard' ? renderStandardWorkVerification() : renderExtraWorkVerification()}
        </form>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Verify: {planType === 'standard' && activeTask ? taskHeaders.find(t => t.id === activeTask.taskId)?.label : activeTask ? (plan as ExtraWorkData).tasks.find(t => t.id === activeTask.taskId)?.taskDescription : ''}
                {planType === 'standard' && activeTask && ` (Flat ${(plan as any).flatPlans[activeTask.flatIndex!].flatNo})`}
              </DialogTitle>
            </DialogHeader>
              {plan && (
                <>
                  <div className="grid md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto p-1">
                     <div>
                      <h3 className="font-semibold text-lg">Uploaded Photos</h3>
                      <Carousel className="w-full mt-2">
                        <CarouselContent>
                          {allPhotosForActiveTask.length > 0 ? (
                            allPhotosForActiveTask.map((photo: PhotoWithMetaData, index) => (
                              <CarouselItem key={index}>
                                <div className="p-1">
                                  <Card>
                                    <CardContent className="flex aspect-video items-center justify-center p-2 relative">
                                      <Image src={photo.dataUri} alt={`Task Photo ${index + 1}`} fill style={{ objectFit: 'contain' }} />
                                    </CardContent>
                                    <CardDescription className="p-2 text-xs text-center border-t">
                                      {format(photo.timestamp, 'PP pp')}
                                    </CardDescription>
                                  </Card>
                                </div>
                              </CarouselItem>
                            ))
                          ) : (
                            <CarouselItem>
                              <div className="p-1"><Card><CardContent className="flex aspect-video items-center justify-center p-2 relative">
                                <p className="text-sm text-muted-foreground">No photos were uploaded.</p>
                              </CardContent></Card></div>
                            </CarouselItem>
                          )}
                        </CarouselContent>
                        {allPhotosForActiveTask.length > 1 && (<><CarouselPrevious /><CarouselNext /></>)}
                      </Carousel>
                    </div>
                  </div>
                   <div className="px-1 pt-4">
                       <FormField
                        control={form.control}
                        name={planType === 'standard' && activeTask && activeTask.flatIndex !== undefined ? `flatPlans.${activeTask.flatIndex}.tasks.${activeTask.taskId}.rejectionRemark` as any :
                        planType === 'extra' && activeTask ? `tasks.${(plan as ExtraWorkData).tasks.findIndex(t => t.id === activeTask.taskId)}.rejectionRemark` as any : 'rejectionRemark' as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rejection Remark (Required if rejecting)</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Provide a detailed reason for rejection..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                </>
              )}
            <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleReject}><ThumbsDown className="mr-2 h-4 w-4" /> Reject</Button>
                <Button type="button" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={handleApprove}><ThumbsUp className="mr-2 h-4 w-4" /> Approve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Form>
    </div>
  );
}

export default function VerifyPlanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyWorkPlanComponent />
        </Suspense>
    )
}
