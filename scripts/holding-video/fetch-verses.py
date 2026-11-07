import json, re, sys, time, html, urllib.parse, subprocess, os
REFS = ['Psalm 118:24', 'Psalm 122:1', 'Psalm 84:1', 'Psalm 95:6', 'Psalm 100:4', 'Psalm 100:5', 'Psalm 96:1', 'Psalm 29:2', 'Psalm 66:1', 'Psalm 46:10', 'Matthew 18:20', 'Psalm 9:1', 'Psalm 19:1', 'Psalm 113:3', 'Psalm 23:1', 'John 10:11', 'Psalm 27:1', 'John 8:12', 'John 1:5', 'Psalm 34:8', 'Psalm 18:1', 'Matthew 11:28', 'Psalm 62:1', 'Psalm 42:1', 'Isaiah 26:3', 'Psalm 121:1-2', 'Psalm 91:1', 'Proverbs 18:10', 'Nahum 1:7', 'Isaiah 41:10', 'Psalm 56:3', 'Lamentations 3:22-23', 'Psalm 63:3', 'Psalm 136:1', 'Psalm 107:1', 'Romans 3:23', 'Romans 6:23', 'John 3:16', 'Romans 5:8', 'Isaiah 53:5', 'Luke 19:10', 'Ephesians 2:8', 'Romans 10:9', 'John 14:6', 'John 11:25', 'John 6:35', 'Revelation 3:20', '2 Corinthians 5:17', 'Psalm 32:1', '1 John 1:9', 'Psalm 51:10', '1 John 4:19', '1 John 4:8', 'John 13:34', 'Ephesians 4:32', '1 Corinthians 16:14', 'Psalm 145:18', 'Isaiah 55:6', 'Jeremiah 29:13', 'Matthew 5:8', 'Matthew 6:33', 'Psalm 37:4', 'Proverbs 3:5-6', 'Psalm 119:105', 'Psalm 119:11', 'Psalm 130:5', 'Isaiah 40:31', 'Psalm 31:24', 'Joshua 1:9', '2 Timothy 1:7', 'Philippians 4:13', 'Romans 8:28', 'Hebrews 11:1', '1 Peter 5:7', 'Psalm 147:3', 'Psalm 139:14', 'Colossians 3:23', 'Philippians 4:4', '1 Thessalonians 5:16-18', 'Romans 12:12', 'Romans 15:13', 'Psalm 16:11', 'Hebrews 13:8', 'Micah 6:8', 'Zephaniah 3:17', 'Psalm 115:1', '2 Corinthians 9:15', 'Psalm 103:1', 'Numbers 6:24-26', 'Psalm 150:6']
out = []
d = os.path.dirname(os.path.abspath(__file__))
for ref in REFS:
    fn = os.path.join(d, "html", re.sub(r"\W+", "_", ref) + ".html")
    if not os.path.exists(fn):
        url = "https://www.biblegateway.com/passage/?search=" + urllib.parse.quote(ref) + "&version=NIVUK"
        subprocess.run(["curl", "-s", "--max-time", "30", "-o", fn, url], check=True)
        time.sleep(0.7)
    page = open(fn, encoding="utf-8").read()
    start = page.index('<div class="passage-text">')
    end = page.index('<div class="footnotes">', start) if '<div class="footnotes">' in page[start:] else page.index('full-chap-link', start)
    body = page[start:end]
    body = re.sub(r'<h3.*?</h3>', '', body, flags=re.S)
    body = re.sub(r'<sup[^>]*>.*?</sup>', '', body, flags=re.S)
    body = re.sub(r'<span class="chapternum">.*?</span>', '', body, flags=re.S)
    body = re.sub(r'<span style="font-variant: small-caps" class="small-caps">(.*?)</span>', lambda m: "{SC:" + m.group(1) + "}", body)
    body = re.sub(r'<span class="small-caps"[^>]*>(.*?)</span>', lambda m: "{SC:" + m.group(1) + "}", body)
    body = re.sub(r'<br\s*/?>', ' ', body)
    texts = re.findall(r'<span (?:id="[^"]*" )?class="text [^"]+"[^>]*>(.*?)</span>\s*(?=<span (?:id="[^"]*" )?class="text|</p>|</span>|<br|$)', body, flags=re.S)
    text = re.sub(r'<[^>]+>', '', body)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace("Read full chapter", "").strip()
    out.append({"ref": ref, "text": text})
    print(ref, "|", text)
json.dump(out, open(os.path.join(d, "verses.json"), "w"), indent=1, ensure_ascii=False)
