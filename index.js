function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = document.cookie;
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

const HOST = getCookie("host");
const USERNAME = getCookie("username");
const PASSWORD = getCookie("password");

function setCredentials() {
  const host = document.getElementById("inputServer").value
  const username = document.getElementById("inputUsername").value
  const password = document.getElementById("inputPassword").value

  const expiry = new Date(Date.now() + 100000000000).toUTCString() // IDK When this is...

  document.cookie = `host=${host}; expires=${expiry};`
  document.cookie = `username=${username}; expires=${expiry};`
  document.cookie = `password=${password}; expires=${expiry};`

  window.location.reload()
}

function updateUI(currentTitle, playlistData) {
  const progressBar = document.getElementById("progress_bar");
  progressBar.ariaValueMax = currentTitle["duration"];
  progressBar.ariaValueNow = playlistData["position"];
  const widthPercent =
    (playlistData["position"] / currentTitle["duration"]) * 100;
  progressBar.style.width = `${widthPercent}%`;

  document.getElementById("track_title").innerText = currentTitle["title"];
  document.getElementById("track_artist").innerText = currentTitle["artist"];

  document.getElementById("queue_list").innerHTML = "";
  playlistData["entry"].forEach((item, index) => {
    const queue_item = document.createElement("tr");

    let color = "black";
    if (playlistData["currentIndex"] == index) {
      color = "red"
    } else if (playlistData["currentIndex"] > index) {
      color = "gray"
    }

    queue_item.innerHTML = `
        <th style="color: ${color};" scope="row">${index + 1}</th>
        <td style="padding: .25rem;"><img style = "height: 48px;" src="${HOST}/rest/getCoverArt?id=${item["coverArt"]}&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0"></td>
        <td style="color: ${color};"> ${item["title"]}</td>
        <td style="color: ${color};"> ${item["artist"]}</td>
        <td style="color: ${color};"> ${item["album"]}</td>
    `;

    document.getElementById("queue_list").appendChild(queue_item);
  });
}

function getMediaSession() {
  fetch(
    `${HOST}/rest/jukeboxControl?action=get&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0`,
  ).then((response) => {
    if (!response.ok) {
      $("#loginModal").modal("show")
      return;
    }

    response.json().then((data) => {
      data = data["subsonic-response"];
      if (data["status"] != "ok") {
        $("#loginModal").modal("show")
        return;
      }

      window.lastStateData = data;

      if (data["jukeboxPlaylist"]["currentIndex"] < 0) {
        navigator.mediaSession.playbackState = "none";
        dummyAudio.pause();
      } else {
        if (data["jukeboxPlaylist"]["playing"] == true) {
          navigator.mediaSession.playbackState = "playing";
          dummyAudio.play();
        } else {
          navigator.mediaSession.playbackState = "paused";
          dummyAudio.pause();
        }

        currentTitle =
          data["jukeboxPlaylist"]["entry"][
          data["jukeboxPlaylist"]["currentIndex"]
          ];

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTitle["title"],
          artist: currentTitle["artist"],
          album: currentTitle["album"],
          artwork: [
            {
              src: `${HOST}/rest/getCoverArt?id=${currentTitle["coverArt"]}&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0`,
            },
          ],
        });

        navigator.mediaSession.setPositionState({
          position: parseFloat(data["jukeboxPlaylist"]["position"]),
          duration: parseFloat(currentTitle["duration"]),
          playbackRate: parseFloat(1),
        });

        updateUI(currentTitle, data["jukeboxPlaylist"]);
      }
    });
  });
}

function stopJukebox() {
  fetch(
    `${HOST}/rest/jukeboxControl?action=stop&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0`,
  ).then((response) => {
    getMediaSession();
  });
}

function startJukebox() {
  fetch(
    `${HOST}/rest/jukeboxControl?action=start&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0`,
  ).then((response) => {
    getMediaSession();
  });
}

function skipSongJukebox() {
  const newIndex =
    parseInt(window.lastStateData["jukeboxPlaylist"]["currentIndex"]) + 1;
  fetch(
    `${HOST}/rest/jukeboxControl?action=skip&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0&index=${newIndex}`,
  ).then((response) => {
    getMediaSession();
  });
}

function previousSongJukebox() {
  const newIndex =
    parseInt(window.lastStateData["jukeboxPlaylist"]["currentIndex"]) - 1;
  if (newIndex < 0) {
    stopJukebox();
    return;
  }
  fetch(
    `${HOST}/rest/jukeboxControl?action=skip&u=${encodeURI(USERNAME)}&p=${encodeURI(PASSWORD)}&c=Navabox&f=json&v=1.13.0&index=${newIndex}`,
  ).then((response) => {
    getMediaSession();
  });
}

navigator.mediaSession.setActionHandler("play", () => {
  startJukebox();
});
navigator.mediaSession.setActionHandler("pause", () => {
  stopJukebox();
});
navigator.mediaSession.setActionHandler("stop", () => {
  stopJukebox();
});
navigator.mediaSession.setActionHandler("nexttrack", () => {
  skipSongJukebox();
});
navigator.mediaSession.setActionHandler("previoustrack", () => {
  previousSongJukebox();
});

// THIS IS SO CURSED
const dummyAudio = new Audio();
dummyAudio.src = "./cursed_silence.mp3";
dummyAudio.loop = true;
dummyAudio.play();

setInterval(getMediaSession, 1500);
