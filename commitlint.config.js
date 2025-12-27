/**
 * Commitlint Configuration for Enterprise Standards
 *
 * Enforces conventional commit format:
 * <type>(<scope>): <subject>
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation
        'style',     // Formatting
        'refactor',  // Code refactoring
        'perf',      // Performance
        'test',      // Testing
        'build',     // Build system
        'ci',        // CI configuration
        'chore',     // Maintenance
        'revert',    // Revert commit
        'security',  // Security fixes
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],  // Allow long body lines for URLs
  },
};
