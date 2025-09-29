
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IndentData } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ApprovalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { indents, setIndents, selectedProject, materials } = useAppContext();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IndentData | null>(null);

  const pendingIndents = useMemo(() =>
    indents.filter(indent => indent.status === 'Pending' && indent.requestingProject === selectedProject),
    [indents, selectedProject]
  );
  
  const handleIndentApproval = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setIndents(prev =>
      prev.map(indent => (indent.id === id ? { ...indent, status: newStatus } : indent))
    );
    toast({
      title: `Indent ${newStatus}`,
      description: `The indent has been successfully ${newStatus.toLowerCase()}.`,
    });
  };

  const renderApprovalActions = (item: IndentData, handler: (id: string, status: 'Approved' | 'Rejected') => void) => (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handler(item.id, 'Approved')}>
            <ThumbsUp className="mr-2 h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handler(item.id, 'Rejected')}>
            <ThumbsDown className="mr-2 h-4 w-4" /> Reject
        </Button>
    </div>
  )

  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || '';
  };


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
          <CardTitle>Material Indent Approvals</CardTitle>
          <CardDescription>Review and approve or reject pending material indents for project: {selectedProject}.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indent No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingIndents.length > 0 ? pendingIndents.map(indent => (
                <TableRow key={indent.id}>
                  <TableCell className="font-medium cursor-pointer" onClick={() => { setSelectedItem(indent); setIsDetailsOpen(true); }}>{indent.indentNumber}</TableCell>
                  <TableCell>{format(indent.date, 'PPP')}</TableCell>
                  <TableCell>{indent.items.length}</TableCell>
                  <TableCell className="text-right">
                    {renderApprovalActions(indent, handleIndentApproval)}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No pending indents for approval.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Details</DialogTitle>
            {selectedItem && (
              <DialogDescription>
                {`Indent: ${selectedItem.indentNumber} | Date: ${format(selectedItem.date, 'PP')}`}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedItem && 'indentNumber' in selectedItem ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItem.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{getUnitForMaterial(item.materialName)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
