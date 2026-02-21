# Contributing to nself Admin

🎉 Thank you for your interest in contributing to nself Admin! We're excited to work with you.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to community@nself.org.

## Getting Started

### Ways to Contribute

- 🐛 **Report Bugs**: Found a bug? Let us know!
- 💡 **Suggest Features**: Have an idea? We'd love to hear it!
- 📝 **Improve Documentation**: Help make our docs better
- 🔧 **Fix Issues**: Browse our [issues](https://github.com/nself-org/admin/issues)
- 🌐 **Translate**: Help localize nself Admin
- ⭐ **Spread the Word**: Star the repo, share with others

### First Time Contributing?

Look for issues labeled:

- `good first issue` - Perfect for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Great for non-code contributions

## Development Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **Docker**: 24.x or higher
- **Git**: Latest version

### Local Development

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/nself-admin.git
cd nself-admin

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3021
```

### Docker Development

```bash
# Build local image
docker build -t nself-admin:dev .

# Run with development setup
docker run -d \
  --name nself-admin-dev \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself-admin:dev
```

### Project Structure

```
nself-admin/
├── src/app/                 # Next.js app directory
│   ├── (auth)/             # Authentication pages
│   ├── (dashboard)/        # Main application
│   ├── (wizard)/           # Setup wizard
│   ├── api/                # API routes
│   └── components/         # Shared components
├── docs/                   # Documentation
├── public/                 # Static assets
├── .github/               # GitHub workflows
└── docker/               # Docker configurations
```

## Making Changes

### Branch Naming

Use descriptive branch names:

```bash
# Feature branches
feature/add-user-management
feature/improve-dashboard-ui

# Bug fix branches
fix/login-redirect-issue
fix/memory-leak-in-metrics

# Documentation branches
docs/update-api-reference
docs/add-deployment-guide
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
type(scope): description

# Examples
feat(auth): add OAuth2 support
fix(dashboard): resolve memory leak in metrics
docs(api): update authentication examples
style(ui): improve button spacing
refactor(db): simplify user queries
test(api): add integration tests
chore(deps): update dependencies
```

### Development Workflow

1. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   # Run tests
   npm test

   # Run linting
   npm run lint

   # Type checking
   npm run type-check

   # Build check
   npm run build
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

### Before Submitting

- [ ] Code follows our style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)

### PR Template

Your PR will auto-populate with our template. Please:

1. **Fill out all sections**
2. **Link related issues** (e.g., "Closes #123")
3. **Add screenshots** for UI changes
4. **Describe testing** performed
5. **Note breaking changes**

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in review environment
4. **Approval** from at least one maintainer
5. **Merge** (squash and merge preferred)

## Issue Guidelines

### Bug Reports

Use our bug report template and include:

- **Environment details** (OS, Docker version, etc.)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots/logs** if applicable
- **Possible solutions** you've tried

### Feature Requests

Use our feature request template and include:

- **Problem statement** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What other options did you consider?
- **Additional context** - Screenshots, mockups, etc.

### Questions

For questions and discussions:

1. **Check existing issues** and documentation first
2. **Use GitHub Discussions** for general questions
3. **Create an issue** only for specific technical problems

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Define interfaces** for complex objects
- **Use strict mode** settings
- **Avoid `any`** types when possible

### React/Next.js

- **Use functional components** and hooks
- **Follow React best practices**
- **Use proper prop types**
- **Implement error boundaries**

### Styling

- **Use Tailwind CSS** for styling
- **Follow component-based architecture**
- **Use CSS modules** for complex styles
- **Ensure responsive design**

### Code Quality

```bash
# Linting
npm run lint      # ESLint + Prettier
npm run lint:fix  # Auto-fix issues

# Type checking
npm run type-check

# Formatting
npm run format
```

### File Organization

- **Group related files** together
- **Use index files** for clean imports
- **Follow naming conventions**
  - Components: `PascalCase`
  - Files: `kebab-case`
  - Functions: `camelCase`

## Testing

### Test Types

- **Unit Tests**: Individual components/functions
- **Integration Tests**: API endpoints and workflows
- **E2E Tests**: Full user journeys

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Writing Tests

- **Test behavior, not implementation**
- **Use descriptive test names**
- **Follow AAA pattern** (Arrange, Act, Assert)
- **Mock external dependencies**
- **Aim for good coverage** (80%+ goal)

## Documentation

### Types of Documentation

- **Code comments** - Complex logic explanation
- **README updates** - Installation and basic usage
- **API documentation** - Endpoint specifications
- **User guides** - Feature walkthroughs
- **Developer docs** - Architecture and patterns

### Documentation Standards

- **Use clear, concise language**
- **Include code examples**
- **Add screenshots for UI features**
- **Update relevant sections**
- **Follow existing formatting**

### Wiki Contributions

Our `/docs` folder syncs to the GitHub Wiki:

1. **Update files in `/docs`**
2. **Follow existing structure**
3. **Use proper markdown formatting**
4. **Test links and references**
5. **Wiki updates automatically** via GitHub Actions

## Community

### Getting Help

- 📚 **[Documentation](https://github.com/nself-org/admin/wiki)**
- 💬 **[GitHub Discussions](https://github.com/nself-org/admin/discussions)**
- 🐛 **[Issues](https://github.com/nself-org/admin/issues)**
- 📧 **[Email](mailto:community@nself.org)**

### Stay Connected

- ⭐ **[Star the repository](https://github.com/nself-org/admin)**
- 🐦 **[Follow on Twitter](https://twitter.com/nselforg)**
- 📺 **[YouTube Channel](https://youtube.com/@nselforg)**
- 📧 **[Newsletter](https://nself.org/newsletter)**

## Recognition

Contributors are recognized in:

- **README contributors section**
- **Release notes**
- **Annual contributor report**
- **Special badges** for significant contributions

## Questions?

Don't hesitate to ask! We're here to help:

- Open an issue with the `question` label
- Start a discussion in GitHub Discussions
- Email us at community@nself.org

---

**Thank you for contributing to nself Admin!** 🚀

Every contribution, no matter how small, makes a difference. We appreciate your time and effort in making nself Admin better for everyone.
