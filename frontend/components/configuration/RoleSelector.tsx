'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RoleType } from '@/types';

interface RoleSelectorProps {
  selectedRoles: RoleType[];
  onRoleToggle: (role: RoleType) => void;
}

const roles = [
  {
    type: RoleType.JUDGE,
    name: 'Judge',
    description: 'Presides over the trial, makes rulings, and ensures fair proceedings',
  },
  {
    type: RoleType.PROSECUTOR,
    name: 'Prosecutor',
    description: 'Represents the state, presents evidence, and argues for conviction',
  },
  {
    type: RoleType.DEFENSE,
    name: 'Defense Attorney',
    description: 'Represents the defendant, challenges prosecution, and protects client rights',
  },
];

export function RoleSelector({ selectedRoles, onRoleToggle }: RoleSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Trial Roles</h2>
        <p className="text-muted-foreground">
          Choose which roles will participate in the mock trial simulation
        </p>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.type} className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <Checkbox
                  id={role.type}
                  checked={selectedRoles.includes(role.type)}
                  onCheckedChange={() => onRoleToggle(role.type)}
                />
                <div className="flex-1">
                  <Label htmlFor={role.type} className="cursor-pointer">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <CardDescription className="mt-1">{role.description}</CardDescription>
                  </Label>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedRoles.length === 0 && (
        <p className="text-sm text-destructive">Please select at least one role</p>
      )}
    </div>
  );
}

