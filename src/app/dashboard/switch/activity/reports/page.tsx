
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, FileDown, Search, ImageIcon } from 'lucide-react';
import { useAppContext, PhotoWithMetaData } from '@/context/AppContext';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportType = 'updated' | 'wip' | 'completed' | 'planned' | 'delayed';

export type ReportRow = {
  updateDate: Date;
  workTile: string;
  task: string;
  building: string;
  flat: string;
  progress: number;
  description?: string;
  contractor: string;
  updatedBy: string;
  status: 'On Time' | 'Delayed';
  finalTaskProgress: number;
  billed?: boolean;
  photos?: PhotoWithMetaData[];
};

export default function ActivityReportsPage() {
  const router = useRouter();
  const { workPlans, extraWorkPlans, workTiles, buildings, suppliers, selectedProject } = useAppContext();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [selectedWorkTiles, setSelectedWorkTiles] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedContractors, setSelectedContractors] = useState<Set<string>>(new Set());
  const [reportType, setReportType] = useState<ReportType>('wip');
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photosToShow, setPhotosToShow] = useState<PhotoWithMetaData[]>([]);

  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  const projectContractors = useMemo(() => suppliers.filter(s => s.supplierType.includes('Contractor')), [suppliers]);

  const availableTasks = useMemo(() => {
    if (selectedWorkTiles.size === 0) return [];
    const tasks = new Map<string, string>();
    workTiles
      .filter(wt => selectedWorkTiles.has(wt.name))
      .flatMap(wt => wt.tasks || [])
      .forEach(task => tasks.set(task.id, task.label));
    return Array.from(tasks.entries()).map(([id, label]) => ({ id, label }));
  }, [selectedWorkTiles, workTiles]);
  
  const handleGenerateReport = () => {
    setIsLoading(true);

    const allPossibleReportRows: ReportRow[] = [];
    
    // Process standard work plans
    workPlans.forEach(plan => {
      if (plan.projectName !== selectedProject) return;
      if (selectedBuildings.size > 0 && !selectedBuildings.has(plan.buildingName)) return;
      if (selectedWorkTiles.size > 0 && !selectedWorkTiles.has(plan.workTile)) return;
      if (selectedContractors.size > 0 && !selectedContractors.has(plan.contractorName)) return;

      plan.flatPlans.forEach(flat => {
        Object.entries(flat.tasks).forEach(([taskId, taskDetails]) => {
          if (selectedTasks.size > 0 && !selectedTasks.has(taskId)) return;

          const taskLabel = workTiles.flatMap(wt => wt.tasks || []).find(t => t.id === taskId)?.label || 'Unknown Task';
          const isDelayed = new Date() > plan.endDate && taskDetails.progress < 100;
          
          (taskDetails.updates || []).forEach(update => {
            allPossibleReportRows.push({
              updateDate: update.date,
              workTile: plan.workTile,
              task: taskLabel,
              building: plan.buildingName,
              flat: flat.flatNo,
              progress: update.progress,
              description: update.description,
              contractor: plan.contractorName,
              updatedBy: update.updatedBy,
              status: isDelayed ? 'Delayed' : 'On Time',
              finalTaskProgress: taskDetails.progress,
              billed: taskDetails.billed,
              photos: update.photos,
            });
          });
        });
      });
    });

    // Process extra work plans
    extraWorkPlans.forEach(plan => {
        if (plan.projectName !== selectedProject) return;
        if (selectedBuildings.size > 0 && plan.buildingName && !selectedBuildings.has(plan.buildingName)) return;
        if (selectedWorkTiles.size > 0 && !selectedWorkTiles.has("Extra Work")) return;
        if (selectedContractors.size > 0 && !selectedContractors.has(plan.contractorName)) return;

        const isDelayed = new Date() > plan.endDate && plan.progress < 100;

        (plan.updates || []).forEach(update => {
            allPossibleReportRows.push({
                updateDate: update.date,
                workTile: 'Extra Work',
                task: plan.taskDescription,
                building: plan.buildingName || 'N/A',
                flat: plan.flatNo || 'N/A',
                progress: update.progress,
                description: update.description,
                contractor: plan.contractorName,
                updatedBy: update.updatedBy,
                status: isDelayed ? 'Delayed' : 'On Time',
                finalTaskProgress: plan.progress,
                billed: plan.billed,
                photos: update.photos,
            });
        });
    });

    let dateFilteredRows = allPossibleReportRows;
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
      toDate.setHours(23, 59, 59, 999);
      
      dateFilteredRows = allPossibleReportRows.filter(row => {
          const updateDate = new Date(row.updateDate);
          return updateDate >= fromDate && updateDate <= toDate;
      });
    }

    let finalReportRows = dateFilteredRows;
    if (reportType !== 'updated') {
        const uniqueTasks = new Map<string, ReportRow[]>();
        dateFilteredRows.forEach(row => {
            const key = `${row.building}-${row.flat}-${row.workTile}-${row.task}`;
            if(!uniqueTasks.has(key)) uniqueTasks.set(key, []);
            uniqueTasks.get(key)!.push(row);
        });

        const tasksToInclude = new Set<string>();
        uniqueTasks.forEach((rows, key) => {
            const finalProgress = rows[rows.length-1].finalTaskProgress;
             switch (reportType) {
                case 'wip': if(finalProgress > 0 && finalProgress < 100) tasksToInclude.add(key); break;
                case 'completed': if(finalProgress === 100) tasksToInclude.add(key); break;
                case 'planned': if(finalProgress === 0) tasksToInclude.add(key); break;
                case 'delayed': if(rows[rows.length-1].status === 'Delayed') tasksToInclude.add(key); break;
            }
        });

        finalReportRows = dateFilteredRows.filter(row => {
            const key = `${row.building}-${row.flat}-${row.workTile}-${row.task}`;
            return tasksToInclude.has(key);
        })
    }
    
    finalReportRows.sort((a,b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime());
    setReportData(finalReportRows);
    setIsLoading(false);
  };
  
  const handleResetFilters = () => {
    setDateRange(undefined);
    setSelectedBuildings(new Set());
    setSelectedWorkTiles(new Set());
    setSelectedTasks(new Set());
    setSelectedContractors(new Set());
    setReportType('wip');
    setReportData([]);
  };

  const handleExportPDF = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(18);
    doc.text('Activity Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    let filterY = 30;
    doc.text(`Project: ${selectedProject}`, 14, filterY);
    if (dateRange?.from) {
      filterY += 7;
      doc.text(`Date Range: ${format(dateRange.from, 'PP')} - ${dateRange.to ? format(dateRange.to, 'PP') : ''}`, 14, filterY);
    }
    doc.setTextColor(0);

    autoTable(doc, {
      startY: filterY + 10,
      head: [['Date', 'Work/Task', 'Building/Flat', 'Updated By', 'Progress', 'Status']],
      body: reportData.map(row => [
        format(new Date(row.updateDate), 'PP p'),
        `${row.workTile}\n${row.task}`,
        `${row.building} / ${row.flat}`,
        row.updatedBy,
        `${row.progress}%`,
        row.billed ? 'Billed' : row.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
            data.cell.styles.fontSize = 8;
        }
      }
    });

    const rowsWithPhotos = reportData.filter(row => row.photos && row.photos.length > 0);
    if (rowsWithPhotos.length > 0) {
      doc.addPage();
      let yPos = 22;
      doc.setFontSize(16);
      doc.text('Photo Appendix', 14, yPos);
      yPos += 10;

      rowsWithPhotos.forEach((row, rowIndex) => {
        const photoHeader = `Photos for ${row.workTile} - ${row.task} (Flat ${row.flat}) on ${format(new Date(row.updateDate), 'PP')}`;

        if (yPos > pageHeight - 30) { 
          doc.addPage();
          yPos = 22;
        }
        
        doc.setFontSize(12);
        doc.text(photoHeader, 14, yPos);
        yPos += 8;

        row.photos!.forEach((photo) => {
          try {
            const imgWidth = 80;
            const imgHeight = 60;
            if (yPos > pageHeight - (imgHeight + 10)) {
              doc.addPage();
              yPos = 22;
            }
            // Use JPEG as it's more common and compresses better
            doc.addImage(photo.dataUri, 'JPEG', 14, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 2;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Taken on: ${format(new Date(photo.timestamp), 'PP pp')}`, 14, yPos);
            yPos += 10;
            doc.setTextColor(0);
          } catch (e) {
            console.error("Error adding image to PDF", e);
            if (yPos > pageHeight - 10) {
              doc.addPage();
              yPos = 22;
            }
            doc.setFontSize(8);
            doc.text('[Could not load image]', 14, yPos);
            yPos += 10;
          }
        });
        
        if(rowIndex < rowsWithPhotos.length -1) {
            if (yPos > pageHeight - 10) {
              doc.addPage();
              yPos = 22;
            }
            doc.line(14, yPos, 196, yPos);
            yPos += 8;
        }
      });
    }

    doc.save('activity_report.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }
    const worksheetData = reportData.map(row => ({
      'Update Date': format(new Date(row.updateDate), 'yyyy-MM-dd HH:mm'),
      'Building': row.building,
      'Flat': row.flat,
      'Work Type': row.workTile,
      'Task': row.task,
      'Updated By': row.updatedBy,
      'Description': row.description || '-',
      'Progress (%)': row.progress,
      'Status': row.billed ? 'Billed' : row.status,
      'Photos': row.photos?.length || 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Report');
    XLSX.writeFile(workbook, 'activity_report.xlsx');
  };
  
  function MultiSelectFilter({ title, items, selected, setSelected }: { title: string, items: {id: string, label: string}[], selected: Set<string>, setSelected: React.Dispatch<React.SetStateAction<Set<string>>> }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <span>{title} ({selected.size || 'All'})</span>
                    <Search className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{title}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {items.map(item => (
                    <DropdownMenuCheckboxItem
                        key={item.id}
                        checked={selected.has(item.id)}
                        onCheckedChange={(checked) => {
                            const newSet = new Set(selected);
                            if (checked) newSet.add(item.id); else newSet.delete(item.id);
                            setSelected(newSet);
                        }}
                    >
                        {item.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Activity Reports</CardTitle>
          <CardDescription>Generate custom reports based on project activities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date" variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wip">Work in Progress</SelectItem>
                  <SelectItem value="completed">Completed Work</SelectItem>
                  <SelectItem value="planned">Planned Work</SelectItem>
                  <SelectItem value="delayed">Delayed Work</SelectItem>
                  <SelectItem value="updated">All Updated Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <MultiSelectFilter title="Buildings" items={projectBuildings.map(b => ({id: b.buildingName, label: b.buildingName}))} selected={selectedBuildings} setSelected={setSelectedBuildings} />
             <MultiSelectFilter title="Work Types" items={[...workTiles.map(w => ({id: w.name, label: w.name})), {id: "Extra Work", label: "Extra Work"}]} selected={selectedWorkTiles} setSelected={setSelectedWorkTiles} />
             <MultiSelectFilter title="Tasks" items={availableTasks} selected={selectedTasks} setSelected={setSelectedTasks} />
             <MultiSelectFilter title="Contractors" items={projectContractors.map(c => ({id: c.supplierName, label: c.supplierName}))} selected={selectedContractors} setSelected={setSelectedContractors} />
          </div>
          <div className="flex gap-4">
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={reportData.length === 0}><FileDown className="mr-2 h-4 w-4"/> Export PDF</Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={reportData.length === 0}><FileDown className="mr-2 h-4 w-4"/> Export Excel</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Results</CardTitle>
          <CardDescription>Found {reportData.length} updates matching your criteria.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Update Date</TableHead>
                <TableHead>Building/Flat</TableHead>
                <TableHead>Work/Task</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Photos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(row.updateDate), 'PP pp')}</TableCell>
                    <TableCell>{row.building} / {row.flat}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.workTile}</div>
                      <div className="text-muted-foreground text-xs">{row.task}</div>
                    </TableCell>
                    <TableCell>{row.updatedBy}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.description || '-'}</TableCell>
                    <TableCell>{row.progress}%</TableCell>
                    <TableCell>
                       {row.billed ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Billed</Badge>
                        ) : (
                          row.status
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!row.photos || row.photos.length === 0}
                        onClick={() => {
                          setPhotosToShow(row.photos || []);
                          setIsPhotoDialogOpen(true);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No data to display. Please generate a report.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Task Photos</DialogTitle>
          </DialogHeader>
          <Carousel className="w-full">
            <CarouselContent>
              {photosToShow.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-video items-center justify-center p-2 relative">
                        <Image src={photo.dataUri} alt={`Task Photo ${index + 1}`} fill style={{ objectFit: 'contain' }} />
                      </CardContent>
                       <CardDescription className="p-2 text-xs text-center border-t">
                          {format(new Date(photo.timestamp), 'PP pp')}
                        </CardDescription>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photosToShow.length > 1 && <><CarouselPrevious /><CarouselNext /></>}
          </Carousel>
        </DialogContent>
      </Dialog>
    </>
  );
}
