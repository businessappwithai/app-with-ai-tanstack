import type { DeployInput, AWSCredentials } from "./types";

/** Pulumi inline program that deploys to AWS App Runner via ECR. */
function makeAWSProgram(input: DeployInput) {
  return async (): Promise<Record<string, unknown>> => {
    // Dynamic imports keep these packages out of the client bundle.
    const aws = await import("@pulumi/aws");
    const docker = await import("@pulumi/docker");
    const pulumi = await import("@pulumi/pulumi");

    const slug = input.projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    // Container registry
    const repo = new aws.ecr.Repository(`${slug}-repo`, {
      forceDelete: true,
      imageTagMutability: "MUTABLE",
    });

    const authToken = aws.ecr.getAuthorizationTokenOutput({ registryId: repo.registryId });

    const decodeUser = (token: string) => Buffer.from(token, "base64").toString().split(":")[0] ?? "";
    const decodePass = (token: string) => Buffer.from(token, "base64").toString().split(":")[1] ?? "";

    // Build and push image
    const image = new docker.Image(`${slug}-image`, {
      imageName: pulumi.interpolate`${repo.repositoryUrl}:latest`,
      build: {
        context: input.projectPath,
        platform: "linux/amd64",
      },
      registry: {
        server: repo.repositoryUrl,
        username: authToken.apply(t => decodeUser(t.authorizationToken)),
        password: authToken.apply(t => decodePass(t.authorizationToken)),
      },
    });

    // IAM role for App Runner ECR access
    const role = new aws.iam.Role(`${slug}-ecr-role`, {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: { Service: "build.apprunner.amazonaws.com" },
          Action: "sts:AssumeRole",
        }],
      }),
    });
    new aws.iam.RolePolicyAttachment(`${slug}-ecr-attach`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
    });

    // App Runner service
    const service = new aws.apprunner.Service(`${slug}-svc`, {
      serviceName: slug,
      sourceConfiguration: {
        autoDeploymentsEnabled: false,
        imageRepository: {
          imageIdentifier: image.imageName,
          imageRepositoryType: "ECR",
          imageConfiguration: {
            port: String(input.frontendPort),
            runtimeEnvironmentVariables: input.appEnvVars,
          },
        },
        authenticationConfiguration: { accessRoleArn: role.arn },
      },
      instanceConfiguration: { cpu: "1024", memory: "2048" },
    }, { dependsOn: [image] });

    return { url: service.serviceUrl.apply(u => `https://${u}`) };
  };
}

export async function deployAWS(
  input: DeployInput,
  creds: AWSCredentials,
  onLog: (msg: string) => void
): Promise<string> {
  const { LocalWorkspace } = await import("@pulumi/pulumi/automation");

  const stack = await LocalWorkspace.createOrSelectStack({
    stackName: input.stackName,
    projectName: "appwithai",
    program: makeAWSProgram(input),
  }, {
    envVars: {
      PULUMI_BACKEND_URL: `file://${input.stateDir}`,
      PULUMI_CONFIG_PASSPHRASE: process.env.PULUMI_CONFIG_PASSPHRASE ?? "",
      AWS_ACCESS_KEY_ID: creds.accessKeyId,
      AWS_SECRET_ACCESS_KEY: creds.secretAccessKey,
      AWS_DEFAULT_REGION: creds.region,
      AWS_REGION: creds.region,
    },
  });

  await stack.setConfig("aws:region", { value: creds.region });

  onLog("Installing AWS provider plugin…");
  await stack.workspace.installPlugin("aws", "v6.0.0");

  const up = await stack.up({ onOutput: (o) => onLog(o.trimEnd()) });
  const url = up.outputs["url"]?.value as string;
  if (!url) throw new Error("Deployment succeeded but no URL was returned.");
  return url;
}
