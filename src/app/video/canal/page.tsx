import { Suspense } from "react";
import { PaginaCanal } from "@/modules/video/PaginaCanal";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaCanal />
    </Suspense>
  );
}
