import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Download, Eye, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { CertificateBatch, IndividualCertificate } from '@/types';

export const History = () => {
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loadingCerts, setLoadingCerts] = useState<Record<string, boolean>>({});
  const [individualCertificates, setIndividualCertificates] = useState<Record<string, IndividualCertificate[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get<CertificateBatch[]>('/batches');
      setBatches(response.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch batch history.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = async (batchId: string) => {
    const newExpandedRow = expandedRow === batchId ? null : batchId;
    setExpandedRow(newExpandedRow);

    if (newExpandedRow && !individualCertificates[batchId]) {
      setLoadingCerts(prev => ({ ...prev, [batchId]: true }));
      try {
        const response = await api.get(`/batches/${batchId}/details`);
        setIndividualCertificates(prev => ({ ...prev, [batchId]: response.data.individualDownloads || [] }));
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load certificate details.', variant: 'destructive' });
      } finally {
        setLoadingCerts(prev => ({ ...prev, [batchId]: false }));
      }
    }
  };

  const handleFileAction = async (certId: string, action: 'view' | 'download') => {
    try {
      const response = await api.get(`/certificates/${certId}/${action}`, {
        responseType: 'blob', // IMPORTANT: request the file data as a blob
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);

      if (action === 'view') {
        window.open(fileURL, '_blank');
      } else {
        // For download, create a temporary link and click it
        const link = document.createElement('a');
        link.href = fileURL;

        // Extract filename from headers if available, otherwise use a generic name
        const contentDisposition = response.headers['content-disposition'];
        let filename = `certificate-${certId}.pdf`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch && filenameMatch.length > 1) {
            filename = filenameMatch[1];
          }
        }
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link); // Clean up the link
      }

      // Optional: Revoke the object URL after a delay to save memory
      setTimeout(() => URL.revokeObjectURL(fileURL), 60000);

    } catch (error) {
      console.error(`Failed to ${action} certificate:`, error);
      toast({ title: 'Error', description: `Could not ${action} the certificate.`, variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Generation History</CardTitle>
            <CardDescription>A record of all your bulk certificate generations.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: '50px' }}></TableHead>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Certificates</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Download Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length > 0 ? (
                  batches.map((batch) => (
                    <>
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => toggleRow(batch.id)}>
                            {loadingCerts[batch.id]
                              ? <Loader2 className="animate-spin" />
                              : expandedRow === batch.id ? <ChevronUp /> : <ChevronDown />
                            }
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{batch.batch_name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
                        </TableCell>
                        <TableCell>{`${batch.generated_certificates}/${batch.total_certificates}`}</TableCell>
                        <TableCell>{new Date(batch.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!batch.batch_zip_url || batch.status !== 'completed'}
                            onClick={() => window.open(batch.batch_zip_url!, '_blank')}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Zip
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRow === batch.id && (
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={6}>
                            <div className="p-4">
                              <h4 className="font-semibold mb-3">Individual Certificates</h4>
                              {individualCertificates[batch.id] ? (
                                <ul className="space-y-2">
                                  {individualCertificates[batch.id].map((cert) => (
                                    <li key={cert.id} className="flex items-center justify-between p-2 rounded-md hover:bg-background">
                                      <span className={cert.status === 'failed' ? 'text-destructive' : ''}>
                                        {cert.recipientName}
                                        {cert.status === 'failed' && ' (Failed)'}
                                      </span>
                                      <div className="space-x-2">
                                        {/* Only show buttons if the certificate was generated successfully and has an ID */}
                                        {cert.status === 'generated' && cert.id ? (
                                          <>
                                            <Button variant="ghost" size="sm" onClick={() => handleFileAction(cert.id, 'view')}>
                                              <Eye className="mr-2 h-4 w-4" />
                                              View
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleFileAction(cert.id, 'download')}>
                                              <Download className="mr-2 h-4 w-4" />
                                              Download
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge variant="destructive">Not Available</Badge>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p>Loading details...</p>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No generation history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};