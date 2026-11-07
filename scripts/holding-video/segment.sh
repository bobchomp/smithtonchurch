#!/bin/bash
# One 10-second segment: background with verse $1 fading in and out (0.75s).
i=$1; f=$(printf "frames/verse-%02d.png" $i); o=$(printf "seg/seg-%02d.mp4" $i)
ffmpeg -loglevel error -y -loop 1 -framerate 30 -t 10 -i frames/background.png -loop 1 -framerate 30 -t 10 -i "$f" \
  -filter_complex "[1:v]format=rgba,fade=t=in:st=0:d=0.75:alpha=1,fade=t=out:st=9.25:d=0.75:alpha=1[t];[0:v][t]overlay=format=auto,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset slow -tune stillimage -crf 18 -r 30 -g 60 -pix_fmt yuv420p -t 10 "$o"
