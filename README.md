# Serv-itor

A small side project i did to have my own music plateform.

## Table of contents
- About
- Features
- Requirements
- Build & installation
  - Dependencies
  - Build
- Usage
- Screenshots
- Project structure
- Coding style & testing

## About
Serv-itor is a small local self hosting music web page that can be launched simply.

Initialy thought to be used with termux on a phone but may work on almost anything.
You can download on the [google playstore](https://play.google.com/store/apps/details?id=com.termux) or on the [applestore](https://apps.apple.com/us/app/termux/id6738933789).

## Features
- multi users
- multi playlists
- favorites title
- title download
- playlists download
- download queue updating

## Requirements
- A POSIX-compatible environment (Linux or macOS)
- npm
- python3
- pip

## Installation / Build

1. Clone the repository
```bash
   git clone https://github.com/Loufok0/Serv-itor.git
   cd Serv-itor
   ```

2. Install dependencies and Build
```bash
sh launch.sh
```

Notes:
- It may be needed to restart the script so it is started with the python venv

## Usage
Start the script and web serv with:
```bash
sh launch.sh
```

Common behavior:
```bash
└──>sh launch.sh
Collecting <...>
...
Successfully installed <...>
...
added 67 packages in 2s
...
found 0 vulnerabilities
🎵 Server launched on http://localhost:3000

=================================
to stop, just type "pkill node"
=================================

```

## Stop
Stop the script and web serv with:
```bash
pkill node
```

Yes, it is maybe wrong to do this but if you don't know what this command do, it may not be necessary to stop it another way. However if you know what it does, you may have others node processes runnning, and so you may know how to stop them then :)


## Screenshots
### Laptop
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Home_laptop.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Status_laptop.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Playlist_laptop.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Album_laptop.png" width="500">

### Phone
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Home_phone.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Status_phone.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Playlist_phone.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Album_phone.png" width="500">
<img src="https://github.com/Loufok0/Serv-itor/blob/main/ressources/Notification_phone.png" width="500">

## Project structure (suggested)
- ./public/                   — public files such as index.html, style.css, etc...
- ./launch.sh                 — install dependencies and start the Serv-itor
- ./script.py                 — downloading titles and playlists to your device
- ./users.json                — users data
- ./download_status.json      — download status of users
- README.md

## Disclamers
This approach uses unencrypted data transfert uses local storage, and is not destinated to be used in any profitable way.
It is aimed to be used for example personnaly on your phone with termux in background!
