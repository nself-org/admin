# Contributing to nself-admin

First off, thank you for considering contributing to nself-admin! It's people like you that make nself-admin such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and expected**
- **Include screenshots and animated GIFs if possible**
- **Include your environment details** (OS, Docker version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 20+
- Docker
- Git
- npm or yarn

### Local Development

```bash
# Clone your fork
git clone https://github.com/your-username/nself-admin.git
cd nself-admin

# Install dependencies
npm install

# Create .env.local for development
cp .env.example .env.local

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Check code coverage
npm run test:coverage
```

### Code Style

We use Prettier and ESLint to maintain code quality:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Project Structure

```
nself-admin/
├── src/
│   ├── app/          # Next.js app directory (pages & API)
│   ├── components/   # React components
│   ├── lib/         # Utility functions
│   ├── services/    # Service layer (API clients, etc.)
│   └── stores/      # State management (Zustand)
├── public/          # Static assets
├── docs/           # Documentation (synced to wiki)
├── scripts/        # Build and deployment scripts
└── tests/          # Test files
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all props and state
- Avoid `any` type - use `unknown` if type is truly unknown
- Export types separately from implementations

```typescript
// Good
export interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types and default values

```typescript
// Good component example
export function ServiceCard({ service, onRestart }: ServiceCardProps) {
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestart = async () => {
    setIsRestarting(true)
    await onRestart(service.id)
    setIsRestarting(false)
  }

  return (
    <Card>
      <CardHeader>{service.name}</CardHeader>
      <CardContent>
        <ServiceStatus status={service.status} />
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleRestart}
          disabled={isRestarting}
        >
          {isRestarting ? 'Restarting...' : 'Restart'}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### API Routes

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent response formats
- Include proper error handling
- Validate input data

```typescript
// Good API route example
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    if (!body.containerId) {
      return NextResponse.json(
        { success: false, error: 'Container ID required' },
        { status: 400 },
      )
    }

    // Perform action
    const result = await restartContainer(body.containerId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }
}
```

### State Management

- Use Zustand for global state
- Keep stores focused and small
- Use proper TypeScript types
- Include selectors for performance

```typescript
// Good store example
interface DockerStore {
  containers: Container[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchContainers: () => Promise<void>
  restartContainer: (id: string) => Promise<void>

  // Selectors
  getContainerById: (id: string) => Container | undefined
}
```

## Commit Guidelines

We follow conventional commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding or updating tests
- `chore:` Changes to build process or auxiliary tools

Examples:

```bash
git commit -m "feat: add container restart functionality"
git commit -m "fix: resolve memory leak in polling service"
git commit -m "docs: update API documentation"
```

## Testing Guidelines

### Unit Tests

- Write tests for all utility functions
- Test component rendering and interactions
- Mock external dependencies
- Aim for >80% code coverage

```typescript
// Example test
describe('ServiceCard', () => {
  it('should render service name', () => {
    const service = { id: '1', name: 'nginx', status: 'running' }
    render(<ServiceCard service={service} />)
    expect(screen.getByText('nginx')).toBeInTheDocument()
  })

  it('should call onRestart when button clicked', async () => {
    const onRestart = jest.fn()
    const service = { id: '1', name: 'nginx', status: 'running' }

    render(<ServiceCard service={service} onRestart={onRestart} />)

    await userEvent.click(screen.getByRole('button', { name: /restart/i }))

    expect(onRestart).toHaveBeenCalledWith('1')
  })
})
```

### Integration Tests

- Test API routes with real database connections
- Test WebSocket connections
- Test Docker API interactions
- Use test containers when possible

## Documentation

- Update docs for any user-facing changes
- Include JSDoc comments for complex functions
- Update API documentation for endpoint changes
- Include examples in documentation

````typescript
/**
 * Restarts a Docker container
 * @param containerId - The ID of the container to restart
 * @returns Promise resolving to the container status
 * @throws Error if container not found or restart fails
 * @example
 * ```typescript
 * const status = await restartContainer('abc123')
 * console.log(status) // { running: true, uptime: 0 }
 * ```
 */
export async function restartContainer(
  containerId: string,
): Promise<ContainerStatus> {
  // Implementation
}
````

## Release Process

1. Update VERSION file
2. Update CHANGELOG.md
3. Run `npm version <patch|minor|major>`
4. Create pull request
5. After merge, tag will trigger automatic release

## Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/nself)
- **GitHub Discussions**: Ask questions in [Discussions](https://github.com/nself-org/admin/discussions)
- **Issue Tracker**: Report bugs in [Issues](https://github.com/nself-org/admin/issues)

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- GitHub contributors page
- Release notes for significant contributions

Thank you for contributing to nself-admin! 🎉
