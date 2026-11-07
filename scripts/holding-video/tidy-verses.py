import json, re, html, os
d = os.path.dirname(os.path.abspath(__file__))
refs = [v["ref"] for v in json.load(open(os.path.join(d, "verses.json"), encoding="utf-8"))]
out = []
for ref in refs:
    page = open(os.path.join(d, "html", re.sub(r"\W+", "_", ref) + ".html"), encoding="utf-8").read()
    start = page.index('<div class="passage-text">')
    end = page.index('<a class="full-chap-link"', start)
    body = page[start:end]
    body = re.sub(r'<h[2-6][^>]*>.*?</h[2-6]>', ' ', body, flags=re.S)          # chapter and psalm headings
    body = re.sub(r'<sup[^>]*>.*?</sup>', '', body, flags=re.S)                 # verse numbers, footnotes
    body = re.sub(r'<span class="chapternum">.*?</span>', '', body, flags=re.S)
    body = re.sub(r'<span class="indent-1-breaks">.*?</span>', '', body, flags=re.S)
    body = re.sub(r'<span[^>]*class="small-caps"[^>]*>(.*?)</span>', lambda m: "{" + m.group(1) + "}", body)
    body = re.sub(r'<br\s*/?>|</p>', ' ', body)
    text = html.unescape(re.sub(r'<[^>]+>', '', body))
    text = re.sub(r'\s+', ' ', text).strip()
    raw = text
    # For showing on its own: drop quotation marks left open or closed by the surrounding speech,
    # start with a capital and end with a full stop.
    for _ in range(3):
        if text[0] in "‘“" and text.count(text[0]) > text.count({"‘": "’", "“": "”"}[text[0]]): text = text[1:].lstrip()
        if text[-1] in "’”" and text.count(text[-1]) > text.count({"’": "‘", "”": "“"}[text[-1]]): text = text[:-1].rstrip()
    if text.startswith("“‘") and text.endswith("’”"): text = text[2:-2]
    text = re.sub(r'\s*[–;,:]$', '', text)
    if "‘" in text and "’" not in text[text.rindex("‘"):]: text = text.rstrip() + ("" if text[-1] in ".!?" else ".") + "’"
    if text[-1] not in ".!?’”": text += "."
    text = text[0].upper() + text[1:]
    out.append({"ref": ref, "text": text, "original": raw})
json.dump(out, open(os.path.join(d, "verses-clean.json"), "w"), indent=1, ensure_ascii=False)
for v in out: print(f'{v["ref"]:22} {v["text"]}' + ("" if v["text"] == v["original"] else "   <- was: " + v["original"]))
