import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SecurityDashboard() {
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const { toast } = useToast();

  const handlePasswordMigration = async () => {
    try {
      setMigrating(true);
      
      // Get current user ID for authorization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Call the password hashing function
      const { data, error } = await supabase.functions.invoke('hash-existing-passwords', {
        body: { requesterId: user.id }
      });

      if (error) {
        throw error;
      }

      setMigrationResult(data);
      
      if (data.success) {
        toast({
          title: "Migration Successful",
          description: `Successfully hashed ${data.updated} out of ${data.total} passwords`,
        });
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error.message || 'Failed to migrate passwords',
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
      </div>

      {/* Password Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Security
          </CardTitle>
          <CardDescription>
            Migrate plain text passwords to secure hashed format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> Plain text passwords were found in the database. 
              This migration will hash all plain text passwords using bcrypt for enhanced security.
            </AlertDescription>
          </Alert>

          {migrationResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Migration Complete:</strong> {migrationResult.message}
                <br />
                Updated: {migrationResult.updated} passwords
                <br />
                Total: {migrationResult.total} passwords checked
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handlePasswordMigration} 
              disabled={migrating}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {migrating ? 'Migrating Passwords...' : 'Migrate to Hashed Passwords'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identifies all plain text passwords in the system</li>
              <li>Hashes them using bcrypt with 12 salt rounds</li>
              <li>Updates the database with secure hashed passwords</li>
              <li>Logs all security events for audit purposes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Security Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Improvements Applied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Row Level Security (RLS) Policies</h4>
                <p className="text-sm text-muted-foreground">
                  Replaced overly permissive policies with proper cabaña-based restrictions
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Database Function Security</h4>
                <p className="text-sm text-muted-foreground">
                  Added proper search_path settings to prevent SQL injection
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">User Role Management</h4>
                <p className="text-sm text-muted-foreground">
                  Restricted role management to admin users only
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Security Audit Logging</h4>
                <p className="text-sm text-muted-foreground">
                  All sensitive operations are now logged for security monitoring
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remaining Security Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Remaining Security Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Configuration Required:</strong> The following settings need to be configured in your Supabase dashboard:
              </AlertDescription>
            </Alert>
            
            <div className="text-sm space-y-2">
              <p><strong>1. Enable Leaked Password Protection</strong></p>
              <p className="text-muted-foreground pl-4">
                Go to Authentication → Settings and enable "Password strength and leaked password protection"
              </p>
              
              <p><strong>2. Configure OTP Expiry</strong></p>
              <p className="text-muted-foreground pl-4">
                Go to Authentication → Settings and set OTP expiry to a shorter duration (recommended: 10 minutes)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}