#!/usr/bin/env node

// It is setup scripts
import { AuthorizationCode } from "simple-oauth2";
import { OAuthConfig } from "./inoreader/OauthConfig";
import open from "open";
import readline from "readline";
import { Octokit } from "@octokit/rest";
import sodium from "tweetsodium";
// @ts-ignore
import nacl from "tweetnacl";

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

// https://github.com/maximilianMairinger/ctp/blob/95dbb0237c02169aa92edd4ad765204a4a44be11/src/app/project/app/app.ts
// get repository public key →　update secrets
async function run() {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN!
    });
    const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
    if (!GITHUB_REPOSITORY) {
        throw new Error("require GITHUB_REPOSITORY env");
    }
    const [owner, repo] = GITHUB_REPOSITORY.split("/");
    const publicKey = await octokit.actions.getRepoPublicKey({
        owner,
        repo
    });
    const message = "xxx";
    const textEncoder = new TextEncoder();
    const encryptedBytes = sodium.seal(textEncoder.encode(message), Buffer.from(publicKey.data.key, "base64"));
    const encrypted = Buffer.from(encryptedBytes).toString("base64");
    console.log("encrypted", encrypted);
    await octokit.actions.createOrUpdateRepoSecret({
        owner: "azu",
        repo: "watch-rss",
        secret_name: "INOREADER_TOKENS",
        encrypted_value: encrypted,
        key_id: publicKey.data.key_id
    });
    return;
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
        const accessToken = await client.getToken(tokenParams);
        console.log("Copy");
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
        console.log(JSON.stringify(accessToken));
    } catch (error) {
        console.log("Access Token Error", error.message);
    }
}

run();
