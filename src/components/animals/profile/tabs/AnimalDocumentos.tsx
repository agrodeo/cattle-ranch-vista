import { useState } from "react";
import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Upload, 
  FileText, 
  Image, 
  Eye, 
  Download, 
  Trash2, 
  File,
  Heart,
  Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAnimalDocuments, AnimalDocument } from "@/hooks/useAnimalDocuments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnimalDocumentosProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalDocumentos({ animal }: AnimalDocumentosProps) {
  const { t } = useTranslation(['common', 'animals']);
  const { documents, isLoading, uploadProgress, uploadDocument, deleteDocument } = useAnimalDocuments(animal.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<AnimalDocument['file_type']>('other');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await uploadDocument(file, selectedFileType);
    
    // Reset the input
    event.target.value = '';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getTypeIcon = (type: AnimalDocument['file_type']) => {
    switch (type) {
      case 'certificate': return <Award className="h-4 w-4" />;
      case 'medical': return <Heart className="h-4 w-4" />;
      case 'photo': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: AnimalDocument['file_type']) => {
    const labels = {
      certificate: 'Certificado',
      medical: 'Médico',
      photo: 'Foto',
      other: 'Otro'
    };
    return labels[type];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filterDocuments = (type: string) => {
    if (type === 'all') return documents;
    if (type === 'photos') return documents.filter(doc => doc.file_type === 'photo');
    return documents.filter(doc => doc.file_type === type);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando documentos...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir Documento
          </CardTitle>
          <CardDescription>
            Sube certificados, registros médicos, fotos y otros documentos del animal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="file-type">Tipo de documento</Label>
                <Select value={selectedFileType} onValueChange={(value: AnimalDocument['file_type']) => setSelectedFileType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificado</SelectItem>
                    <SelectItem value="medical">Médico</SelectItem>
                    <SelectItem value="photo">Foto</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="file-upload">Archivo</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </div>
            </div>

            {/* Upload Progress */}
            {Object.values(uploadProgress).map((progress) => (
              <div key={progress.fileName} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.fileName}</span>
                  <span>{Math.round(progress.progress)}%</span>
                </div>
                <Progress value={progress.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({documents.length})</TabsTrigger>
              <TabsTrigger value="photos">Fotos ({filterDocuments('photos').length})</TabsTrigger>
              <TabsTrigger value="certificate">Certificados ({filterDocuments('certificate').length})</TabsTrigger>
              <TabsTrigger value="medical">Médicos ({filterDocuments('medical').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <DocumentsList 
                documents={filterDocuments('all')} 
                onImageClick={setSelectedImage}
                onDelete={deleteDocument}
                getFileIcon={getFileIcon}
                getTypeIcon={getTypeIcon}
                getTypeLabel={getTypeLabel}
                formatFileSize={formatFileSize}
              />
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              <PhotoGallery 
                documents={filterDocuments('photos')} 
                onImageClick={setSelectedImage} 
              />
            </TabsContent>

            <TabsContent value="certificate" className="space-y-4">
              <DocumentsList 
                documents={filterDocuments('certificate')} 
                onImageClick={setSelectedImage}
                onDelete={deleteDocument}
                getFileIcon={getFileIcon}
                getTypeIcon={getTypeIcon}
                getTypeLabel={getTypeLabel}
                formatFileSize={formatFileSize}
              />
            </TabsContent>

            <TabsContent value="medical" className="space-y-4">
              <DocumentsList 
                documents={filterDocuments('medical')} 
                onImageClick={setSelectedImage}
                onDelete={deleteDocument}
                getFileIcon={getFileIcon}
                getTypeIcon={getTypeIcon}
                getTypeLabel={getTypeLabel}
                formatFileSize={formatFileSize}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa de imagen</DialogTitle>
            <DialogDescription>
              Haz clic fuera de la imagen para cerrar
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Vista previa" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Documents List Component
interface DocumentsListProps {
  documents: AnimalDocument[];
  onImageClick: (url: string) => void;
  onDelete: (id: string) => void;
  getFileIcon: (type: string) => JSX.Element;
  getTypeIcon: (type: AnimalDocument['file_type']) => JSX.Element;
  getTypeLabel: (type: AnimalDocument['file_type']) => string;
  formatFileSize: (bytes: number) => string;
}

function DocumentsList({ 
  documents, 
  onImageClick, 
  onDelete,
  getFileIcon,
  getTypeIcon,
  getTypeLabel,
  formatFileSize
}: DocumentsListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay documentos en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getTypeIcon(doc.file_type)}
            </div>
            <div>
              <p className="font-medium">{doc.file_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{getTypeLabel(doc.file_type)}</Badge>
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {doc.file_type === 'photo' && doc.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onImageClick(doc.url!)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {doc.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(doc.url, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(doc.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Photo Gallery Component
interface PhotoGalleryProps {
  documents: AnimalDocument[];
  onImageClick: (url: string) => void;
}

function PhotoGallery({ documents, onImageClick }: PhotoGalleryProps) {
  const photos = documents.filter(doc => doc.file_type === 'photo');
  
  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay fotos subidas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative">
          <div 
            className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
            onClick={() => photo.url && onImageClick(photo.url)}
          >
            {photo.url ? (
              <img 
                src={photo.url} 
                alt={photo.file_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium truncate">{photo.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(photo.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}