import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, FileText, Plus, History, BarChart } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // Initialize navigate
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Create a handler for logout
  const handleLogout = () => {
    logout(); // Clear the user session
    navigate('/'); // Redirect to the homepage
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-primary">
              CertificateGen
            </Link>
            
            {user && ( // Only show nav links if user is logged in
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/dashboard" className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
                  <BarChart className="h-4 w-4" /><span>Dashboard</span>
                </Link>
                <Link to="/templates" className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/templates') ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Plus className="h-4 w-4" /><span>Templates</span>
                </Link>
                <Link to="/generate" className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/generate') ? 'text-primary' : 'text-muted-foreground'}`}>
                  <FileText className="h-4 w-4" /><span>Generate</span>
                </Link>
                <Link to="/history" className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/history') ? 'text-primary' : 'text-muted-foreground'}`}>
                  <History className="h-4 w-4" /><span>History</span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.fullName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.fullName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}> {/* Use the new handler */}
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};