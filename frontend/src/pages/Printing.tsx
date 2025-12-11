import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface AssignedDoc {
  id: string;
  documentId: string;
  documentTitle: string;
  assignedQuota: number;
  usedPrints: number;
  remainingPrints: number;
  sessionToken: string;
  documentType: 'pdf' | 'svg' | string;
}

const Printing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [assignedDocs, setAssignedDocs] = useState<AssignedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('http://localhost:4000/api/docs/assigned', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data.message || 'Failed to load assigned documents';
          throw new Error(message);
        }

        const data: AssignedDoc[] = await res.json();
        setAssignedDocs(data);
      } catch (err) {
        console.error('Assigned docs error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assigned documents');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAssigned();
    }
  }, [token]);

  const handleViewAndPrint = (doc: AssignedDoc) => {
    navigate('/viewer', {
      state: {
        sessionToken: doc.sessionToken,
        documentTitle: doc.documentTitle,
        documentId: doc.documentId,
        remainingPrints: doc.remainingPrints,
        maxPrints: doc.assignedQuota,
        documentType: doc.documentType,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Printing</h1>
            <p className="text-muted-foreground">
              Yahan aapko woh saare documents dikhengi jo admin ne aapke email par assign kiye hain.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading assigned documents...
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : assignedDocs.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
              Abhi tak admin ne aapke liye koi document assign nahi kiya hai.
            </div>
          ) : (
            <div className="space-y-4">
              {assignedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-border rounded-lg p-4 bg-background/60 flex items-center justify-between gap-4"
                >
                  <div>
                    <h2 className="text-lg font-semibold">{doc.documentTitle}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Admin ne aapko <span className="font-medium">{doc.assignedQuota}</span> pages assign kiye hain.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining: {doc.remainingPrints} / {doc.assignedQuota} pages
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      disabled={doc.remainingPrints <= 0}
                      onClick={() => handleViewAndPrint(doc)}
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      {doc.remainingPrints > 0 ? 'View & Print' : 'No Prints Left'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Printing;
