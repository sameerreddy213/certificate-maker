import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Plus, RefreshCw, X } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import xlsx library for frontend parsing

// Define the schema for the generation form
const generateSchema = z.object({
  templateId: z.string().min(1, 'Please select a template'),
  dataFile: typeof window === 'undefined' ? z.any() : z.instanceof(File, { message: 'Data file is required' }),
});

type GenerateForm = z.infer<typeof generateSchema>;

interface Template {
  _id: string;
  name: string;
  placeholders: string[];
}

interface BatchStatus {
  status: string;
  generated: number;
  total: number;
  batchId?: string;
  individualDownloads?: { recipientName: string; downloadUrl: string }[];
  batchZipDownloadUrl?: string;
}

export const GenerateCertificates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplatePlaceholders, setSelectedTemplatePlaceholders] = useState<string[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // {excelHeader: templatePlaceholder}
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBatchStatus, setCurrentBatchStatus] = useState<BatchStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema),
  });

  const selectedTemplateId = form.watch('templateId');
  const dataFile = form.watch('dataFile');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token'); // Assuming JWT token is stored
        const response = await fetch('http://localhost:5000/api/templates', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast({
          title: 'Error',
          description: 'Failed to load templates.',
          variant: 'destructive',
        });
      }
    };
    fetchTemplates();
  }, [toast]);

  // Update placeholders when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t._id === selectedTemplateId);
      if (template) {
        setSelectedTemplatePlaceholders(template.placeholders);
        // Reset mappings if template changes
        setMappings({});
      }
    } else {
      setSelectedTemplatePlaceholders([]);
      setMappings({});
    }
  }, [selectedTemplateId, templates]);

  // Handle data file upload and parse headers
  useEffect(() => {
    if (dataFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Get raw data to extract headers

          if (json.length > 0) {
            setExcelHeaders(json[0] as string[]); // First row is headers
          } else {
            setExcelHeaders([]);
            toast({
              title: 'Warning',
              description: 'Uploaded file is empty or has no headers.',
              variant: 'default',
            });
          }
          setMappings({}); // Reset mappings on new file upload
        } catch (error) {
          console.error('Error reading file:', error);
          setExcelHeaders([]);
          toast({
            title: 'Error',
            description: 'Failed to read data file. Please ensure it is a valid Excel/CSV.',
            variant: 'destructive',
          });
        }
      };
      reader.readAsArrayBuffer(dataFile);
    } else {
      setExcelHeaders([]);
      setMappings({});
    }
  }, [dataFile, toast]);

  const handleMappingChange = (placeholder: string, excelHeader: string) => {
    setMappings((prev) => ({ ...prev, [excelHeader]: placeholder }));
  };

  const removeMapping = (excelHeader: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[excelHeader];
      return newMappings;
    });
  };

  const startPollingBatchStatus = (batchId: string) => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/batches/${batchId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch batch status');
        }
        const statusData: BatchStatus = await response.json();
        setCurrentBatchStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval); // Stop polling when done
          setPollingInterval(null);
          if (statusData.status === 'completed') {
            toast({
              title: 'Success',
              description: 'Certificate batch generation completed!',
            });
            // Fetch full details including download links
            fetchBatchDetails(batchId);
          } else {
            toast({
              title: 'Error',
              description: 'Certificate batch generation failed. Check server logs.',
              variant: 'destructive',
            });
          }
          setIsGenerating(false);
        }
      } catch (error) {
        console.error('Error polling batch status:', error);
        clearInterval(interval);
        setPollingInterval(null);
        setIsGenerating(false);
        toast({
          title: 'Error',
          description: 'Failed to get batch status. Try again later.',
          variant: 'destructive',
        });
      }
    }, 3000); // Poll every 3 seconds
    setPollingInterval(interval);
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/batches/${batchId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch batch details');
      }
      const details: BatchStatus = await response.json();
      setCurrentBatchStatus(details);
    } catch (error) {
      console.error('Error fetching batch details:', error);
      toast({
        title: 'Error',
        description: 'Failed to retrieve batch download links.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: GenerateForm) => {
    if (Object.keys(mappings).length !== selectedTemplatePlaceholders.length) {
      toast({
        title: 'Validation Error',
        description: 'Please map all template placeholders to Excel columns.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setCurrentBatchStatus({ status: 'pending', generated: 0, total: excelHeaders.length });

    const formData = new FormData();
    formData.append('templateId', data.templateId);
    formData.append('dataFile', data.dataFile);
    formData.append('mappings', JSON.stringify(mappings)); // Send mappings as JSON string

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/batches/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start generation');
      }

      const responseData = await response.json();
      toast({
        title: 'Generation Started',
        description: `Batch ${responseData.batchId} is now processing.`,
      });
      startPollingBatchStatus(responseData.batchId); // Start polling status
    } catch (error) {
      console.error('Error starting generation:', error);
      setIsGenerating(false);
      setCurrentBatchStatus(null); // Clear status on error
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to start certificate generation.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Generate Certificates</h1>
            <p className="text-muted-foreground">
              Select a template, upload data, and generate certificates in bulk.
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Template Selection & Data Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Select Template & Data</CardTitle>
                <CardDescription>
                  Choose your certificate template and upload the recipient data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Select */}
                <div className="space-y-2">
                  <Label htmlFor="template">Certificate Template</Label>
                  <Select
                    onValueChange={(value) => form.setValue('templateId', value)}
                    value={selectedTemplateId || ''}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value="no-templates" disabled>
                          No templates available. Create one first.
                        </SelectItem>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.templateId && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.templateId.message}
                    </p>
                  )}
                </div>

                {/* Data File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="dataFile">Recipient Data (Excel/CSV)</Label>
                  <Input
                    id="dataFile"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={fileInputRef}
                    onChange={(e) => form.setValue('dataFile', e.target.files?.[0])}
                  />
                  {dataFile && (
                    <p className="text-sm text-muted-foreground">Selected: {dataFile.name}</p>
                  )}
                  {form.formState.errors.dataFile?.message && (
                    <p className="text-sm text-destructive">
                      {typeof form.formState.errors.dataFile.message === 'string'
                        ? form.formState.errors.dataFile.message
                        : 'Invalid file.'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping */}
            <Card>
              <CardHeader>
                <CardTitle>Map Fields</CardTitle>
                <CardDescription>
                  Match your Excel columns to template placeholders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTemplateId && excelHeaders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Placeholder</TableHead>
                        <TableHead>Excel Column</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTemplatePlaceholders.map((placeholder) => (
                        <TableRow key={placeholder}>
                          <TableCell className="font-medium">
                            `&#123;&#123;{placeholder}&#125;&#125;`
                          </TableCell>
                          <TableCell>
                            <Select
                              onValueChange={(value) => handleMappingChange(placeholder, value)}
                              value={
                                Object.keys(mappings).find((key) => mappings[key] === placeholder) ||
                                ''
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Excel Column" />
                              </SelectTrigger>
                              <SelectContent>
                                {excelHeaders.map((header) => (
                                  <SelectItem
                                    key={header}
                                    value={header}
                                    // Disable if already mapped to another placeholder
                                    disabled={Object.keys(mappings).some(
                                      (k) => mappings[k] === placeholder && k !== header
                                    )}
                                  >
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {Object.keys(mappings).some((key) => mappings[key] === placeholder) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  removeMapping(
                                    Object.keys(mappings).find((key) => mappings[key] === placeholder) || ''
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Select a template and upload a data file to start mapping.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generation Progress & Download */}
          {isGenerating && currentBatchStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
                <CardDescription>
                  Tracking batch: {currentBatchStatus.batchId}
                  {currentBatchStatus.status === 'processing' && (
                    <span className="ml-2 text-blue-500 flex items-center">
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Processing...
                    </span>
                  )}
                  {currentBatchStatus.status === 'completed' && (
                    <span className="ml-2 text-green-500">Completed!</span>
                  )}
                  {currentBatchStatus.status === 'failed' && (
                    <span className="ml-2 text-red-500">Failed!</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress
                  value={(currentBatchStatus.generated / currentBatchStatus.total) * 100}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Generated {currentBatchStatus.generated} of {currentBatchStatus.total} certificates.
                </p>

                {currentBatchStatus.status === 'completed' && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Download Options:</h3>
                    {currentBatchStatus.batchZipDownloadUrl && (
                      <a href={currentBatchStatus.batchZipDownloadUrl} download className="block">
                        <Button className="w-full">
                          <Download className="h-4 w-4 mr-2" /> Download All as ZIP
                        </Button>
                      </a>
                    )}
                    {currentBatchStatus.individualDownloads && currentBatchStatus.individualDownloads.length > 0 && (
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        <p className="text-sm text-muted-foreground mb-2">Individual Certificates:</p>
                        {currentBatchStatus.individualDownloads.map((cert, index) => (
                          <a key={index} href={cert.downloadUrl} download className="block mb-1">
                            <Button variant="outline" size="sm" className="w-full justify-between">
                              <span>{cert.recipientName || `Certificate ${index + 1}`}</span>
                              <Download className="h-3 w-3 ml-2" />
                            </Button>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Start Generation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};