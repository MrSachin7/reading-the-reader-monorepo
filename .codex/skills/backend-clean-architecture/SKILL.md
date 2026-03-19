---
name: backend-clean-architecture
description: Use when changing the Reading The Reader backend structure, adding features, refactoring services, or reviewing .NET code for boundary violations across WebApi, core, and infrastructure.
---

# Backend Clean Architecture

Preserve the existing layering and keep transport, application logic, domain logic, and infrastructure concerns separated.

## Read when relevant

- `../../../docs/backend/backend-architecture.md` for current realtime flow and component boundaries

## Current structure

- `../../../Backend/src/ReadingTheReader.WebApi` contains FastEndpoints entrypoints, HTTP contracts, WebSocket wiring, and startup composition.
- `../../../Backend/src/core/ReadingTheReader.core.Domain` contains entities and core abstractions.
- `../../../Backend/src/core/ReadingTheReader.core.Application` contains session orchestration, application services, and infrastructure contracts.
- `../../../Backend/src/infrastructure/*` contains persistence, realtime transport, and Tobii integrations.

## Boundary rules

- Keep domain types free of HTTP, FastEndpoints, filesystem, and Tobii SDK details.
- Keep endpoints thin: validate input, call application services, map output.
- Put session rules, calibration behavior, and reading-material rules in application or domain code.
- Put filesystem, WebSocket, and device integration code in infrastructure.
- Keep application contracts explicit; do not leak infrastructure types upward.

## Change workflow

1. Start from the use case and identify whether it belongs in domain, application, or infrastructure.
2. Add or update domain types only if the core model changes.
3. Add application contracts and services before endpoint code.
4. Add infrastructure implementations only for external effects or persistence.
5. Expose the use case through a thin endpoint or WebSocket handler.

## Guardrails

- Avoid putting orchestration logic directly in `Program.cs` or endpoint classes.
- Avoid endpoint responses that are just serialized internal state objects without intent.
- Keep naming aligned across request DTOs, commands, services, and response contracts.
- Review project references and namespaces when moving code across layers.

## Validation

- Run `dotnet build Backend/reading-the-reader-backend.sln`.
- Run the narrowest `dotnet test` target that covers the touched behavior.
