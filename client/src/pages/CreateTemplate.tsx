import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api'; // Make sure to use your api instance

// Updated schema to include File object for template_file
const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  template_type: z.enum(['docx', 'pptx']), // Only docx and pptx allowed now
  template_file: typeof window === 'undefined' ? z.any() : z.instanceof(File, { message: 'A template file is required.' }),
});

type TemplateForm = z.infer<typeof templateSchema>;

export const CreateTemplate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>(['recipientName', 'eventName']); // Default placeholders
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_type: 'docx',
      name: '',
      description: '',
    },
  });

  const selectedFile = form.watch('template_file');

  const addPlaceholder = () => {
    if (newPlaceholder && !placeholders.includes(newPlaceholder)) {
      setPlaceholders([...placeholders, newPlaceholder]);
      setNewPlaceholder('');
    }
  };

  const removePlaceholder = (placeholder: string) => {
    setPlaceholders(placeholders.filter(p => p !== placeholder));
  };

  const onSubmit = async (data: TemplateForm) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('template_type', data.template_type);
    formData.append('template_file', data.template_file);
    formData.append('placeholders', JSON.stringify(placeholders));

    try {
        // Use your configured api instance which includes the auth token
        await api.post('/templates', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        toast({
            title: 'Success',
            description: 'Template created successfully!',
        });

        navigate('/templates');
    } catch (error: any) {
        console.error('Error creating template:', error);
        toast({
            title: 'Error',
            description: error.response?.data?.message || 'Failed to create template',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/templates')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New Template</h1>
            <p className="text-muted-foreground">
              Upload a DOCX/PPTX template and define placeholders for dynamic content.
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Template Settings */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Template Settings</CardTitle>
                  <CardDescription>
                    Configure your template details and define placeholders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter template name"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Enter template description"
                      {...form.register('description')}
                    />
                  </div>

                  {/* Template File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="template_file">Upload Template (DOCX/PPTX)</Label>
                    <Input
                      id="template_file"
                      type="file"
                      accept=".docx,.pptx"
                      ref={fileInputRef}
                      onChange={(e) => form.setValue('template_file', e.target.files?.[0], { shouldValidate: true })}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
                    )}
                    {form.formState.errors.template_file && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.template_file.message}
                      </p>
                    )}
                  </div>

                  {/* Template Type Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="template_type">Template Type</Label>
                    <select
                      id="template_type"
                      {...form.register('template_type')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="docx">DOCX</option>
                      <option value="pptx">PPTX</option>
                    </select>
                  </div>

                  {/* Placeholders */}
                  <div className="space-y-4">
                    <Label>Define Placeholders in your DOCX/PPTX</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="e.g., issueDate"
                        value={newPlaceholder}
                        onChange={(e) => setNewPlaceholder(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPlaceholder())}
                      />
                      <Button type="button" onClick={addPlaceholder} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {placeholders.map((placeholder) => (
                        <Badge
                          key={placeholder}
                          variant="secondary"
                          className="cursor-default"
                        >
                          {`{{${placeholder}}}`}
                          <X
                            className="h-3 w-3 ml-1 hover:text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlaceholder(placeholder);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {/* THE FIX IS HERE */}
                      These are the placeholders to use in your file (e.g., {'{{recipientName}}'}).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Info */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Template Information</CardTitle>
                  <CardDescription>
                    Upload your file with the defined placeholders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg">Upload your DOCX or PPTX file.</p>
                        <p className="text-sm">
                          {/* AND THE FIX IS HERE */}
                          Ensure your placeholders (e.g., {'{{recipientName}}'}) are placed correctly.
                        </p>
                    </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/templates')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedFile}>
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};