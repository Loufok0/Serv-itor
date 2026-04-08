import sys
import os
import json
import requests
from yt_dlp import YoutubeDL

STATUS_FILE = "downloads_status.json"

def sanitize_filename(name):
    return "".join(c for c in name if c not in "\\/:*?\"<>|").strip()

def get_sanitized_filename(info):
    uploader = info.get('uploader', 'Unknown Uploader')
    title = info.get('title', 'Unknown Title')
    return sanitize_filename(f"{uploader} | {title}")

def update_status(user, name, url, status, progress=None, error=None):
    try:
        if not os.path.exists(STATUS_FILE):
            with open(STATUS_FILE, "w") as f:
                json.dump({}, f)

        with open(STATUS_FILE, "r") as f:
            data = json.load(f)

        if user not in data:
            data[user] = []

        for item in data[user]:
            if item["url"] == url:
                item["status"] = status
                if item["name"] == "NULL":
                    item["name"] = name
                if progress is not None:
                    item["progress"] = progress
                if error:
                    item["error"] = error
                break
        else:
            data[user].append({
                "name": name,
                "url": url,
                "status": status,
                "progress": progress or 0,
                "error": error
            })

        with open(STATUS_FILE, "w") as f:
            json.dump(data, f, indent=2)

    except Exception as e:
        print(f"⚠️ Erreur mise à jour status : {e}")

def download_audio_and_cover(video_url, output_dir, user):
    info_opts = {'quiet': True, 'skip_download': True}
    try:
        with YoutubeDL(info_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
    except Exception as e:
        print(f"⚠️ Erreur récupération info : {e}")
        update_status(user, "NULL", video_url, "error", error=str(e))
        return

    sanitized = get_sanitized_filename(info)
    mp3_path = os.path.join(output_dir, sanitized + ".mp3")
    jpg_path = os.path.join(output_dir, sanitized + ".jpg")

    update_status(user, sanitized, video_url, "in_progress", 0)
    if os.path.exists(mp3_path):
        print(f"🎵 Skipped: {sanitized}.mp3 déjà présent.")
        update_status(user, sanitized, video_url, "done", 100)
        return

    ydl_opts = {
        'quiet': True,
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, sanitized + ".%(ext)s"),
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
    except Exception as e:
        print(f"⛔ Erreur téléchargement audio : {e}")
        update_status(user, sanitized, video_url, "error", error=str(e))
        return

    if not os.path.exists(jpg_path) and info.get("thumbnail"):
        try:
            img_data = requests.get(info["thumbnail"]).content
            with open(jpg_path, "wb") as f:
                f.write(img_data)
        except Exception as e:
            print(f"⚠️ Erreur miniature : {e}")

    update_status(user, sanitized, video_url, "done", 100)

def download_playlist_audio_and_covers(url, output_dir, user):
    playlist_opts = {
        'quiet': True,
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'ignoreerrors': True,
    }

    try:
        with YoutubeDL(playlist_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        print(f"❌ Erreur chargement playlist : {e}")
        return

    os.makedirs(output_dir, exist_ok=True)

    if 'entries' in info:
        entries = [e for e in info['entries'] if e is not None]
        print(f"\n📁 Playlist : {info.get('title', 'Unknown Playlist')} ({len(entries)} vidéos)\n")

        for entry in entries:
            info = ydl.extract_info(entry['url'], download=False)
            name = get_sanitized_filename(info)
            update_status(user, name, entry['url'], "queued", 0)
        for entry in entries:
            download_audio_and_cover(entry['url'], output_dir, user)
    else:
        name = info.get('title', 'Titre inconnu')
        print(f"🎵 Vidéo unique détectée : {name}")
        update_status(user, name, url, "queued", 0)
        download_audio_and_cover(url, output_dir, user)

# --- Entrée script ---
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage : python3 script.py <URL> <output_dir> [<username>]")
        sys.exit(1)

    url = sys.argv[1].strip()
    output_dir = sys.argv[2].strip()
    user = sys.argv[3].strip() if len(sys.argv) > 3 else "anonymous"

    download_playlist_audio_and_covers(url, output_dir, user)


