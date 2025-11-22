'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface LegalPropertiesProps {
  jurisdiction: string;
  legalAreas: string[];
  onJurisdictionChange: (jurisdiction: string) => void;
  onLegalAreasChange: (areas: string[]) => void;
}

const availableLegalAreas = [
  { id: 'criminal', name: 'Criminal Law' },
  { id: 'civil', name: 'Civil Law' },
  { id: 'constitutional', name: 'Constitutional Law' },
  { id: 'administrative', name: 'Administrative Law' },
  { id: 'family', name: 'Family Law' },
  { id: 'commercial', name: 'Commercial Law' },
];

export function LegalProperties({
  jurisdiction,
  legalAreas,
  onJurisdictionChange,
  onLegalAreasChange,
}: LegalPropertiesProps) {
  const [jurisdictions, setJurisdictions] = useState([
    { id: 'us', name: 'United States' },
    { id: 'uk', name: 'United Kingdom' },
    { id: 'ca', name: 'Canada' },
    { id: 'au', name: 'Australia' },
  ]);

  const toggleLegalArea = (areaId: string) => {
    if (legalAreas.includes(areaId)) {
      onLegalAreasChange(legalAreas.filter((a) => a !== areaId));
    } else {
      onLegalAreasChange([...legalAreas, areaId]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Legal Properties</h2>
        <p className="text-muted-foreground">
          Configure the legal context for your trial simulation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jurisdiction</CardTitle>
          <CardDescription>Select the country/jurisdiction for this trial</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={jurisdiction} onValueChange={onJurisdictionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {jurisdictions.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal Areas</CardTitle>
          <CardDescription>Select relevant areas of law for this case</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableLegalAreas.map((area) => (
              <div key={area.id} className="flex items-center space-x-2">
                <Checkbox
                  id={area.id}
                  checked={legalAreas.includes(area.id)}
                  onCheckedChange={() => toggleLegalArea(area.id)}
                />
                <Label htmlFor={area.id} className="cursor-pointer">
                  {area.name}
                </Label>
              </div>
            ))}
          </div>

          {legalAreas.length === 0 && (
            <p className="text-sm text-destructive mt-2">Please select at least one legal area</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

