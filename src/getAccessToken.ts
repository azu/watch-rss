#!/usr/bin/env node

// It is setup scripts
import { AuthorizationCode } from "simple-oauth2";
import { OAuthConfig } from "./inoreader/OauthConfig";
import open from "open";
import readline from "readline";
import sodium from "tweetsodium";

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

async function run() {
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
