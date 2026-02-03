# Smart Related Notes for Thymer

A [Thymer](https://thymer.com) plugin that discovers related notes based on content similarity, shared references, and tags.

![image](<CleanShot 2026-02-03 at 18.56.15@2x.png>)
## Features

- **Content Similarity** - TF-IDF cosine similarity finds notes with similar wording and topics
- **Title Mentions** - Detects when a note's name appears in another note's content
- **Shared References** - Surfaces notes that link to each other or share common links
- **Shared Tags** - Finds notes with matching hashtags
- **Score Breakdown** - Hover the percentage badge to see how each signal contributes
- **Click to Open** - Click any result to open the note in the adjacent panel

## Installation

1. In Thymer, open the **Command Palette** (Cmd/Ctrl + p)
2. Search for **"Plugins"** and select it
3. In **Global Plugins**, click **"Create Plugin"**
4. Give it a name (e.g., "Smart Related Notes")
5. Click **"Edit Code"**
6. Copy the contents of [`plugin.json`](plugin.json) into the **Configuration** field
7. Copy the contents of [`plugin.js`](plugin.js) into the **Custom Code** field
8. Click **Save**

The plugin will appear in your sidebar.

## Usage

- Click the **lightbulb icon** in the sidebar to open the Related Notes panel
- Navigate to any note in an adjacent panel — related notes update automatically
- Hover the **percentage badge** on any result to see the signal breakdown
- Click a result to open that note in the other panel
- Use the **Rebuild** button or **Command Palette → "Rebuild Related Notes Index"** after adding new notes

## Configuration

In `plugin.json` under `custom`:

| Key | Default | Description |
|-----|---------|-------------|
| `maxResults` | `10` | Maximum number of related notes shown |
| `pollIntervalMs` | `2000` | How often (ms) the plugin checks for navigation changes |

## How It Works

The plugin indexes all notes on load, then scores every other note against the active note using five weighted signals:

| Signal | Weight | Method |
|--------|--------|--------|
| Content similarity | 25% | TF-IDF cosine similarity |
| Title mention | 30% | Bidirectional title-in-content check |
| References | 20% | Direct links + shared reference Jaccard |
| Tags | 15% | Hashtag set Jaccard similarity |
| Title similarity | 10% | Title word set Jaccard similarity |

All processing runs locally in the browser — no external APIs.

## Known Limitations

- Index must be rebuilt manually after adding new notes (click Rebuild or use the command palette)
- Only English stop words are filtered during tokenization

## Requirements

- Thymer with at least one collection containing notes

## License

MIT
