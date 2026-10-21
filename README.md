# EIS NOW

The website for EIS NOW, the student newspaper: https://ladharimedaziz.github.io/eis-now/

Plain HTML, CSS and JavaScript on GitHub Pages, with a small Supabase database behind it for the stories. No build step.

```
index.html            page layout
css/site.css          the look of the site
css/desk.css          the look of the editor
js/config.js          which Supabase project to read from
js/app.js             page, story reader, case file, intro, light/dark
js/desk.js            the editor
js/demo.js            sample content, shown only when there's no database
assets/               logo and icons
sw.js                 keeps a copy for when there's no signal
```

## Posting and editing

Click **Editor** (side menu, top bar or the bottom of the page) and enter the editor code.

- **Stories**: post a new story, or click one to edit or delete it. Leave an empty line between paragraphs. Photos are shrunk on your device before they upload. Tick *Front page* to put a story at the top.
- **Issue**: issue number and month, the big title at the top, the story tip email.
- **Ticker**: one headline per line.
- **Crew**: add, remove and reorder people.
- **Mystery**: see below.
- **Code**: change the editor code. Do this if the code gets passed around.

Click **Lock** when you're done on a shared computer.

## The mystery

For people who go looking:

- a message in the page source
- a message in the browser console (from the Mystery tab)
- a signal line that scrolls in the ticker
- a hidden clue on any story; it's invisible until someone selects the text at the end of the story
- a locked case file at `#case`, opened with a password you set in the Mystery tab
- five quick taps on the logo in the side menu also lead to the case file

The password is checked by the database, so it can't be read out of the page. 8 wrong guesses lock that connection out for 15 minutes.

## Database

`js/config.js` holds the Supabase project URL and publishable key. Both are fine to have in public; nothing can be changed without the editor code.
