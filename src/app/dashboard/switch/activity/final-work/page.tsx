
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

export default function FinalWorkPage() {
  const router = useRouter();
  const { workPlans, extraWorkPlans, selectedProject } = useAppContext();
  const { hasPermission } = usePermissions();

  const plansForVerification = useMemo(() => {
    const standardPlans = workPlans
      .filter(plan => plan.projectName === selectedProject)
      .filter(plan => 
        plan.flatPlans.some(fp => 
          Object.values(fp.tasks).some(task => task.progress === 100 && task.finalCheckStatus !== 'approved')
        )
      );
      
    const extraPlans = extraWorkPlans
        .filter(plan => plan.projectName === selectedProject)
        .filter(plan => 
            plan.tasks.some(task => task.progress === 100 && task.finalCheckStatus !== 'approved')
        );

    return [...standardPlans, ...extraPlans];
  }, [workPlans, extraWorkPlans, selectedProject]);

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
       <Card>
        <CardHeader>
          <CardTitle>Final Work Verification</CardTitle>
          <CardDescription>
            Verify completed tasks for project: {selectedProject}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Item</TableHead>
                <TableHead>Building / N.A.</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansForVerification.length > 0 ? (
                plansForVerification.map(plan => {
                  const isExtra = 'tasks' in plan;
                  const workItem = isExtra ? 'Extra Work' : plan.workTile;
                  const planId = plan.id;
                  const planType = isExtra ? 'extra' : 'standard';

                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{workItem}</TableCell>
                      <TableCell>{plan.buildingName || 'N/A'}</TableCell>
                      <TableCell>{plan.contractorName}</TableCell>
                      <TableCell>{format(plan.startDate, 'PP')} - {format(plan.endDate, 'PP')}</TableCell>
                      <TableCell className="text-right">
                        {hasPermission('manage_final_work') && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/switch/activity/final-work/verify/${planId}?type=${planType}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Verify
                              </Link>
                            </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No work is currently pending final verification.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
