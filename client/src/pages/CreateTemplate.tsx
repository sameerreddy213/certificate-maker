import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// import { useAuth } from '@/contexts/AuthContext'; // Removed as it's no longer used
// import { supabase } from '@/integrations/supabase/client'; // Removed as it's no longer used
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Plus, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  template_type: z.enum(['html', 'docx', 'pptx']),
  template_content: z.string().min(1, 'Template content is required'),
});

type TemplateForm = z.infer<typeof templateSchema>;

const defaultHtmlTemplate = `
<div style="
  width: 800px;
  height: 600px;
  margin: 0 auto;
  padding: 60px;
  border: 2px solid #2563eb;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: 'Georgia', serif;
  text-align: center;
  position: relative;
">
  <div style="border: 1px solid #cbd5e1; padding: 40px; background: white; border-radius: 8px;">
    <h1 style="
      font-size: 48px;
      color: #1e40af;
      margin-bottom: 20px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
    ">Certificate of Achievement</h1>
    
    <p style="font-size: 18px; color: #475569; margin-bottom: 30px;">
      This is to certify that
    </p>
    
    <h2 style="
      font-size: 36px;
      color: #0f172a;
      margin: 30px 0;
      font-weight: bold;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
      display: inline-block;
    ">{{recipientName}}</h2>
    
    <p style="font-size: 18px; color: #475569; margin: 30px 0; line-height: 1.6;">
      has successfully completed the course
    </p>
    
    <h3 style="
      font-size: 24px;
      color: #1e40af;
      margin: 20px 0;
      font-weight: bold;
    ">{{courseName}}</h3>
    
    <p style="font-size: 16px; color: #475569; margin: 30px 0;">
      on {{completionDate}}
    </p>
    
    <div style="
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div style="text-align: left;">
        <div style="width: 200px; height: 2px; background: #2563eb; margin-bottom: 5px;"></div>
        <p style="font-size: 14px; color: #475569;">Instructor Signature</p>
      </div>
      
      <div style="text-align: right;">
        <div style="width: 200px; height: 2px; background: #2563eb; margin-bottom: 5px;"></div>
        <p style="font-size: 14px; color: #475569;">Date</p>
      </div>
    </div>
  </div>
</div>
`.trim();

export const CreateTemplate = () => {
  // const { user } = useAuth(); // Removed as it's no longer used
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>(['recipientName', 'courseName', 'completionDate']);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      template_type: 'html',
      template_content: defaultHtmlTemplate,
    },
  });

  const templateContent = form.watch('template_content');

  const addPlaceholder = () => {
    if (newPlaceholder && !placeholders.includes(newPlaceholder)) {
      setPlaceholders([...placeholders, newPlaceholder]);
      setNewPlaceholder('');
    }
  };

  const removePlaceholder = (placeholder: string) => {
    setPlaceholders(placeholders.filter(p => p !== placeholder));
  };

  const insertPlaceholder = (placeholder: string) => {
    const currentContent = form.getValues('template_content');
    const newContent = currentContent + `{{${placeholder}}}`;
    form.setValue('template_content', newContent);
  };

  const getPreviewContent = () => {
    let content = templateContent;
    placeholders.forEach(placeholder => {
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      content = content.replace(regex, `[${placeholder.toUpperCase()}]`);
    });
    return content;
  };

  const onSubmit = async (data: TemplateForm) => {
    setLoading(true);
    try {
        const response = await fetch('http://localhost:5000/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, placeholders }),
        });

        if (!response.ok) throw new Error('Failed to create template');

        toast({
            title: 'Success',
            description: 'Template created successfully!',
        });

        navigate('/templates');
    } catch (error) {
        console.error('Error creating template:', error);
        toast({
            title: 'Error',
            description: 'Failed to create template',
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
              Design a certificate template with placeholders for dynamic content
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
                    Configure your template details and placeholders
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
                    <Textarea
                      id="description"
                      placeholder="Enter template description"
                      {...form.register('description')}
                    />
                  </div>

                  {/* Placeholders */}
                  <div className="space-y-4">
                    <Label>Placeholders</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add placeholder name"
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
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => insertPlaceholder(placeholder)}
                        >
                          {placeholder}
                          <X
                            className="h-3 w-3 ml-1 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlaceholder(placeholder);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click on a placeholder to insert it into your template
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Template Editor</CardTitle>
                      <CardDescription>
                        Create your HTML template with placeholders
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {previewMode ? (
                    <div className="border rounded-lg p-4 min-h-[500px] bg-white">
                      <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                    </div>
                  ) : (
                    <Textarea
                      {...form.register('template_content')}
                      placeholder="Enter your HTML template here..."
                      className="min-h-[500px] font-mono text-sm"
                    />
                  )}
                  {form.formState.errors.template_content && (
                    <p className="text-sm text-destructive mt-2">
                      {form.formState.errors.template_content.message}
                    </p>
                  )}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
