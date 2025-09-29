
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Search, CalendarIcon } from 'lucide-react';
import { useAppContext, ExtraWorkData, WorkPlanData } from '@/context/AppContext';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { usePermissions } from '@/hooks/use-permissions';


type CombinedPlan = (WorkPlanData & { planType: 'standard' }) | (ExtraWorkData & { planType: 'extra' });

export default function WorkInProcessPage() {
  const router = useRouter();
  const { workPlans, extraWorkPlans, selectedProject } = useAppContext();
  const { hasPermission } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkItem, setFilterWorkItem] = useState('all');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const combinedProjectPlans: CombinedPlan[] = useMemo(() => {
    const standardPlans: CombinedPlan[] = workPlans
      .filter(plan => plan.projectName === selectedProject)
      .map(plan => ({ ...plan, planType: 'standard' }));
      
    const extraPlans: CombinedPlan[] = extraWorkPlans
      .filter(plan => plan.projectName === selectedProject)
      .map(plan => ({ ...plan, planType: 'extra' }));

    return [...standardPlans, ...extraPlans];
  }, [workPlans, extraWorkPlans, selectedProject]);
  
  const uniqueWorkItems = useMemo(() => {
    const items = new Set(combinedProjectPlans.map(p => p.planType === 'standard' ? p.workTile : "Extra Work"));
    return Array.from(items);
  }, [combinedProjectPlans]);

  const uniqueBuildings = useMemo(() => {
    const items = new Set(combinedProjectPlans.map(p => p.buildingName).filter(Boolean));
    return Array.from(items) as string[];
  }, [combinedProjectPlans]);

  const uniqueContractors = useMemo(() => {
    const items = new Set(combinedProjectPlans.map(p => p.contractorName));
    return Array.from(items);
  }, [combinedProjectPlans]);

  const filteredWorkPlans = useMemo(() => {
    return combinedProjectPlans
      .filter(plan => {
        const workItemName = plan.planType === 'standard' ? plan.workTile : 'Extra Work';
        if (searchTerm === '') return true;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          workItemName.toLowerCase().includes(lowerSearchTerm) ||
          (plan.buildingName && plan.buildingName.toLowerCase().includes(lowerSearchTerm)) ||
          plan.contractorName.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .filter(plan => {
          const workItemName = plan.planType === 'standard' ? plan.workTile : 'Extra Work';
          return filterWorkItem === 'all' || workItemName === filterWorkItem
      })
      .filter(plan => filterBuilding === 'all' || plan.buildingName === filterBuilding)
      .filter(plan => filterContractor === 'all' || plan.contractorName === filterContractor)
      .filter(plan => {
        if (!dateRange?.from) return true; // No start date, no filter
        const from = dateRange.from;
        const to = dateRange.to || from; // If no 'to' date, use 'from' date for a single day selection
        // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
        return plan.startDate <= to && plan.endDate >= from;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [combinedProjectPlans, searchTerm, filterWorkItem, filterBuilding, filterContractor, dateRange]);


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
          <CardTitle>Work in Process - Other</CardTitle>
          <CardDescription>
            All active work plans for project: {selectedProject}. Update progress from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by work item, building, contractor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        />
                    </div>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "flex-1 min-w-[260px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                            <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Filter by date range</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        />
                    </PopoverContent>
                    </Popover>
                 </div>
                <div className="flex flex-wrap items-center gap-4">
                    <Select value={filterWorkItem} onValueChange={setFilterWorkItem}>
                        <SelectTrigger className="flex-1 min-w-[180px]">
                            <SelectValue placeholder="Filter by work item" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Work Items</SelectItem>
                            {uniqueWorkItems.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                        <SelectTrigger className="flex-1 min-w-[180px]">
                            <SelectValue placeholder="Filter by building" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Buildings</SelectItem>
                            {uniqueBuildings.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterContractor} onValueChange={setFilterContractor}>
                        <SelectTrigger className="flex-1 min-w-[180px]">
                            <SelectValue placeholder="Filter by contractor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contractors</SelectItem>
                            {uniqueContractors.map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

          {filteredWorkPlans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20">Work Item</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium sticky left-0 bg-background">{plan.planType === 'standard' ? plan.workTile : 'Extra Work'}</TableCell>
                    <TableCell>{plan.buildingName || 'N/A'}</TableCell>
                    <TableCell>{plan.contractorName}</TableCell>
                    <TableCell>{format(plan.startDate, 'PP')} - {format(plan.endDate, 'PP')}</TableCell>
                    <TableCell className="text-right">
                      {hasPermission('manage_work_in_process') && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/switch/activity/work-in-process/update/${plan.id}?type=${plan.planType}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Update
                            </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No work plans match the current filters.</p>
              {hasPermission('manage_planning') && (
                <Button onClick={() => router.push('/dashboard/switch/activity/planning/other-work')} className="mt-4">
                    Create a New Plan
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
