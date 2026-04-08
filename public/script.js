// --- SECTIONS ---
const sections = {
  playlists: document.getElementById("view-playlists"),
  tracks: document.getElementById("view-tracks"),
  downloads: document.getElementById("view-downloads")
};

// --- CONTAINERS & UI ELEMENTS ---
const containers = {
  playlists: document.getElementById("playlists"),
  tracks: document.getElementById("tracks"),
  downloads: document.getElementById("downloads-list")
};

const playlistTitle = document.getElementById("playlist-title");

// --- AUDIO PLAYER ---
const player = {
  audio: document.getElementById("audio"),
  playPauseBtn: document.getElementById("play-pause"),
  loopBtn: document.getElementById("loop-btn"),
  container: document.getElementById("player"),
  playerSize: document.getElementById("toggle-size"),
  seek: document.getElementById("seek"),
  currentTime: document.getElementById("current"),
  duration: document.getElementById("duration"),
  cover: document.getElementById("player-cover"),
  title: document.getElementById("track-title"),
  playlist: document.getElementById("track-playlist")
};

let currentPlaylist = [];
let currentTrackIndex = 0;
let isLooping = false;
let isExtended = false;
let favorites = [];

// --- UTILITIES ---
const formatTime = sec => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const showSection = name => {
  Object.keys(sections).forEach(sec => {
    sections[sec].classList.toggle("hidden", sec !== name);
  });
};

// --- FAVORITES ---
async function loadFavorites() {
  const res = await fetch("/api/favorites");
  favorites = await res.json();
}

async function toggleFavorite(audioUrl) {
  const res = await fetch("/api/favorites/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: audioUrl })
  });

  if (res.ok) {
    const data = await res.json();
    favorites = data.favorites;
    renderTracks(currentPlaylist, playlistTitle.textContent);
  }
}

// --- PLAYLISTS ---
function renderTracks(tracks, playlistName) {
  containers.tracks.innerHTML = "";

  tracks.forEach((track, index) => {
    const div = document.createElement("div");
    div.className = "track";

    const img = document.createElement("img");
    img.src = track.image || "default-cover.jpg";
    div.appendChild(img);

    const favBtn = document.createElement("button");
    favBtn.textContent = favorites.includes(track.audio) ? "💛" : "🤍";
    favBtn.addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(track.audio);
    });
    div.appendChild(favBtn);

    const span = document.createElement("span");
    span.textContent = track.title;
    div.appendChild(span);

    div.addEventListener("click", () => playTrack(index, playlistName));
    containers.tracks.appendChild(div);
  });
}

async function loadPlaylists() {
  const res = await fetch("/api/playlists");
  const data = await res.json();
  containers.playlists.innerHTML = "";

  data.forEach(pl => {
    const div = document.createElement("div");
    div.className = "playlist-card";

    const coverImg = document.createElement("img");
    const firstTrack = pl.tracks[0];
    coverImg.src = firstTrack?.image || "default-cover.jpg";
    div.appendChild(coverImg);

    const span = document.createElement("span");
    span.textContent = pl.name;
    div.appendChild(span);

    div.addEventListener("click", () => {
      currentPlaylist = pl.tracks;
      playlistTitle.textContent = pl.name;
      renderTracks(pl.tracks, pl.name);
      showSection("tracks");
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.className = "delete-playlist-btn";
    delBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (!confirm(`Supprimer playlist "${pl.name}" ?`)) return;
      const res = await fetch(
        `/api/delete-playlist/${encodeURIComponent(pl.name)}`,
        { method: "DELETE" }
      );
      if (res.ok) loadPlaylists();
    });
    div.appendChild(delBtn);

    containers.playlists.appendChild(div);
  });

  showSection("playlists");
}

document.getElementById("back").addEventListener("click", loadPlaylists);

