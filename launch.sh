#!/bin/bash

pkg update && pkg upgrade
pkg install python npm ffmpeg
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip
pip install -r requirement.txt
npm install express cookie-parser
npm audit fix
mkdir -p playlists

node server.js &
sleep 2
echo "
=================================
to stop, just type \"pkill node\"
=================================
"

