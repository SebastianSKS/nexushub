import type { Canal } from "@/types/canal";

/**
 * Canales precargados cuando el usuario no tiene ninguno guardado, para que la aplicación
 * nunca abra vacía. Los IDs y avatares se resolvieron y verificaron contra YouTube el
 * 21 de septiembre de 2026 (cada uno tiene su feed con 15 videos recientes).
 * El usuario puede quitarlos cuando quiera.
 */
export const CANALES_SUGERIDOS: readonly Omit<Canal, "agregadoEn" | "sugerido">[] = [
  {
    "id": "UCbdSYaPD-lr1kW27UJuk8Pw",
    "nombre": "QuantumFracture",
    "avatar": "https://yt3.googleusercontent.com/ytc/AIdro_lJpHTSZBbl8uWZMuctVo5UG_Xj7H_haXqIZL2yDsmFkUY=s96-c-k-c0x00ffffff-no-rj",
    "tipo": "canal"
  },
  {
    "id": "UCH-Z8ya93m7_RD02WsCSZYA",
    "nombre": "Derivando",
    "avatar": "https://yt3.googleusercontent.com/7CCM84pByNC1Y4xSKvbmZlk9DcBF1Bjiw3Bww0_Qmxg1G1CZfmmwKfENYh4n0pUUyVnI49o6=s96-c-k-c0x00ffffff-no-rj",
    "tipo": "canal"
  },
  {
    "id": "UCP15FVAA2UL-QOcGhy7-ezA",
    "nombre": "EDteam",
    "avatar": "https://yt3.googleusercontent.com/gVPEp1RFXTNqaImY4yOnIjamU1AFDGNEpI1B7g_D4PBX10esTrtQpqejAaj0sNx_hl7lugPEYA=s96-c-k-c0x00ffffff-no-rj",
    "tipo": "canal"
  },
  {
    "id": "UC52hytXteCKmuOzMViTK8_w",
    "nombre": "CdeCiencia",
    "avatar": "https://yt3.googleusercontent.com/ytc/AIdro_l9rmItabl-zw-33MhJFtsZmmVcHKkVBf3cyEI304cTYO8=s96-c-k-c0x00ffffff-no-rj",
    "tipo": "canal"
  }
];
