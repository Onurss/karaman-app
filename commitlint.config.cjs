/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'mobile',
        'admin',
        'restaurant',
        'shared-types',
        'api-client',
        'utils',
        'supabase',
        'docs',
        'deps',
        'ci',
        'config',
      ],
    ],
    'subject-case': [0],
  },
};
