import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layouts/MainLayout';
import WebTerminal from '@/components/terminal/WebTerminal';
import { Loader2, RefreshCw, XCircle, PlayCircle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  createdAt: Date;
  userId?: number;
  matchId?: number;
  ipAddress?: string;
  sessionId?: number;
  labels: Record<string, string>;
}

interface TerminalSession {
  sessionId: number;
  token: string;
  containerId: string;
  message?: string;
}

const TerminalInteractiveView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list');
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);
  const [activeSession, setActiveSession] = useState<TerminalSession | null>(null);

  // Consultar contenedores del usuario
  const { data: containers, isLoading: isLoadingContainers, refetch: refetchContainers } = useQuery({
    queryKey: ['/api/terminal/my-containers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/terminal/my-containers');
      const data = await response.json();
      return data as Container[];
    },
  });

  // Mutación para conectar a un contenedor existente
  const connectMutation = useMutation({
    mutationFn: async (containerId: string) => {
      const response = await apiRequest('POST', `/api/terminal/connect/${containerId}`);
      return await response.json() as TerminalSession;
    },
    onSuccess: (data) => {
      // Actualizar la lista de contenedores
      queryClient.invalidateQueries({ queryKey: ['/api/terminal/my-containers'] });
      
      // Guardar la sesión activa
      setActiveSession(data);
      
      // Cambiar a la pestaña de terminal
      setActiveTab('terminal');
      
      toast({
        title: 'Conectado al contenedor',
        description: data.message || 'Se ha establecido conexión con el contenedor correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al conectar',
        description: error.message || 'No se pudo conectar al contenedor. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    },
  });

  // Cerrar sesión de terminal
  const closeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest('POST', `/api/duels/terminal/close/${sessionId}`);
      return await response.json();
    },
    onSuccess: () => {
      // Limpiar sesión activa
      setActiveSession(null);
      setActiveContainer(null);
      
      // Volver a la lista
      setActiveTab('list');
      
      // Actualizar la lista de contenedores
      queryClient.invalidateQueries({ queryKey: ['/api/terminal/my-containers'] });
      
      toast({
        title: 'Sesión cerrada',
        description: 'Se ha cerrado la conexión con el contenedor.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al cerrar sesión',
        description: error.message || 'No se pudo cerrar la sesión. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    },
  });

  // Conectar a un contenedor
  const handleConnect = (container: Container) => {
    setActiveContainer(container);
    connectMutation.mutate(container.id);
  };

  // Cerrar la terminal actual
  const handleCloseTerminal = () => {
    if (activeSession?.sessionId) {
      closeSessionMutation.mutate(activeSession.sessionId);
    } else {
      // Si no hay ID de sesión, simplemente limpiar el estado
      setActiveSession(null);
      setActiveContainer(null);
      setActiveTab('list');
    }
  };

  // Formatear fecha de creación
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'exited':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'created':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terminal Interactivo</h1>
            <p className="text-muted-foreground mt-2">
              Accede a tus contenedores Docker y conéctate a sus terminales interactivas
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetchContainers()}
              disabled={isLoadingContainers}
            >
              {isLoadingContainers ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
            <Link href="/docker-lab">
              <Button variant="default">
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar Nuevo Contenedor
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">Lista de Contenedores</TabsTrigger>
            <TabsTrigger 
              value="terminal" 
              disabled={!activeSession}
            >
              Terminal Interactiva
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {isLoadingContainers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !containers || containers.length === 0 ? (
              <div className="text-center py-16 border rounded-lg bg-muted/10">
                <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay contenedores activos</h3>
                <p className="text-muted-foreground mb-4">
                  No tienes contenedores Docker activos en este momento.
                </p>
                <Link href="/docker-lab">
                  <Button>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Iniciar un contenedor
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {containers.map((container) => (
                  <Card key={container.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg truncate" title={container.name}>
                          {container.name}
                        </CardTitle>
                        <Badge 
                          className={`${getStatusColor(container.status)} uppercase text-xs font-medium`}
                        >
                          {container.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        ID: {container.id.substring(0, 12)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Imagen:</span>{' '}
                          <span className="text-muted-foreground">{container.image}</span>
                        </div>
                        <div>
                          <span className="font-medium">Creado:</span>{' '}
                          <span className="text-muted-foreground">{formatDate(container.createdAt)}</span>
                        </div>
                        {container.ipAddress && (
                          <div>
                            <span className="font-medium">IP:</span>{' '}
                            <span className="text-muted-foreground">{container.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <Separator />
                    <CardFooter className="pt-3">
                      <Button 
                        className="w-full" 
                        disabled={container.status !== 'running' || connectMutation.isPending}
                        onClick={() => handleConnect(container)}
                      >
                        {connectMutation.isPending && activeContainer?.id === container.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Terminal className="h-4 w-4 mr-2" />
                        )}
                        Conectar al terminal
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="terminal">
            {activeSession ? (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">
                      Terminal: {activeContainer?.name || 'Contenedor Docker'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ID: {activeContainer?.id.substring(0, 12)}
                      {activeContainer?.ipAddress && ` • IP: ${activeContainer.ipAddress}`}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCloseTerminal}
                    disabled={closeSessionMutation.isPending}
                  >
                    {closeSessionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cerrar terminal
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden" style={{ height: '70vh' }}>
                  <WebTerminal
                    sessionId={activeSession.sessionId}
                    token={activeSession.token}
                    matchId={activeContainer?.matchId || 0}
                    isActive={true}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border rounded-lg bg-muted/10">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay sesión activa</h3>
                <p className="text-muted-foreground mb-4">
                  Selecciona un contenedor de la lista para conectarte a su terminal.
                </p>
                <Button onClick={() => setActiveTab('list')}>
                  Ver lista de contenedores
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default TerminalInteractiveView;