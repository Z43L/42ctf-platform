import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, PlusCircle, Trash, Edit } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { DuelImage } from "@shared/schema";

export default function DockerManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newImageOpen, setNewImageOpen] = useState(false);
  const [editImageOpen, setEditImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DuelImage | null>(null);
  const [formData, setFormData] = useState({
    imageTag: "",
    name: "",
    description: "",
    isEnabled: true,
  });

  // Cargar las imágenes disponibles
  const { data: images, isLoading } = useQuery<DuelImage[]>({
    queryKey: ["/api/duels/images"],
    refetchInterval: 30000, // Recargar cada 30 segundos
  });

  // Crear una nueva imagen
  const createImageMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/duels/images", {
        ...data,
        addedByAdminId: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Imagen creada",
        description: "La imagen ha sido creada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels/images"] });
      setNewImageOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear la imagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar una imagen existente
  const updateImageMutation = useMutation({
    mutationFn: async (data: { id: number; imageData: Partial<DuelImage> }) => {
      const res = await apiRequest("PUT", `/api/duels/images/${data.id}`, data.imageData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Imagen actualizada",
        description: "La imagen ha sido actualizada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels/images"] });
      setEditImageOpen(false);
      setSelectedImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar la imagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar una imagen
  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/duels/images/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Imagen eliminada",
        description: "La imagen ha sido eliminada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels/images"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar la imagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cambiar el estado de una imagen
  const toggleImageMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await apiRequest("PUT", `/api/duels/images/${id}/toggle`, { enabled });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado de la imagen ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels/images"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Limpiar el formulario
  const resetForm = () => {
    setFormData({
      imageTag: "",
      name: "",
      description: "",
      isEnabled: true,
    });
  };

  // Preparar el formulario para editar
  const handleEdit = (image: DuelImage) => {
    setSelectedImage(image);
    setFormData({
      imageTag: image.imageTag,
      name: image.name,
      description: image.description || "",
      isEnabled: image.isEnabled,
    });
    setEditImageOpen(true);
  };

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageTag || !formData.name) {
      toast({
        title: "Error en el formulario",
        description: "Por favor, completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    if (selectedImage) {
      updateImageMutation.mutate({
        id: selectedImage.id,
        imageData: formData,
      });
    } else {
      createImageMutation.mutate(formData);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <h1 className="text-2xl font-bold">Acceso Restringido</h1>
        <p className="text-muted-foreground">
          Solo los administradores pueden acceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Administrador de Imágenes Docker</h1>
        <Dialog open={newImageOpen} onOpenChange={setNewImageOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle size={16} />
              Agregar Imagen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nueva Imagen Docker</DialogTitle>
              <DialogDescription>
                Ingresa los detalles de la nueva imagen Docker para los duelos.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="imageTag" className="text-right">
                    Tag de la Imagen
                  </Label>
                  <Input
                    id="imageTag"
                    value={formData.imageTag}
                    onChange={(e) => setFormData({ ...formData, imageTag: e.target.value })}
                    placeholder="cyberchallenge/duel-kali-web:v1"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Reto Web Básico"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción detallada de la imagen..."
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isEnabled" className="text-right">
                    Habilitada
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                    />
                    <span>{formData.isEnabled ? "Sí" : "No"}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setNewImageOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createImageMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createImageMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de edición */}
        <Dialog open={editImageOpen} onOpenChange={setEditImageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Imagen Docker</DialogTitle>
              <DialogDescription>
                Actualiza los detalles de la imagen Docker.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="imageTag" className="text-right">
                    Tag de la Imagen
                  </Label>
                  <Input
                    id="imageTag"
                    value={formData.imageTag}
                    onChange={(e) => setFormData({ ...formData, imageTag: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isEnabled" className="text-right">
                    Habilitada
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                    />
                    <span>{formData.isEnabled ? "Sí" : "No"}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedImage(null);
                    resetForm();
                    setEditImageOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateImageMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateImageMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Actualizar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !images || images.length === 0 ? (
        <div className="text-center my-12">
          <p className="text-muted-foreground">No hay imágenes disponibles.</p>
        </div>
      ) : (
        <Table>
          <TableCaption>Lista de imágenes Docker disponibles para duelos</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Agregada por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((image) => (
              <TableRow key={image.id}>
                <TableCell className="font-medium">{image.id}</TableCell>
                <TableCell>{image.imageTag}</TableCell>
                <TableCell>{image.name}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {image.description || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={image.isEnabled}
                      onCheckedChange={(checked) =>
                        toggleImageMutation.mutate({ id: image.id, enabled: checked })
                      }
                      disabled={toggleImageMutation.isPending}
                    />
                    <span>{image.isEnabled ? "Activa" : "Inactiva"}</span>
                  </div>
                </TableCell>
                <TableCell>{image.addedByAdminId}</TableCell>
                <TableCell>{new Date(image.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(image)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de eliminar esta imagen?")) {
                          deleteImageMutation.mutate(image.id);
                        }
                      }}
                      disabled={deleteImageMutation.isPending}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}