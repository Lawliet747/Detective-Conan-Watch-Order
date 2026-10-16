# Detective Conan Watch Order

An interactive checklist for the full Detective Conan watch order: 184 entries covering episode blocks, movies, OVAs, Magic Kaito specials, drama specials and other shorts, in the order you should watch them.

## How to use it

1. Open the site (see the link at the top of this repository's page).
2. Tap the checkbox on any entry to mark it as watched.
3. Use the progress bar at the top to see how far along you are.
4. Tap **Next up** to jump to the first entry you haven't watched yet.
5. Use the filter buttons to show only Episodes, Movies, OVAs, Magic Kaito, Drama or Specials.
6. Type in the search box to find a title, or type an episode number to find the block that contains it.
7. Tap the **⋯** button on any entry to mark everything up to that point as watched, or to clear everything from that point on.
8. Tick **Hide watched entries** to see only what is left.
9. The list shows 10 entries per page. Use the arrow buttons under the list to move between pages, or type a page number. The **Per page** menu above the list lets you switch to showing all entries at once.

When you open the site, it jumps to the page that holds the next entry you haven't watched.

Your progress is saved in your own browser on the device you use. Clearing your browser data will also clear your progress.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page structure. |
| `style.css` | All colors, fonts and layout. Colors and fonts are variables at the top of the page styles. |
| `app.js` | The checklist behavior: ticking, progress, search, filters, pages and saving. |
| `data.js` | The list of entries, one per line. This is the file you edit when the show gets new content. |
| `logo.png` | The logo shown beside the page title. |
| `favicon.png` | The small icon in the browser tab. |
| `apple-touch-icon.png` | The icon used when the page is added to a phone's home screen. |

Keep all of these files together in the same folder. The page needs every one of them.

## Publish it with GitHub Pages

1. Make sure this repository is **Public** and that the files above sit at the top level, not inside a folder.
2. Go to the repository's **Settings** tab and open **Pages** in the left sidebar.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to **main** and the folder to **/(root)**, then click **Save**.
5. Wait one to two minutes and refresh the Pages screen. Your site address appears there, in the form `https://your-username.github.io/your-repository-name/`.

If you see a 404 page, wait a few more minutes, then check that the file is named exactly `index.html`.

## Add new episodes or movies

1. Open `data.js` in the repository and tap the pencil icon to edit.
2. Add a new line at the **end** of the list, before the closing `];`. Adding at the end keeps everyone's saved progress in the right place.
3. Make sure every line ends with a comma except the last one. A missing or extra comma breaks the page.
4. Commit the change. The site updates after a minute or two.

Examples of a line:

```
{"k":"movie","title":"New Movie Title","meta":"Movie 30"}
{"k":"ep","title":"Episodes 1235–1260","meta":"26 episodes","a":1235,"b":1260}
{"k":"ep","title":"Episodes 1261–current","meta":"Ongoing","a":1261,"b":null}
```

The `k` value is the type: `ep`, `movie`, `ova`, `kaito`, `drama` or `other`.

When the "current" block ends, change it to a fixed range, then add the new movie and a fresh "current" block after it.

## Change how many entries show per page

Open `app.js` and find the line that starts with `var PAGE_SIZES`. It currently reads `[10, 0]`, which means 10 per page or all (0 means all). The first number is the default. To offer more choices, add numbers, for example `[10, 25, 50, 0]`, then commit.

## Change the look

Open `style.css` and edit the values at the top of the page styles to change colors and fonts. To replace the logo or icons, upload new images with the same file names.
