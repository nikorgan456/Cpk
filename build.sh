#!/bin/bash
# Joins the client files into public/index.html (one file, like Mint Rush)
set -e
cd "$(dirname "$0")/client"
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
  echo '<title>cpk</title><meta name="theme-color" content="#ff8ac4"><meta name="description" content="Tiny party games for 2-8 friends.">'
  echo '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%F0%9F%8E%89%3C/text%3E%3C/svg%3E">'
  echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">'
  echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
  echo '<style>'; cat style.css; echo '</style></head><body>'
  cat body.html
  echo '<script>(()=>{"use strict";'
  for f in core.js audio.js bean.js net.js controls.js arena3d.js match.js games_phys.js games_party.js ui.js; do cat "$f"; echo; done
  [ "$TEST" = "1" ] && echo 'window.__cpk = { NET, CM, get HM(){ return HM; }, GAMES, STORE, ME:() => ME, CTL, myInput, hIntro, hVote, startMatch };'
  echo '})();</script></body></html>'
} > ../public/index.html
echo "built public/index.html ($(wc -c < ../public/index.html) bytes)"
