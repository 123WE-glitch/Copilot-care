const fs = require('fs');
const path = require('path');

const REQUIRED_INSTRUCTIONS = [
  'CONTRIBUTING.md',
  'README.md',
  'docs/architecture.md',
  'docs/process/opencode-operation-guide.md',
  'docs/process/development-workflow.md',
  'docs/process/opencode-command-mapping.md',
  '.opencode/rules/*.md',
];

const MUTATING_TOKENS = [
  'edit',
  'write',
  'bash',
  'task',
  'external_directory',
  'todowrite',
];

function isMutating(value) {
  const text = String(value || '').toLowerCase();
  return MUTATING_TOKENS.some((token) => text.includes(token));
}

function containsMedicalBoundaryViolation(text) {
  return /(prescrib|prescription|diagnose|diagnosis)/i.test(text);
}

function resolveAgentName(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return '';
  }

  const candidates = [
    metadata.agent,
    metadata.agentID,
    metadata.agentId,
    metadata.requester,
    metadata.role,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  return '';
}

function instructionExists(root, instruction) {
  if (instruction === '.opencode/rules/*.md') {
    const rulesDir = path.join(root, '.opencode', 'rules');
    if (!fs.existsSync(rulesDir)) {
      return false;
    }
    return fs.readdirSync(rulesDir).some((entry) => entry.endsWith('.md'));
  }

  return fs.existsSync(path.join(root, instruction));
}

function applyModelOverrides(config) {
  const mapping = [
    ['plan', 'OPENCODE_MODEL_PLAN'],
    ['build', 'OPENCODE_MODEL_BUILD'],
    ['reviewer', 'OPENCODE_MODEL_REVIEW'],
  ];

  config.agent = config.agent || {};

  for (const [agentName, envName] of mapping) {
    const model = process.env[envName];
    if (!model) {
      continue;
    }
    config.agent[agentName] = config.agent[agentName] || {};
    config.agent[agentName].model = model;
  }
}

const superpowerPlugin = async (input) => {
  const root = input.worktree || input.directory || process.cwd();

  return {
    async config(config) {
      config.default_agent = 'build';
      applyModelOverrides(config);

      const instructions = Array.isArray(config.instructions)
        ? [...config.instructions]
        : [];

      for (const required of REQUIRED_INSTRUCTIONS) {
        if (!instructions.includes(required)) {
          instructions.push(required);
        }
      }
      config.instructions = instructions;

      const missing = instructions.filter(
        (instruction) => !instructionExists(root, instruction),
      );
      if (missing.length > 0) {
        throw new Error(
          `[superpower] missing instruction target(s): ${missing.join(', ')}`,
        );
      }
    },

    async 'permission.ask'(inputPermission, output) {
      const permissionType = String(
        inputPermission.type || inputPermission.permission || '',
      ).toLowerCase();
      const metadata =
        inputPermission && typeof inputPermission.metadata === 'object'
          ? inputPermission.metadata
          : {};
      const agent = resolveAgentName(metadata);

      const contextText = JSON.stringify({
        permissionType,
        pattern: inputPermission.pattern,
        patterns: inputPermission.patterns,
        metadata,
      });

      const isReviewer = agent.includes('reviewer');
      const isPlanner = agent === 'plan' || agent.includes('planner');

      if (isReviewer && isMutating(permissionType)) {
        output.status = 'deny';
        return;
      }

      if (isPlanner && /edit|write|bash/.test(permissionType)) {
        output.status = 'deny';
        return;
      }

      if (
        permissionType.includes('bash') &&
        containsMedicalBoundaryViolation(contextText)
      ) {
        output.status = 'deny';
        return;
      }

      if (isMutating(permissionType)) {
        output.status = 'ask';
      }
    },

    async 'tool.execute.before'(inputTool, output) {
      if (
        output.args &&
        typeof output.args === 'object' &&
        !Array.isArray(output.args)
      ) {
        output.args.__superpower = {
          gate: 'active',
          time: new Date().toISOString(),
          tool: inputTool.tool,
        };
      }
    },

    async 'tool.execute.after'(inputTool, output) {
      const existing =
        output.metadata && typeof output.metadata === 'object'
          ? output.metadata
          : {};
      output.metadata = {
        ...existing,
        superpower: {
          gate: 'active',
          tool: inputTool.tool,
          time: new Date().toISOString(),
        },
      };

      if (isMutating(inputTool.tool)) {
        output.title = `[Superpower Gate] ${output.title || inputTool.tool}`;
      }
    },
  };
};

module.exports = superpowerPlugin;
module.exports.default = superpowerPlugin;
