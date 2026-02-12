import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trees, Users, CheckCircle } from "lucide-react";
import { AnimalFieldMapping } from "./AnimalExcelUploadAdvanced";

interface FamilyNode {
  id: string;
  name?: string;
  sex: string;
  breed: string;
  birthDate?: string;
  category?: string;
  parents?: {
    father?: FamilyNode;
    mother?: FamilyNode;
  };
  children?: FamilyNode[];
  consanguinityCoefficient?: number;
}

interface FamilyTreeVisualizationProps {
  animals: AnimalFieldMapping[];
  consanguinityResults: any[];
  onComplete: () => void;
  onBack: () => void;
}

export const FamilyTreeVisualization = ({
  animals,
  consanguinityResults,
  onComplete,
  onBack
}: FamilyTreeVisualizationProps) => {
  const [selectedAnimal, setSelectedAnimal] = useState<string>("");
  const [familyTree, setFamilyTree] = useState<FamilyNode | null>(null);
  const [treeStats, setTreeStats] = useState({
    totalAnimals: 0,
    generations: 0,
    lineages: 0
  });

  // Build family tree structure
  const buildFamilyTree = (animalId: string): FamilyNode | null => {
    const animal = animals.find(a => a.identificacion === animalId);
    if (!animal) return null;

    const node: FamilyNode = {
      id: animal.identificacion,
      name: animal.nombre,
      sex: animal.sexo,
      breed: animal.raza,
      birthDate: animal.fecha_nacimiento,
      category: animal._category,
      consanguinityCoefficient: animal._consanguinityCoefficient
    };

    // Add parents
    if (animal.padre_id || animal.madre_id) {
      node.parents = {};
      
      if (animal.padre_id) {
        node.parents.father = buildFamilyTree(animal.padre_id);
      }
      
      if (animal.madre_id) {
        node.parents.mother = buildFamilyTree(animal.madre_id);
      }
    }

    // Add children
    const children = animals.filter(a => 
      a.padre_id === animalId || a.madre_id === animalId
    );
    
    if (children.length > 0) {
      node.children = children.map(child => ({
        id: child.identificacion,
        name: child.nombre,
        sex: child.sexo,
        breed: child.raza,
        birthDate: child.fecha_nacimiento,
        category: child._category,
        consanguinityCoefficient: child._consanguinityCoefficient
      }));
    }

    return node;
  };

  // Calculate tree statistics
  const calculateTreeStats = (tree: FamilyNode | null) => {
    if (!tree) return { totalAnimals: 0, generations: 0, lineages: 0 };

    const visited = new Set<string>();
    let maxDepth = 0;
    let lineageCount = 0;

    const traverse = (node: FamilyNode, depth: number) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      
      maxDepth = Math.max(maxDepth, depth);
      
      // Count unique lineages (animals with no parents)
      if (!node.parents?.father && !node.parents?.mother) {
        lineageCount++;
      }
      
      if (node.parents?.father) traverse(node.parents.father, depth + 1);
      if (node.parents?.mother) traverse(node.parents.mother, depth + 1);
      
      node.children?.forEach(child => traverse(child, depth - 1));
    };

    traverse(tree, 0);
    
    return {
      totalAnimals: visited.size,
      generations: maxDepth + 1,
      lineages: lineageCount
    };
  };

  useEffect(() => {
    if (selectedAnimal) {
      const tree = buildFamilyTree(selectedAnimal);
      setFamilyTree(tree);
      setTreeStats(calculateTreeStats(tree));
    }
  }, [selectedAnimal, animals]);

  // Render family tree node
  const renderFamilyNode = (node: FamilyNode, level: number = 0, isParent: boolean = false) => {
    const consanguinityResult = consanguinityResults.find(r => r.animalId === node.id);
    
    return (
      <div key={node.id} className={`border rounded-lg p-3 ${level === 0 ? 'border-primary bg-primary/5' : 'border-muted'}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{node.id}</span>
              {node.name && <span className="text-sm text-muted-foreground">({node.name})</span>}
            </div>
            <div className="flex space-x-1">
              <Badge variant={node.sex === 'Macho' ? 'default' : 'secondary'} className="text-xs">
                {node.sex}
              </Badge>
              {node.category && (
                <Badge variant="outline" className="text-xs">
                  {node.category}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Raza: {node.breed}</div>
            {node.birthDate && <div>Nacimiento: {node.birthDate}</div>}
            {consanguinityResult && (
              <div className="flex items-center space-x-1">
                <span>Consanguinidad:</span>
                <Badge variant={
                  consanguinityResult.riskLevel === 'critical' ? 'destructive' :
                  consanguinityResult.riskLevel === 'high' ? 'destructive' :
                  consanguinityResult.riskLevel === 'medium' ? 'secondary' : 'default'
                } className="text-xs">
                  {(consanguinityResult.consanguinityCoefficient * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render generation
  const renderGeneration = (title: string, nodes: FamilyNode[]) => {
    if (nodes.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nodes.map(node => renderFamilyNode(node))}
        </div>
      </div>
    );
  };

  const validAnimals = animals.filter(a => a._isValid);
  const animalsWithFamily = validAnimals.filter(a => 
    a.padre_id || a.madre_id || animals.some(child => child.padre_id === a.identificacion || child.madre_id === a.identificacion)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Paso 5: Visualización del Árbol Genealógico</CardTitle>
        <CardDescription>
          Explore las relaciones familiares de su ganado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Animal selection */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Trees className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Seleccionar Animal para Visualizar</h4>
          </div>
          
          <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un animal para ver su árbol genealógico" />
            </SelectTrigger>
            <SelectContent>
              {animalsWithFamily.map(animal => (
                <SelectItem key={animal.identificacion} value={animal.identificacion}>
                  {animal.identificacion} {animal.nombre && `(${animal.nombre})`} - {animal.sexo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tree statistics */}
        {familyTree && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-primary">{treeStats.totalAnimals}</div>
              <div className="text-xs text-muted-foreground">Animales en el árbol</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-primary">{treeStats.generations}</div>
              <div className="text-xs text-muted-foreground">Generaciones</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-2xl font-bold text-primary">{treeStats.lineages}</div>
              <div className="text-xs text-muted-foreground">Linajes base</div>
            </div>
          </div>
        )}

        {/* Family tree visualization */}
        {familyTree && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Árbol Genealógico de {familyTree.id}</h4>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* Grandparents */}
              {familyTree.parents && (
                <>
                  <div className="space-y-4">
                    {/* Paternal grandparents */}
                    {familyTree.parents.father?.parents && (
                      renderGeneration("Abuelos Paternos", [
                        familyTree.parents.father.parents.father,
                        familyTree.parents.father.parents.mother
                      ].filter(Boolean) as FamilyNode[])
                    )}
                    
                    {/* Maternal grandparents */}
                    {familyTree.parents.mother?.parents && (
                      renderGeneration("Abuelos Maternos", [
                        familyTree.parents.mother.parents.father,
                        familyTree.parents.mother.parents.mother
                      ].filter(Boolean) as FamilyNode[])
                    )}
                  </div>

                  {/* Parents */}
                  {renderGeneration("Padres", [
                    familyTree.parents.father,
                    familyTree.parents.mother
                  ].filter(Boolean) as FamilyNode[])}
                </>
              )}

              {/* Selected animal */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-primary">Animal Seleccionado</h4>
                {renderFamilyNode(familyTree, 0)}
              </div>

              {/* Children */}
              {familyTree.children && familyTree.children.length > 0 && (
                renderGeneration("Descendencia", familyTree.children)
              )}
            </div>
          </div>
        )}

        {/* Summary and completion */}
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium">Proceso de Carga Completado</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-lg font-bold text-green-700">{validAnimals.length}</div>
              <div className="text-sm text-green-600">Animales cargados</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-lg font-bold text-blue-700">{consanguinityResults.length}</div>
              <div className="text-sm text-blue-600">Análisis de consanguinidad</div>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
              <div className="text-lg font-bold text-purple-700">{animalsWithFamily.length}</div>
              <div className="text-sm text-purple-600">Con relaciones familiares</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <Button onClick={onComplete}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Completar Proceso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};