
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type TaskDetail = {
  id: string;
  label: string;
  progress: number;
  status: 'Billed' | 'Final Check' | 'WIP' | 'Planned' | 'Pending';
  contractorName?: string;
  billedDate?: Date | null;
};

type WorkTileStatus = {
  name: string;
  tasks: TaskDetail[];
};

function FlatDetailsComponent() {
  const router = useRouter();
  const params = useParams();
  const { selectedProject, workTiles, flats, workPlans, allWorkData, contractorBills } = useAppContext();
  
  const flatNo = decodeURIComponent(params.flatNo as string);

  const flatDetails = useMemo(() => 
    flats.find(f => f.projectName === selectedProject && f.flatNo === flatNo), 
    [flats, selectedProject, flatNo]
  );

  const workStatusForFlat = useMemo((): WorkTileStatus[] => {
    if (!flatDetails) return [];
    
    const assignedWorkForBuilding = allWorkData.filter(
      w => w.projectName === selectedProject && w.buildingName === flatDetails.buildingName
    );

    return assignedWorkForBuilding.map(assignedWork => {
      const workTileInfo = workTiles.find(wt => wt.id === assignedWork.workTileId);
      if (!workTileInfo) return null;

      const allPossibleTasks = new Map<string, { id: string; label: string }>();
      (workTileInfo.tasks || []).forEach(task => allPossibleTasks.set(task.id, task));
      (assignedWork.customTasks || []).forEach(task => allPossibleTasks.set(task.id, task));

      const allRegisteredTasks = Array.from(allPossibleTasks.values());
      if (allRegisteredTasks.length === 0) return null;

      const detailedTasks: TaskDetail[] = allRegisteredTasks.map(task => {
        const workPlan = workPlans.find(p => p.workTile === workTileInfo.name && p.buildingName === flatDetails.buildingName);
        const flatPlan = workPlan?.flatPlans.find(fp => fp.flatNo === flatDetails.flatNo);
        const taskDetailsFromPlan = flatPlan?.tasks[task.id];
        const progress = taskDetailsFromPlan?.progress || 0;
        
        let status: TaskDetail['status'] = 'Pending';
        let billedDate: Date | null = null;
        
        if (taskDetailsFromPlan) {
          if (taskDetailsFromPlan.billed) {
            status = 'Billed';
            const bill = contractorBills.find(b => b.billedItems.some(item => item.planId === workPlan?.id && item.flatNo === flatDetails.flatNo && item.taskId === task.id));
            if (bill) {
                billedDate = bill.date;
            }
          } else if (taskDetailsFromPlan.finalCheckStatus === 'approved' || progress === 100) {
            status = 'Final Check';
          } else if (progress > 0) {
            status = 'WIP';
          } else {
            status = 'Planned';
          }
        }
        
        return {
          id: task.id,
          label: task.label,
          progress,
          status,
          contractorName: workPlan?.contractorName,
          billedDate: billedDate,
        };
      });
  
      return {
        name: workTileInfo.name,
        tasks: detailedTasks,
      };
    }).filter((item): item is WorkTileStatus => item !== null && item.tasks.length > 0);
  }, [flatDetails, selectedProject, allWorkData, workTiles, workPlans, contractorBills]);

  const getStatusBadge = (status: TaskDetail['status']) => {
    switch(status) {
        case 'Billed': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Billed</Badge>;
        case 'Final Check': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Final Check</Badge>;
        case 'WIP': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">WIP</Badge>;
        case 'Planned': return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200">Planned</Badge>;
        default: return <Badge variant="secondary">Pending</Badge>;
    }
  }

  const handleDownloadPDF = () => {
    if (!flatDetails || workStatusForFlat.length === 0) return;

    const doc = new jsPDF();
    doc.text(`Work Status Report for Flat: ${flatDetails.flatNo}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Project: ${selectedProject} | Building: ${flatDetails.buildingName} | Floor: ${flatDetails.floorName} | Unit: ${flatDetails.type}`, 14, 26);
    
    let startY = 35;

    workStatusForFlat.forEach(work => {
      autoTable(doc, {
        startY: startY,
        head: [[work.name]],
        body: [],
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 12 },
        didDrawPage: (data) => {
          startY = data.cursor?.y || 10;
        }
      });
      startY = (doc as any).lastAutoTable.finalY;

      const head = [['Task', 'Progress', 'Status', 'Contractor', 'Billed Date']];
      const body = work.tasks.map(task => [
        task.label,
        `${task.progress}%`,
        task.status,
        task.contractorName || 'N/A',
        task.billedDate ? format(task.billedDate, 'dd-MM-yyyy') : '-',
      ]);

      autoTable(doc, {
        startY: startY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data) => {
          startY = data.cursor?.y || 10;
        }
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`flat_status_${flatDetails.flatNo}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!flatDetails || workStatusForFlat.length === 0) return;

    const wb = XLSX.utils.book_new();
    
    workStatusForFlat.forEach(work => {
      const wsData = [
        ['Task', 'Progress', 'Status', 'Contractor', 'Billed Date'],
        ...work.tasks.map(task => [
          task.label,
          task.progress,
          task.status,
          task.contractorName || 'N/A',
          task.billedDate ? format(task.billedDate, 'yyyy-MM-dd') : '-',
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, work.name.replace(/[/\\?*:[\]]/g, '').substring(0, 30));
    });

    XLSX.writeFile(wb, `flat_status_${flatDetails.flatNo}.xlsx`);
  };

  if (!flatDetails) {
    return <div className="p-4"><Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button><p className="mt-4">Flat details not found.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Status List
        </Button>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
            <Button variant="outline" onClick={handleDownloadExcel}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Status for Flat {flatDetails.flatNo}</CardTitle>
          <CardDescription>
            Building: {flatDetails.buildingName} | Floor: {flatDetails.floorName} | Unit: {flatDetails.type} | Project: {selectedProject}
          </CardDescription>
        </CardHeader>
      </Card>
      
      {workStatusForFlat.length > 0 ? (
        workStatusForFlat.map((work, index) => (
          <Card key={work.name}>
             <CardHeader className="bg-muted/50 py-3 px-4 border-b">
                 <h3 className="text-lg font-semibold">{work.name}</h3>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px] border-r">Flat Details</TableHead>
                        {work.tasks.map(task => (
                          <TableHead key={task.id} className="text-center min-w-[200px] border-r">{task.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="border-r align-top text-sm space-y-1">
                             <p><strong>Work Status:</strong></p>
                             <p><strong>Contractor:</strong></p>
                             <p><strong>Billed Date:</strong></p>
                        </TableCell>
                        {work.tasks.map(task => (
                          <TableCell key={task.id} className="text-center align-top border-r">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="flex items-center gap-2">
                                <Progress value={task.progress} className="w-16 h-2"/>
                                <span className="font-semibold text-xs">{task.progress}%</span>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div>{getStatusBadge(task.status)}</div>
                                <div className="text-muted-foreground">{task.contractorName || 'N/A'}</div>
                                <div className="text-muted-foreground">{task.billedDate ? format(task.billedDate, 'dd-MM-yyyy') : '-'}</div>
                              </div>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
               </div>
             </CardContent>
          </Card>
        ))
      ) : (
        <Card>
            <CardContent className="text-center py-10">
              <p className="text-muted-foreground">No work has been assigned to this flat's building yet.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FlatDetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FlatDetailsComponent />
        </Suspense>
    )
}
