import Docker from 'dockerode';
import { randomBytes } from 'crypto';
import { log } from './vite';

// Inicializar cliente Docker
const docker = new Docker();

interface DockerContainerInfo {
  containerId: string;
  containerName: string;
  networkId?: string;
  ipAddress?: string;
  image: string;
  status: string;
  createdAt: Date;
}

interface TerminalSession {
  sessionId: number;
  token: string;
  containerId: string;
  userId: number;
  matchId: number;
}

// Servicio para gestionar contenedores Docker
class DockerService {
  private runningContainers: Map<string, DockerContainerInfo>;
  private activeTerminalSessions: Map<number, TerminalSession>;

  constructor() {
    this.runningContainers = new Map();
    this.activeTerminalSessions = new Map();
    log('Docker service initialized', 'docker');
  }

  // Listar imágenes Docker disponibles
  async listImages(): Promise<string[]> {
    try {
      const images = await docker.listImages();
      return images.map(img => {
        if (img.RepoTags && img.RepoTags.length > 0) {
          return img.RepoTags[0];
        }
        return img.Id.substring(7, 19); // ID corto
      });
    } catch (error) {
      log(`Error listing Docker images: ${error}`, 'docker');
      throw error;
    }
  }

  // Crear un nuevo contenedor Docker
  async createContainer(imageTag: string, sessionInfo: { userId: number, matchId: number, sessionId: number }): Promise<{ 
    containerId: string,
    sessionToken: string
  }> {
    try {
      // Generar nombre y token único para el contenedor
      const containerName = `ctf_container_${sessionInfo.userId}_${sessionInfo.matchId}_${Date.now()}`;
      const sessionToken = randomBytes(16).toString('hex');
      
      log(`Creating container from image ${imageTag} with name ${containerName}`, 'docker');
      
      // Crear contenedor con terminal interactiva
      const container = await docker.createContainer({
        Image: imageTag,
        name: containerName,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        Cmd: ['/bin/bash'],
        HostConfig: {
          AutoRemove: true, // Eliminar contenedor cuando se detenga
          NetworkMode: 'bridge',
          CapAdd: ['NET_ADMIN'], // Permisos para configuración de red
        },
        // Información personalizada para rastreo
        Labels: {
          'app': '42ctf',
          'user_id': sessionInfo.userId.toString(),
          'match_id': sessionInfo.matchId.toString(),
          'session_id': sessionInfo.sessionId.toString()
        }
      });
      
      // Iniciar contenedor
      await container.start();
      
      const containerInfo = await container.inspect();
      const containerId = containerInfo.Id;
      
      // Guardar información del contenedor
      this.runningContainers.set(containerId, {
        containerId,
        containerName,
        image: imageTag,
        status: containerInfo.State.Status,
        createdAt: new Date(),
        ipAddress: containerInfo.NetworkSettings.IPAddress
      });
      
      // Guardar información de la sesión
      this.activeTerminalSessions.set(sessionInfo.sessionId, {
        sessionId: sessionInfo.sessionId,
        token: sessionToken,
        containerId,
        userId: sessionInfo.userId,
        matchId: sessionInfo.matchId
      });
      
      log(`Container created successfully: ${containerId}`, 'docker');
      
      return {
        containerId,
        sessionToken
      };
    } catch (error) {
      log(`Error creating Docker container: ${error}`, 'docker');
      throw error;
    }
  }
  
