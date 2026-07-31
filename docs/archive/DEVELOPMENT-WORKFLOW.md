# Development Workflow Guide

## Overview
This document outlines the task-driven development workflow for the Parenta Next.js application. Follow these guidelines to ensure consistent, high-quality development practices.

## Task-Driven Development Process

### 1. Task Creation
- Break down features into small, manageable tasks (1-4 hours each)
- Use the task template in `tasks/templates/task-template.md`
- Assign unique task numbers (TASK-001, TASK-002, etc.)
- Place new tasks in `tasks/backlog/`

### 2. Task Prioritization
- 🔴 **High**: Critical features, blocking issues, security fixes
- 🟡 **Medium**: Important features, moderate urgency
- 🟢 **Low**: Nice-to-have features, minor improvements

### 3. Development Workflow

#### Starting a Task
1. Move task from `tasks/backlog/` to `tasks/in-progress/`
2. Update task status to "In Progress"
3. Create a feature branch: `git checkout -b feature/task-001-brief-description`
4. Update task with start date and assign to yourself

#### During Development
1. Follow the cursor rules in `.cursorrules`
2. Write code following TypeScript and Next.js best practices
3. Update task progress regularly
4. Commit frequently with conventional commit messages

#### Code Review Process
1. Complete all acceptance criteria
2. Run tests and ensure they pass
3. Check for linting errors
4. Move task to `tasks/review/`
5. Create pull request with task link
6. Request code review from team member

#### Completing a Task
1. Address all review feedback
2. Merge pull request
3. Move task to `tasks/done/`
4. Update task status and completion date
5. Deploy changes if applicable

## Commit Message Format
Use conventional commits for consistent git history:

```
feat: add user authentication system
fix: resolve navigation menu overflow
refactor: improve button component performance
docs: update API documentation
test: add unit tests for utilities
chore: update dependencies
```

## Branch Naming Convention
- `feature/task-001-brief-description` - New features
- `bugfix/fix-navigation-issue` - Bug fixes
- `hotfix/critical-security-patch` - Critical fixes
- `refactor/improve-component-structure` - Code refactoring

## Code Review Checklist

### Functionality
- [ ] All acceptance criteria met
- [ ] Code implements requirements correctly
- [ ] Edge cases handled appropriately
- [ ] Error handling implemented

### Code Quality
- [ ] Follows TypeScript best practices
- [ ] Consistent with project conventions
- [ ] Proper component structure
- [ ] Appropriate abstractions

### Performance
- [ ] No unnecessary re-renders
- [ ] Proper use of React hooks
- [ ] Optimized bundle impact
- [ ] Efficient algorithms

### Security
- [ ] Input validation implemented
- [ ] No sensitive data exposure
- [ ] Secure API endpoints
- [ ] Authentication/authorization correct

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests where needed
- [ ] Manual testing completed
- [ ] No breaking changes

### Documentation
- [ ] Code comments for complex logic
- [ ] README updated if needed
- [ ] API documentation current
- [ ] Task documentation complete

## Development Environment Setup

### Required Tools
- Node.js 18+
- npm or yarn
- Git
- VS Code with recommended extensions
- Chrome/Firefox developer tools

### VS Code Extensions
- TypeScript and JavaScript
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- Auto Rename Tag
- Bracket Pair Colorizer

### Environment Variables
Create `.env.local` for local development:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret_key
```

## Project Structure Guidelines

### Directory Organization
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route groups
│   ├── api/               # API routes
│   └── [feature]/         # Dynamic routes
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── features/         # Feature-specific components
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
├── styles/               # Global styles
└── utils/                # Helper functions
```

### File Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Types: `camelCase.types.ts`
- Pages: `page.tsx`, `layout.tsx`

## Testing Strategy

### Unit Tests
- Test utility functions
- Test custom hooks
- Test component logic

### Integration Tests
- Test component interactions
- Test API endpoints
- Test user workflows

### E2E Tests
- Test critical user journeys
- Test cross-browser compatibility
- Test responsive design

## Deployment Process

### Development
- Automatic deployment on push to `main`
- Preview deployments for pull requests
- Environment-specific configurations

### Staging
- Manual deployment trigger
- Full regression testing
- Performance monitoring

### Production
- Approved deployment only
- Rollback procedures
- Monitoring and alerting

## Troubleshooting

### Common Issues
1. **TypeScript errors**: Check type definitions and imports
2. **Build failures**: Verify all dependencies are installed
3. **Styling issues**: Check Tailwind CSS configuration
4. **API errors**: Verify environment variables and endpoints

### Getting Help
- Check project documentation
- Review similar completed tasks
- Ask team members for guidance
- Use AI assistance following cursor rules

## Continuous Improvement

### Regular Reviews
- Weekly task retrospectives
- Monthly workflow assessments
- Quarterly process improvements

### Metrics to Track
- Task completion time
- Code review feedback
- Bug frequency
- Feature delivery speed

---

**Last Updated**: 2024-01-15  
**Next Review**: 2024-02-15 