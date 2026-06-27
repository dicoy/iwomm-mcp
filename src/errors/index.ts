export class DevEnvError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class DockerNotAvailableError extends DevEnvError {
  constructor() {
    super("Docker daemon is not available or not running");
  }
}

export class LogFileNotFoundError extends DevEnvError {
  constructor(path: string) {
    super(`Log file not found: ${path}`);
  }
}

export class ServiceLogsNotConfiguredError extends DevEnvError {
  constructor(service: string) {
    super(`No log path configured for service: ${service}`);
  }
}

export class GitNotARepositoryError extends DevEnvError {
  constructor(path: string) {
    super(`Not a git repository: ${path}`);
  }
}

export class EnvFileNotFoundError extends DevEnvError {
  constructor(path: string) {
    super(`Env file not found: ${path}`);
  }
}

export class ConfigNotFoundError extends DevEnvError {
  constructor(path: string) {
    super(`No .mcp-context.yml found at: ${path}`);
  }
}

export class ConfigParseError extends DevEnvError {
  constructor(path: string, detail: string) {
    super(`Failed to parse config at ${path}: ${detail}`);
  }
}

export class ProcessProviderError extends DevEnvError {}

export class PortProviderError extends DevEnvError {}
