import { AwsClient } from "aws4fetch";

import { serverEnv } from "#/lib/server/env";

/**
 * Uploaded files live in a private Cloudflare R2 bucket (S3 API); the app
 * serves them through its own routes, so access rules stay in one place.
 * Keys: files/<cv_file id>, avatars/<user id>, photos/<hash>.
 */
let client: Promise<{ aws: AwsClient; base: string }> | null = null;

const bucket = () => {
  client ??= (async () => {
    const [account, name, key, secret] = await Promise.all([
      serverEnv("R2_ACCOUNT_ID"),
      serverEnv("R2_BUCKET"),
      serverEnv("R2_ACCESS_KEY_ID"),
      serverEnv("R2_SECRET_ACCESS_KEY"),
    ]);
    if (!(account && name && key && secret)) {
      client = null;
      throw new Error("R2 storage is not configured");
    }
    return {
      aws: new AwsClient({
        accessKeyId: key,
        secretAccessKey: secret,
        service: "s3",
        region: "auto",
      }),
      base: `https://${account}.r2.cloudflarestorage.com/${name}/`,
    };
  })();
  return client;
};

const send = async (key: string, init?: RequestInit) => {
  const { aws, base } = await bucket();
  return aws.fetch(
    `${base}${key.split("/").map(encodeURIComponent).join("/")}`,
    init
  );
};

export const putObject = async (
  key: string,
  body: Uint8Array | ArrayBuffer,
  contentType: string
) => {
  const res = await send(key, {
    method: "PUT",
    body: body as BodyInit,
    headers: { "content-type": contentType },
  });
  if (!res.ok) {
    throw new Error(`R2 put ${key}: ${res.status}`);
  }
};

export const getObject = async (key: string) => {
  const res = await send(key);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`R2 get ${key}: ${res.status}`);
  }
  return {
    body: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
};

export const deleteObjects = async (keys: string[]) => {
  // R2 deletes are idempotent; a missing key is fine.
  await Promise.all(
    keys.map(async (key) => {
      const res = await send(key, { method: "DELETE" });
      if (!(res.ok || res.status === 404)) {
        throw new Error(`R2 delete ${key}: ${res.status}`);
      }
    })
  );
};

export const fileKey = (id: string) => `files/${id}`;
export const avatarKey = (userId: string) => `avatars/${userId}`;
export const photoKey = (hash: string) => `photos/${hash}`;
