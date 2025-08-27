# fix-google-takeout-export

A Node.js tool to fix missing `titleUrl` properties in Google Takeout YouTube watch history exports by matching them with a yt-dlp export.

## Problem

When exporting your YouTube watch history from Google Takeout, the export might be missing the `titleUrl` property that contains the video URL. This tool helps recover these URLs by matching the video titles with a secondary export from yt-dlp.

## Installation

```shell
yarn install
```

## Generating yt-dlp Export

1. Install [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation).
2. Make sure you're logged in to YouTube in your web browser, then close all YouTube tabs.
3. Get the value of the `--cookies-from-browser` parameter. You can find the list of supported browsers [here](https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#filesystem-options).
    >Currently supported browsers are: brave, chrome, chromium, edge, firefox,
opera, safari, vivaldi, whale.
4. run the following command:

    ```shell
    yt-dlp --flat-playlist --cookies-from-browser <browser> --print-to-file "%(.{title,url})j" ytdlp-watch-history.json https://www.youtube.com/feed/history
    ```

This command will:

- Use your web browser cookies to access your YouTube watch history
- Export only the necessary metadata (title and URL)
- Save the output in JSON format to `ytdlp-watch-history.json`

## Usage

```shell
yarn start --takeout <takeout-file> --ytdlp <ytdlp-file> [--output <output-file>]
```

### Options

- `-t, --takeout`: Path to Google Takeout export file (required)
- `-y, --ytdlp`: Path to yt-dlp export file (required)
- `-o, --output`: Path to output file (default: "watch-history-fixed.json")
- `--help`: Show help
- `--version`: Show version number

### Example

```shell
yarn start --takeout watch-history.json --ytdlp ytdlp-watch-history.json
```

### Output

The tool will create a new JSON file that matches the Google Takeout format but includes the `titleUrl` property for each matching entry.
