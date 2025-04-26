import { useState, useEffect } from 'react';
import LaunchContainer from './LaunchContainer';
import WebTerminal from '../terminal/WebTerminal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw, Terminal } from 'lucide-react';

const DockerLab = () => {
  const [activeTab, setActiveTab] = useState('launch');
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: number;
    token: string;
    matchId: number;
  } | null>(null);

  // Consultar sesiones activas en Docker Lab
  const { data: activeSessions, isLoading: isLoadingSession, refetch: refetchSession } = useQuery<{
    sessionId?: number;
    token?: string;
    containerId?: string;
  }[]>({
    queryKey: ['/api/docker-lab/active-sessions'],
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });

  // Sincronizar el estado con los datos del servidor
  useEffect(() => {
    if (activeSessions && activeSessions.length > 0) {
      // Tomar la primera sesión activa
      const session = activeSessions[0];
      if (session.sessionId && session.token) {
        setSessionInfo({
          sessionId: session.sessionId,
          token: session.token,
          matchId: 0 // En Docker Lab siempre es 0
        });
        setActiveTab('terminal');
      }
    } else if ((!activeSessions || activeSessions.length === 0) && sessionInfo) {
      // Si no hay sesiones activas pero teníamos una, resetear el estado
      setSessionInfo(null);
      setActiveTab('launch');
    }
  }, [activeSessions, sessionInfo]);

  // Manejar el lanzamiento exitoso del contenedor
  const handleLaunchSuccess = (sessionId: number, token: string, matchId: number) => {
    setSessionInfo({ sessionId, token, matchId });
    setActiveTab('terminal');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Docker Lab</CardTitle>
            <CardDescription>
              Inicia contenedores Docker para practicar en un entorno seguro
            </CardDescription>
          </div>
          <Button
            variant="outline" 
            size="icon"
            onClick={() => refetchSession()}
            disabled={isLoadingSession}
          >
            {isLoadingSession ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="launch">Lanzar Contenedor</TabsTrigger>
            <TabsTrigger 
              value="terminal" 
              disabled={!sessionInfo}
              className="flex items-center"
            >
              <Terminal className="mr-2 h-4 w-4" />
              <span>Terminal</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="launch" className="mt-4">
            <LaunchContainer onLaunchSuccess={handleLaunchSuccess} />
            
            <div className="mt-8">
              <h3 className="text-sm font-medium mb-2">Instrucciones:</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Selecciona una imagen Docker para iniciar un contenedor.</li>
                <li>Una vez iniciado, tendrás acceso a una terminal web interactiva.</li>
                <li>Los contenedores se eliminan automáticamente después de 2 horas de inactividad.</li>
                <li>Puedes cerrar la sesión en cualquier momento para liberar recursos.</li>
              </ol>
            </div>
          </TabsContent>
          <TabsContent value="terminal" className="mt-4">
            {sessionInfo ? (
              <div className="h-[500px] border rounded-md overflow-hidden">
                <WebTerminal 
                  sessionId={sessionInfo.sessionId} 
                  token={sessionInfo.token} 
                  matchId={sessionInfo.matchId}
                  isActive={true}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <p className="text-muted-foreground mb-4">
                  No hay una sesión de terminal activa. Inicia un contenedor primero.
                </p>
                <Button onClick={() => setActiveTab('launch')}>
                  Iniciar un contenedor
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DockerLab;