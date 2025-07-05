import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { CertificateBatch } from '@/types';
import { FileText, Download, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api'; // Assuming this is your axios instance configured with base URL
import { useAuth } from '@/contexts/AuthContext'; // Using the useAuth hook for token

interface DashboardStats {
  totalTemplates: number;
  totalBatches: number;
  totalCertificates: number;
  chartData: { date: string; count: number }[];
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<CertificateBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth(); // Get the token and user from the auth context

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Ensure the API calls include the authorization header.
        // Assuming 'api' is an axios instance that can be configured with interceptors
        // or you can pass headers explicitly if 'api' is just an alias for axios.
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        // Fetch dashboard statistics
        const statsResponse = await api.get<DashboardStats>('/dashboard/stats', config);
        setStats(statsResponse.data);

        // Fetch recent batches
        const batchesResponse = await api.get<CertificateBatch[]>('/batches', config); 
        setRecentBatches(batchesResponse.data.slice(0, 5));

      } catch (error: unknown) {
        console.error('Error fetching dashboard data:', error);
        let errorMessage = 'Could not load dashboard data.';

        // Define a type for the error response
        type ApiError = {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as ApiError).response?.data?.message === 'string'
        ) {
          errorMessage = (error as ApiError).response!.data!.message!;
        }
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if the token exists. This prevents unauthenticated calls.
    if (token) {
      fetchDashboardData();
    } else {
      setLoading(false); // If no token, stop loading and wait for login/redirect
    }
  }, [token]); // Re-run effect if token changes

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {user?.email || 'Guest'}! An overview of your certificate generation activity.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTemplates ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBatches ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCertificates ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Generations This Week</CardTitle>
              <CardDescription>Certificates generated over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={stats?.chartData}>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Batches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Generations</span>
                <Button asChild variant="ghost" size="sm"><Link to="/history">View All</Link></Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentBatches.length > 0 ? (
                <div className="space-y-4">
                  {recentBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{batch.batch_name}</p>
                        <p className="text-sm text-muted-foreground">{batch.total_certificates} certificates</p>
                      </div>
                      <Badge className={getStatusColor(batch.status)}>{batch.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No recent batches found.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};