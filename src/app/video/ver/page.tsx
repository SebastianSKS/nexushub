import { Suspense } from "react";
import { PaginaVer } from "@/modules/video/PaginaVer";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaVer />
    </Suspense>
  );
}
