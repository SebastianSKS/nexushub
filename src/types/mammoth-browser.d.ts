declare module "mammoth/mammoth.browser" {
  export interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: unknown): Promise<ConvertResult>;
  const mammoth: { convertToHtml: typeof convertToHtml };
  export default mammoth;
}
