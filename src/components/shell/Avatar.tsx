import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";

interface AvatarProps {
  nombre: string | null;
  foto: string | null;
  tam?: number;
  className?: string;
}

/** Foto de perfil redonda; sin foto, la inicial del nombre; sin nombre, un icono de persona. */
export function Avatar({ nombre, foto, tam = 32, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white", className)}
      style={{ width: tam, height: tam, fontSize: tam * 0.42, backgroundImage: foto ? undefined : "linear-gradient(135deg, #0f6cbd, #3fb6f5)" }}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto local (data URL)
        <img src={foto} alt="" width={tam} height={tam} className="h-full w-full object-cover" draggable={false} />
      ) : nombre ? (
        nombre.trim().charAt(0).toUpperCase()
      ) : (
        <Glifo nombre="persona" tam={Math.round(tam * 0.5)} />
      )}
    </span>
  );
}
