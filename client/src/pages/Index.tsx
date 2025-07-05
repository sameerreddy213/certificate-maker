import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, History, CheckCircle, Users, Zap } from 'lucide-react';

const Index = () => {
  // Since authentication is removed for now, we default to the non-user view.
  const user = null; 

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary rounded-lg p-2">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Certificate Generator</h1>
                <p className="text-sm text-muted-foreground">Bulk certificate creation made simple</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Generate Professional Certificates in Bulk
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create, customize, and distribute hundreds of certificates instantly. 
              Perfect for educational institutions, corporate training, and certification programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Button asChild size="lg" className="text-lg px-8">
                    <Link to="/dashboard">Open Dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-8">
                    <Link to="/generate">Generate Certificates</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="text-lg px-8">
                    <Link to="/auth">Start Free Trial</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-8">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need to create certificates</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to make certificate creation fast, easy, and professional
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Custom Templates</CardTitle>
                <CardDescription>
                  Design beautiful certificate templates with HTML/CSS or upload your own designs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Excel Integration</CardTitle>
                <CardDescription>
                  Upload Excel files with recipient data and automatically generate personalized certificates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Bulk Generation</CardTitle>
                <CardDescription>
                  Generate hundreds of certificates in minutes with our powerful batch processing system
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Quality Assurance</CardTitle>
                <CardDescription>
                  Preview certificates before generation and ensure perfect results every time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>History & Tracking</CardTitle>
                <CardDescription>
                  Keep track of all generated certificates with detailed history and download management
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Multi-User Support</CardTitle>
                <CardDescription>
                  Perfect for institutions with multiple administrators and departments
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of organizations who trust us with their certificate generation needs.
            </p>
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/auth">
                {user ? 'Go to Dashboard' : 'Start Creating Certificates'}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 Certificate Generator. Built with precision and care.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;