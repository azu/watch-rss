# watch-rss

Subscribe your watched GitHub repository's releases as RSS on [Inoreader](https://inoreader.com).

This repository use GitHub Actions as scheduled cron.

You can subscribe new watched repository's releases every day 00:00.

## Overview: behavior

1. Get your watches repositories without private and your repository
2. Create `https://github.com/<owner>/<repo>/releases.atom` from 1
3. Subscribe these rss if you do not subscribe it yet. 

This job run every day at 00:00 By default.

For more details, See [schedule-subscribe.yml](.github/workflows/schedule-subscribe.yml).

## Usage

1. Get GitHub Personal Access Token of GitHub

- Visit <https://github.com/settings/tokens/new>
- Create a token with `repo`,`workflow`,`public_key`,`user` permissions
- Copy it!

2. Get access token of [Inoreader](https://inoreader.com)

```markdown
GITHUB_REPOSITORY=<owner>/watch-rss GITHUB_TOKEN=$GITHUB_TOKEN npm start
```

:memo: This script add `INOREADER_TOKEN_JSON` to your repository(`<owner>/watch-rss`).

3. Set access tokens GitHub Action's secrets.

You need to create `PERSONAL_GITHUB_TOKEN` and set 1's access token value.

```
PERSONAL_GITHUB_TOKEN=Personal Access Token of GitHub(1)
```

:memo: watch-rss has some optional enviroments values.

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
