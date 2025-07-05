import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { CertificateTemplate } from '@/types';
import { Plus, Search, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const Templates = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const filtered = templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredTemplates(filtered);
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Error', description: 'Failed to fetch templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/templates/${templateId}`, { // This endpoint needs to be created on the backend
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete template');
      
      setTemplates(templates.filter(t => t.id !== templateId));
      toast({ title: 'Success', description: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Certificate Templates</h1>
            <p className="text-muted-foreground">Create and manage your certificate templates</p>
          </div>
          <Button asChild>
            <Link to="/templates/create"><Plus className="h-4 w-4 mr-2" />Create Template</Link>
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search templates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {filteredTemplates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{searchTerm ? 'No templates found' : 'No templates created yet'}</h3>
              <p className="text-muted-foreground mb-6">{searchTerm ? 'Try adjusting your search criteria' : 'Create your first certificate template to get started'}</p>
              {!searchTerm && (
                <Button asChild><Link to="/templates/create"><Plus className="h-4 w-4 mr-2" />Create Your First Template</Link></Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>{template.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <CardDescription>{template.description || 'No description provided'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{template.template_type.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{template.placeholders.length} placeholders</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/templates/${template.id}`}><Edit className="h-4 w-4 mr-2" />Edit</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{template.name}"? This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTemplate(template.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};