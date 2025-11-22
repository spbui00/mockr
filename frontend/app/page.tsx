'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Scale, ArrowRight, Gavel, UserCheck, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RoleType } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [factFlowId, setFactFlowId] = useState('');
  const [trialFlowId, setTrialFlowId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([
    RoleType.JUDGE,
    RoleType.PROSECUTOR,
    RoleType.DEFENSE,
  ]);

  const handleRoleToggle = (role: RoleType) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleStartFactGathering = () => {
    if (!factFlowId.trim()) {
      alert('Please enter a Fact-Gathering Flow ID');
      return;
    }

    if (!trialFlowId.trim()) {
      alert('Please enter a Trial Flow ID');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('Please select at least one role');
      return;
    }

    const sessionId = uuidv4();
    const rolesParam = selectedRoles.join(',');
    
    router.push(`/fact-gathering/${sessionId}?factFlowId=${encodeURIComponent(factFlowId)}&trialFlowId=${encodeURIComponent(trialFlowId)}&roles=${encodeURIComponent(rolesParam)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Scale className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Mock Trial Simulator</h1>
          <p className="text-xl text-muted-foreground">
            AI-powered legal simulation with OpenJustice Dialog Flows
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="factFlowId" className="text-lg font-semibold">
                Fact-Gathering Flow ID
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the OpenJustice Dialog Flow ID for gathering case facts
              </p>
              <Input
                id="factFlowId"
                type="text"
                placeholder="e.g., df_fact_gathering_123..."
                value={factFlowId}
                onChange={(e) => setFactFlowId(e.target.value)}
                className="text-lg h-12"
              />
            </div>

            <div>
              <Label htmlFor="trialFlowId" className="text-lg font-semibold">
                Trial Flow ID
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Enter the OpenJustice Dialog Flow ID for trial debate/argumentation
              </p>
              <Input
                id="trialFlowId"
                type="text"
                placeholder="e.g., df_trial_debate_456..."
                value={trialFlowId}
                onChange={(e) => setTrialFlowId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleStartFactGathering();
                  }
                }}
                className="text-lg h-12"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold mb-3 block">
                Select Trial Roles
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose which roles will participate in the mock trial
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="judge"
                    checked={selectedRoles.includes(RoleType.JUDGE)}
                    onCheckedChange={() => handleRoleToggle(RoleType.JUDGE)}
                  />
                  <Label
                    htmlFor="judge"
                    className="flex items-center space-x-2 cursor-pointer flex-1"
                  >
                    <Gavel className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Judge</p>
                      <p className="text-xs text-muted-foreground">
                        Presides over the trial, makes rulings
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="prosecutor"
                    checked={selectedRoles.includes(RoleType.PROSECUTOR)}
                    onCheckedChange={() => handleRoleToggle(RoleType.PROSECUTOR)}
                  />
                  <Label
                    htmlFor="prosecutor"
                    className="flex items-center space-x-2 cursor-pointer flex-1"
                  >
                    <UserCheck className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">Prosecutor</p>
                      <p className="text-xs text-muted-foreground">
                        Argues for conviction, presents evidence
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id="defense"
                    checked={selectedRoles.includes(RoleType.DEFENSE)}
                    onCheckedChange={() => handleRoleToggle(RoleType.DEFENSE)}
                  />
                  <Label
                    htmlFor="defense"
                    className="flex items-center space-x-2 cursor-pointer flex-1"
                  >
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Defense Lawyer</p>
                      <p className="text-xs text-muted-foreground">
                        Defends the accused, challenges prosecution
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartFactGathering}
              disabled={!factFlowId.trim() || !trialFlowId.trim() || selectedRoles.length === 0}
              className="w-full h-12 text-lg"
              size="lg"
            >
              Start Fact Gathering
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Enter TWO Dialog Flow IDs from OpenJustice (one for facts, one for trial)</li>
                <li>2. Select which trial roles to include (judge, prosecutor, defense)</li>
                <li>3. Gather case facts through interactive AI conversation</li>
                <li>4. Start voice trial where AI debates using gathered facts</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

