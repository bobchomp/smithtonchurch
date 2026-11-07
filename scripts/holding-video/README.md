# The "service will start shortly" verses video

How `public/holding-videos/service-starting-shortly-verses-v1.mp4` (Admin → Holding Slides) was made:

1. `fetch-verses.py` downloads each verse (NIV, Anglicised) from Bible Gateway, and `tidy-verses.py` strips
   headings and verse numbers and tidies quotation marks for showing on their own. The result is
   `content/holding-video-verses.json` (`{Lord}` marks LORD in small capitals).
2. With the site running on port 3930, `node render-verses.cjs <out> content/holding-video-verses.json` draws the
   background (photo, logo, title) and one transparent image per verse.
3. `segment.sh <n>` (run in `<out>`'s parent, with the images in `frames/`) makes each 20-second segment, the verse
   fading in and out over a second. The segments are joined with `ffmpeg -f concat -c copy`, then re-encoded:
   `-c:v libx264 -preset slow -tune stillimage -crf 23 -g 1800 -keyint_min 1800 -sc_threshold 0 -movflags +faststart`.

NIV verses in church media need "NIV" after each quotation (Hodder & Stoughton's terms for non-saleable use).
