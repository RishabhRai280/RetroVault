/**
 * @file scraper.ts
 * @package @retrovault/core
 * @description
 * Handles free, anonymous metadata scraping for discovering descriptions,
 * release years, and developers for recognized games.
 *
 * It uses the Wikipedia API as a highly reliable, free source of game metadata
 * without requiring API keys or user OAuth tokens.
 */

import { GameMetadata } from './files';

/**
 * Strips HTML tags from Wikipedia extracts to yield plain text.
 */
const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Given a parsed game title, fetches rich metadata (description, release year, etc).
 *
 * PIPELINE:
 *  1. Uses Wikipedia Search API to find the most likely article matching "${title} video game".
 *  2. Fetches the intro extract (summary) of that specific article.
 *  3. Uses a naive regex over the intro to guess the release year (the first year mentioned).
 *
 * @param title - Cleaned title from extractMetadataFromName()
 * @returns Partial GameMetadata containing description and releaseYear
 */
export const fetchGameMetadata = async (title: string): Promise<Partial<GameMetadata>> => {
    try {
        // Step 1: Search Wikipedia for the game
        // Appending 'video game' tightly focuses the search results to avoid parsing the real word 
        // if the game title is a common noun (e.g., "Doom", "Quake", "Black").
        const searchQuerystring = encodeURIComponent(`${title} video game`);
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuerystring}&utf8=&format=json&origin=*`;

        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        // No pages matched our search
        if (!searchData?.query?.search?.length) {
            return {};
        }

        const topHit = searchData.query.search[0];
        const pageId = topHit.pageid;

        // Step 2: Fetch the summary extract for the top hit
        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`;
        const extractRes = await fetch(extractUrl);
        const extractData = await extractRes.json();

        const pageData = extractData?.query?.pages?.[pageId];
        if (!pageData || !pageData.extract) {
            return {};
        }

        const descriptionRaw = pageData.extract;
        
        // Wikipedia summaries can be long. We truncate to the first ~350 characters to fit the UI gracefully.
        let description = descriptionRaw;
        const cutoff = descriptionRaw.indexOf('.', 250);
        if (cutoff !== -1 && cutoff < 400) {
            description = descriptionRaw.substring(0, cutoff + 1);
        } else if (descriptionRaw.length > 350) {
            description = descriptionRaw.substring(0, 350) + '...';
        }

        // Step 3: Best-effort Release Year extraction from the text
        // Usually, game intros say "is a 199X role-playing video game..." or "...released in 200X."
        let releaseYear: string | undefined = undefined;
        const yearRegex = /\b(198\d|199\d|200\d|201\d|202\d)\b/;
        const match = descriptionRaw.match(yearRegex);
        if (match && match[1]) {
            releaseYear = match[1];
        }

        return {
            description: stripHtml(description),
            releaseYear
        };

    } catch (e) {
        console.warn(`Failed to scrape metadata for game "${title}".`, e);
        return {};
    }
};
