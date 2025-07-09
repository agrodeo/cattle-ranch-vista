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

      // Fetch immediate parents
      if (animal.mother_id || animal.father_id) {
        const parentPromises = [];
        
        if (animal.mother_id) {
          parentPromises.push(
            supabase.from("animals").select("*").eq("id", animal.mother_id).single()
          );
        }
        
        if (animal.father_id) {
          parentPromises.push(
            supabase.from("animals").select("*").eq("id", animal.father_id).single()
          );
        }

        const parentResults = await Promise.allSettled(parentPromises);
        
        if (animal.mother_id && parentResults[0]?.status === 'fulfilled') {
          const motherData = (parentResults[0] as PromiseFulfilledResult<any>).value.data;
          if (motherData) {
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
        }

        if (animal.father_id) {
          const resultIndex = animal.mother_id ? 1 : 0;
          if (parentResults[resultIndex]?.status === 'fulfilled') {
            const fatherData = (parentResults[resultIndex] as PromiseFulfilledResult<any>).value.data;
            if (fatherData) {
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

    const { data: animal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", animalNode.id)
      .single();

    if (!animal) return animalNode;

    const enhancedNode = { ...animalNode };

    // Fetch mother's ancestors
    if (animal.mother_id) {
      const { data: mother } = await supabase
        .from("animals")
        .select("*")
        .eq("id", animal.mother_id)
        .single();

      if (mother) {
        const motherNode: AnimalNode = {
          id: mother.id,
          name: mother.name,
          id_tag: mother.id_tag,
          sex: mother.sex,
          birth_date: mother.birth_date,
          breed: mother.breed,
          generation: currentGeneration
        };

        enhancedNode.mother = await fetchAncestors(motherNode, currentGeneration + 1);
      }
    }

    // Fetch father's ancestors
    if (animal.father_id) {
      const { data: father } = await supabase
        .from("animals")
        .select("*")
        .eq("id", animal.father_id)
        .single();

      if (father) {
        const fatherNode: AnimalNode = {
          id: father.id,
          name: father.name,
          id_tag: father.id_tag,
          sex: father.sex,
          birth_date: father.birth_date,
          breed: father.breed,
          generation: currentGeneration
        };

        enhancedNode.father = await fetchAncestors(fatherNode, currentGeneration + 1);
      }
    }

    return enhancedNode;
  };

  // Expand tree to show full genealogy
  const expandFullTree = async () => {
    if (!treeData) return;
    
    setLoading(true);
    try {
      const fullTree = await fetchAncestors(treeData, 1);
      setTreeData(fullTree);
      setExpandedTree(true);
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

  // Render ancestor node
  const renderAncestorNode = (node: AnimalNode | null, label: string, indent: number = 0) => {
    if (!node) {
      return (
        <div className={`ml-${indent * 4} p-2 text-sm text-muted-foreground border-l-2 border-muted`}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-muted rounded-full"></div>
            <span>{label}: Desconocido</span>
          </div>
        </div>
      );
    }

    const hasAncestors = (node.mother || node.father) && expandedTree;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div className={`ml-${indent * 4} border-l-2 border-primary/20`}>
        <div className="relative">
          <div className="absolute -left-2 top-3 w-4 h-4 bg-primary/20 rounded-full"></div>
          <div className="ml-4 p-3 bg-muted/30 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasAncestors && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNode(node.id)}
                    className="p-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <div className="font-medium">
                  {label}: {node.name || "Sin nombre"}
                </div>
                <Badge variant="outline" className="text-xs">
                  {node.sex}
                </Badge>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setSelectedAncestor(node)}>
                    Ver detalles
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Detalles del Ancestro</DialogTitle>
                    <DialogDescription>
                      Información completa de {node.name || node.id_tag}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium">Nombre:</span> {node.name || "Sin nombre"}</div>
                      <div><span className="font-medium">ID:</span> {node.id_tag}</div>
                      <div><span className="font-medium">Sexo:</span> {node.sex}</div>
                      <div><span className="font-medium">Raza:</span> {node.breed || "N/A"}</div>
                      <div><span className="font-medium">Fecha de Nacimiento:</span> {node.birth_date ? new Date(node.birth_date).toLocaleDateString() : "N/A"}</div>
                      <div><span className="font-medium">Generación:</span> {node.generation}</div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div>ID: {node.id_tag}</div>
              <div>Raza: {node.breed || "N/A"}</div>
              <div>Nacimiento: {node.birth_date ? new Date(node.birth_date).toLocaleDateString() : "N/A"}</div>
              {node.generation !== undefined && node.generation > 0 && (
                <div>Generación: {node.generation}</div>
              )}
            </div>
          </div>
        </div>

        {/* Render ancestors if expanded */}
        {hasAncestors && isExpanded && (
          <div className="ml-4 mt-2 space-y-2">
            {node.mother && renderAncestorNode(node.mother, "Madre", 1)}
            {node.father && renderAncestorNode(node.father, "Padre", 1)}
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
          <div className="font-bold text-lg">{animalName || "Sin nombre"}</div>
          <div className="text-sm text-muted-foreground">ID: {animalIdTag}</div>
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
              {treeData.offspring.slice(0, 6).map((child) => (
                <div key={child.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-medium">{child.name || "Sin nombre"}</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>ID: {child.id_tag}</div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{child.sex}</Badge>
                      {child.birth_date && (
                        <span className="text-xs">
                          {new Date(child.birth_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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