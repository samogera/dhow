# Contributing to Dhow OS

Thanks for helping build Dhow OS. This guide keeps the code consistent and safe.

## Workflow

1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Keep each pull request to one change, with a clear title ("Clients get invoice reminders").
3. Run `npm run typecheck && npm run lint` before pushing. CI runs both plus a production build.
4. Database changes: add a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_what_it_does.sql`. Never edit a migration that has already run.
5. A pull request needs one approving review before merging. `main` deploys to production.

## Conventions

- **Language.** All user-facing text is plain, short English. Sentences under 25 words. No jargon.
- **Server first.** Pages are server components; use client components only for interaction.
- **Writes.** Use server actions in `src/actions/`, validate input with Zod, and check permissions first (`staffOrNull`, `memberOrNull`).
- **Secrets.** Never commit keys or real account numbers. Add new variables to `.env.example` with empty values and a comment.
- **Errors.** Forms show friendly messages that name the field (`friendlyError`).
- **Design.** Use the tokens in `globals.css` (navy, green, mint, amber) and the shared components in `src/components/`.
- **Accessibility.** Every control has a label; text meets WCAG AA contrast.

## Commit messages

Imperative and specific: `Add weekly opportunities email`, not `updates`. Explain *why* in the body when it isn't obvious.
