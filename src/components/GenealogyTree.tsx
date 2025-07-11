import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, TreePine, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnimalNode {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
  birth_date?: string;
  breed?: string;
  father?: AnimalNode | null;
  mother?: AnimalNode | null;
  offspring?: AnimalNode[];
  generation?: number;
}

interface GenealogyTreeProps {
  animalId: string;
  animalName?: string;
  animalIdTag: string;
}

const GenealogyTree = ({ animalId, animalName, animalIdTag }: GenealogyTreeProps) => {
  const [treeData, setTreeData] = useState<AnimalNode | null>(null);
  const [expandedTree, setExpandedTree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAncestor, setSelectedAncestor] = useState<AnimalNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch basic family (immediate parents and offspring)
  const fetchBasicFamily = async () => {
    try {
      const { data: animal, error } = await supabase
        .from("animals")
        .select("*")
        .eq("id", animalId)
        .single();

      if (error) throw error;

      const family: AnimalNode = {
        id: animal.id,
        name: animal.name,
        id_tag: animal.id_tag,
        sex: animal.sex,
        birth_date: animal.birth_date,
        breed: animal.breed,
        generation: 0
      };

      // Fetch immediate parents with proper individual handling
      if (animal.mother_id || animal.father_id) {
        // Fetch mother separately
        if (animal.mother_id) {
          try {
            const { data: motherData, error: motherError } = await supabase
              .from("animals")
              .select("*")
              .eq("id", animal.mother_id)
              .single();
            
            if (!motherError && motherData) {
              family.mother = {
                id: motherData.id,
                name: motherData.name,
                id_tag: motherData.id_tag,
                sex: motherData.sex,
                birth_date: motherData.birth_date,
                breed: motherData.breed,
                generation: 1
              };
            }
          } catch (error) {
            console.error("Error fetching mother:", error);
          }
        }

        // Fetch father separately
        if (animal.father_id) {
          try {
            const { data: fatherData, error: fatherError } = await supabase
              .from("animals")
              .select("*")
              .eq("id", animal.father_id)
              .single();
            
            if (!fatherError && fatherData) {
              family.father = {
                id: fatherData.id,
                name: fatherData.name,
                id_tag: fatherData.id_tag,
                sex: fatherData.sex,
                birth_date: fatherData.birth_date,
                breed: fatherData.breed,
                generation: 1
              };
            }
          } catch (error) {
            console.error("Error fetching father:", error);
          }
        }
      }

      // Fetch offspring
      const { data: offspring } = await supabase
        .from("animals")
        .select("*")
        .or(`mother_id.eq.${animalId},father_id.eq.${animalId}`)
        .order("birth_date", { ascending: false });

      if (offspring && offspring.length > 0) {
        family.offspring = offspring.map(child => ({
          id: child.id,
          name: child.name,
          id_tag: child.id_tag,
          sex: child.sex,
          birth_date: child.birth_date,
          breed: child.breed,
          generation: -1
        }));
      }

      setTreeData(family);
    } catch (error) {
      console.error("Error fetching basic family:", error);
    }
  };

  // Recursively fetch ancestors up to 4 generations
  const fetchAncestors = async (animalNode: AnimalNode, currentGeneration: number = 1): Promise<AnimalNode> => {
    if (currentGeneration > 4) return animalNode;

    try {
      const { data: animal, error } = await supabase
        .from("animals")
        .select("*")
        .eq("id", animalNode.id)
        .single();

      if (error || !animal) return animalNode;

      const enhancedNode = { ...animalNode };

      // Fetch and process mother's line
      if (animal.mother_id) {
        try {
          const { data: mother, error: motherError } = await supabase
            .from("animals")
            .select("*")
            .eq("id", animal.mother_id)
            .single();

          if (!motherError && mother) {
            const motherNode: AnimalNode = {
              id: mother.id,
              name: mother.name,
              id_tag: mother.id_tag,
              sex: mother.sex,
              birth_date: mother.birth_date,
              breed: mother.breed,
              generation: currentGeneration
            };

            // Recursively fetch mother's ancestors
            enhancedNode.mother = await fetchAncestors(motherNode, currentGeneration + 1);
          }
        } catch (error) {
          console.error(`Error fetching mother at generation ${currentGeneration}:`, error);
        }
      }

      // Fetch and process father's line
      if (animal.father_id) {
        try {
          const { data: father, error: fatherError } = await supabase
            .from("animals")
            .select("*")
            .eq("id", animal.father_id)
            .single();

          if (!fatherError && father) {
            const fatherNode: AnimalNode = {
              id: father.id,
              name: father.name,
              id_tag: father.id_tag,
              sex: father.sex,
              birth_date: father.birth_date,
              breed: father.breed,
              generation: currentGeneration
            };

            // Recursively fetch father's ancestors
            enhancedNode.father = await fetchAncestors(fatherNode, currentGeneration + 1);
          }
        } catch (error) {
          console.error(`Error fetching father at generation ${currentGeneration}:`, error);
        }
      }

      return enhancedNode;
    } catch (error) {
      console.error(`Error in fetchAncestors at generation ${currentGeneration}:`, error);
      return animalNode;
    }
  };

  // Expand tree to show full genealogy
  const expandFullTree = async () => {
    if (!treeData) return;
    
    setLoading(true);
    try {
      const fullTree = await fetchAncestors(treeData, 1);
      setTreeData(fullTree);
      setExpandedTree(true);
      
      // Auto-expand all nodes to show the full tree
      const allNodeIds = new Set<string>();
      const collectNodeIds = (node: AnimalNode) => {
        allNodeIds.add(node.id);
        if (node.mother) collectNodeIds(node.mother);
        if (node.father) collectNodeIds(node.father);
      };
      
      if (fullTree.mother) collectNodeIds(fullTree.mother);
      if (fullTree.father) collectNodeIds(fullTree.father);
      
      setExpandedNodes(allNodeIds);
    } catch (error) {
      console.error("Error expanding tree:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Get animal display name using naming convention: "Nombre – ID" or just "ID"
  const getAnimalDisplayName = (animal: AnimalNode) => {
    if (animal.name && animal.name.trim()) {
      return `${animal.name} – ${animal.id_tag}`;
    }
    return animal.id_tag;
  };

  // Get animal tooltip info
  const getAnimalTooltipInfo = (animal: AnimalNode) => {
    const birthYear = animal.birth_date ? new Date(animal.birth_date).getFullYear() : 'N/A';
    return {
      raza: animal.breed || 'N/A',
      sexo: animal.sex || 'N/A',
      añoNacimiento: birthYear,
      estadoCuernos: 'N/A' // We'll need to add mocho field to the interface if needed
    };
  };

  // Render ancestor node with proper tree formatting and improved naming
  const renderAncestorNode = (node: AnimalNode | null, label: string, generation: number = 1, isLast: boolean = false) => {
    if (!node) {
      return (
        <div className="flex items-start space-x-3 py-2">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            </div>
            {!isLast && <div className="w-px h-8 bg-border mt-1"></div>}
          </div>
          <div className="flex-1 pt-1">
            <div className="text-sm text-muted-foreground">
              {label}: <span className="italic">No disponible en BD</span>
            </div>
          </div>
        </div>
      );
    }

    const hasAncestors = (node.mother || node.father) && expandedTree;
    const isExpanded = expandedNodes.has(node.id);
    const generationPrefix = "→".repeat(generation);
    const displayName = getAnimalDisplayName(node);
    const tooltipInfo = getAnimalTooltipInfo(node);

    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-3 py-2">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              node.sex === 'Macho' ? 'bg-blue-100 border-blue-300' : 'bg-pink-100 border-pink-300'
            }`}>
              <span className="text-xs font-bold">
                {node.sex === 'Macho' ? '♂' : '♀'}
              </span>
            </div>
            {!isLast && <div className="w-px h-8 bg-border mt-1"></div>}
          </div>
          
          <div className="flex-1 pt-1">
            <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">{generationPrefix}</span>
                  <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {label}: {displayName}
                  </div>
                  <Badge variant={node.sex === 'Macho' ? 'default' : 'secondary'} className="text-xs">
                    {node.sex}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  {hasAncestors && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNode(node.id)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                        Ver Perfil
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Perfil del Animal</DialogTitle>
                        <DialogDescription>
                          {displayName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="font-medium">Nombre:</span> {node.name || "Sin nombre"}</div>
                          <div><span className="font-medium">ID:</span> {node.id_tag}</div>
                          <div><span className="font-medium">Sexo:</span> {tooltipInfo.sexo}</div>
                          <div><span className="font-medium">Raza:</span> {tooltipInfo.raza}</div>
                          <div><span className="font-medium">Año de Nacimiento:</span> {tooltipInfo.añoNacimiento}</div>
                          <div><span className="font-medium">Generación:</span> {node.generation}</div>
                        </div>
                        {node.birth_date && (
                          <div className="pt-2 border-t">
                            <span className="font-medium text-sm">Fecha de Nacimiento:</span>
                            <div className="text-sm text-muted-foreground">
                              {new Date(node.birth_date).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Quick info tooltip overlay */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-4">
                  <span>Raza: {tooltipInfo.raza}</span>
                  <span>Año: {tooltipInfo.añoNacimiento}</span>
                </div>
                {node.birth_date && (
                  <div>Nacimiento: {new Date(node.birth_date).toLocaleDateString('es-AR')}</div>
                )}
                {node.generation !== undefined && node.generation > 0 && (
                  <div>Generación: {node.generation}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Render ancestors if expanded */}
        {hasAncestors && isExpanded && (
          <div className="ml-11 space-y-1 border-l-2 border-muted pl-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Ancestros de {displayName}
            </div>
            {node.mother && renderAncestorNode(node.mother, "Madre", generation + 1, !node.father)}
            {node.father && renderAncestorNode(node.father, "Padre", generation + 1, true)}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchBasicFamily();
  }, [animalId]);

  if (!treeData) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg flex items-center space-x-2">
          <TreePine className="h-5 w-5" />
          <span>Árbol Genealógico</span>
        </h4>
        {!expandedTree && (
          <Button 
            variant="outline" 
            onClick={expandFullTree}
            disabled={loading}
            className="text-sm"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            ) : (
              <TreePine className="h-4 w-4 mr-2" />
            )}
            Ver árbol completo
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Current Animal */}
        <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
          <div className="font-bold text-lg">
            {animalName && animalName.trim() ? `${animalName} – ${animalIdTag}` : animalIdTag}
          </div>
          <div className="text-sm text-muted-foreground">
            {treeData.breed && `Raza: ${treeData.breed}`}
            {treeData.birth_date && ` • Nacido: ${new Date(treeData.birth_date).toLocaleDateString('es-AR')}`}
          </div>
          <Badge variant="default" className="mt-2">Animal Principal</Badge>
        </div>

        {/* Ancestors */}
        {(treeData.mother || treeData.father) && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">ANCESTROS</div>
            {treeData.mother && renderAncestorNode(treeData.mother, "Madre")}
            {treeData.father && renderAncestorNode(treeData.father, "Padre")}
          </div>
        )}

        {/* Offspring */}
        {treeData.offspring && treeData.offspring.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>DESCENDENCIA ({treeData.offspring.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {treeData.offspring
                .sort((a, b) => {
                  // Sort by birth date, most recent first
                  if (!a.birth_date && !b.birth_date) return 0;
                  if (!a.birth_date) return 1;
                  if (!b.birth_date) return -1;
                  return new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime();
                })
                .slice(0, 6)
                .map((child) => {
                  const displayName = child.name && child.name.trim() ? `${child.name} – ${child.id_tag}` : child.id_tag;
                  return (
                    <div key={child.id} className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="font-medium text-sm">{displayName}</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{child.sex}</Badge>
                          {child.breed && <span>Raza: {child.breed}</span>}
                        </div>
                        {child.birth_date && (
                          <div>Nacimiento: {new Date(child.birth_date).toLocaleDateString('es-AR')}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {treeData.offspring.length > 6 && (
                <div className="p-3 bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground">
                  +{treeData.offspring.length - 6} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* No family message */}
        {!treeData.mother && !treeData.father && (!treeData.offspring || treeData.offspring.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay información genealógica disponible</p>
          </div>
        )}
      </div>

      {expandedTree && (
        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <div className="text-xs text-muted-foreground text-center">
            Árbol genealógico completo (hasta 4 generaciones) • Haz clic en "Ver detalles" para más información
          </div>
        </div>
      )}
    </div>
  );
};

export default GenealogyTree;