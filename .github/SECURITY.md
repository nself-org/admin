# Security Policy

## Supported Versions

| Version     | Supported |
| ----------- | --------- |
| 1.0.x (LTS) | :white_check_mark: |
| < 1.0.0     | :x:        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@nself.org** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

We will acknowledge receipt within 48 hours and provide a status update within 5 business days. Critical vulnerabilities are patched on a priority basis.

For richer reports, please also include where helpful:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- How an attacker might exploit the issue

## Scope

In scope: nself CLI, plugins, backend services, authentication, API endpoints, web apps

Out of scope: Third-party dependencies (report upstream), our hosted infrastructure (contact support@nself.org)

## Disclosure Policy

We follow coordinated disclosure. Please give us 90 days to patch before public disclosure.

### Disclosure Process

1. We'll work with you to understand and validate the issue
2. We'll develop a fix and create a timeline for release
3. We'll coordinate public disclosure after the fix is available
4. We'll credit you in our security advisory (unless you prefer to remain anonymous)

## Security Best Practices

### For Users

- **Use strong passwords**: Minimum 12 characters with mixed case, numbers, and symbols
- **Enable HTTPS**: Always use SSL/TLS in production environments
- **Keep updated**: Use the latest version of nself Admin
- **Secure your environment**: Follow our [Production Deployment Guide](wiki/Production-Deployment.md)
- **Regular backups**: Maintain secure, tested backups
- **Network security**: Use firewalls and VPNs where appropriate

### For Developers

- **Code review**: All code changes require review
- **Dependency scanning**: We use automated tools to scan dependencies
- **Static analysis**: Code is analyzed for security issues
- **Container scanning**: Docker images are scanned for vulnerabilities
- **Secrets management**: Never commit secrets to the repository

## Security Features

### Current Security Measures

- **Authentication**: bcrypt password hashing with cost factor 10
- **Session Management**: Secure httpOnly cookies with SameSite=strict
- **Security Headers**: Automatic X-Frame-Options, X-XSS-Protection, etc.
- **Container Security**: Non-root user, read-only filesystem options
- **API Protection**: Authentication required for all sensitive endpoints

### Planned Security Enhancements

- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Audit logging
- Rate limiting
- CSRF token validation
- OAuth2 integration

## Security Advisories

Security advisories will be published on:

- [GitHub Security Advisories](https://github.com/nself-org/admin/security/advisories)
- [Release Notes](https://github.com/nself-org/admin/releases)
- [Security Mailing List](https://nself.org/security-updates) (optional subscription)

## Contact

For security-related questions or concerns:

- **Email**: security@nself.org
- **GPG Key**: Available on request

## Attribution

We appreciate security researchers and users who help keep nself Admin secure. Contributors to security improvements may be recognized in:

- Release notes
- Security advisories
- Hall of Fame (with permission)

Thank you for helping keep nself Admin and our users safe!
