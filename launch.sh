#!/bin/bash

pkg update && pkg upgrade
pkg install python npm ffmpeg nodejs
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip
pip install -r requirement.txt
npm install express cookie-parser nodemailer
npm audit fix
mkdir -p playlists

node srcs/server.js &
sleep 2
echo "
=================================
to stop, just type \"pkill node\"
=================================
"

