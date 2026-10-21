// Shown only until config.js points at the database, or the first time someone opens the site with no signal.
const DEMO = {
  settings: {
    issue: { number: 1, month: "October 2026", channel: "CH. 01" },
    hero: { title: "Your school,", highlight: "right now.", lede: "News, sport, events and the stories behind them, written by students for students." },
    ticker: ["Issue 1 is out now", "Science fair winners announced", "Basketball team through to the finals", "Want to write for us? Room 12, Thursday break"],
    crew: [
      { role: "Editor in chief", name: "Name Surname", about: "Runs the paper and signs off every issue." },
      { role: "Deputy editor", name: "Name Surname", about: "Plans the stories and keeps deadlines." },
      { role: "Reporter", name: "Name Surname", about: "Covers sport and school events." },
      { role: "Photographer", name: "Name Surname", about: "Takes the photos for every issue." }
    ],
    contact: { text: "Seen something the school should know about? Tell us and we might run it.", email: "eisnow@example.com" },
    mystery: { on: true, signal: "SIGNAL 7 // 19-21-2-16-15-5-14-1 // LISTEN AT #case", console: "You looked under the hood. Good. Not everyone does.", hint: "One word. The ticker knows it." }
  },
  stories: [
    { id: "demo-1", section: "Front page", title: "Headline for the main story goes here", summary: "A couple of sentences that sum up the story and make people want to read on.", author: "Name Surname", date: "2026-10-20", body: "This is the first paragraph of the full story.\n\nThis is the second paragraph.", clue: "", front: true },
    { id: "demo-2", section: "Sport", title: "Second story headline", summary: "Short summary of the story.", author: "Name Surname", date: "2026-10-18", body: "Full text of the story.", clue: "" },
    { id: "demo-3", section: "Events", title: "Third story headline", summary: "Short summary of the story.", author: "Name Surname", date: "2026-10-16", body: "Full text of the story.", clue: "" },
    { id: "demo-4", section: "Science", title: "Fourth story headline", summary: "Short summary of the story.", author: "Name Surname", date: "2026-10-14", body: "Full text of the story.", clue: "" },
    { id: "demo-5", section: "Opinion", title: "Fifth story headline", summary: "Short summary of the story.", author: "Name Surname", date: "2026-10-12", body: "Full text of the story.", clue: "" }
  ]
};
