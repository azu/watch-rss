import { Octokit } from "@octokit/rest";
// @ts-ignore
import RSSCombiner from "rss-combiner";

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
    return repositories
        .filter((repo) => {
            return repo.owner?.login !== myUserName && !repo.private;
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
        // const feedConfig = createFeedConfig({
        //     title: "@azu watching",
        //     size: 100,
        //     rssList
        // });
        // console.log("feedConfig", feedConfig);
        // // やっぱりリクエストを投げすぎる…
        // RSSCombiner(feedConfig).then(function(combinedFeed: any) {
        //     const xml = combinedFeed.xml();
        //     console.log(xml);
        // }).catch((error: Error) => {
        //     console.error(error);
        // });
    })();
}
