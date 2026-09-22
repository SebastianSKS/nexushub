"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TextInput } from "@/components/fluent/TextInput";
import { usePerfilStore } from "@/store/perfil-store";
import { Avatar } from "./Avatar";

const MAX_BYTES = 12 * 1024 * 1024;

/** Recorta la imagen al cuadrado central y la reduce a 256 px: ligera para guardarla en el equipo. */
async function fotoACuadrado(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const lado = Math.min(bmp.width, bmp.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  lienzo.getContext("2d")!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  bmp.close();
  return lienzo.toDataURL("image/jpeg", 0.85);
}

/** Inicio de sesión pequeño y opcional: un nombre y, si quieres, una foto. Todo se queda en este equipo. */
export function DialogoPerfil({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const nombreActual = usePerfilStore((s) => s.nombre);
  const fotoActual = usePerfilStore((s) => s.foto);
  const [nombre, setNombre] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const entrada = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombre(nombreActual ?? "");
    setFoto(fotoActual);
    setError(null);
    setErrorNombre(undefined);
    const t = setTimeout(() => campo.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [abierto, nombreActual, fotoActual]);

  const elegirFoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Ese archivo no es una imagen. Elige una foto JPG, PNG o WebP.");
    if (file.size > MAX_BYTES) return setError("Esa foto pesa demasiado (más de 12 MB). Elige una más pequeña.");
    try {
      setFoto(await fotoACuadrado(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con otra foto.");
    }
  };

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setErrorNombre("Escribe cómo quieres que te llamemos.");
    usePerfilStore.getState().iniciarSesion(nombre, foto);
    onCerrar();
  };

  const conSesion = nombreActual !== null;

  return (
    <Dialog open={abierto} onClose={onCerrar} title={conSesion ? "Tu perfil" : "Iniciar sesión"} maxWidth={440}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <p className="text-body text-fg-secondary">
          {conSesion ? "Cambia tu nombre o tu foto cuando quieras." : "Es opcional: sirve para saludarte por tu nombre. NexusHub funciona igual sin perfil."}
        </p>

        <div className="flex items-center gap-4">
          <Avatar nombre={nombre || null} foto={foto} tam={72} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" icon={<Glifo nombre="camara" />} onClick={() => entrada.current?.click()}>
              {foto ? "Cambiar foto" : "Añadir foto"}
            </Button>
            {foto && (
              <Button type="button" variant="subtle" onClick={() => setFoto(null)}>
                Quitar foto
              </Button>
            )}
          </div>
          <input ref={entrada} type="file" accept="image/*" className="hidden" aria-label="Elegir foto de perfil" onChange={(e) => { void elegirFoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        <TextInput ref={campo} label="Tu nombre" value={nombre} maxLength={30} autoComplete="off" onChange={(e) => { setNombre(e.target.value); setErrorNombre(undefined); }} error={errorNombre} placeholder="Por ejemplo, Sebastián" />

        {error && <InfoBar severity="error" title={error} />}

        <p className="text-caption text-fg-tertiary">Tu nombre y tu foto se guardan solo en este equipo. No se envían a ningún servidor.</p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {conSesion ? (
            <Button
              type="button"
              variant="subtle"
              onClick={() => {
                usePerfilStore.getState().cerrarSesion();
                onCerrar();
              }}
            >
              Cerrar sesión
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent">
              {conSesion ? "Guardar" : "Entrar"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
