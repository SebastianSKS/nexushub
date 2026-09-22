import { Suspense } from "react";
import { PaginaVideo } from "@/modules/video/PaginaVideo";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaginaVideo />
    </Suspense>
  );
}
