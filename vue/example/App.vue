<script setup lang="ts">
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

<template>
  <main style="display: grid; gap: 24px; padding: 24px; font-family: system-ui">
    <h1>@miosa/vue — example</h1>

    <section>
      <h2>MiosaPreview</h2>
      <div style="height: 400px">
        <MiosaPreview
          :sandbox-id="SANDBOX_ID"
          :api-key="API_KEY"
          theme="dark"
          @error="(e) => console.error(e)"
        />
      </div>
    </section>

    <section>
      <h2>MiosaTerminal</h2>
      <div style="height: 300px">
        <MiosaTerminal
          :sandbox-id="SANDBOX_ID"
          :api-key="API_KEY"
          theme="dark"
          @resize="(cols, rows) => console.log(cols, rows)"
          @error="(e) => console.error(e)"
        />
      </div>
    </section>

    <section>
      <h2>MiosaFileTree</h2>
      <div style="height: 300px">
        <MiosaFileTree
          :sandbox-id="SANDBOX_ID"
          :api-key="API_KEY"
          :show-hidden="false"
          :default-expanded="true"
          @select="(p) => console.log('selected', p)"
          @change="(p, t) => console.log('changed', p, t)"
        />
      </div>
    </section>

    <section>
      <h2>MiosaUsage</h2>
      <MiosaUsage
        external-user-id="user-123"
        :api-key="API_KEY"
        period="current"
        theme="light"
      />
    </section>

    <section>
      <h2>MiosaShareButton</h2>
      <MiosaShareButton
        :sandbox-id="SANDBOX_ID"
        :api-key="API_KEY"
        @share="(url) => console.log('shared', url)"
      />
    </section>
  </main>
</template>
