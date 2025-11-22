'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleSelector } from '@/components/configuration/RoleSelector';
import { LegalProperties } from '@/components/configuration/LegalProperties';
import { CaseContext } from '@/components/configuration/CaseContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleType, CreateTrialRequest } from '@/types';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

export default function ConfigurationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([
    RoleType.JUDGE,
    RoleType.PROSECUTOR,
    RoleType.DEFENSE,
  ]);
  const [jurisdiction, setJurisdiction] = useState('us');
  const [legalAreas, setLegalAreas] = useState<string[]>(['criminal']);
  const [caseDescription, setCaseDescription] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);

  const handleRoleToggle = (role: RoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const canProceedToStep2 = selectedRoles.length > 0;
  const canProceedToStep3 = jurisdiction && legalAreas.length > 0;
  const canCreateTrial = caseDescription.trim().length > 0;

  const handleCreateTrial = async () => {
    if (!canCreateTrial) return;

    setLoading(true);

    try {
      const request: CreateTrialRequest = {
        roles: selectedRoles.map((role) => ({
          role,
          enabled: true,
        })),
        legal_properties: {
          jurisdiction,
          legal_areas: legalAreas,
          articles: [],
          case_law: [],
        },
        case_context: {
          description: caseDescription,
          documents: [],
          additional_info: {},
        },
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/trial/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to create trial');
      }

      const data = await response.json();

      if (documents.length > 0) {
        for (const doc of documents) {
          const formData = new FormData();
          formData.append('file', doc);

          await fetch(`${backendUrl}/api/trial/${data.session_id}/context`, {
            method: 'POST',
            body: formData,
          });
        }
      }

      router.push(`/trial/${data.session_id}`);
    } catch (error) {
      console.error('Error creating trial:', error);
      alert('Failed to create trial. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mock Trial Simulator</h1>
          <p className="text-xl text-muted-foreground">
            Configure your AI-powered trial simulation
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Roles</span>
            <span>Legal Properties</span>
            <span>Case Context</span>
          </div>
        </div>

        <Card className="p-6 mb-6">
          {step === 1 && (
            <RoleSelector selectedRoles={selectedRoles} onRoleToggle={handleRoleToggle} />
          )}
          {step === 2 && (
            <LegalProperties
              jurisdiction={jurisdiction}
              legalAreas={legalAreas}
              onJurisdictionChange={setJurisdiction}
              onLegalAreasChange={setLegalAreas}
            />
          )}
          {step === 3 && (
            <CaseContext
              description={caseDescription}
              documents={documents}
              onDescriptionChange={setCaseDescription}
              onDocumentsChange={setDocuments}
            />
          )}
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedToStep2) || (step === 2 && !canProceedToStep3)
              }
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreateTrial} disabled={!canCreateTrial || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Trial...
                </>
              ) : (
                'Start Trial'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

