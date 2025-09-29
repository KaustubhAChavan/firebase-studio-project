
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type TaskStatus = 'Pending' | 'Planned' | 'In Progress' | 'Completed';

type TaskDetail = {
  id: string;
  label: string;
  progress: number;
  status: TaskStatus;
};

type StatusDetails = {
    overallStatus: TaskStatus;
    tasks: TaskDetail[];
    overallProgress: number;
}

export default function OtherWorkStatusPage() {
  const router = useRouter();
  const { selectedProject, workTiles, flats, buildings, workPlans, allWorkData, defaultTasksByTile } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedWorkTile, setSelectedWorkTile] = useState('all');
  
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatusDetails, setSelectedStatusDetails] = useState<{
    flatNo: string;
    workTileName: string;
    details: StatusDetails;
  } | null>(null);

  const projectBuildings = useMemo(() =>
    buildings.filter(b => b.projectName === selectedProject),
    [buildings, selectedProject]
  );

  const filteredFlats = useMemo(() =>
    flats
      .filter(f => f.projectName === selectedProject)
      .filter(f => selectedBuilding === 'all' || f.buildingName === selectedBuilding)
      .filter(f => searchTerm === '' || f.flatNo.toLowerCase().includes(searchTerm.toLowerCase())),
    [flats, selectedProject, selectedBuilding, searchTerm]
  );
  
  const displayedWorkTiles = useMemo(() =>
      selectedWorkTile === 'all'
      ? workTiles
      : workTiles.filter(wt => wt.id === selectedWorkTile),
    [workTiles, selectedWorkTile]
  );
  
  const getOverallStatusDetails = (flatNo: string, workTileName: string): StatusDetails => {
    const flatInfo = flats.find(f => f.flatNo === flatNo && f.projectName === selectedProject);
    const workTileInfo = workTiles.find(wt => wt.name === workTileName);

    if (!flatInfo || !workTileInfo) {
      return { overallStatus: 'Pending', tasks: [], overallProgress: 0 };
    }

    const allPossibleTasksForTile = new Map<string, { id: string; label: string }>();
    if (defaultTasksByTile[workTileInfo.id]) {
      defaultTasksByTile[workTileInfo.id].forEach(task => allPossibleTasksForTile.set(task.id, task));
    }
    const projectWorkForTile = allWorkData.filter(w => w.projectName === selectedProject && w.workTileId === workTileInfo.id);
    projectWorkForTile.forEach(work => {
        work.customTasks?.forEach(task => {
            if (!allPossibleTasksForTile.has(task.id)) {
                allPossibleTasksForTile.set(task.id, task);
            }
        });
    });

    const allRegisteredTasks = Array.from(allPossibleTasksForTile.values());
    
    if (allRegisteredTasks.length === 0) {
        return { overallStatus: 'Pending', tasks: [], overallProgress: 0 };
    }

    const taskProgressMap = new Map<string, number>();
    const tasksInPlan = new Set<string>();

    workPlans
        .filter(plan => plan.workTile === workTileName && plan.buildingName === flatInfo.buildingName)
        .forEach(plan => {
            const flatPlan = plan.flatPlans.find(fp => fp.flatNo === flatNo);
            if(flatPlan) {
                Object.entries(flatPlan.tasks).forEach(([taskId, taskDetails]) => {
                    taskProgressMap.set(taskId, taskDetails.progress);
                    tasksInPlan.add(taskId);
                });
            }
        });

    const detailedTasks: TaskDetail[] = allRegisteredTasks.map(task => {
        const progress = taskProgressMap.get(task.id) || 0;
        let status: TaskStatus;
        if (progress === 100) {
            status = 'Completed';
        } else if (progress > 0) {
            status = 'In Progress';
        } else if (tasksInPlan.has(task.id)) {
            status = 'Planned';
        } else {
            status = 'Pending';
        }
        return {
            id: task.id,
            label: task.label,
            progress: progress,
            status: status,
        };
    });
    
    const totalProgress = detailedTasks.reduce((sum, task) => sum + task.progress, 0);
    const overallProgress = detailedTasks.length > 0 ? Math.round(totalProgress / detailedTasks.length) : 0;
    
    let overallStatus: TaskStatus;
    if (overallProgress === 100) {
        overallStatus = 'Completed';
    } else if (totalProgress > 0) {
        overallStatus = 'In Progress';
    } else if (detailedTasks.some(t => t.status === 'Planned')) {
        overallStatus = 'Planned';
    } else {
        overallStatus = 'Pending';
    }
    
    return { overallStatus, tasks: detailedTasks, overallProgress };
  };
  
  const getStatusBadge = (status: TaskStatus) => {
    switch(status) {
        case 'Completed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>;
        case 'In Progress': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
        case 'Planned': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Planned</Badge>;
        default: return <Badge variant="secondary">Pending</Badge>;
    }
  }

  const handleStatusClick = (flatNo: string, workTileName: string) => {
    const details = getOverallStatusDetails(flatNo, workTileName);
    setSelectedStatusDetails({
      flatNo,
      workTileName,
      details,
    });
    setIsStatusDialogOpen(true);
  };

  const getTaskStatusBadge = (status: TaskStatus) => {
    switch(status) {
        case 'Completed': return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
        case 'In Progress': return <Badge variant="outline" className="text-blue-600 border-blue-600">In Progress</Badge>;
        case 'Planned': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Planned</Badge>;
        default: return <Badge variant="secondary">Pending</Badge>;
    }
  }

  return (
    <>
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
            <CardTitle>Other Work Status</CardTitle>
            <CardDescription>
              A real-time overview of work progress for each flat in project: {selectedProject}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by flat no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                  <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Filter by Building" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {projectBuildings.map(b => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedWorkTile} onValueChange={setSelectedWorkTile}>
                  <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Filter by Work" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Work</SelectItem>
                    {workTiles.map(wt => <SelectItem key={wt.id} value={wt.id}>{wt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20">Flat No.</TableHead>
                  {displayedWorkTiles.map(tile => (
                    <TableHead key={tile.id} className="text-center">{tile.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlats.length > 0 ? (
                  filteredFlats.map(flat => (
                    <TableRow key={flat.flatNo}>
                      <TableCell className="font-medium sticky left-0 bg-background">{flat.flatNo}</TableCell>
                      {displayedWorkTiles.map(tile => {
                          const { overallStatus } = getOverallStatusDetails(flat.flatNo, tile.name);
                          return (
                            <TableCell key={tile.id} className="text-center">
                              <Button
                                variant="ghost"
                                className="p-0 h-auto"
                                onClick={() => handleStatusClick(flat.flatNo, tile.name)}
                              >
                                {getStatusBadge(overallStatus)}
                              </Button>
                            </TableCell>
                          )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={displayedWorkTiles.length + 1} className="h-24 text-center">
                      No flats match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            {selectedStatusDetails && (
              <>
                <DialogTitle>Status for Flat {selectedStatusDetails.flatNo}</DialogTitle>
                <DialogDescription>{selectedStatusDetails.workTileName}</DialogDescription>
              </>
            )}
          </DialogHeader>
          {selectedStatusDetails && (
             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {selectedStatusDetails.details.tasks.length > 0 ? (
                    selectedStatusDetails.details.tasks.map(task => (
                    <div key={task.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{task.label}</span>
                             {getTaskStatusBadge(task.status)}
                          </div>
                          <span className="text-muted-foreground">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} />
                    </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No tasks have been assigned for this work item yet.
                    </p>
                )}
             </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

    
}
