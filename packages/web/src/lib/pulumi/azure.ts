import type { DeployInput, AzureCredentials } from "./types";

function makeAzureProgram(input: DeployInput) {
  return async (): Promise<Record<string, unknown>> => {
    const azure = await import("@pulumi/azure-native");
    const docker = await import("@pulumi/docker");
    const pulumi = await import("@pulumi/pulumi");

    const slug = input.projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    const azConfig = new pulumi.Config("azure-native");
    const location = azConfig.get("location") ?? "eastus";

    // Resource group
    const rg = new azure.resources.ResourceGroup(`${slug}-rg`, {
      resourceGroupName: `rg-${slug}`,
      location,
    });

    // Azure Container Registry
    const registry = new azure.containerregistry.Registry(`${slug}-acr`, {
      resourceGroupName: rg.name,
      registryName: slug.replace(/-/g, ""),
      location: rg.location,
      sku: { name: "Basic" },
      adminUserEnabled: true,
    });

    const creds = azure.containerregistry.listRegistryCredentialsOutput({
      resourceGroupName: rg.name,
      registryName: registry.name,
    });

    // Build and push image
    const image = new docker.Image(`${slug}-image`, {
      imageName: pulumi.interpolate`${registry.loginServer}/${slug}:latest`,
      build: {
        context: input.projectPath,
        platform: "linux/amd64",
      },
      registry: {
        server: registry.loginServer,
        username: creds.apply(c => c.username ?? ""),
        password: creds.apply(c => c.passwords?.[0]?.value ?? ""),
      },
    });

    // Container Apps Environment
    const env = new azure.app.ManagedEnvironment(`${slug}-env`, {
      resourceGroupName: rg.name,
      environmentName: `env-${slug}`,
      location: rg.location,
    });

    // Container App
    const envVarArr = Object.entries(input.appEnvVars).map(([name, value]) => ({ name, value }));
    const app = new azure.app.ContainerApp(`${slug}-app`, {
      resourceGroupName: rg.name,
      containerAppName: slug,
      location: rg.location,
      managedEnvironmentId: env.id,
      configuration: {
        ingress: {
          external: true,
          targetPort: input.frontendPort,
          transport: "Auto",
        },
        registries: [{
          server: registry.loginServer,
          username: creds.apply(c => c.username ?? ""),
          passwordSecretRef: "acr-pass",
        }],
        secrets: [{
          name: "acr-pass",
          value: creds.apply(c => c.passwords?.[0]?.value ?? ""),
        }],
      },
      template: {
        containers: [{
          name: slug,
          image: image.imageName,
          resources: { cpu: 0.5, memory: "1Gi" },
          env: envVarArr,
        }],
        scale: { minReplicas: 1, maxReplicas: 3 },
      },
    }, { dependsOn: [image] });

    return {
      url: app.configuration.apply(c => `https://${c?.ingress?.fqdn ?? "pending"}`),
    };
  };
}

export async function deployAzure(
  input: DeployInput,
  creds: AzureCredentials,
  onLog: (msg: string) => void
): Promise<string> {
  const { LocalWorkspace } = await import("@pulumi/pulumi/automation");

  const stack = await LocalWorkspace.createOrSelectStack({
    stackName: input.stackName,
    projectName: "appwithai",
    program: makeAzureProgram(input),
  }, {
    envVars: {
      PULUMI_BACKEND_URL: `file://${input.stateDir}`,
      PULUMI_CONFIG_PASSPHRASE: process.env.PULUMI_CONFIG_PASSPHRASE ?? "",
      ARM_CLIENT_ID: creds.clientId,
      ARM_CLIENT_SECRET: creds.clientSecret,
      ARM_TENANT_ID: creds.tenantId,
      ARM_SUBSCRIPTION_ID: creds.subscriptionId,
    },
  });

  await stack.setConfig("azure-native:clientId", { value: creds.clientId, secret: true });
  await stack.setConfig("azure-native:clientSecret", { value: creds.clientSecret, secret: true });
  await stack.setConfig("azure-native:tenantId", { value: creds.tenantId });
  await stack.setConfig("azure-native:subscriptionId", { value: creds.subscriptionId });
  await stack.setConfig("azure-native:location", { value: creds.location });

  onLog("Installing Azure provider plugin…");
  await stack.workspace.installPlugin("azure-native", "v2.0.0");

  const up = await stack.up({ onOutput: (o) => onLog(o.trimEnd()) });
  const url = up.outputs["url"]?.value as string;
  if (!url) throw new Error("Deployment succeeded but no URL was returned.");
  return url;
}
