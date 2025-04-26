import DockerLab from "@/components/docker/DockerLab";

export default function DockerLabPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Docker Lab</h1>
        <p className="text-muted-foreground mt-2">
          Entorno de práctica con contenedores Docker para mejorar tus habilidades de ciberseguridad
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DockerLab />
        </div>
        
        <div className="space-y-6">
          <div className="p-6 bg-background-elevated rounded-lg border border-background-subtle">
            <h2 className="text-xl font-semibold mb-4">¿Qué es Docker Lab?</h2>
            <p className="text-muted-foreground mb-4">
              Docker Lab te permite iniciar contenedores Docker preconfigurados 
              para practicar diferentes escenarios de ciberseguridad en un entorno 
              controlado y seguro. Cada contenedor tiene vulnerabilidades específicas 
              para que puedas aprender a identificarlas y explotarlas.
            </p>
            <h3 className="text-lg font-medium mt-6 mb-2">Características:</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Entorno completamente aislado</li>
              <li>Terminal web interactiva</li>
              <li>Diferentes escenarios</li>
              <li>Imágenes mantenidas y actualizadas</li>
              <li>Automáticamente temporizado (2 horas)</li>
            </ul>
          </div>
          
          <div className="p-6 bg-background-elevated rounded-lg border border-background-subtle">
            <h2 className="text-xl font-semibold mb-4">Consejos de uso</h2>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Si pierdes la conexión, puedes volver a conectarte desde esta página</li>
              <li>Las sesiones inactivas se cierran automáticamente después de 2 horas</li>
              <li>Puedes tener solo un contenedor activo a la vez</li>
              <li>Cierra la sesión cuando termines para liberar recursos</li>
              <li>No uses estos contenedores para actividades maliciosas</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}