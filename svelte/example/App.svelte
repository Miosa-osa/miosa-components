<script lang="ts">
  import {
    MiosaFileTree,
    MiosaPreview,
    MiosaShareButton,
    MiosaTerminal,
    MiosaUsage,
  } from "../src/index";

  const SANDBOX_ID = "sb-example";
  const API_KEY = "mk_live_example";
</script>

<main style="display: grid; gap: 24px; padding: 24px; font-family: system-ui">
  <h1>@miosa/svelte — example</h1>

  <section>
    <h2>MiosaPreview</h2>
    <div style="height: 400px">
      <MiosaPreview
        sandboxId={SANDBOX_ID}
        apiKey={API_KEY}
        theme="dark"
        on:error={(e) => console.error(e.detail)}
      />
    </div>
  </section>

  <section>
    <h2>MiosaTerminal</h2>
    <div style="height: 300px">
      <MiosaTerminal
        sandboxId={SANDBOX_ID}
        apiKey={API_KEY}
        theme="dark"
        on:resize={(e) => console.log(e.detail.cols, e.detail.rows)}
        on:error={(e) => console.error(e.detail)}
      />
    </div>
  </section>

  <section>
    <h2>MiosaFileTree</h2>
    <div style="height: 300px">
      <MiosaFileTree
        sandboxId={SANDBOX_ID}
        apiKey={API_KEY}
        showHidden={false}
        defaultExpanded={true}
        on:select={(e) => console.log("selected", e.detail)}
        on:change={(e) => console.log("changed", e.detail)}
      />
    </div>
  </section>

  <section>
    <h2>MiosaUsage</h2>
    <MiosaUsage
      externalUserId="user-123"
      apiKey={API_KEY}
      period="current"
      theme="light"
    />
  </section>

  <section>
    <h2>MiosaShareButton</h2>
    <MiosaShareButton
      sandboxId={SANDBOX_ID}
      apiKey={API_KEY}
      on:share={(e) => console.log("shared", e.detail)}
    />
  </section>
</main>
