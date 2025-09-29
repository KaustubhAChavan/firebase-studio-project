
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext, CompanyData, companyFormSchema } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { withAuthorization } from '@/components/with-authorization';

function CompanyPageComponent() {
  const { toast } = useToast();
  const { companies, setCompanies } = useAppContext();
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyData | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      id: '',
      companyName: '',
      companyAddress: '',
      email: '',
      gstNo: '',
      contactNo: '',
    },
  });

  function onSubmit(values: z.infer<typeof companyFormSchema>) {
    if (editingCompany) {
      const updatedCompanies = companies.map(c => c.id === editingCompany.id ? values : c);
      setCompanies(updatedCompanies);
      toast({
        title: 'Success!',
        description: 'Company information has been updated.',
      });
      setEditingCompany(null);
    } else {
      setCompanies((prevCompanies) => [...prevCompanies, {...values, id: crypto.randomUUID()}]);
      toast({
        title: 'Success!',
        description: 'Company information has been saved.',
      });
    }
    form.reset({ id: '', companyName: '', companyAddress: '', email: '', gstNo: '', contactNo: '' });
  }

  const handleEdit = (company: CompanyData) => {
    setEditingCompany(company);
    form.reset(company);
  };

  const handleDelete = () => {
    if (!deletingCompany) return;
    setCompanies(companies.filter((c) => c.id !== deletingCompany.id));
    toast({
      variant: 'destructive',
      title: 'Deleted!',
      description: 'Company information has been deleted.',
    });
    setDeletingCompany(null);
  };
  
  const handleCancelEdit = () => {
    setEditingCompany(null);
    form.reset({ id: '', companyName: '', companyAddress: '', email: '', gstNo: '', contactNo: '' });
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="space-y-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              {editingCompany ? 'Edit Company' : 'Company Information'}
            </CardTitle>
            <CardDescription>
              {editingCompany
                ? 'Update the details for the selected company.'
                : 'Fill out the details for the new company.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Kothari Construction Company"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="contact@kccinfrasoft.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="companyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Construction Ave, Building City, 12345"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gstNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST No</FormLabel>
                        <FormControl>
                          <Input placeholder="27ABCDE1234F1Z5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact No</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                    <Button type="submit">
                      {editingCompany ? 'Update Company' : 'Save Company'}
                    </Button>
                    {editingCompany && <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {companies.length > 0 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Saved Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>GST No.</TableHead>
                    <TableHead>Contact No.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        {company.companyName}
                      </TableCell>
                      <TableCell>{company.email}</TableCell>
                      <TableCell>{company.gstNo}</TableCell>
                      <TableCell>{company.contactNo}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(company)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCompany(company)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <AlertDialog
          open={deletingCompany !== null}
          onOpenChange={() => setDeletingCompany(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                company and remove its data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingCompany(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default withAuthorization(CompanyPageComponent);
