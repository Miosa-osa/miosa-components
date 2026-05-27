import { Miosa } from "@miosa/sdk";

export function createMiosaClient(apiKey: string) {
  const client = new Miosa({ apiKey });

  async function mintPreviewToken(
    sandboxId: string,
    expiresIn = 3600,
  ): Promise<{ token: string; url: string }> {
    const sandbox = await client.sandboxes.get(sandboxId);
    return (sandbox as any).previewToken(expiresIn);
  }

  return { client, mintPreviewToken };
}
