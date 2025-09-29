
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/context/AppContext';

type FlatStatus = {
  buildingName: string;
  floorName: string;
  flatNo: string;
  type: string;
  overallProgress: number;
};

export default function FlatWorkStatusPage() {
  const router = useRouter();
  const { selectedProject, flats, buildings, workPlans, allWorkData, workTiles } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [progressFilter, setProgressFilter] = useState('');

  const flatOverallStatus: FlatStatus[] = useMemo(() => {
    return flats
      .filter(flat => flat.projectName === selectedProject)
      .map(flat => {
        const assignedWorkForBuilding = allWorkData.filter(w => w.projectName === selectedProject && w.buildingName === flat.buildingName);
        
        let totalTaskCount = 0;
        let totalProgressSum = 0;
        
        assignedWorkForBuilding.forEach(work => {
            const workTileInfo = workTiles.find(wt => wt.id === work.workTileId);
            if (!workTileInfo) return;

            const allTasksForTile = work.customTasks || [];
            
            allTasksForTile.forEach(task => {
                totalTaskCount++;
                const plan = workPlans.find(p => p.workTile === workTileInfo.name && p.buildingName === flat.buildingName);
                const flatPlan = plan?.flatPlans.find(fp => fp.flatNo === flat.flatNo);
                const progress = flatPlan?.tasks[task.id]?.progress || 0;
                totalProgressSum += progress;
            });
        });
        
        const overallProgress = totalTaskCount > 0 ? Math.round(totalProgressSum / totalTaskCount) : 0;
        
        return {
          buildingName: flat.buildingName,
          floorName: flat.floorName,
          flatNo: flat.flatNo,
          type: flat.type,
          overallProgress,
        };
      });
  }, [flats, selectedProject, allWorkData, workTiles, workPlans]);

  const filteredFlats = useMemo(() => {
    let flatsToFilter = [...flatOverallStatus];
    
    if(selectedBuilding !== 'all') {
        flatsToFilter = flatsToFilter.filter(f => f.buildingName === selectedBuilding);
    }
    
    if (searchTerm) {
      flatsToFilter = flatsToFilter.filter(f => f.flatNo.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    if (progressFilter) {
      const maxProgress = parseInt(progressFilter, 10);
      if (!isNaN(maxProgress)) {
        flatsToFilter = flatsToFilter.filter(f => f.overallProgress <= maxProgress);
      }
    }
    
    return flatsToFilter;
  }, [flatOverallStatus, selectedBuilding, searchTerm, progressFilter]);

  const projectBuildings = useMemo(() =>
    buildings.filter(b => b.projectName === selectedProject),
    [buildings, selectedProject]
  );
  
  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Flat Work Status</CardTitle>
          <CardDescription>
            A detailed overview of work progress for each flat in project: {selectedProject}.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger><SelectValue placeholder="Filter by Building" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {projectBuildings.map(b => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}
                </SelectContent>
              </Select>
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by flat no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="number"
                placeholder="Show flats under X% complete"
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
              />
           </div>

           <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Flat No.</TableHead>
                            <TableHead>Building</TableHead>
                            <TableHead>Floor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Overall Progress</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredFlats.length > 0 ? (
                            filteredFlats.map(flat => (
                                <TableRow 
                                    key={flat.flatNo} 
                                    onClick={() => router.push(`/dashboard/switch/activity/status/flat-work-status/${encodeURIComponent(flat.flatNo)}`)}
                                    className="cursor-pointer"
                                >
                                    <TableCell className="font-medium">{flat.flatNo}</TableCell>
                                    <TableCell>{flat.buildingName}</TableCell>
                                    <TableCell>{flat.floorName}</TableCell>
                                    <TableCell>{flat.type}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={flat.overallProgress} className="w-24"/>
                                            <span>{flat.overallProgress}%</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No flats match the current filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
