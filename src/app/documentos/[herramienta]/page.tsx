import { notFound } from "next/navigation";
import { SLUGS, toolIdDeSlug } from "@/lib/rutas";
import { PaginaHerramienta } from "@/modules/documents/PaginaHerramienta";

// Las herramientas se conocen de antemano: la exportación estática genera una página por cada una.
export const dynamicParams = false;
export function generateStaticParams() {
  return SLUGS.map((herramienta) => ({ herramienta }));
}

export default async function Page({ params }: { params: Promise<{ herramienta: string }> }) {
  const toolId = toolIdDeSlug((await params).herramienta);
  if (!toolId) notFound();
  return <PaginaHerramienta toolId={toolId} />;
}
