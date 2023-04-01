import fetch from "node-fetch";
import { AuthorizationCode, AccessToken } from "simple-oauth2";
import { OAuthConfig } from "./inoreader/OauthConfig";
import { updateSecret } from "./getAccessToken";
import { stringify } from "querystring";
import { fetchAllWatching } from "./watch-rss";
import pAll from "p-all";

const DEBUG = Boolean(process.env.DEBUG);
const debug = (...args: any[]) => {
    if (!DEBUG) {
        return;
    }
    console.log("[watch-rss]", ...args);
};
const info = (...args: any[]) => {
    console.info("[watch-rss]", ...args);
};
const createInoreaderAPI = async (accessToken: AccessToken) => {
    const fetchSubscriptions = (): Promise<{ subscriptions: { url: string }[] }> => {
        return fetch("https://www.inoreader.com/reader/api/0/subscription/list", {
            headers: {
                Authorization: `Bearer ${accessToken.token.access_token}`
            }
        }).then((res) => {
            if (res.ok) {
                return res.json();
            }
            throw new Error(res.statusText);
        });
    };
    const subscriptions = await fetchSubscriptions();
    if (!subscriptions.subscriptions) {
        throw new Error("Fail to fetchSubscriptions");
    }
    const subscriptionFeedURLSet = new Set(subscriptions.subscriptions.map((subscription) => subscription.url));
    debug("Subscription size", subscriptionFeedURLSet.size);
    const addSubscription = async (url: string, folder: string): Promise<{ status: "skip" | "ok" }> => {
        if (subscriptionFeedURLSet.has(url)) {
            debug("Already subscribe: " + url);
            return {
                status: "skip"
            };
        }
        // https://www.inoreader.com/developers/add-subscription
        // Edit is adding and editing folder
        const match = url.match(/https:\/\/github.com\/(.*?)\/(.*)\/releases.atom/);
        if (!match) {
            return {
                status: "skip"
            };
        }
        const [, owner, repo] = match;
        const editParam = stringify({
            ac: `subscribe`,
            s: `feed/${url}`,
            t: `[${owner}/${repo}] release notes`,
            a: "user/-/label/" + folder
        });
        // post body does not work…
        await fetch(`https://www.inoreader.com/reader/api/0/subscription/edit?${editParam}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken.token.access_token}`,
                "Content-Type": "application/json"
            }
        }).then((res) => res.text());
        debug("Subscribe: " + url);
        return {
            status: "ok"
        };
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
 *
 * ENV(optional):
 *  EXCLUDE_PATTERNS="ignore-owner/,ignore-org/" # ignore patterns that are comma separated
 *  INOREADER_FOLDER_NAME=folder name
 *  DEBUG=1
 */
async function run() {
    const FOLDER_NAME = process.env.INOREADER_FOLDER_NAME ?? "GitHubReleases";
    if (!FOLDER_NAME) {
        throw new Error("require INOREADER_FOLDER_NAME env");
    }
    const EXCLUDE_PATTERNS = process.env.EXCLUDE_PATTERNS ?? "";
    const excludePatterns = EXCLUDE_PATTERNS.split(",")
        .map((exclude) => {
            return exclude.trim();
        })
        .filter(Boolean);
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
                redirect_uri: "http://localhost:3000/callback",
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
            console.error("Error refreshing access token: ", error.message);
            throw error;
        }
    }
    // GitHub
    info("fetch watching...");
    const releaseFeedList = await fetchAllWatching({
        ENABLE_CACHE: Boolean(process.env.ENABLE_CACHE), // IT IS LOCAL OPTION
        GITHUB_TOKEN: GITHUB_TOKEN
    });
    info(`fetched GitHub feed count: ${releaseFeedList.length}`);
    const inoreaderClient = await createInoreaderAPI(accessToken);
    const resultCount = {
        skipped: 0,
        subscribed: 0
    };
    const actions = releaseFeedList
        .filter((releaseNoteFeedURL) => {
            const skipped = excludePatterns.some((excludePattern) => {
                return releaseNoteFeedURL.includes(excludePattern);
            });
            if (skipped) {
                debug("Skip: ", releaseNoteFeedURL);
                return false;
            } else {
                debug("Want to subscribe: ", releaseNoteFeedURL);
                return true;
            }
        })
        .map((releaseNoteFeedURL) => {
            return async () => {
                return inoreaderClient.addSubscription(releaseNoteFeedURL, FOLDER_NAME).then((status) => {
                    if (status.status === "ok") {
                        resultCount.subscribed++;
                    } else if (status.status === "skip") {
                        resultCount.skipped++;
                    }
                });
            };
        });
    info(`Filtered feed count: ${actions.length}`);
    await pAll(actions, {
        concurrency: 8,
        stopOnError: false
    });
    info("Completed!");
    info("Skipped: " + resultCount.skipped);
    info("Subscribed: " + resultCount.subscribed);
}

if (require.main === module) {
    run().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
