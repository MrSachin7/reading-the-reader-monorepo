// Phase 2 smoke test for the module-provider framework.
//
// Validates that /ws/module-provider:
//   1. Rejects hellos for unregistered modules (unknown-module)
//   2. Rejects bad auth tokens (auth-failed)
//   3. Rejects unsupported framework protocol versions (protocol-mismatch)
//   4. Rejects hellos with no modules (invalid-payload)
//
// Run: node handshake-smoke-test.js
// Requires Node 22+ (built-in WebSocket).

const WS_URL = process.env.WS_URL || "ws://localhost:5190/ws/module-provider";
const SHARED_SECRET = process.env.SHARED_SECRET || "change-me-local-module-provider-secret";
const FRAMEWORK_VERSION = "module-provider.v1";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openSocket() {
  const socket = new WebSocket(WS_URL);
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve(socket);
    socket.onerror = (err) => reject(err);
  });
}

function nextEnvelope(socket) {
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      try {
        resolve(JSON.parse(event.data));
      } catch (err) {
        reject(err);
      }
    };
    const onClose = () => {
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      resolve(null);
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
  });
}

function send(socket, type, payload, extra = {}) {
  socket.send(
    JSON.stringify({
      type,
      protocolVersion: FRAMEWORK_VERSION,
      providerId: extra.providerId ?? null,
      sessionId: extra.sessionId ?? null,
      correlationId: extra.correlationId ?? null,
      sentAtUnixMs: Date.now(),
      payload,
    }),
  );
}

async function scenario(label, build) {
  console.log(`\n=== ${label} ===`);
  let socket;
  try {
    socket = await openSocket();
  } catch (err) {
    console.error(`  connect failed: ${err?.message || err}`);
    return { label, ok: false };
  }

  let received;
  try {
    const recvPromise = nextEnvelope(socket);
    build(socket);
    received = await Promise.race([recvPromise, delay(3000).then(() => "timeout")]);
  } finally {
    try {
      socket.close();
    } catch {
      // ignore
    }
  }

  if (received === "timeout") {
    console.error("  no response within 3s");
    return { label, ok: false };
  }

  if (received === null) {
    console.error("  connection closed without sending an envelope");
    return { label, ok: false };
  }

  console.log(`  type=${received.type}`);
  if (received.payload) {
    console.log(`  payload=${JSON.stringify(received.payload)}`);
  }
  return { label, ok: true, envelope: received };
}

async function main() {
  console.log(`Module-provider smoke test against ${WS_URL}`);

  const results = [];

  results.push(
    await scenario("unknown module", (socket) => {
      send(
        socket,
        "moduleProviderHello",
        {
          providerId: "smoke-test-1",
          displayName: "Smoke Test",
          protocolVersion: FRAMEWORK_VERSION,
          authToken: SHARED_SECRET,
          modules: [
            {
              moduleId: "module-that-does-not-exist",
              protocolVersion: "v1",
              capabilities: null,
            },
          ],
        },
        { providerId: "smoke-test-1" },
      );
    }),
  );

  results.push(
    await scenario("bad auth", (socket) => {
      send(
        socket,
        "moduleProviderHello",
        {
          providerId: "smoke-test-2",
          displayName: "Smoke Test",
          protocolVersion: FRAMEWORK_VERSION,
          authToken: "definitely-not-the-secret",
          modules: [
            { moduleId: "facial-state", protocolVersion: "v1", capabilities: null },
          ],
        },
        { providerId: "smoke-test-2" },
      );
    }),
  );

  results.push(
    await scenario("bad framework version", (socket) => {
      send(
        socket,
        "moduleProviderHello",
        {
          providerId: "smoke-test-3",
          displayName: "Smoke Test",
          protocolVersion: "module-provider.v99",
          authToken: SHARED_SECRET,
          modules: [
            { moduleId: "facial-state", protocolVersion: "v1", capabilities: null },
          ],
        },
        { providerId: "smoke-test-3" },
      );
    }),
  );

  results.push(
    await scenario("no modules", (socket) => {
      send(
        socket,
        "moduleProviderHello",
        {
          providerId: "smoke-test-4",
          displayName: "Smoke Test",
          protocolVersion: FRAMEWORK_VERSION,
          authToken: SHARED_SECRET,
          modules: [],
        },
        { providerId: "smoke-test-4" },
      );
    }),
  );

  console.log("\n=== summary ===");
  for (const r of results) {
    console.log(`  ${r.ok ? "ok " : "FAIL"}  ${r.label}`);
  }

  const allOk = results.every((r) => r.ok && r.envelope?.type === "moduleProviderError");
  console.log(allOk ? "\nAll handshake scenarios responded with errors as expected." : "\nUnexpected responses — check backend logs.");
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
