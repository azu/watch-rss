#!/usr/bin/env node

// It is setup scripts
import { AuthorizationCode } from "simple-oauth2";
import { OAuthConfig } from "./inoreader/OauthConfig";
import open from "open";
import readline from "readline";
import { Octokit } from "@octokit/rest";
import sodium from "tweetsodium";

export const SECRET_KEY_NAME = "INOREADER_TOKEN_JSON";

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans);
        })
    );
}

export const updateSecret = async ({
    owner,
    repo,
    value,
    GITHUB_TOKEN
}: {
    owner: string;
    repo: string;
    value: string;
    GITHUB_TOKEN: string;
}) => {
    const octokit = new Octokit({
        auth: GITHUB_TOKEN!
    });
    const publicKey = await octokit.actions.getRepoPublicKey({
        owner,
        repo
    });
    const message = value;
    const textEncoder = new TextEncoder();
    const encryptedBytes = sodium.seal(textEncoder.encode(message), Buffer.from(publicKey.data.key, "base64"));
    const encrypted = Buffer.from(encryptedBytes).toString("base64");
    return octokit.actions.createOrUpdateRepoSecret({
        owner: owner,
        repo: repo,
        secret_name: SECRET_KEY_NAME,
        encrypted_value: encrypted,
        key_id: publicKey.data.key_id
    });
};
// https://github.com/maximilianMairinger/ctp/blob/95dbb0237c02169aa92edd4ad765204a4a44be11/src/app/project/app/app.ts
// get repository public key →　update secrets
async function getAccessToken() {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
        throw new Error("require GITHUB_TOKEN env");
    }
    const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
    if (!GITHUB_REPOSITORY) {
        throw new Error("require GITHUB_REPOSITORY env");
    }
    const [owner, repo] = GITHUB_REPOSITORY.split("/");
    const client = new AuthorizationCode(OAuthConfig);
    const authorizationUri = client.authorizeURL({
        redirect_uri: "http://localhost:3000/callback",
        scope: "read write",
        state: "ok_it_state"
    });
    await open(authorizationUri);
    const code = await askQuestion("Input your code(?code=): ");
    const tokenParams = {
        code: code,
        redirect_uri: "http://localhost:3000/callback",
        scope: "read write"
    };

    try {
        const tokenJSON = await client.getToken(tokenParams);
        await updateSecret({
            owner,
            repo,
            value: JSON.stringify(tokenJSON),
            GITHUB_TOKEN: GITHUB_TOKEN
        });
        /**
         *
         {
  token: {
    access_token: 'xxx',
    expires_in: 86400,
    token_type: 'Bearer',
    scope: 'read write',
    refresh_token: 'vvvv',
    expires_at: 2021-01-04T06:00:46.739Z
  }
}

         */
        console.log(`Save token to secrets.${SECRET_KEY_NAME}`);
        console.log(JSON.stringify(tokenJSON));
    } catch (error) {
        console.log("Access Token Error", error.message);
    }
}

if (require.main === module) {
    getAccessToken().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
