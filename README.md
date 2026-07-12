# API Documentation & Contribution Guide

## API Documentation

This project uses Firebase Firestore as its backend. No custom REST APIs are deployed; all data access happens directly via the Firebase JS SDK from the client.

### Firebase Collections

- **`users`**: User profiles and permissions.
- **`messages`**: Public and private messages sent via the contact form.
- **`gallery_photos_production`**: Portfolio images.
- **`music_playlist`**: Track list for the music player.
- **`blog_posts_production`**: Articles and blog posts.
- **`site_content`**: Dynamic homepage content.
- **`analytics_daily`** & **`analytics_logs`**: Traffic tracking.

## Contribution Guide

1. **Branching**: Create a new branch for each feature (`feature/your-feature`) or bugfix (`fix/your-fix`).
2. **Commits**: Use conventional commits (e.g., `feat: add new gallery layout`, `fix: resolve mobile overflow issue`).
3. **Testing**: Run `npm run test` before submitting a Pull Request.
4. **Styling**: Adhere strictly to the `DESIGN.md` guidelines. Use Tailwind CSS utility classes.
5. **Code Quality**: Ensure TypeScript types are defined. No `any` types allowed unless strictly necessary.

### Automated Testing
Vitest is configured for unit testing components. Tests should be placed in `src/__tests__`.

### CI/CD
A GitHub Actions workflow is provided in `.github/workflows/deploy.yml` to automatically build, test, and deploy to Vercel upon pushing to the `main` branch.
