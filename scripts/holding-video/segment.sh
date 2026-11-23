#!/bin/bash
# One segment: background with verse $1 fading in and out. Optional: $2 = seconds (default 10), $3 = fade (default 0.75).
i=$1; T=${2:-10}; F=${3:-0.75}; f=$(printf "frames/verse-%02d.png" $i); o=$(printf "seg/seg-%02d.mp4" $i)
OUT=$(echo "$T - $F" | bc)
ffmpeg -loglevel error -y -loop 1 -framerate 30 -t $T -i frames/background.png -loop 1 -framerate 30 -t $T -i "$f" \
  -filter_complex "[1:v]format=rgba,fade=t=in:st=0:d=$F:alpha=1,fade=t=out:st=$OUT:d=$F:alpha=1[t];[0:v][t]overlay=format=auto,format=yuv420p[v]" \
  -map "[v]" -c:v libx264 -preset slow -tune stillimage -crf 18 -r 30 -g 60 -pix_fmt yuv420p -t $T "$o"
