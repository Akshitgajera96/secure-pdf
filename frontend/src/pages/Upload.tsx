import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Layers, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/UploadZone';
import { SeriesGenerator } from '@/components/SeriesGenerator';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import { Input } from '@/components/ui/input';

const Upload = () => {
  const navigate = useNavigate();
  const { user, token, loading, signOut } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoutUserId, setLogoutUserId] = useState('');
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [sessions, setSessions] = useState<Array<{ _id: string; ip: string; userAgent: string; createdAt: string }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { state: { from: '/upload' } });
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !token) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);
      formData.append('totalPrints', '5');

      const res = await fetch('http://localhost:4000/api/docs/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.message || 'Upload failed';
        throw new Error(message);
      }

      const data = await res.json();

      toast.success('Document uploaded securely');

      navigate('/viewer', {
        state: {
          sessionToken: data.sessionToken,
          documentTitle: data.documentTitle,
          documentId: data.documentId,
          remainingPrints: data.remainingPrints,
          maxPrints: data.maxPrints,
          documentType: data.documentType,
        },
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleLoadSessions = async () => {
    if (!logoutUserId) {
      toast.error('Enter a userId first');
      return;
    }

    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setIsLoadingSessions(true);

    try {
      const res = await fetch(`http://localhost:4000/api/admin/users/${logoutUserId}/sessions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && (data as any).logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }

      if (!res.ok) {
        const message = (data as any).message || 'Failed to load sessions';
        throw new Error(message);
      }

      setSessions((data as any).sessions || []);
    } catch (error) {
      console.error('Load sessions error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!logoutUserId) {
      toast.error('Enter a userId to logout');
      return;
    }

    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setIsLoggingOutAll(true);

    try {
      const res = await fetch('http://localhost:4000/api/admin/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: logoutUserId }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && (data as any).logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }

      if (!res.ok) {
        const message = (data as any).message || 'Failed to logout user from all devices';
        throw new Error(message);
      }

      toast.success('User logged out from all devices');
      setLogoutUserId('');
    } catch (error) {
      console.error('Logout all devices error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to logout user');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-8">Document Tools</h1>

        <Tabs defaultValue="upload" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="gap-2">
              <UploadIcon className="h-4 w-4" />
              Secure Upload
            </TabsTrigger>
            <TabsTrigger value="series" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch Series
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <UploadZone 
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
            />

            {selectedFile && !isUploading && (
              <div className="flex justify-center animate-fade-in">
                <Button 
                  size="lg"
                  onClick={handleUpload}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-14 px-8"
                >
                  <UploadIcon className="h-5 w-5" />
                  Upload & View Securely
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="series">
            {user && <SeriesGenerator userId={user.id} />}
          </TabsContent>
        </Tabs>

        {/* Security info */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security Features
          </h3>
          <ul className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              "Vector format preserved",
              "No download option",
              "No copy/paste",
              "Session controlled",
              "Watermarked prints",
              "Print count limits"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {user && user.role === 'admin' && (
          <div className="mt-6 p-4 rounded-xl bg-card border border-border animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Session Control (Admin)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              View and control active sessions for a user. Enter the user&apos;s ID to see all logged-in devices.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Target userId"
                value={logoutUserId}
                onChange={(e) => setLogoutUserId(e.target.value)}
                className="sm:max-w-xs"
              />
              <Button
                variant="outline"
                onClick={handleLoadSessions}
                disabled={isLoadingSessions}
                className="w-full sm:w-auto"
              >
                {isLoadingSessions ? 'Loading sessions...' : 'View active sessions'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogoutAllDevices}
                disabled={isLoggingOutAll}
                className="w-full sm:w-auto"
              >
                {isLoggingOutAll ? 'Logging out...' : 'Logout all devices'}
              </Button>
            </div>

            {sessions.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 pr-2 text-left">IP address</th>
                      <th className="py-2 px-2 text-left">Browser / Device</th>
                      <th className="py-2 px-2 text-left">Login time</th>
                      <th className="py-2 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s._id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2 align-top font-mono text-[11px] sm:text-xs">{s.ip}</td>
                        <td className="py-2 px-2 align-top max-w-xs truncate" title={s.userAgent}>
                          {s.userAgent || 'Unknown'}
                        </td>
                        <td className="py-2 px-2 align-top whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pl-2 align-top text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                const res = await fetch(`http://localhost:4000/api/admin/sessions/${s._id}/logout`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                });

                                const data = await res.json().catch(() => ({}));

                                if (res.status === 401 && (data as any).logout) {
                                  localStorage.removeItem('auth_token');
                                  localStorage.removeItem('auth_user');
                                  toast.error('Session expired. Please login again.');
                                  navigate('/auth');
                                  return;
                                }

                                if (!res.ok) {
                                  const message = (data as any).message || 'Failed to logout session';
                                  throw new Error(message);
                                }

                                toast.success('Session logged out');
                                setSessions((prev) => prev.filter((x) => x._id !== s._id));
                              } catch (error) {
                                console.error('Logout session error:', error);
                                toast.error(
                                  error instanceof Error ? error.message : 'Failed to logout session'
                                );
                              }
                            }}
                          >
                            Logout
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                const res = await fetch(`http://localhost:4000/api/admin/sessions/${s._id}/block-ip`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ reason: 'Blocked from admin panel' }),
                                });

                                const data = await res.json().catch(() => ({}));

                                if (res.status === 401 && (data as any).logout) {
                                  localStorage.removeItem('auth_token');
                                  localStorage.removeItem('auth_user');
                                  toast.error('Session expired. Please login again.');
                                  navigate('/auth');
                                  return;
                                }

                                if (!res.ok) {
                                  const message = (data as any).message || 'Failed to block IP';
                                  throw new Error(message);
                                }

                                toast.success('IP blocked and sessions removed');
                                setSessions((prev) => prev.filter((x) => x.ip !== s.ip));
                              } catch (error) {
                                console.error('Block IP error:', error);
                                toast.error(error instanceof Error ? error.message : 'Failed to block IP');
                              }
                            }}
                          >
                            Block IP
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;