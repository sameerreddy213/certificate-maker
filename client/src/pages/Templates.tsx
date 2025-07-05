import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit } from 'lucide-react'; // Added Edit icon for consistency
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api'; // Your configured axios instance
import { CertificateTemplate } from '@/types'; // Assuming this type is correct
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
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

export const Templates = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { token } = useAuth(); // Get the token from the auth context

  // Move fetchTemplates to component scope so it can be used elsewhere
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`, // Use token from useAuth
        },
      };
      const response = await api.get<CertificateTemplate[]>('/templates', config);
      setTemplates(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch templates:', err);
      type ErrorWithResponse = { response?: { data?: { message?: string } } };
      if (typeof err === 'object' && err !== null && 'response' in err && typeof (err as ErrorWithResponse).response === 'object') {
        setError((err as ErrorWithResponse).response?.data?.message || 'Failed to load templates. Please try again.');
      } else {
        setError('Failed to load templates. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    // Only fetch templates if a token is available
    if (token) {
      fetchTemplates();
    } else {
      setLoading(false); // Stop loading if no token is present
      setError('Authentication token not found. Please log in.');
    }
  }, [token, fetchTemplates]); // Add fetchTemplates as a dependency

  // This function is called when you click the trash icon
  const handleDeleteClick = (id: string) => {
    setTemplateToDelete(id);
    setShowDeleteConfirm(true); // This opens the dialog
  };

  // This function is attached to the "Delete" button's onClick event in the AlertDialog
  const handleDeleteConfirm = async () => {
    if (!templateToDelete || !token) {
      setShowDeleteConfirm(false); // Close dialog if no template to delete or no token
      setTemplateToDelete(null);
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`, // Use token from useAuth
        },
      };
      // Send the request to the backend
      await api.delete(`/templates/${templateToDelete}`, config);

      toast({
        title: 'Success',
        description: 'Template deleted successfully.',
      });
    } catch (err: unknown) {
      console.error('Failed to delete template:', err);
      let description = 'Could not delete the template.';
      type ErrorWithResponse = { response?: { data?: { message?: string } } };
      if (typeof err === 'object' && err !== null && 'response' in err && typeof (err as ErrorWithResponse).response === 'object') {
        description = (err as ErrorWithResponse).response?.data?.message || description;
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      // Close the dialog and reset the state regardless of success or failure
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center text-red-500">
          <p className="text-lg font-medium mb-4">Error loading templates:</p>
          <p className="text-md">{error}</p>
          {token ? (
            <Button onClick={fetchTemplates} className="mt-4">Retry</Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Please ensure you are logged in.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Certificate Templates</h1>
              <p className="text-muted-foreground">Manage your DOCX and PPTX templates.</p>
            </div>
            <Button asChild>
              <Link to="/templates/create">
                <Plus className="mr-2 h-4 w-4" /> Create New
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Templates</CardTitle>
              <CardDescription>
                A list of all templates in your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(template.template_type || 'N/A').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          {new Date(template.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end space-x-2">
                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link to={`/templates/edit/${template.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No templates found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};