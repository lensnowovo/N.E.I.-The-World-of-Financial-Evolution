# MCP Library and Connect Redesign

## Product split

- `/mcp-library` is the external intelligence source directory. It helps an investor decide which outside source can fill an evidence gap.
- `/connect` is the N.E.I. Agent access console. It creates independently revocable client credentials and verifies whether each client has actually called the current token.
- `/mcp` remains documentation and troubleshooting, not an onboarding funnel.

## Visual direction

Both pages retain N.E.I.'s parchment, serif typography, fine rules and animated research-map background. The MCP library adds an “intelligence radar” composition: compact source cards on the left and a changing evidence dossier on the right. The connection page adds an “Agent access console”: a restrained dark instrument panel nested inside the paper interface, with signal motion and clear connected / waiting / revoked states.

Motion is functional. Selection changes fade and slide the dossier, connection indicators pulse only while active, and all animation respects `prefers-reduced-motion`.

## Multi-token model

Each AI client gets a named bearer token. Tokens are stored as hashes, shown in plaintext only after creation, independently revoked, and limited to eight active credentials per user during beta. Existing single tokens remain valid and appear as a legacy credential until the user revokes them.

Each token records creation time, last successful authentication and the tools called through that credential. Connection status is therefore scoped to the current token rather than inferred from all historical MCP logs.

## Main flows

### Connect

1. Select Codex, Claude Code, Workbuddy or another Streamable HTTP client.
2. Name and create an independent token.
3. Copy the client setup instruction or JSON without displaying the full token repeatedly.
4. Run the supplied verification task.
5. Return to the page to see the credential become connected and inspect recent tools.
6. Revoke one client without interrupting the others.

### MCP library

1. Search by source, evidence type or PEVC use case.
2. Filter by category and connector type.
3. Select a compact connector card.
4. Review coverage, use cases, auth, pricing, maturity and safety in the dossier.
5. Copy the setup instruction only for MCP connectors; API entries are explicitly described as requiring development work.

## Error and safety behavior

- Token creation and copy failures are visible and never report false success.
- Revocation requires an inline second confirmation.
- Existing clients are not invalidated when creating another token.
- The raw token exists in browser memory only for the creation session and is not repeated in visible Prompt and JSON previews.
- External connector setup remains user-confirmed and N.E.I. never proxies external calls.

## Verification

- Prisma validation and generated client.
- Lint, TypeScript and production build.
- API tests for create, list, authenticate, log and revoke.
- Desktop and 390px mobile screenshots for both pages.
- Manual checks for keyboard focus, reduced motion, empty state, error state and legacy-token compatibility.
