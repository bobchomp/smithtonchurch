# The "service will start shortly" verses video

How `public/holding-videos/service-starting-shortly-verses-v<N>.mp4` (Admin → Holding Slides) was made:

1. `fetch-verses.py` downloads each verse (NIV, Anglicised) from Bible Gateway, and `tidy-verses.py` strips
   headings and verse numbers and tidies quotation marks for showing on their own. The result is
   `content/holding-video-verses-v<N>.json` (`{Lord}` marks LORD in small capitals).
2. With the site running on port 3930, `node render-verses.cjs <out> content/holding-video-verses-v<N>.json` draws the
   background (photo, logo, title) and one transparent image per verse.
3. `segment.sh <n> [seconds] [fade]` (run in `<out>`'s parent, with the images in `frames/`) makes each segment (version 2: 10 seconds, 0.75s fades; version 1: 20 seconds, 1s fades), the verse
   fading in and out. The segments are joined with `ffmpeg -f concat -c copy`, then re-encoded:
   `-c:v libx264 -preset slow -tune stillimage -crf 23 -g 1800 -keyint_min 1800 -sc_threshold 0 -movflags +faststart`.

Version 3 is version 2 with a progress line added: a 6px white line (70% opacity) along the bottom that grows from left
to right over each 10-second verse. Made from the version 2 file with ffmpeg:

```bash
ffmpeg -i service-starting-shortly-verses-v2.mp4 -f lavfi -t 900 -i "color=c=white:s=1920x6:r=30" \
  -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=0.7[bar];[0:v][bar]overlay=x='-w+w*mod(t\,10)/10':y=H-h:shortest=1:format=auto,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset slow -tune stillimage -crf 23 -g 1800 -keyint_min 1800 -sc_threshold 0 -movflags +faststart -an \
  service-starting-shortly-verses-v3.mp4
```

The version with piano music (`service-starting-shortly-verses-music-v1.mp4`) is version 3's picture (copied, not re-encoded)
with 4:28–19:06 of the recording `Robert_01.mp3` (whole pieces, between two pauses), raised 7.8 dB, padded with silence to 15 minutes:

```bash
ffmpeg -i service-starting-shortly-verses-v3.mp4 -ss 268.17 -to 1146.5 -i Robert_01.mp3 \
  -filter_complex "[1:a]volume=7.8dB,afade=t=in:d=0.4,afade=t=out:st=877.3:d=1,apad=whole_dur=900[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -ar 44100 -t 900 -movflags +faststart service-starting-shortly-verses-music-v1.mp4
```

Version 4 (and the piano version 2) shows each verse for 16 seconds with 1-second fades: 57 verses
(`content/holding-video-verses-v4.json`: version 2's order, keeping all 45 version 1 verses and the first 12 shorter ones),
15:12 long. Segments: `segment.sh <n> 16 1`; the progress line uses `mod(t\,16)/16` and `-t 912`; the piano audio is padded to 912s.

NIV verses in church media need "NIV" after each quotation (Hodder & Stoughton's terms for non-saleable use).
