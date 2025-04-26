import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DuelImage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlayCircle } from 'lucide-react';

interface LaunchContainerProps {
  onLaunchSuccess?: (sessionId: number, token: string, matchId: number) => void;
}

const LaunchContainer = ({ onLaunchSuccess }: LaunchContainerProps) => {
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Obtener imágenes Docker disponibles (solo habilitadas)
  const { data: images, isLoading: isLoadingImages } = useQuery<DuelImage[]>({
    queryKey: ['/api/duels/images'],
  });

  // Obtener sesiones activas de Docker Lab
  const { data: activeSessions, isLoading: isLoadingSession } = useQuery<{
    sessionId?: number;
    token?: string;
    containerId?: string;
  }[]>({
    queryKey: ['/api/docker-lab/active-sessions'],
    refetchInterval: 5000, // Comprobar cada 5 segundos
  });

  // Mutación para iniciar un nuevo contenedor
  const launchMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await apiRequest('POST', '/api/docker-lab/launch', { imageId });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Contenedor iniciado',
        description: 'El contenedor se ha iniciado correctamente. Conectando a la terminal...',
      });
      
      // Invalidar consulta de sesión activa
      queryClient.invalidateQueries({ queryKey: ['/api/docker-lab/active-sessions'] });
      
      // Llamar al callback si existe - esto activará automáticamente la pestaña de terminal
      if (onLaunchSuccess && data.sessionId && data.token) {
        onLaunchSuccess(data.sessionId, data.token, 0); // matchId = 0 para Docker Lab
      }
      
      // Cerrar diálogo
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al iniciar el contenedor',
        description: error.message || 'No se pudo iniciar el contenedor. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    },
  });

  // Manejador para iniciar el contenedor
  const handleLaunch = () => {
    if (!selectedImageId) {
      toast({
        title: 'Selecciona una imagen',
        description: 'Por favor, selecciona una imagen Docker antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    launchMutation.mutate(parseInt(selectedImageId));
  };

  // Si hay una sesión activa, mostrar mensaje
  if (activeSessions && activeSessions.length > 0 && activeSessions[0]?.sessionId) {
    const activeSession = activeSessions[0];
    return (
      <div className="p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-md mb-4">
        <h3 className="text-sm font-medium text-yellow-500 mb-2">Tienes una sesión activa</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Ya tienes un contenedor Docker en ejecución. Puedes volver a tu terminal activa.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (onLaunchSuccess && activeSession.sessionId && activeSession.token) {
              onLaunchSuccess(activeSession.sessionId, activeSession.token, 0); // matchId = 0 para Docker Lab
            }
          }}
        >
          Volver a la terminal activa
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full flex items-center space-x-2">
          <PlayCircle className="w-5 h-5" />
          <span>Iniciar Contenedor Docker</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar contenedor Docker</DialogTitle>
          <DialogDescription>
            Selecciona una imagen Docker para iniciar un nuevo contenedor. Una vez iniciado,
            tendrás acceso a una terminal interactiva.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            Selecciona una imagen:
          </label>
          
          {isLoadingImages ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !images || images.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              No hay imágenes Docker disponibles en este momento.
            </div>
          ) : (
            <Select 
              value={selectedImageId} 
              onValueChange={setSelectedImageId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una imagen" />
              </SelectTrigger>
              <SelectContent>
                {images.map((image) => (
                  <SelectItem key={image.id} value={image.id.toString()}>
                    {image.name} ({image.imageTag})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleLaunch}
            disabled={launchMutation.isPending || !selectedImageId}
          >
            {launchMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LaunchContainer;