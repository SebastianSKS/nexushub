import { T } from "@/lib/i18n";
import type { MusicItem } from "@/types/music";

/**
 * Catálogo de sugeridos del Modo Invitado. Son canciones y playlists reales de Spotify;
 * título, artista y portada se leyeron de sus páginas públicas el 21 de septiembre de 2026.
 * Se reproducen con el embed oficial: no necesitan ninguna credencial.
 */
export const DEMO_MUSIC: readonly MusicItem[] = [
  {
    "kind": "playlist",
    "id": "37i9dQZF1DWWQRwui0ExPn",
    "title": "lofi beats",
    "subtitle": T("Playlist · Para concentrarse"),
    "cover": "https://i.scdn.co/image/ab67706f00000002266beb50b0032b0f140a749e"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DWZeKCadgRdKQ",
    "title": "Deep Focus",
    "subtitle": T("Playlist · Para concentrarse"),
    "cover": "https://i.scdn.co/image/ab67706f000000026020f2f6476db518ef747da4"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DX4sWSpwq3LiO",
    "title": "Peaceful Piano",
    "subtitle": T("Playlist · Para concentrarse"),
    "cover": "https://i.scdn.co/image/ab67706f0000000270e1fb7db7b45809d6a80377"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DX10zKzsJ2jva",
    "title": "Viva Latino",
    "subtitle": T("Playlist · Latino"),
    "cover": "https://i.scdn.co/image/ab67706f0000000291a1a63cc880fed3abb539dd"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DXcBWIGoYBM5M",
    "title": "Today’s Top Hits",
    "subtitle": T("Playlist · Éxitos"),
    "cover": "https://i.scdn.co/image/ab67706f00000002622db66d648829915229cb74"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DWXRqgorJj26U",
    "title": "Rock Classics",
    "subtitle": T("Playlist · Rock"),
    "cover": "https://i.scdn.co/image/ab67706f00000002694bf33281695f3b7542a09a"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DX4dyzvuaRJ0n",
    "title": "mint",
    "subtitle": T("Playlist · Electrónica"),
    "cover": "https://i.scdn.co/image/ab67706f000000027a205124c2dafd9f16bccd33"
  },
  {
    "kind": "playlist",
    "id": "37i9dQZF1DX4WYpdgoIcn6",
    "title": "Chill Hits",
    "subtitle": T("Playlist · Chill"),
    "cover": "https://i.scdn.co/image/ab67706f000000020408713c731caaf1f800615a"
  },
  {
    "kind": "track",
    "id": "5XaDdPqb8MTApJ5kqReqgg",
    "title": "New Light",
    "subtitle": "Dalby",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02bc5c02266d20753c79831747"
  },
  {
    "kind": "track",
    "id": "3h5T5JypYU7huFiVYhv1dr",
    "title": "BbY WOW",
    "subtitle": "KAROL G, Judeline, rusowsky",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0221deb742375f88edfb2e7368"
  },
  {
    "kind": "track",
    "id": "0ofHAoxe9vBkTCp2UQIavz",
    "title": "Dreams - 2004 Remaster",
    "subtitle": "Fleetwood Mac",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02e52a59a28efa4773dd2bfe1b"
  },
  {
    "kind": "track",
    "id": "0RO9W1xJoUEpq5MEelddFb",
    "title": "Stairway to Heaven - Remaster",
    "subtitle": "Led Zeppelin",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e024509204d0860cc0cc67e83dc"
  },
  {
    "kind": "track",
    "id": "57JVGBtBLCfHw2muk5416J",
    "title": "Another One Bites The Dust - Remastered 2011",
    "subtitle": "Queen",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0207744e2ed983efa3e6620a47"
  },
  {
    "kind": "track",
    "id": "3wRO9Pt5iPbZTs8YT1x69Q",
    "title": "Just A Little Bit More",
    "subtitle": "Mau P",
    "cover": "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02b063f96e99a788df90029270"
  },
  {
    "kind": "track",
    "id": "1sVVbdDuMGG8BMGqcwVRS6",
    "title": "I Could Be Madonna",
    "subtitle": "Barry Can't Swim, Sammy Virji",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dfd8f09916111aefb55eaf0b"
  },
  {
    "kind": "track",
    "id": "6dOtVTDdiauQNBQEDOtlAB",
    "title": "BIRDS OF A FEATHER",
    "subtitle": "Billie Eilish",
    "cover": "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0271d62ea7ea8a5be92d3c1f62"
  },
  {
    "kind": "track",
    "id": "5XeFesFbtLpXzIVDNQP22n",
    "title": "I Wanna Be Yours",
    "subtitle": "Arctic Monkeys",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e024ae1c4c5c45aabe565499163"
  },
  {
    "kind": "track",
    "id": "5ViLKrbyL3HD6wsq3AB9eI",
    "title": "White Keys",
    "subtitle": "Dominic Fike",
    "cover": "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023696096119ef08824cf85ede"
  }
];
