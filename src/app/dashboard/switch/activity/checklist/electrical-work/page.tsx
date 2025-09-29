
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function ElectricalWorkChecklistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { buildings, floors, flats, selectedProject } = useAppContext();
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedFlats, setSelectedFlats] = useState<string[]>([]);

  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  
  const uniqueFloorsForBuilding = useMemo(() => {
    if (selectedBuilding === 'all') {
      return [];
    }
    const buildingFloors = floors
      .filter((f) => f.buildingName === selectedBuilding && f.projectName === selectedProject)
      .map((f) => f.floorName);
    return [...new Set(buildingFloors)];
  }, [floors, selectedBuilding, selectedProject]);

  const filteredFlats = useMemo(() => {
    if (selectedBuilding === 'all') {
      return [];
    }
    return flats.filter((flat) => {
      const projectMatch = flat.projectName === selectedProject;
      const buildingMatch = flat.buildingName === selectedBuilding;
      const floorMatch =
        selectedFloor === 'all' || flat.floorName === selectedFloor;
      return projectMatch && buildingMatch && floorMatch;
    });
  }, [flats, selectedBuilding, selectedFloor, selectedProject]);

  const handleFlatSelection = (flatNo: string, checked: boolean) => {
    setSelectedFlats((prev) =>
      checked ? [...prev, flatNo] : prev.filter((id) => id !== flatNo)
    );
  };

  const handleSubmit = () => {
    if (selectedFlats.length > 0) {
      toast({
        title: 'Submission Successful',
        description: `Submitted ${selectedFlats.length} flat(s) for building ${selectedBuilding}.`,
      });
      setSelectedFlats([]);
    } else {
       toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Please select at least one flat to submit.',
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Electrical Work Checklist</CardTitle>
          <CardDescription>
            Select a building and floor to view and select flats for project: {selectedProject}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="building-select">Building</Label>
              <Select
                value={selectedBuilding}
                onValueChange={(value) => {
                  setSelectedBuilding(value);
                  setSelectedFloor('all');
                  setSelectedFlats([]);
                }}
              >
                <SelectTrigger id="building-select">
                  <SelectValue placeholder="Select a building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select a building</SelectItem>
                  {projectBuildings.map((building, index) => (
                    <SelectItem key={index} value={building.buildingName}>
                      {building.buildingName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="floor-select">Floor</Label>
              <Select
                value={selectedFloor}
                onValueChange={setSelectedFloor}
                disabled={selectedBuilding === 'all'}
              >
                <SelectTrigger id="floor-select">
                  <SelectValue placeholder="Select a floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {uniqueFloorsForBuilding.map((floorName, index) => (
                    <SelectItem key={index} value={floorName}>
                      {floorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBuilding !== 'all' && (
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="font-medium text-lg">Flats</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {filteredFlats.length > 0 ? (
                  filteredFlats.map((flat) => (
                    <div key={flat.flatNo} className="flex items-center space-x-2">
                      <Checkbox
                        id={`flat-${flat.flatNo}`}
                        checked={selectedFlats.includes(flat.flatNo)}
                        onCheckedChange={(checked) =>
                          handleFlatSelection(flat.flatNo, !!checked)
                        }
                      />
                      <Label htmlFor={`flat-${flat.flatNo}`} className="font-normal cursor-pointer">
                        Flat No: {flat.flatNo} ({flat.type}) - Floor: {flat.floorName}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No flats found for the selected criteria.
                  </p>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={selectedBuilding === 'all'}>
            Submit
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
