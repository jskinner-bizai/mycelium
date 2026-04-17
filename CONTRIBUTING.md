# Contributing to mycelium

Thank you for wanting to grow the organism.

## Quick start

```bash
git clone https://github.com/jskinner-bizai/mycelium
cd mycelium
bash scripts/dev-setup.sh
pnpm test
```

## The easiest contributions

1. **A recipe.** Pick a specific hardware + brand combination (e.g. "Raspberry Pi + Zigbee + Frigate"). Ship a folder at `docs/recipes/your-recipe-name/` with a `README.md`, a `topics.md`, any config scaffolding, and a diagram tied into the organism. Sanitize all secrets before PR.
2. **An adapter.** Write a new `Adapter` implementation for a transport `@mycelium/core` doesn't cover yet (NATS, Redis Streams, WebSocket, gRPC). Publish as a separate package (`@your-scope/mycelium-adapter-X`) and link from `docs/architecture.md`.
3. **A diagram.** Replace the static `organism.svg` with a better one. Extend `organism.html`. Add a new diagram that tells a new story.
4. **A philosophy PR.** If you read `docs/philosophy.md` and disagree, open an issue. If you read it and have a better way to say something, open a PR.

## Code standards

- TypeScript strict, no `any` unless justified in a comment.
- One responsibility per file. Files over 200 lines need a reason.
- TDD for anything in `packages/`. Test goes first.
- Small commits, conventional messages (`feat:`, `fix:`, `docs:`, `chore:`).

## Secret hygiene

`scripts/check-secrets.sh` runs on pre-commit and in CI. Don't commit real IPs, tokens, passwords, or personal email addresses. Use `${VAR}` placeholders and add the variable to `.env.example`.

## License

By contributing you agree your work is released under the repository's Apache-2.0 license.
