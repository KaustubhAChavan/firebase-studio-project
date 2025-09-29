
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, FileDown, Search, Image as ImageIcon } from 'lucide-react';
import { useAppContext, GRNData, IndentData, IssueRecordData, SiteTransferData, InventoryData } from '@/context/AppContext';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportSection = 'inventory' | 'indents' | 'grn' | 'issues' | 'transfers';

const reportSections: { id: ReportSection, label: string }[] = [
    { id: 'inventory', label: 'Current Inventory' },
    { id: 'indents', label: 'Indents' },
    { id: 'grn', label: 'GRN (Goods Received Notes)' },
    { id: 'issues', label: 'Issues to Contractor' },
    { id: 'transfers', label: 'Site to Site Transfers' },
];

type ReportData = {
    inventory: InventoryData[],
    indents: IndentData[],
    grn: GRNData[],
    issues: IssueRecordData[],
    transfers: SiteTransferData[]
};

export default function MaterialReportsPage() {
  const router = useRouter();
  const { grns, suppliers, purchaseOrders, selectedProject, inventory, indents, issueRecords, siteTransfers, materials } = useAppContext();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [reportData, setReportData] = useState<Partial<ReportData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGrnDetails, setSelectedGrnDetails] = useState<GRNData | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<ReportSection>>(new Set(['grn']));

  const projectSuppliers = useMemo(() => {
    const supplierNames = new Set<string>();
    grns.filter(g => g.projectName === selectedProject).forEach(g => supplierNames.add(g.supplierName));
    purchaseOrders.filter(po => po.projectName === selectedProject).forEach(po => supplierNames.add(po.supplierName));
    issueRecords.filter(i => i.projectName === selectedProject).forEach(i => supplierNames.add(i.contractorName));
    return Array.from(supplierNames);
  }, [grns, purchaseOrders, issueRecords, selectedProject]);
  
  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || 'N/A';
  }

  const handleGenerateReport = () => {
    setIsLoading(true);
    const newReportData: Partial<ReportData> = {};

    const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    const toDate = dateRange?.to ? new Date(dateRange.to) : (dateRange?.from ? new Date(dateRange.from) : null);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const dateFilter = (itemDate: Date) => {
        if (!fromDate || !toDate) return true;
        const checkDate = new Date(itemDate);
        return checkDate >= fromDate && checkDate <= toDate;
    };
    
    if (selectedSections.has('inventory')) {
        newReportData.inventory = inventory.filter(i => i.project === selectedProject);
    }
    if (selectedSections.has('indents')) {
        newReportData.indents = indents.filter(i => i.requestingProject === selectedProject && dateFilter(i.date));
    }
    if (selectedSections.has('grn')) {
        newReportData.grn = grns.filter(g => 
            g.projectName === selectedProject && 
            dateFilter(g.date) && 
            (selectedSuppliers.size === 0 || selectedSuppliers.has(g.supplierName))
        );
    }
    if (selectedSections.has('issues')) {
        newReportData.issues = issueRecords.filter(i => 
            i.projectName === selectedProject && 
            dateFilter(i.date) &&
            (selectedSuppliers.size === 0 || selectedSuppliers.has(i.contractorName))
        );
    }
    if (selectedSections.has('transfers')) {
        newReportData.transfers = siteTransfers.filter(t => 
            (t.fromProject === selectedProject || t.toProject === selectedProject) && 
            dateFilter(t.date)
        );
    }
    
    setReportData(newReportData);
    setIsLoading(false);
  };
  
  const handleResetFilters = () => {
    setDateRange(undefined);
    setSelectedSuppliers(new Set());
    setReportData({});
    setSelectedSections(new Set(['grn']));
  };

  const handleExportPDF = () => {
    if (Object.keys(reportData).length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }
  
    const doc = new jsPDF();
    let yPos = 15;
  
    doc.setFontSize(18);
    doc.text('Material Report', 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Project: ${selectedProject}`, 14, yPos);
    if (dateRange?.from) {
      yPos += 7;
      doc.text(`Date Range: ${format(dateRange.from, 'PP')} - ${dateRange.to ? format(dateRange.to, 'PP') : ''}`, 14, yPos);
    }
    yPos += 10;
    doc.setTextColor(0);

    const addSection = (title: string, head: any, body: any) => {
        if(body.length === 0) return;
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.text(title, 14, yPos);
        yPos += 8;
        autoTable(doc, { startY: yPos, head, body, theme: 'grid' });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    };
    
    if (reportData.inventory) {
        addSection(
            'Current Inventory', 
            [['Material', 'Category', 'Stock', 'Unit']], 
            reportData.inventory.map(i => [i.materialName, i.category, i.currentStock, i.unit])
        );
    }
    if (reportData.indents) {
        const body = reportData.indents.flatMap(i => i.items.map(item => [format(i.date, 'PP'), i.indentNumber, i.status, item.materialName, item.quantity, getUnitForMaterial(item.materialName)]))
        addSection(
            'Indents',
            [['Date', 'Indent No.', 'Status', 'Material', 'Qty', 'Unit']],
            body
        )
    }
    if (reportData.grn) {
        const body = reportData.grn.flatMap(g => g.items.map(item => [format(g.date, 'PP'), g.grnNumber, g.supplierName, item.materialName, item.receivedQuantity, getUnitForMaterial(item.materialName)]))
        addSection(
            'GRN History',
            [['Date', 'GRN No.', 'Supplier', 'Material', 'Qty Received', 'Unit']],
            body
        )
    }
    if (reportData.issues) {
        const body = reportData.issues.flatMap(i => i.items.map(item => [format(i.date, 'PP'), i.contractorName, `${i.buildingName}/${i.flatNo}`, item.materialName, item.quantity, getUnitForMaterial(item.materialName)]))
        addSection(
            'Material Issues',
            [['Date', 'Contractor', 'Building/Flat', 'Material', 'Qty Issued', 'Unit']],
            body
        )
    }
     if (reportData.transfers) {
        const body = reportData.transfers.flatMap(t => t.items.map(item => [format(t.date, 'PP'), t.fromProject, t.toProject, item.materialName, item.quantity, getUnitForMaterial(item.materialName)]))
        addSection(
            'Site Transfers',
            [['Date', 'From', 'To', 'Material', 'Qty', 'Unit']],
            body
        )
    }

    doc.save('material_report.pdf');
  };

  return (
    <>
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Material Reports</CardTitle>
          <CardDescription>Generate custom reports for project: {selectedProject}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
              <Label>Report Sections</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
                {reportSections.map(section => (
                    <div key={section.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={section.id}
                            checked={selectedSections.has(section.id)}
                            onCheckedChange={(checked) => {
                                const newSet = new Set(selectedSections);
                                if(checked) newSet.add(section.id); else newSet.delete(section.id);
                                setSelectedSections(newSet);
                            }}
                        />
                        <Label htmlFor={section.id} className="font-normal">{section.label}</Label>
                    </div>
                ))}
              </div>
            </div>

            <Separator/>

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
             <div className="flex flex-col gap-2">
                <Label>Supplier / Contractor</Label>
                <Select onValueChange={(value) => setSelectedSuppliers(value === 'all' ? new Set() : new Set([value]))}>
                    <SelectTrigger><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {projectSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>Reset Filters</Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={Object.keys(reportData).length === 0}><FileDown className="mr-2 h-4 w-4"/> Export PDF</Button>
          </div>
        </CardContent>
      </Card>
      
      {Object.keys(reportData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {reportData.inventory && reportData.inventory.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Current Inventory</h3>
                <Table>
                    <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.inventory.map(item => (
                            <TableRow key={item.materialName}><TableCell>{item.materialName}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.currentStock}</TableCell><TableCell>{item.unit}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
              </section>
            )}
            {reportData.indents && reportData.indents.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-2">Indents</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Indent No.</TableHead><TableHead>Status</TableHead><TableHead>Material</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                        <TableBody>
                           {reportData.indents.flatMap(i => i.items.map(item => (
                               <TableRow key={`${i.id}-${item.materialName}`}>
                                   <TableCell>{format(i.date, 'PP')}</TableCell>
                                   <TableCell>{i.indentNumber}</TableCell>
                                   <TableCell>{i.status}</TableCell>
                                   <TableCell>{item.materialName}</TableCell>
                                   <TableCell>{item.quantity}</TableCell>
                                   <TableCell>{getUnitForMaterial(item.materialName)}</TableCell>
                               </TableRow>
                           )))}
                        </TableBody>
                    </Table>
                </section>
            )}
            {reportData.grn && reportData.grn.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold mb-2">GRN History</h3>
                     <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>GRN No.</TableHead><TableHead>Supplier</TableHead><TableHead>Material</TableHead><TableHead>Qty Received</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {reportData.grn.flatMap(g => g.items.map(item => (
                                <TableRow key={`${g.id}-${item.materialName}`}>
                                    <TableCell>{format(g.date, 'PP')}</TableCell>
                                    <TableCell>{g.grnNumber}</TableCell>
                                    <TableCell>{g.supplierName}</TableCell>
                                    <TableCell>{item.materialName}</TableCell>
                                    <TableCell>{item.receivedQuantity}</TableCell>
                                    <TableCell>{getUnitForMaterial(item.materialName)}</TableCell>
                                </TableRow>
                            )))}
                        </TableBody>
                     </Table>
                </section>
            )}
            {reportData.issues && reportData.issues.length > 0 && (
                 <section>
                    <h3 className="text-lg font-semibold mb-2">Material Issues</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Contractor</TableHead><TableHead>Building/Flat</TableHead><TableHead>Material</TableHead><TableHead>Qty Issued</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                        <TableBody>
                           {reportData.issues.flatMap(i => i.items.map(item => (
                               <TableRow key={`${i.id}-${item.materialName}`}>
                                   <TableCell>{format(i.date, 'PP')}</TableCell>
                                   <TableCell>{i.contractorName}</TableCell>
                                   <TableCell>{i.buildingName} / {i.flatNo}</TableCell>
                                   <TableCell>{item.materialName}</TableCell>
                                   <TableCell>{item.quantity}</TableCell>
                                   <TableCell>{getUnitForMaterial(item.materialName)}</TableCell>
                               </TableRow>
                           )))}
                        </TableBody>
                    </Table>
                </section>
            )}
             {reportData.transfers && reportData.transfers.length > 0 && (
                 <section>
                    <h3 className="text-lg font-semibold mb-2">Site Transfers</h3>
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Material</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                        <TableBody>
                           {reportData.transfers.flatMap(t => t.items.map(item => (
                               <TableRow key={`${t.id}-${item.materialName}`}>
                                   <TableCell>{format(t.date, 'PP')}</TableCell>
                                   <TableCell>{t.fromProject}</TableCell>
                                   <TableCell>{t.toProject}</TableCell>
                                   <TableCell>{item.materialName}</TableCell>
                                   <TableCell>{item.quantity}</TableCell>
                                   <TableCell>{getUnitForMaterial(item.materialName)}</TableCell>
                               </TableRow>
                           )))}
                        </TableBody>
                    </Table>
                </section>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
