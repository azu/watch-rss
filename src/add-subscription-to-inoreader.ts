import fetch from "node-fetch";
import { AuthorizationCode, AccessToken } from "simple-oauth2";
import { OAuthConfig } from "./inoreader/OauthConfig";
import { updateSecret } from "./getAccessToken";
import { stringify } from "querystring";
import { fetchAllWatching } from "./watch-rss";
import pAll from "p-all";

const log = (...args: any[]) => {
    console.log("[watch-rss]", ...args);
};
const createInoreaderAPI = async (accessToken: AccessToken) => {
    const fetchSubscriptions = (): Promise<{ subscriptions: { url: string }[] }> => {
        return fetch("https://www.inoreader.com/reader/api/0/subscription/list", {
            headers: {
                Authorization: `Bearer ${accessToken.token.access_token}`
            }
        }).then((res) => res.json());
    };
    const subscriptions = await fetchSubscriptions();
    const subscriptionFeedURLSet = new Set(subscriptions.subscriptions.map((subscription) => subscription.url));
    log("Subscription size", subscriptionFeedURLSet.size);
    const addSubscription = async (url: string, folder: string) => {
        if (subscriptionFeedURLSet.has(url)) {
            log("Already subscribe: " + url);
            return;
        }
        // https://www.inoreader.com/developers/add-subscription
        // Edit is adding and editing folder
        const match = url.match(/https:\/\/github.com\/(.*?)\/(.*)\/releases.atom/);
        if (!match) {
            return;
        }
        const [, owner, repo] = match;
        const editParam = stringify({
            ac: `subscribe`,
            s: `feed/${url}`,
            t: `[${owner}/${repo}] release notes`,
            a: "user/-/label/" + folder
        });
        await fetch(`https://www.inoreader.com/reader/api/0/subscription/edit?${editParam}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken.token.access_token}`,
                "Content-Type": "application/json"
            }
        }).then((res) => res.text());
        log("Subscribe: " + url);
    };
    return {
        addSubscription: addSubscription
    };
};

/**
 * ENV:
 *  INOREADER_TOKEN_JSON=${{secrets.INOREADER_TOKEN_JSON}}
 *  GITHUB_TOKEN=<Personal Access Token> (repo,public_key,workflow,users)
 *  GITHUB_REPOSITORY=azu/watch-rss
 * ENV(optional):
 *  INOREADER_FOLDER_NAME=folder name
 */
async function run() {
    const FOLDER_NAME = process.env.INOREADER_FOLDER_NAME ?? "GitHubReleases";
    if (!FOLDER_NAME) {
        throw new Error("require FOLDER_NAME env");
    }
    const INOREADER_TOKEN_JSON = process.env.INOREADER_TOKEN_JSON;
    if (!INOREADER_TOKEN_JSON) {
        throw new Error("require INOREADER_TOKEN_JSON env");
    }
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
        throw new Error("require GITHUB_TOKEN env");
    }
    const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
    if (!GITHUB_REPOSITORY) {
        throw new Error("require GITHUB_REPOSITORY env");
    }
    const [owner, repo] = GITHUB_REPOSITORY.split("/");
    const tokenJSON = JSON.parse(INOREADER_TOKEN_JSON) as AccessToken["token"];
    const client = new AuthorizationCode(OAuthConfig);
    let accessToken: AccessToken = client.createToken(tokenJSON);
    if (accessToken.expired()) {
        try {
            const refreshParams = {
                scope: "read write"
            };
            accessToken = await accessToken.refresh(refreshParams);
            await updateSecret({
                owner,
                repo,
                GITHUB_TOKEN,
                value: JSON.stringify(accessToken.token)
            });
        } catch (error) {
            console.log("Error refreshing access token: ", error.message);
        }
    }
    // GitHub
    const releaseFeedList = await fetchAllWatching({
        ENABLE_CACHE: Boolean(process.env.ENABLE_CACHE), // IT IS LOCAL OPTION
        GITHUB_TOKEN: GITHUB_TOKEN
    });
    const inoreaderClient = await createInoreaderAPI(accessToken);
    const actions = releaseFeedList.map((releaseNoteFeedURL) => {
        return () => {
            return inoreaderClient.addSubscription(releaseNoteFeedURL, FOLDER_NAME);
        };
    });
    await pAll(actions, {
        concurrency: 8,
        stopOnError: false
    });
    log("Completed");
}

if (require.main === module) {
    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
