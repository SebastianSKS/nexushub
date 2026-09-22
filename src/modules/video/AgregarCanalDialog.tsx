"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TextInput } from "@/components/fluent/TextInput";
import { rutaCanal } from "@/lib/rutas";
import { useCanalesStore, type ErrorFeed } from "@/store/canales-store";

interface AgregarCanalDialogProps {
  abierto: boolean;
  onCerrar: () => void;
}

/** Diálogo para suscribirse a un canal o lista pegando un enlace, @handle o ID. */
export function AgregarCanalDialog({ abierto, onCerrar }: AgregarCanalDialogProps) {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<ErrorFeed | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!abierto) return;
    setTexto("");
    setError(null);
    setBuscando(false);
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [abierto]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (buscando) return;
    setBuscando(true);
    setError(null);
    const r = await useCanalesStore.getState().agregarCanal(texto);
    setBuscando(false);
    if (r.ok) {
      onCerrar();
      router.push(rutaCanal(r.canal.id));
    } else {
      setError(r.error);
    }
  };

  return (
    <Dialog open={abierto} onClose={onCerrar} title="Agregar canal" maxWidth={560}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <TextInput
          ref={inputRef}
          label="Pega el enlace de un canal de YouTube"
          placeholder="youtube.com/@canal, /channel/UC…, una lista o cualquier video"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          hint="También sirve un @nombre, el ID del canal (UC…) o el enlace de cualquier video del canal."
        />

        {buscando && (
          <p className="text-body text-fg-secondary" role="status">
            Buscando el canal en YouTube…
          </p>
        )}
        {error && (
          <InfoBar severity="error" title={error.mensaje}>
            {error.pista}
          </InfoBar>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" disabled={buscando || texto.trim().length === 0}>
            {buscando ? "Buscando…" : "Agregar canal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
