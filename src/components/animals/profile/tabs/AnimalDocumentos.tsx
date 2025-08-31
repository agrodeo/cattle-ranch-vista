import { useState, useRef } from "react";
import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Image, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  Camera,
  File,
  Award,
  Stethoscope
} from "lucide-react";
import { toast } from "sonner";

interface DocumentFile {
  id: string;
  name: string;
  type: 'certificate' | 'medical' | 'photo' | 'other';
  url: string;
  size: number;
  uploadDate: string;
}

interface AnimalDocumentosProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalDocumentos({ animal }: AnimalDocumentosProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock documents for demonstration
  const mockDocuments: DocumentFile[] = [
    {
      id: '1',
      name: 'Certificado_Nacimiento.pdf',
      type: 'certificate',
      url: '#',
      size: 245760,
      uploadDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Analisis_Sangre_Marzo.pdf',
      type: 'medical',
      url: '#',
      size: 189432,
      uploadDate: '2024-03-10'
    },
    {
      id: '3',
      name: 'Foto_Perfil.jpg',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400',
      size: 523456,
      uploadDate: '2024-02-20'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast.success("Archivo subido exitosamente");
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'certificate': return <Award className="h-4 w-4 text-yellow-500" />;
      case 'medical': return <Stethoscope className="h-4 w-4 text-red-500" />;
      case 'photo': return <Image className="h-4 w-4 text-blue-500" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'certificate': return 'Certificado';
      case 'medical': return 'Médico';
      case 'photo': return 'Fotografía';
      default: return 'Otro';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir Archivos
          </CardTitle>
          <CardDescription>
            Sube certificados, análisis médicos, fotografías y otros documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
            </Button>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Subiendo archivos... {uploadProgress}%
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Formatos admitidos: PDF, DOC, DOCX, JPG, PNG. Tamaño máximo: 10MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documents Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
          <TabsTrigger value="medical">Médicos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <DocumentsList 
            documents={mockDocuments} 
            onImageClick={setSelectedImage}
            getFileIcon={getFileIcon}
            getTypeLabel={getTypeLabel}
            formatFileSize={formatFileSize}
          />
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <PhotoGallery 
            documents={mockDocuments.filter(doc => doc.type === 'photo')}
            onImageClick={setSelectedImage}
          />
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <DocumentsList 
            documents={mockDocuments.filter(doc => doc.type === 'certificate')} 
            onImageClick={setSelectedImage}
            getFileIcon={getFileIcon}
            getTypeLabel={getTypeLabel}
            formatFileSize={formatFileSize}
          />
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <DocumentsList 
            documents={mockDocuments.filter(doc => doc.type === 'medical')} 
            onImageClick={setSelectedImage}
            getFileIcon={getFileIcon}
            getTypeLabel={getTypeLabel}
            formatFileSize={formatFileSize}
          />
        </TabsContent>
      </Tabs>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista Previa</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Preview" 
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Documents List Component
function DocumentsList({ 
  documents, 
  onImageClick,
  getFileIcon,
  getTypeLabel,
  formatFileSize 
}: {
  documents: DocumentFile[];
  onImageClick: (url: string) => void;
  getFileIcon: (type: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
  formatFileSize: (bytes: number) => string;
}) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay documentos en esta categoría</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(doc.type)}
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(doc.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(doc.uploadDate).toLocaleDateString('es')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {doc.type === 'photo' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onImageClick(doc.url)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Photo Gallery Component
function PhotoGallery({ 
  documents, 
  onImageClick 
}: {
  documents: DocumentFile[];
  onImageClick: (url: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay fotografías subidas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {documents.map((photo) => (
        <Card key={photo.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-2">
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-32 object-cover rounded-md mb-2"
              onClick={() => onImageClick(photo.url)}
            />
            <p className="text-xs font-medium truncate">{photo.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(photo.uploadDate).toLocaleDateString('es')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}