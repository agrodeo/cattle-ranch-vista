import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AnimalDocument {
  id: string;
  animal_id: string;
  file_name: string;
  file_type: 'certificate' | 'medical' | 'photo' | 'other';
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  url?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  isUploading: boolean;
}

export function useAnimalDocuments(animalId: string) {
  const [documents, setDocuments] = useState<AnimalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  const fetchDocuments = async () => {
    if (!animalId) return;
    
    try {
      const { data, error } = await supabase
        .from('animal_documents')
        .select('*')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each document
      const documentsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          try {
            const { data: urlData } = await supabase.storage
              .from('animal-documents')
              .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
            
            return {
              ...doc,
              url: urlData?.signedUrl
            } as AnimalDocument;
          } catch (error) {
            console.error('Error getting signed URL for document:', error);
            return doc as AnimalDocument;
          }
        })
      );

      setDocuments(documentsWithUrls);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (file: File, fileType: AnimalDocument['file_type']) => {
    try {
      // Get user's cabaña_id using the function we have
      const { data: userInfo } = await supabase.rpc('get_user_cabana_info', {
        user_uuid: (await supabase.auth.getUser()).data.user?.id
      });

      if (!userInfo || userInfo.length === 0) {
        throw new Error('No se pudo obtener la información de la cabaña');
      }

      const cabanaId = userInfo[0].cabana_id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${cabanaId}/${animalId}/${fileName}`;

      // Initialize upload progress
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          fileName: file.name,
          progress: 0,
          isUploading: true
        }
      }));

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('animal-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document metadata
      const { error: metadataError } = await supabase
        .from('animal_documents')
        .insert({
          animal_id: animalId,
          cabaña_id: cabanaId,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          storage_path: filePath,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (metadataError) throw metadataError;

      // Complete upload progress
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          ...prev[file.name],
          progress: 100,
          isUploading: false
        }
      }));

      toast({
        title: "Éxito",
        description: "Documento subido correctamente"
      });

      // Refresh documents list
      await fetchDocuments();

      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 2000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          ...prev[file.name],
          isUploading: false
        }
      }));
      
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      // Get document info first
      const { data: doc, error: docError } = await supabase
        .from('animal_documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('animal-documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('animal_documents')
        .delete()
        .eq('id', documentId);

      if (metadataError) throw metadataError;

      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente"
      });

      // Refresh documents list
      await fetchDocuments();

    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [animalId]);

  return {
    documents,
    isLoading,
    uploadProgress,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
}