  // Ejecutar comando en un contenedor
  async executeCommand(containerId: string, command: string): Promise<{ stdout: string, stderr: string }> {
    try {
      if (!this.runningContainers.has(containerId)) {
        throw new Error(`Container ${containerId} not found or not managed by this service`);
      }
      
      const container = docker.getContainer(containerId);
      
      const exec = await container.exec({
        Cmd: ['/bin/bash', '-c', command],
        AttachStdin: false,
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start({ hijack: true, stdin: false });
      
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        // Capturar salida del comando
        container.modem.demuxStream(stream, {
          write: (data: Buffer) => {
            stdout += data.toString();
          }
        }, {
          write: (data: Buffer) => {
            stderr += data.toString();
          }
        });
        
        stream.on('end', () => {
          resolve({ stdout, stderr });
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      log(`Error executing command in container ${containerId}: ${error}`, 'docker');
      throw error;
    }
  }
  
  // Verificar si una sesión es válida
  isValidSession(sessionId: number, token: string): boolean {
    const session = this.activeTerminalSessions.get(sessionId);
    return !!session && session.token === token;
  }
  
  // Obtener ID del contenedor por sessionId
  getContainerIdBySessionId(sessionId: number): string | null {
    const session = this.activeTerminalSessions.get(sessionId);
    return session ? session.containerId : null;
  }
  
  // Conectar a un stream interactivo del contenedor
  async getInteractiveStream(containerId: string): Promise<NodeJS.ReadWriteStream> {
    try {
      // Verificamos primero si el contenedor está en nuestra lista interna
      // pero permitimos conectar aunque no esté en nuestra lista para soportar el terminal interactivo
      const container = docker.getContainer(containerId);
      
      try {
        // Verificar que el contenedor existe y está corriendo
        const info = await container.inspect();
        if (info.State.Status !== 'running') {
          throw new Error(`Container is not running (status: ${info.State.Status})`);
        }
      } catch (error) {
        const inspectError = error as Error;
        throw new Error(`Container not found or cannot be inspected: ${inspectError.message}`);
      }
      
      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true
      });
      
      return stream;
    } catch (error) {
      log(`Error connecting to container stream: ${error}`, 'docker');
      throw error;
    }
  }
  
  // Crear una sesión para acceder a un contenedor existente
  async createSessionForExistingContainer(
    containerId: string, 
    userId: number
  ): Promise<{ 
    sessionId: number, 
    token: string 
  }> {
    try {
      const container = docker.getContainer(containerId);
      const info = await container.inspect();
      
      if (info.State.Status !== 'running') {
        throw new Error(`Container is not running (status: ${info.State.Status})`);
      }
      
      // Generar un ID de sesión único
      const sessionId = Date.now();
      const sessionToken = randomBytes(16).toString('hex');
      
      // Determinar el ID del match usando el valor de la etiqueta o usar 0 para Docker Lab
      let matchId = 0;
      if (info.Config.Labels && info.Config.Labels['match_id']) {
        matchId = parseInt(info.Config.Labels['match_id']);
      }
      
      // Registrar la sesión
      this.activeTerminalSessions.set(sessionId, {
        sessionId,
        token: sessionToken,
        containerId,
        userId,
        matchId
      });
      
      log(`Created terminal session ${sessionId} for existing container ${containerId}`, 'docker');
      
      return {
        sessionId,
        token: sessionToken
      };
    } catch (error) {
      log(`Error creating session for container ${containerId}: ${error}`, 'docker');
      throw error;
    }
  }
  
  // Detener un contenedor específico
  async stopContainer(containerId: string): Promise<boolean> {
    try {
      if (!this.runningContainers.has(containerId)) {
        return false;
      }
      
      const container = docker.getContainer(containerId);
      await container.stop();
      
      // Eliminar información del contenedor
      this.runningContainers.delete(containerId);
      
      // Eliminar sesiones asociadas (evitar problemas de tipado con Map.entries())
      const sessionIds = Array.from(this.activeTerminalSessions.keys());
      
      for (const sessionId of sessionIds) {
        const session = this.activeTerminalSessions.get(sessionId);
        if (session && session.containerId === containerId) {
          this.activeTerminalSessions.delete(sessionId);
        }
      }
      
      log(`Container stopped and removed: ${containerId}`, 'docker');
      return true;
    } catch (error) {
      log(`Error stopping container ${containerId}: ${error}`, 'docker');
      throw error;
    }
  }
  
  // Detener contenedor por ID de sesión
  async stopContainerBySessionId(sessionId: number): Promise<boolean> {
    const containerId = this.getContainerIdBySessionId(sessionId);
    if (!containerId) return false;
    
    return this.stopContainer(containerId);
  }
  
  // Obtener información de un contenedor específico
  getContainerInfo(containerId: string): DockerContainerInfo | undefined {
    return this.runningContainers.get(containerId);
  }
  
  // Listar contenedores en ejecución
  listRunningContainers(): DockerContainerInfo[] {
    return Array.from(this.runningContainers.values());
  }
  
  // Listar todos los contenedores manejados por la plataforma con información detallada
  async listDetailedContainers(): Promise<Array<{
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
  }>> {
    try {
      // Obtener todos los contenedores, no solo los activos
      const containers = await docker.listContainers({ all: true });
      
      // Filtrar solo los contenedores que tengan la etiqueta de nuestra aplicación
      const ourContainers = containers.filter(container => 
        container.Labels && container.Labels['app'] === '42ctf'
      );
      
      // Mapear a formato más detallado
      return Promise.all(ourContainers.map(async container => {
        const containerObj = docker.getContainer(container.Id);
        const details = await containerObj.inspect();
        
        return {
          id: container.Id,
          name: container.Names[0].replace(/^\//, ''),
          image: container.Image,
          status: container.State,
          createdAt: new Date(container.Created * 1000),
          userId: container.Labels['user_id'] ? parseInt(container.Labels['user_id']) : undefined,
          matchId: container.Labels['match_id'] ? parseInt(container.Labels['match_id']) : undefined,
          sessionId: container.Labels['session_id'] ? parseInt(container.Labels['session_id']) : undefined,
          ipAddress: details.NetworkSettings.IPAddress,
          labels: container.Labels
        };
      }));
    } catch (error) {
      log(`Error listing detailed containers: ${error}`, 'docker');
      return [];
    }
  }
  
  // Verificar el estado de un contenedor
  async checkContainerStatus(containerId: string): Promise<string> {
    try {
      const container = docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Status;
    } catch (error) {
      return 'not_found';
    }
  }
  
  // Limpiar contenedores antiguos
  async cleanupOldContainers(maxAgeHours: number = 2): Promise<number> {
    try {
      let removed = 0;
      const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
      
      // Obtener todos los IDs de contenedores para evitar problemas de tipado con iteración de Maps
      const containerIds = Array.from(this.runningContainers.keys());
      
      for (const containerId of containerIds) {
        const info = this.runningContainers.get(containerId);
        if (info && info.createdAt < cutoffTime) {
          await this.stopContainer(containerId);
          removed++;
        }
      }
      
      log(`Cleanup completed: ${removed} containers removed`, 'docker');
      return removed;
    } catch (error) {
      log(`Error during container cleanup: ${error}`, 'docker');
      throw error;
    }
  }
}

// Exportar una única instancia del servicio
export const dockerService = new DockerService();