// --- AUDIO PLAYER ---
function playTrack(index, playlistName) {
  const track = currentPlaylist[index];
  if (!track) return;
  player.audio.src = track.audio;
  player.cover.src = track.image || "";
  player.title.textContent = track.title;
  player.playlist.textContent = playlistName;
  currentTrackIndex = index;
  player.audio.play();
  player.playPauseBtn.textContent = "⏸️";

 //Met à jour la notification Android via MediaSession
	if ('mediaSession' in navigator) {
		  navigator.mediaSession.metadata = new MediaMetadata({
			      title: track.title || 'Titre inconnu',
			      artist: track.playlist || 'Playlist locale',
			      album: track.playlist || 'Serv-itor',
			      artwork: [
					        { src: track.image || '/default.jpg', sizes: '512x512', type: 'image/jpeg' }
					      ]
			    });

		  //Optionnel : contrôles du casque ou des boutons système
		   navigator.mediaSession.setActionHandler('play', () => audio.play());
		     navigator.mediaSession.setActionHandler('pause', () => audio.pause());
		       navigator.mediaSession.setActionHandler('stop', () => audio.pause());
		       }
}
player.playPauseBtn.addEventListener("click", () => {
	  if (player.audio.paused) {
		      player.audio.play();
		      player.playPauseBtn.textContent = "⏸️";

		      // 🔊 Informe Android que la lecture a repris
  if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
            }
              } else {
                  player.audio.pause();
                      player.playPauseBtn.textContent = "▶️";

			  // ⏸ Informe Android que la lecture est en pause
		       if ("mediaSession" in navigator) {
		             navigator.mediaSession.playbackState = "paused";
		 	      }
		       }

		       // 🔄 Met à jour la position dans la notification
		       if ("setPositionState" in navigator.mediaSession) {
		               navigator.mediaSession.setPositionState({
		               duration: player.audio.duration || 0,
		            playbackRate: player.audio.playbackRate || 1.0,
		          position: player.audio.currentTime || 0,
		       });
			  }
			});

player.loopBtn.addEventListener("click", () => {
  isLooping = !isLooping;
  player.loopBtn.textContent = isLooping ? "🔂" : "🔁";
});

player.playerSize.addEventListener("click", () => {
  isExtended = !isExtended;
  player.playerSize.textContent = isExtended ? "▽" : "▲";
  player.container.classList.toggle("expanded", isExtended);
  player.container.classList.toggle("collapsed", !isExtended);
});

player.audio.addEventListener("timeupdate", () => {
  player.seek.value = Math.floor(player.audio.currentTime);
  player.currentTime.textContent = formatTime(player.audio.currentTime);
});

player.audio.addEventListener("loadedmetadata", () => {
  player.seek.max = Math.floor(player.audio.duration);
  player.duration.textContent = formatTime(player.audio.duration);
});

player.audio.addEventListener("ended", () => {
  if (isLooping) playTrack(currentTrackIndex, player.playlist.textContent);
  else {
    currentTrackIndex++;
    if (currentTrackIndex < currentPlaylist.length)
      playTrack(currentTrackIndex, player.playlist.textContent);
  }
});

player.seek.addEventListener("input", () => {
  player.audio.currentTime = player.seek.value;
});

// --- CREATE PLAYLIST ---
document
  .getElementById("create-playlist-btn")
  .addEventListener("click", async () => {
    const name = document.getElementById("new-playlist-name").value.trim();
    if (!name) return alert("Nom invalide");

    const res = await fetch("/api/create-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      loadPlaylists();
      document.getElementById("new-playlist-name").value = "";
    } else {
      const data = await res.json();
      alert(data.error || "Erreur création playlist");
    }
  });

// --- DOWNLOAD ---
document.getElementById("download-btn").addEventListener("click", async () => {
  const url = document.getElementById("youtube-url").value.trim();
  const playlist = document.getElementById("target-playlist").value.trim();
  if (!url || !playlist) return alert("URL ou playlist manquante");

  const res = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, playlist })
  });

  if (res.status === 202) {
    alert("Téléchargement lancé en arrière-plan");
    document.getElementById("youtube-url").value = "";
    document.getElementById("target-playlist").value = "";
    loadDownloads();
  } else {
    const data = await res.json();
    alert(data.error || "Erreur téléchargement");
  }
});

async function loadDownloads() {
  const res = await fetch("/api/downloads");
  const data = await res.json();

  containers.downloads.innerHTML = "";
  data.reverse().forEach(dl => {
    const li = document.createElement("li");
    li.textContent = `${dl.name} - ${dl.status}`;
    containers.downloads.appendChild(li);
  });

  showSection("downloads");
}

document
  .getElementById("downloads-btn")
  .addEventListener("click", () => loadDownloads());
document
  .getElementById("back-from-downloads")
  .addEventListener("click", loadPlaylists);

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  loadFavorites().then(loadPlaylists);
});


