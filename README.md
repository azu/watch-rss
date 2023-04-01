# watch-rss

> Subscribe https://github.com/watching as RSS Feeds

Subscribe your watched GitHub repository's releases as RSS on [Inoreader](https://inoreader.com).

This repository use GitHub Actions as scheduled cron.

You can subscribe new watched repository's releases every day 00:00.

## Overview: behavior

1. Get [your watching repositories](https://github.com/watching) without private and your repository
2. Create `https://github.com/<owner>/<repo>/releases.atom` for each 1's result.
3. Filter repositories by `EXCLUDE_PATTERNS`
4. Subscribe these rss if you do not subscribe it yet.

This job run every day at 00:00 By default.

For more details, See [schedule-subscribe.yml](.github/workflows/scheduled-subscribe.yml).

## Usage

This repository is template repository. You need to create your repository for yours.

0. Create your repository from ["Use this Template"](https://github.com/azu/watch-rss/generate)
1. Get GitHub Personal Access Token of GitHub

- Visit <https://github.com/settings/tokens/new>
- Create a token with `repo`,`workflow`,`user` permissions
- Copy it!

2. Get access token of [Inoreader](https://inoreader.com)

- `$GITHUB_TOKEN` is your personal access token that you got it at 1
- `<your-username>/watch-rss` is your forked repository name

```
yarn install
GITHUB_REPOSITORY=<your-username>/watch-rss GITHUB_TOKEN=$GITHUB_TOKEN npm run getAccessToken
```

:memo: This script add `INOREADER_TOKEN_JSON` to your repository(`<owner>/watch-rss`)'s secrets.

3. Set access tokens GitHub Action's secrets.

You need to create `PERSONAL_GITHUB_TOKEN` to repository's secrets and fill it your GitHub personal access token.

- `https://github.com/<yourname>/watch-rss/settings/secrets/actions`
- Name: `PERSONAL_GITHUB_TOKEN`
- Value: GitHub personal access token

:memo: watch-rss has some optional environments values.

```
 ENV:
  INOREADER_TOKEN_JSON=${{secrets.INOREADER_TOKEN_JSON}}
  GITHUB_TOKEN=<Personal Access Token> (repo,public_key,workflow,users)
  GITHUB_REPOSITORY=azu/watch-rss

 ENV(optional):
  EXCLUDE_PATTERNS="ignore-owner/,ignore-word" # ignore patterns that are comma separated
  INOREADER_FOLDER_NAME=folder name
  DEBUG=1
```

## Debug

RUN following command after create token using `npm run getAccessToken`.

- `ENABLE_CACHE=1` store cache to `.cache/`
- `DEBUG=1` dump debug log

```
DEBUG=1 ENABLE_CACHE=1 INOREADER_TOKEN_JSON=$(cat .cache/inoreader_token.json) GITHUB_REPOSITORY="azu/watch-rss" GITHUB_TOKEN="$GITHUB_TOKEN" npm run add-subscription-to-inoreader
```

## Changelog

See [Releases page](https://github.com/azu/watch-rss/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/watch-rss/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- azu: [GitHub](https://github.com/azu), [Twitter](https://twitter.com/azu_re)

## License

MIT © azu
