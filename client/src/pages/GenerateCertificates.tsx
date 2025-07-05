import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CertificateTemplate } from '@/types';
import { Upload, FileText, Loader2, ChevronsRight, AlertCircle } from 'lucide-react';

// Zod schema for form validation
const generateFormSchema = z.object({
  batch_name: z.string().min(3, { message: 'Batch name must be at least 3 characters.' }),
  template_id: z.string({ required_error: 'Please select a template.' }),
});

type GenerateForm = z.infer<typeof generateFormSchema>;

export const GenerateCertificates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Component State
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // React Hook Form setup
  const form = useForm<GenerateForm>({
    resolver: zodResolver(generateFormSchema),
  });

  // Fetch certificate templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('http://localhost:5000/api/templates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch templates.');
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Could not load certificate templates.',
          variant: 'destructive',
        });
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [toast]);

  // Update selected template object when form value changes
  const selectedTemplateId = form.watch('template_id');
  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplateId) || null;
    setSelectedTemplate(template);
  }, [selectedTemplateId, templates]);

  // Handler for file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          setExcelData(json);
          toast({
            title: 'File Processed',
            description: `${json.length} rows loaded from ${file.name}`,
          });
        } catch (error) {
            toast({
                title: 'File Error',
                description: 'Could not read the Excel file. Please ensure it is a valid .xlsx or .csv file.',
                variant: 'destructive'
            });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
  // Check if all conditions are met to enable the generate button
  const canGenerate = () => {
      if (!selectedTemplate || excelData.length === 0) return false;
      const headers = Object.keys(excelData[0]);
      // Ensures every required field from the template is present in the Excel file headers
      return selectedTemplate.required_fields.every(field => headers.includes(field));
  };
  
  /**
   * Handles the form submission to create a new certificate batch.
   * This is the updated function you provided.
   */
  const onSubmit = async (formData: GenerateForm) => {
    if (!selectedTemplate || !canGenerate()) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Include excelData in the body
        body: JSON.stringify({
          template_id: formData.template_id,
          batch_name: formData.batch_name,
          total_certificates: excelData.length,
          status: 'pending',
          excelData: excelData // Send parsed Excel data to the backend
        }),
      });
      if (!response.ok) throw new Error('Failed to create batch');

      toast({ title: 'Success', description: `Batch "${formData.batch_name}" created.` });
      navigate('/history'); // Navigate to history page on success
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({ title: 'Error', description: 'Failed to create certificate batch', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Generate New Certificate Batch</CardTitle>
            <CardDescription>
              Select a template, upload recipient data, and start the generation process.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-8">
                {/* Step 1: Batch Details */}
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-4">Step 1: Batch Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name="batch_name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Batch Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Q3 Developer Awards" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="template_id"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Certificate Template</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTemplates}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                    {template.template_name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                {/* Step 2: Upload Data */}
                <div className={`p-4 border rounded-lg ${!selectedTemplate ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold mb-4">Step 2: Upload Recipient Data</h3>
                    {!selectedTemplate ? (
                        <p className='text-sm text-muted-foreground'>Please select a template first.</p>
                    ) : (
                        <div>
                            <FormLabel htmlFor="file-upload">Excel/CSV File</FormLabel>
                            <div className="mt-2 flex items-center gap-4">
                                <Button asChild variant="outline">
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose File
                                </label>
                                </Button>
                                <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .csv" />
                                {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
                            </div>
                            <FormDescription className="mt-2">
                                Your file must contain the following columns: <br />
                                <code className="bg-muted px-2 py-1 rounded-md text-xs">{selectedTemplate.required_fields.join(', ')}</code>
                            </FormDescription>
                        </div>
                    )}
                </div>

                {/* Step 3: Preview and Generate */}
                {excelData.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-4">Step 3: Preview Data & Generate</h3>
                     {!canGenerate() && (
                         <div className="p-3 mb-4 text-destructive-foreground bg-destructive/80 rounded-md flex items-center gap-2">
                           <AlertCircle className="h-4 w-4"/>
                           <p className="text-sm">File headers do not match template requirements. Please check your file and re-upload.</p>
                         </div>
                     )}
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                        <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                            {Object.keys(excelData[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                            ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {excelData.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                                {Object.values(row).map((cell: any, i: number) => (
                                <TableCell key={i}>{String(cell)}</TableCell>
                                ))}
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    {excelData.length > 5 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 5 of {excelData.length} rows.</p>}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={!canGenerate() || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Certificates
                      <ChevronsRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};