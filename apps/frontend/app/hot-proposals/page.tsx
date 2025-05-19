"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { MediaFormData } from "@/app/types";

interface StoredProposal {
  proveedor: string;
  date: string;
  mediaItems: Array<{
    claveZirkel: string;
    proveedor: string;
  }>;
}

export default function HotProposalsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<StoredProposal[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [results, setResults] = useState<MediaFormData[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { toast } = useToast();
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    // Load proposals from localStorage
    const storedProposals = localStorage.getItem("mediaProposals");
    if (storedProposals) {
      const parsedProposals = JSON.parse(storedProposals);
      setProposals(parsedProposals);

      // Auto-select today's proposals
      const today = new Date().toISOString().split("T")[0];
      const todayProposals = parsedProposals.filter((p: StoredProposal) =>
        p.date.startsWith(today)
      );
      setSelectedDates(todayProposals.map((p: StoredProposal) => p.date));
    }
  }, []);

  const handlePreview = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor seleccione al menos una fecha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get selected proposals
      const selectedProposals = proposals.filter((p) =>
        selectedDates.includes(p.date)
      );

      // Extract all Zirkel keys from the selected proposals
      const zirkelKeys = selectedProposals.flatMap((proposal) =>
        proposal.mediaItems.map((item) => item.claveZirkel)
      );

      // Fetch real media data from the API
      const response = await fetch(`${baseUrl}/get-medios-by-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ zirkelKeys }),
      });

      if (!response.ok) {
        throw new Error("Error al obtener datos de medios");
      }

      const mediaData: MediaFormData[] = await response.json();
      setResults(mediaData);
      // Set all items as selected by default
      setSelectedItems(mediaData.map((item) => item.claveZirkel));

      toast({
        title: "Vista previa generada",
        description: `Se encontraron ${mediaData.length} espacios de medios.`,
      });
    } catch (error) {
      console.error("Error fetching media data:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al generar la vista previa.",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems((prev) => [...prev, id]);
    } else {
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleDateSelect = (date: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDates((prev) => [...prev, date]);
    } else {
      setSelectedDates((prev) => prev.filter((d) => d !== date));
    }
  };

  const handleGenerateProposal = async () => {};

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Propuestas Recientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
        <div className="lg:col-span-1 space-y-6 h-full">
          <Card className="h-full">
            <CardContent className="pt-6 h-full flex flex-col">
              <div className="space-y-4 flex-grow flex flex-col">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Fechas</h2>
                  <Button
                    onClick={handlePreview}
                    disabled={isLoading || selectedDates.length === 0}
                  >
                    Previsualizar
                  </Button>
                </div>

                <Separator className="my-4" />

                <ScrollArea className="flex-grow pr-4">
                  <div className="space-y-4">
                    {proposals.map((proposal) => {
                      const formattedDate = format(
                        new Date(proposal.date),
                        "PPP",
                        { locale: es }
                      );

                      return (
                        <div
                          key={proposal.date}
                          className="flex items-center space-x-3"
                        >
                          <Checkbox
                            checked={selectedDates.includes(proposal.date)}
                            onCheckedChange={(checked) =>
                              handleDateSelect(
                                proposal.date,
                                checked as boolean
                              )
                            }
                          />
                          <div>
                            <p className="font-medium">{formattedDate}</p>
                            <p className="text-sm text-muted-foreground">
                              {proposal.proveedor} -{" "}
                              {proposal.mediaItems.length} medios
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 h-full">
          <div className="bg-white rounded-lg border p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Resultados ({results.length})
              </h2>
              <Button
                onClick={handleGenerateProposal}
                disabled={isLoading || selectedItems.length === 0}
              >
                Crear propuesta
              </Button>
            </div>

            <Separator className="mb-4" />

            {isLoading ? (
              <div className="flex items-center justify-center flex-grow">
                <p>Cargando resultados...</p>
              </div>
            ) : results.length > 0 ? (
              <ScrollArea className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {results.map((media) => (
                    <Card key={media.claveZirkel} className="overflow-hidden">
                      <div className="relative">
                        <img
                          src={
                            media.imageUrl ||
                            "/placeholder.svg?height=200&width=300&text=Sin+Imagen"
                          }
                          alt={`${media.proveedor} - ${media.tipoMedio}`}
                          className="w-full h-40 object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{media.proveedor}</h3>
                          <Badge variant="outline">{media.tipoMedio}</Badge>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Clave Zirkel:
                            </span>
                            <span>{media.claveZirkel}</span>
                          </div>
                          {media.claveOriginalSitio && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Clave Original:
                              </span>
                              <span>{media.claveOriginalSitio}</span>
                            </div>
                          )}
                          {media.base && media.altura && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Base × Altura:
                              </span>
                              <span>
                                {media.base}m × {media.altura}m
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Ubicación:
                            </span>
                            <span>
                              {media.ciudad}, {media.estado}
                            </span>
                          </div>
                          {media.costo && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Costo Espacio:
                              </span>
                              <span className="font-medium">
                                ${media.costo.toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Costo Instalación:
                            </span>
                            <span className="font-medium">
                              {media.costoInstalacion
                                ? `${media.costoInstalacion.toLocaleString()}`
                                : "Sin especificar"}
                            </span>
                          </div>
                          {media.iluminacion && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Iluminación:
                              </span>
                              <span>{media.iluminacion}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="px-4 py-3 border-t flex justify-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`select-${media.claveZirkel}`}
                            checked={selectedItems.includes(media.claveZirkel)}
                            onCheckedChange={(checked) =>
                              handleItemSelect(
                                media.claveZirkel,
                                checked as boolean
                              )
                            }
                          />
                          <label
                            htmlFor={`select-${media.claveZirkel}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Seleccionar
                          </label>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center flex-grow">
                <p className="text-muted-foreground">
                  Seleccione una fecha y haga clic en Previsualizar para ver los
                  resultados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
