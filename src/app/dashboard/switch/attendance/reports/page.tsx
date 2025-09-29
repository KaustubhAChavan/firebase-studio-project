
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CompanyReportSummary = {
    laborerName: string;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    totalWages: number;
};

type ContractorReportSummary = {
    contractorName: string;
    totalMistri: number;
    totalHelper: number;
    totalFemale: number;
    totalAmount: number;
}
type ContractorReportData = {
    summaries: ContractorReportSummary[];
    grandTotal: number;
} | null;


export default function AttendanceReportsPage() {
  const router = useRouter();
  const { 
      selectedProject,
      companyLaborers,
      companyAttendance,
      suppliers,
      contractorAttendance,
      contractorRates,
  } = useAppContext();
  const { toast } = useToast();

  const [companyDateRange, setCompanyDateRange] = useState<DateRange | undefined>(undefined);
  const [contractorDateRange, setContractorDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedContractor, setSelectedContractor] = useState('all');

  const [companyReport, setCompanyReport] = useState<CompanyReportSummary[] | null>(null);
  const [contractorReport, setContractorReport] = useState<ContractorReportData | null>(null);
  
  const projectContractors = useMemo(() => suppliers.filter(s => s.supplierType.includes('Contractor')), [suppliers]);

  const generateCompanyReport = () => {
    if (!companyDateRange?.from || !companyDateRange?.to) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid date range.' });
      return;
    }

    const interval = eachDayOfInterval({ start: companyDateRange.from, end: companyDateRange.to });
    
    const reportSummaries: CompanyReportSummary[] = companyLaborers.map(laborer => {
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;

      interval.forEach(date => {
        const attendanceRecord = companyAttendance.find(att => att.projectName === selectedProject && isSameDay(att.date, date));
        const status = attendanceRecord?.attendance[laborer.id] || 'Absent';
        if (status === 'Present') presentDays++;
        else if (status === 'Half Day') halfDays++;
        else absentDays++;
      });
      
      const totalWages = (presentDays * laborer.wages) + (halfDays * (laborer.wages / 2));

      return {
        laborerName: laborer.name,
        presentDays,
        absentDays,
        halfDays,
        totalWages
      };
    });

    setCompanyReport(reportSummaries);
  };

  const generateContractorReport = () => {
      if (!contractorDateRange?.from || !contractorDateRange?.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a valid date range.' });
        return;
      }
      
      const interval = eachDayOfInterval({ start: contractorDateRange.from, end: contractorDateRange.to });
      const contractorsToReport = selectedContractor === 'all' ? projectContractors : projectContractors.filter(c => c.supplierName === selectedContractor);
      
      let grandTotalAmount = 0;
      
      const summaries = contractorsToReport.map(contractor => {
        const rates = contractorRates.find(r => r.projectName === selectedProject && r.contractorName === contractor.supplierName)?.rates || { mistri: 0, helper: 0, female: 0 };
        let totalMistri = 0;
        let totalHelper = 0;
        let totalFemale = 0;
        let totalAmount = 0;

        interval.forEach(date => {
            const record = contractorAttendance.find(att => att.projectName === selectedProject && att.contractorName === contractor.supplierName && isSameDay(att.date, date));
            if (record) {
                totalMistri += record.laborCount.mistri;
                totalHelper += record.laborCount.helper;
                totalFemale += record.laborCount.female;
                totalAmount += (record.laborCount.mistri * rates.mistri) + (record.laborCount.helper * rates.helper) + (record.laborCount.female * rates.female);
            }
        });
        
        grandTotalAmount += totalAmount;

        return {
            contractorName: contractor.supplierName,
            totalMistri,
            totalHelper,
            totalFemale,
            totalAmount
        };
      }).filter(s => s.totalAmount > 0);
      
      setContractorReport({ summaries, grandTotal: grandTotalAmount });
  };
  
  const exportCompanyReportToPDF = () => {
    if (!companyReport || !companyDateRange?.from || !companyDateRange?.to) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please generate a report first.' });
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const interval = eachDayOfInterval({ start: companyDateRange.from, end: companyDateRange.to });
    
    // --- Detailed Day-wise Data for PDF ---
    const headers = ['Laborer', ...interval.map(d => format(d, 'dd/MM'))];
    let grandTotalWages = 0;
    const rows = companyLaborers.map(laborer => {
      let totalWage = 0;
      const dayStatuses = interval.map(date => {
        const attendanceRecord = companyAttendance.find(att => att.projectName === selectedProject && isSameDay(att.date, date));
        const status = attendanceRecord?.attendance[laborer.id] || 'Absent';
        if (status === 'Present') totalWage += laborer.wages;
        if (status === 'Half Day') totalWage += laborer.wages / 2;
        return status.charAt(0);
      });
      grandTotalWages += totalWage;
      return [laborer.name, ...dayStatuses];
    });

    // --- PDF Generation ---
    doc.text('Company Labor Report', 14, 15);
    doc.text(`Total Wages for Period: ₹${grandTotalWages.toFixed(2)}`, 14, 22);

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 30,
    });
    doc.save('company_labor_report.pdf');
  };
  
   const exportContractorReportToPDF = () => {
    if (!contractorReport || !contractorDateRange?.from || !contractorDateRange?.to) return;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Contractor Attendance Report', 14, 15);
    
    const interval = eachDayOfInterval({ start: contractorDateRange.from, end: contractorDateRange.to });
    const contractorsToReport = selectedContractor === 'all' ? projectContractors : projectContractors.filter(c => c.supplierName === selectedContractor);

    const body: (string|number)[][] = [];

    contractorsToReport.forEach(contractor => {
        const rates = contractorRates.find(r => r.projectName === selectedProject && r.contractorName === contractor.supplierName)?.rates || { mistri: 0, helper: 0, female: 0 };
        let hasData = false;
        
        const contractorRows: (string|number)[][] = [];

        interval.forEach(date => {
            const record = contractorAttendance.find(att => att.projectName === selectedProject && att.contractorName === contractor.supplierName && isSameDay(att.date, date));
            const labor = record?.laborCount || { mistri: 0, helper: 0, female: 0 };
            const dailyTotal = (labor.mistri * rates.mistri) + (labor.helper * rates.helper) + (labor.female * rates.female);
            if (dailyTotal > 0 || labor.mistri > 0 || labor.helper > 0 || labor.female > 0) {
                hasData = true;
                contractorRows.push([
                    format(date, 'dd-MM-yy'),
                    labor.mistri,
                    labor.helper,
                    labor.female,
                    `₹${dailyTotal.toFixed(2)}`
                ]);
            }
        });

        if (hasData) {
            body.push([{ content: contractor.supplierName, colSpan: 5, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }]);
            body.push(...contractorRows);
            const summary = contractorReport.summaries.find(s => s.contractorName === contractor.supplierName);
            if (summary) {
              body.push([{ content: 'Sub-Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₹${summary.totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold' } }]);
            }
        }
    });

    body.push([{ content: 'Grand Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: '#e0e0e0' } }, { content: `₹${contractorReport.grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: '#e0e0e0' } }]);

    autoTable(doc, {
        head: [['Date', 'Mistri', 'Helper', 'Female', 'Daily Amount']],
        body,
        startY: 22,
    });
    
    doc.save(`contractor_attendance_report.pdf`);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

       <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">Company Labor Report</TabsTrigger>
            <TabsTrigger value="contractor">Contractor Labor Report</TabsTrigger>
        </TabsList>
        <TabsContent value="company">
            <Card>
                <CardHeader>
                    <CardTitle>Company Labor Attendance Report</CardTitle>
                    <CardDescription>Generate a daily attendance and wage report for your company's laborers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Label>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant="outline" className={cn("w-full justify-start text-left font-normal", !companyDateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {companyDateRange?.from ? (companyDateRange.to ? `${format(companyDateRange.from, "LLL dd, y")} - ${format(companyDateRange.to, "LLL dd, y")}` : format(companyDateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={companyDateRange?.from} selected={companyDateRange} onSelect={setCompanyDateRange} numberOfMonths={2} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={generateCompanyReport}>Generate Report</Button>
                        <Button variant="outline" onClick={exportCompanyReportToPDF} disabled={!companyReport}>
                            <FileDown className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                    {companyReport && (
                        <div className="border rounded-md p-4">
                            <h3 className="font-semibold text-lg mb-2">Total Wages for Period: ₹{companyReport.reduce((sum, r) => sum + r.totalWages, 0).toFixed(2)}</h3>
                            <div className="overflow-x-auto max-h-[60vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Laborer</TableHead>
                                            <TableHead className="text-right">Present</TableHead>
                                            <TableHead className="text-right">Half Days</TableHead>
                                            <TableHead className="text-right">Absent</TableHead>
                                            <TableHead className="text-right">Total Wages</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companyReport.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{row.laborerName}</TableCell>
                                                <TableCell className="text-right">{row.presentDays}</TableCell>
                                                <TableCell className="text-right">{row.halfDays}</TableCell>
                                                <TableCell className="text-right">{row.absentDays}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{row.totalWages.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="contractor">
            <Card>
                <CardHeader>
                    <CardTitle>Contractor Attendance Report</CardTitle>
                    <CardDescription>Generate a daily attendance and cost report for contractors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Label>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant="outline" className={cn("w-full justify-start text-left font-normal", !contractorDateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {contractorDateRange?.from ? (contractorDateRange.to ? `${format(contractorDateRange.from, "LLL dd, y")} - ${format(contractorDateRange.to, "LLL dd, y")}` : format(contractorDateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={contractorDateRange?.from} selected={contractorDateRange} onSelect={setContractorDateRange} numberOfMonths={2} />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="flex-1">
                            <Label>Contractor</Label>
                            <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Contractors</SelectItem>
                                    {projectContractors.map(c => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={generateContractorReport}>Generate Report</Button>
                        <Button variant="outline" onClick={exportContractorReportToPDF} disabled={!contractorReport}>
                            <FileDown className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    </div>
                     {contractorReport && (
                        <div className="border rounded-md p-4">
                            <h3 className="font-semibold text-lg mb-2">Grand Total: ₹{contractorReport.grandTotal.toFixed(2)}</h3>
                            <div className="overflow-x-auto max-h-[60vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Contractor</TableHead>
                                            <TableHead className="text-right">Total Mistri</TableHead>
                                            <TableHead className="text-right">Total Helper</TableHead>
                                            <TableHead className="text-right">Total Female</TableHead>
                                            <TableHead className="text-right">Total Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contractorReport.summaries.map((summary) => (
                                            <TableRow key={summary.contractorName}>
                                                <TableCell className="font-medium">{summary.contractorName}</TableCell>
                                                <TableCell className="text-right">{summary.totalMistri}</TableCell>
                                                <TableCell className="text-right">{summary.totalHelper}</TableCell>
                                                <TableCell className="text-right">{summary.totalFemale}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{summary.totalAmount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
