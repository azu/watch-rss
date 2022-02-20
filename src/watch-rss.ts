import { Octokit } from "@octokit/rest";
// @ts-ignore
import RSSCombiner from "rss-combiner";
import * as fs from "fs";
import path from "path";

export type fetchAllWatchingOptions = {
    GITHUB_TOKEN: string;
    ENABLE_CACHE?: boolean;
};
export const createFeedConfig = ({ title, size, rssList }: { title: string; size: number; rssList: string[] }) => {
    return {
        title,
        size,
        feeds: rssList,
        pubDate: new Date()
    };
};
export const fetchAllWatching = async (options: fetchAllWatchingOptions): Promise<string[]> => {
    if (options.ENABLE_CACHE) {
        try {
            return require("../.cache/rss.json");
        } catch {
            // nope
        }
    }
    const octokit = new Octokit({
        auth: options.GITHUB_TOKEN
    });
    // https://docs.github.com/github-ae@latest/rest/reference/activity#list-repositories-watched-by-the-authenticated-user
    const user = await octokit.users.getAuthenticated();
    const myUserName = user.data.login;
    const repositories = await octokit.paginate(octokit.activity.listWatchedReposForAuthenticatedUser);
    console.info(`[watch-rss] all watching repo count: ${repositories.length}`);
    return repositories
        .filter((repo) => {
            return !repo.private && repo.owner?.login !== myUserName;
        })
        .map((repo) => {
            return repo.html_url + "/releases.atom";
        });
};

if (require.main === module) {
    (async () => {
        const rssList = await fetchAllWatching({
            GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
            ENABLE_CACHE: Boolean(process.env.ENABLE_CACHE)
        });
        console.log(rssList);
        fs.mkdirSync(path.join(__dirname, "../.cache/"), {
            recursive: true
        });
        fs.writeFileSync(path.join(__dirname, "../.cache/rss.json"), JSON.stringify(rssList), "utf-8");
    })();
}
