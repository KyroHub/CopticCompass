export type EnvSource = Record<string, string | undefined>;

export function readNumberEnv(
  env: EnvSource,
  key: string,
  defaultValue: number,
) {
  return Number(env[key] ?? String(defaultValue));
}

export function readBooleanEnv(
  env: EnvSource,
  key: string,
  defaultValue: boolean,
) {
  const value = env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return defaultValue ? value !== "false" : value === "true";
}

export function hasEnvValue(env: EnvSource, key: string) {
  return Boolean(env[key]);
}
