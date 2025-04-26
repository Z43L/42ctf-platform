import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useToast } from '@/hooks/use-toast';
import { Terminal } from 'lucide-react';

interface WebTerminalProps {
  token: string;
  sessionId: number;
  matchId?: number;
  isActive?: boolean;
}

const WebTerminal = ({ token, sessionId, matchId, isActive = true }: WebTerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Configurar terminal y conectar websocket
  useEffect(() => {
    if (!terminalRef.current) return;
    if (terminal) return;
    if (!isActive) return;

    // Crear terminal
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selectionBackground: '#585b70',
        black: '#45475a',
        brightBlack: '#585b70',
        red: '#f38ba8',
        brightRed: '#f38ba8',
        green: '#a6e3a1',
        brightGreen: '#a6e3a1',
        yellow: '#f9e2af',
        brightYellow: '#f9e2af',
        blue: '#89b4fa',
        brightBlue: '#89b4fa',
        magenta: '#f5c2e7',
        brightMagenta: '#f5c2e7',
        cyan: '#94e2d5',
        brightCyan: '#94e2d5',
        white: '#bac2de',
        brightWhite: '#a6adc8'
      }
    });

    // Crear addon para ajustar tamaño automáticamente
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Abrir terminal en el div de referencia
    term.open(terminalRef.current);
    fitAddon.fit();

    // Guardar terminal en estado
    setTerminal(term);

    // Conectar websocket
    connectWebSocket(term);

    // Ajustar tamaño al cambiar dimensiones de la ventana
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
      if (term) {
        term.dispose();
      }
      if (socket) {
        socket.close();
      }
    };
  }, [terminalRef, terminal, isActive, token, sessionId]);

  // Función para conectar websocket
  const connectWebSocket = (term: XTerm) => {
    // URL del websocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/duels/terminal/connect?token=${token}&sessionId=${sessionId}`;

    // Crear websocket
    const ws = new WebSocket(wsUrl);

    // Manejar eventos
    ws.addEventListener('open', () => {
      setIsConnected(true);
      term.write('\r\n\x1b[1;32mConexión establecida con el contenedor\x1b[0m\r\n\r\n');
    });

    ws.addEventListener('message', (event) => {
      // Escribir datos recibidos en la terminal
      term.write(event.data);
    });

    ws.addEventListener('close', () => {
      setIsConnected(false);
      term.write('\r\n\x1b[1;31mConexión cerrada\x1b[0m\r\n');
      
      toast({
        title: 'Conexión terminada',
        description: 'La conexión con el contenedor ha sido cerrada.',
        variant: 'destructive',
      });
    });

    ws.addEventListener('error', () => {
      setIsConnected(false);
      term.write('\r\n\x1b[1;31mError de conexión\x1b[0m\r\n');
      
      toast({
        title: 'Error de conexión',
        description: 'No se pudo establecer conexión con el contenedor.',
        variant: 'destructive',
      });
    });

    // Guardar socket en estado
    setSocket(ws);

    // Enviar datos al presionar teclas
    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  };

  // Función para reconectar
  const handleReconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    // Esperar un momento antes de intentar reconectar
    setTimeout(() => {
      if (terminal) {
        terminal.clear();
        terminal.write('\r\n\x1b[1;33mReconectando...\x1b[0m\r\n');
        connectWebSocket(terminal);
      }
    }, 500);
  };

  // Función para cerrar sesión
  const handleCloseSession = async () => {
    try {
      // Cerrar socket
      if (socket) {
        socket.close();
      }

      // Llamar a API para cerrar sesión
      await fetch(`/api/duels/terminal/session/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: 'Sesión terminada',
        description: 'La sesión de terminal ha sido cerrada exitosamente.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesión correctamente.',
        variant: 'destructive',
      });
    }
  };

  // Si el terminal no está activo, mostrar mensaje
  if (!isActive) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-muted/30 rounded-md">
        <div className="text-center">
          <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Terminal no disponible</p>
          <p className="text-xs text-muted-foreground mt-1">
            El terminal estará disponible cuando inicies un duelo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 bg-background-elevated border-b border-background-subtle">
        <div>
          <span className="text-sm text-muted-foreground">Sesión {sessionId}</span>
          <span className={`ml-2 inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </div>
        <div className="space-x-2">
          <button
            onClick={handleReconnect}
            className="px-3 py-1 text-xs rounded bg-background-subtle hover:bg-background-muted"
          >
            Reconectar
          </button>
          <button
            onClick={handleCloseSession}
            className="px-3 py-1 text-xs rounded bg-red-900 hover:bg-red-800 text-white"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-1 bg-black" ref={terminalRef} />
    </div>
  );
};

export default WebTerminal;