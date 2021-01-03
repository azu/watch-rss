import type { ModuleOptions } from "simple-oauth2";

export const OAuthConfig: ModuleOptions = {
    client: {
        id: "999999340",
        secret: "0FioFJLPR7sRGHsiNpHFlyH8r_XHzlY9"
    },
    auth: {
        authorizeHost: "https://www.inoreader.com",
        authorizePath: "/oauth2/auth",
        tokenHost: "https://www.inoreader.com",
        tokenPath: "/oauth2/token"
    }
};
