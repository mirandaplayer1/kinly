#!/bin/zsh
# Joins the cards, the walkthrough and the glasses concept into demo/kinly-demo.mp4 (1600x900, 30 fps).
# Clips that are missing are skipped. Usage: video/final/assemble.sh [walkthrough speed, default 1.6]
cd "$(dirname "$0")/../.." || exit 1
SPEED=${1:-1.6}
T=video/final/tmp; rm -rf $T; mkdir -p $T
norm() { # in out [speed]
  local sp=${3:-1}
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" | grep -q .; then
    ffmpeg -loglevel error -y -i "$1" -filter_complex "[0:v]setpts=PTS/$sp,scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:color=0xfbf3e4,fps=30,format=yuv420p[v];[0:a]atempo=$sp,aresample=44100[a]" -map "[v]" -map "[a]" -c:v libx264 -crf 21 -preset veryfast -c:a aac -ac 2 "$2"
  else
    ffmpeg -loglevel error -y -i "$1" -f lavfi -i anullsrc=r=44100:cl=stereo -filter_complex "[0:v]setpts=PTS/$sp,scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:color=0xfbf3e4,fps=30,format=yuv420p[v]" -map "[v]" -map 1:a -c:v libx264 -crf 21 -preset veryfast -c:a aac -ac 2 -shortest "$2"
  fi
}
: > $T/list.txt
add() { [ -f "$1" ] && norm "$1" "$T/$2.mp4" "${3:-1}" && echo "file '$2.mp4'" >> $T/list.txt && echo "added $1"; }
add video/final/c1.mp4 01 1.2
add video/final/c2.mp4 02 1.25
add video/final/c3.mp4 03 1.25
add demo/walkthrough.mp4 04 $SPEED
add video/final/c4.mp4 05 1.4
add demo/glasses-concept.mp4 06 1.12
add video/final/c5.mp4 07 1.2
ffmpeg -loglevel error -y -f concat -safe 0 -i $T/list.txt -c copy -movflags +faststart demo/kinly-demo.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 demo/kinly-demo.mp4
