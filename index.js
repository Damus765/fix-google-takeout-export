import { readFile, writeFile } from 'fs/promises'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import ProgressBar from 'progress'

async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: yarn start --takeout <takeout-file> --ytdlp <ytdlp-file> [--output <output-file>]')
        .example('yarn start --takeout watch-history.json --ytdlp ytdlp-watch-history.json')
        .help()
        .option('takeout', {
            alias: 't',
            description: 'Path to Google Takeout export file',
            type: 'string',
            demandOption: true
        })
        .option('ytdlp', {
            alias: 'y',
            description: 'Path to yt-dlp export file',
            type: 'string',
            demandOption: true
        })
        .option('output', {
            alias: 'o',
            description: 'Path to output file',
            type: 'string',
            default: 'watch-history-fixed.json'
        })
        .parse()

    try {
        const [takeoutData, ytdlpData] = await Promise.all([
            readFile(argv.takeout, 'utf8'),
            readFile(argv.ytdlp, 'utf8')
        ])

        const takeoutJson = JSON.parse(takeoutData)
        const ytdlpJson = JSON.parse(ytdlpData)

        const filteredTakeout = takeoutJson.filter(entry =>
            // Take YouTube entries
            entry.products.includes('YouTube') &&
            // Take entries that don't have a titleUrl or have a YouTube video URL
            (!entry.titleUrl || entry.titleUrl.includes('www.youtube.com/watch?v')) &&
            // Take entries that have channel data (exclude posts that are no longer available)
            entry.subtitles != null &&
            // Take entries that aren't Google Ads
            entry.details == null
        )

        if (filteredTakeout.length === 0) {
            console.log('No entries found in the provided Google Takeout file after filtering')
            return
        }

        const bar = new ProgressBar('Processing entries [:bar] :current/:total :percent', {
            complete: '=',
            incomplete: ' ',
            width: 30,
            total: filteredTakeout.length
        })

        const urlMap = new Map(ytdlpJson.map(entry => [entry.title, entry.url]))
        const commonStart = getCommonStart(filteredTakeout.map(e => e.title))
        
        const fixedTakeout = []
        for (const entry of filteredTakeout) {
            bar.tick();
            
            // Keep entries that already have a titleUrl
            if (entry.titleUrl) {
                fixedTakeout.push(entry)
                continue
            }

            const videoTitle = entry.title.slice(commonStart.length);
            const url = urlMap.get(videoTitle);
            
            // If no URL is found, skip this entry
            if (!url) {
                continue
            }
            
            // Add the titleUrl to the entry
            fixedTakeout.push({
                ...entry,
                titleUrl: url
            })
        }

        console.log(`\nTotal entries in Google Takeout file: ${takeoutJson.length}`)
        console.log(`Filtered YouTube watch entries (ads and posts removed): ${filteredTakeout.length}`)

        if (fixedTakeout.length === 0) {
            console.log('No entries were fixed. Please ensure that the yt-dlp export file matches the Google Takeout data.')
            return
        }
        
        console.log(`Entries successfully fixed: ${fixedTakeout.length} (${Math.round(fixedTakeout.length / filteredTakeout.length * 100)}%)`)

        await writeFile(argv.output, JSON.stringify(fixedTakeout, null, 2), 'utf8')
        console.log(`File successfully saved to ${argv.output}`)

    } catch (error) {
        console.error('\nAn error occurred:', error.message)
        process.exit(1)
    }
}

/**
 * Remove 'Watched' and translated variants from start of title
 * so we get the common string prefix for all the titles
 * @param {string[]} allTitles 
 */
function getCommonStart(allTitles) {
    const watchedTitle = allTitles[0].split(' ')
    for (const title of allTitles) {
        const splitTitle = title.split(' ')
        for (let wtIndex = 0; wtIndex <= watchedTitle.length; wtIndex++) {
            if (!splitTitle.includes(watchedTitle[wtIndex])) {
                watchedTitle.splice(wtIndex, watchedTitle.length - wtIndex)
            }
        }
    }

    return watchedTitle.join(' ') + ' '
}

main();
