import { Miosa } from "@miosa/sdk";
import { ref, shallowRef } from "vue";

export function useMiosaClient(apiKey: string) {
  const client = shallowRef<Miosa>(new Miosa({ apiKey }));
  const error = ref<Error | null>(null);

  async function mintPreviewToken(
    sandboxId: string,
    expiresIn = 3600,
  ): Promise<{ token: string; url: string }> {
    const sandbox = await client.value.sandboxes.get(sandboxId);
    return (sandbox as any).previewToken(expiresIn);
  }

  return { client, error, mintPreviewToken };
}
