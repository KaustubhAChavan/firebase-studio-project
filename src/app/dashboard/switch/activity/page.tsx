
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  CheckCircle2,
  Building,
  Home,
  Users,
  DraftingCompass,
  TrendingUp,
  ListChecks,
  ChevronDown,
  Construction,
  Activity,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { format, addDays, isWithinInterval } from 'date-fns';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Cell, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"


export default function ActivityPage() {
  const router = useRouter();
  const { selectedProject, buildings, flats, workPlans, workTiles, allWorkData } = useAppContext();

  const projectData = useMemo(() => {
    if (!selectedProject) return null;

    const projectBuildings = buildings.filter(b => b.projectName === selectedProject);
    const projectFlats = flats.filter(f => f.projectName === selectedProject);
    const projectWorkPlans = workPlans.filter(p => p.projectName === selectedProject);
    const projectWorkData = allWorkData.filter(w => w.projectName === selectedProject);
    
    // Create a map of actual progress from plans for quick lookup
    const progressMap = new Map<string, number>(); // key: `${flatNo}-${taskId}`
    projectWorkPlans.forEach(plan => {
        plan.flatPlans.forEach(fp => {
            Object.entries(fp.tasks).forEach(([taskId, taskDetails]) => {
                progressMap.set(`${fp.flatNo}-${taskId}`, taskDetails.progress);
            });
        });
    });

    let totalOverallProgressSum = 0;
    let totalOverallTaskCount = 0;

    projectWorkData.forEach(work => {
        const flatsInBuilding = projectFlats.filter(f => f.buildingName === work.buildingName);
        const workTile = workTiles.find(t => t.id === work.workTileId);
        if (!workTile) return;

        const allTasksForTile = new Set<string>((workTile.tasks || []).map(t => t.id));
        (work.customTasks || []).forEach(t => allTasksForTile.add(t.id));

        flatsInBuilding.forEach(flat => {
            allTasksForTile.forEach(taskId => {
                totalOverallTaskCount++;
                const progress = progressMap.get(`${flat.flatNo}-${taskId}`) || 0;
                totalOverallProgressSum += progress;
            });
        });
    });
    
    const overallProgress = totalOverallTaskCount > 0 ? Math.round(totalOverallProgressSum / totalOverallTaskCount * 100) / 100 : 0;
    
    const buildingProgress = projectBuildings.map(building => {
        let buildingProgressSum = 0;
        let buildingTaskCount = 0;
        
        const workForBuilding = projectWorkData.filter(w => w.buildingName === building.buildingName);
        const flatsInBuilding = projectFlats.filter(f => f.buildingName === building.buildingName);

        workForBuilding.forEach(work => {
            const workTile = workTiles.find(t => t.id === work.workTileId);
            if (!workTile) return;

            const allTasksForTile = new Set<string>((workTile.tasks || []).map(t => t.id));
            (work.customTasks || []).forEach(t => allTasksForTile.add(t.id));

            flatsInBuilding.forEach(flat => {
                allTasksForTile.forEach(taskId => {
                    buildingTaskCount++;
                    const progress = progressMap.get(`${flat.flatNo}-${taskId}`) || 0;
                    buildingProgressSum += progress;
                });
            });
        });

        return {
            name: building.buildingName,
            progress: buildingTaskCount > 0 ? Math.round(buildingProgressSum / buildingTaskCount) : 0,
        };
    });
    
    const activeContractors = new Set(projectWorkPlans.map(p => p.contractorName));
    
    const today = new Date();
    const nextSevenDays = { start: today, end: addDays(today, 7) };
    const upcomingDeadlines = projectWorkPlans.filter(plan => 
        isWithinInterval(plan.endDate, nextSevenDays)
    );
    
    const taskStatusCounts = { planned: 0, inProgress: 0, completed: 0, rejected: 0 };
    projectWorkPlans.forEach(plan => {
      plan.flatPlans.forEach(fp => {
        Object.values(fp.tasks).forEach(task => {
          if (task.finalCheckStatus === 'rejected') {
            taskStatusCounts.rejected++;
          } else if (task.progress === 100) {
            taskStatusCounts.completed++;
          } else if (task.progress > 0) {
            taskStatusCounts.inProgress++;
          } else {
            taskStatusCounts.planned++;
          }
        });
      });
    });

    const taskStatusData = [
      { name: 'Planned', value: taskStatusCounts.planned, fill: 'hsl(var(--chart-1))' },
      { name: 'In Progress', value: taskStatusCounts.inProgress, fill: 'hsl(var(--chart-2))' },
      { name: 'Completed', value: taskStatusCounts.completed, fill: 'hsl(var(--chart-3))' },
      { name: 'Rejected', value: taskStatusCounts.rejected, fill: 'hsl(var(--chart-4))' },
    ].filter(d => d.value > 0);

    const workTypeProgress: { [key: string]: { total: number, completed: number } } = {};
    workTiles.forEach(tile => {
        workTypeProgress[tile.name] = { total: 0, completed: 0 };
    });

    projectWorkPlans.forEach(plan => {
        if (workTypeProgress[plan.workTile]) {
            plan.flatPlans.forEach(fp => {
                const tasks = Object.values(fp.tasks);
                workTypeProgress[plan.workTile].total += tasks.length;
                workTypeProgress[plan.workTile].completed += tasks.filter(t => t.progress === 100).length;
            });
        }
    });
    
    const workTypeData = Object.entries(workTypeProgress)
        .map(([name, data]) => ({
            name,
            pending: data.total - data.completed,
            completed: data.completed,
        }))
        .filter(d => d.completed > 0 || d.pending > 0);
    
    const flatStatus: { [flatNo: string]: { total: number, completed: number, inProgress: boolean } } = {};
    projectWorkPlans.forEach(plan => {
      plan.flatPlans.forEach(fp => {
        if (!flatStatus[fp.flatNo]) {
          flatStatus[fp.flatNo] = { total: 0, completed: 0, inProgress: false };
        }
        const tasksInPlan = Object.values(fp.tasks);
        tasksInPlan.forEach(task => {
          flatStatus[fp.flatNo].total++;
          if (task.progress === 100) {
            flatStatus[fp.flatNo].completed++;
          }
          if (task.progress > 0) {
              flatStatus[fp.flatNo].inProgress = true;
          }
        });
      });
    });

    let plannedFlatsCount = Object.keys(flatStatus).length;
    let inProgressFlatsCount = 0;
    let completedFlatsCount = 0;

    Object.values(flatStatus).forEach(status => {
        if (status.total > 0 && status.total === status.completed) {
            completedFlatsCount++;
        } else if (status.inProgress) {
            inProgressFlatsCount++;
        }
    });

    return {
      totalBuildings: projectBuildings.length,
      totalFlats: projectFlats.length,
      plannedFlats: plannedFlatsCount,
      inProgressFlats: inProgressFlatsCount,
      completedFlats: completedFlatsCount,
      overallProgress,
      activeContractors: activeContractors.size,
      upcomingDeadlines,
      buildingProgress,
      taskStatusData,
      workTypeData
    };
  }, [selectedProject, buildings, flats, workPlans, workTiles, allWorkData]);


  if (!projectData) {
    return (
      <div className="space-y-6">
        <p>Loading project data...</p>
      </div>
    );
  }
  
  const { 
    totalBuildings, totalFlats, plannedFlats, inProgressFlats, completedFlats,
    overallProgress, activeContractors, upcomingDeadlines,
    buildingProgress, taskStatusData, workTypeData
  } = projectData;

  const buildingProgressChartConfig = {
    progress: {
      label: "Progress",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const taskStatusChartConfig = {
    tasks: {
      label: "Tasks",
    },
    planned: {
      label: "Planned",
      color: "hsl(var(--chart-1))",
    },
    inProgress: {
      label: "In Progress",
      color: "hsl(var(--chart-2))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-3))",
    },
    rejected: {
      label: "Rejected",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  const workTypeChartConfig = {
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-1))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Activity Hub</h2>
          <p className="text-muted-foreground">
            An overview of all ongoing activities for project: {selectedProject}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Main Dashboard
        </Button>
      </div>

       <Card>
        <CardContent className="p-6 flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <DraftingCompass className="mr-2 h-4 w-4" />
                        Planning
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/planning/rcc-work">
                            <ListChecks className="mr-2 h-4 w-4" />
                            RCC Work
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/planning/other-work">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Other Work
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Work in Process
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/work-in-process/rcc">
                            <Building className="mr-2 h-4 w-4" />
                            RCC WIP
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/work-in-process/other">
                            <Construction className="mr-2 h-4 w-4" />
                            Other Work WIP
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button asChild variant="outline">
                <Link href="/dashboard/switch/activity/final-work">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Final Work
                </Link>
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <Activity className="mr-2 h-4 w-4" />
                        Status
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/status/rcc">
                            <ListChecks className="mr-2 h-4 w-4" />
                            RCC Status
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/activity/status/other">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Other Work Status
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader><CardTitle>Overall Progress</CardTitle></CardHeader>
            <CardContent>
                <Progress value={overallProgress} className="w-full" />
                <p className="text-center text-2xl font-bold mt-2">{overallProgress}%</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalBuildings}</div>
                <p className="text-xs text-muted-foreground">Buildings in this project</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flats</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalFlats}</div>
                <p className="text-xs text-muted-foreground">{plannedFlats} Planned, {inProgressFlats} In Progress, {completedFlats} Completed</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contractors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activeContractors}</div>
                <p className="text-xs text-muted-foreground">Contractors with active tasks</p>
            </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Work Type Progress</CardTitle>
            <CardDescription>Completed vs. Pending tasks for each work type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workTypeChartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workTypeData} layout="vertical" stackOffset="expand" margin={{ left: -10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} tickMargin={10} />
                        <ChartTooltip
                            cursor={{ radius: 4 }}
                            content={<ChartTooltipContent />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="pending" stackId="a" fill="hsl(var(--chart-1))" radius={[4, 0, 0, 4]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
            <CardDescription>Distribution of all tasks by their current status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer
              config={taskStatusChartConfig}
              className="mx-auto aspect-square h-64"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={taskStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  labelLine={false}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    percent,
                  }) => {
                    if (percent < 0.05) {
                      return null
                    }
                    const RADIAN = Math.PI / 180
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="hsl(var(--primary-foreground))"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-xs font-bold"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    )
                  }}
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                 <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Building Progress Overview</CardTitle>
                <CardDescription>Overall completion percentage for each building.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={buildingProgressChartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={buildingProgress}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                            <Bar dataKey="progress" fill="hsl(var(--chart-1))" radius={8} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Work plans ending in the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                {upcomingDeadlines.length > 0 ? (
                    <ul className="space-y-2">
                        {upcomingDeadlines.map(plan => (
                            <li key={plan.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                <div>
                                    <span className="font-semibold">{plan.workTile}</span>
                                    <p className="text-xs text-muted-foreground">{plan.buildingName} by {plan.contractorName}</p>
                                </div>
                                <div className="text-right font-mono text-xs">{format(plan.endDate, 'PP')}</div>
                            </li>
                        ))}
                    </ul>
                ): (
                    <p className="text-center text-sm text-muted-foreground py-4">No deadlines in the next 7 days.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
