# Playing Lanternreach Radio on Google devices

Ideas for getting the radio (`lanternreach-radio.html`, published as `radio.html`) onto
Nest speakers, Nest Hubs and Chromecasts. None of these are built yet.

The catch behind all of them: the music is composed live by Web Audio in the browser, so
there is no audio file or stream URL a speaker can fetch on its own. Either something keeps
running the page and sends the sound over, or the music has to be rendered to audio first.

## Option 1: cast the page as it is

Works today, nothing to build.

- **Computer:** open the radio in Chrome, then ⋮ → **Cast…** → **Sources: Cast tab**, and
  pick the speaker, Hub or Chromecast. The tab's audio plays on the device.
- **Android phone:** open the radio in Chrome, then in the **Google Home** app choose the
  device → **Cast my audio** (or **Cast my screen** for a Hub or Chromecast).

Downside: the computer or phone has to stay awake with the page open, and phones may pause
it when the screen locks.

## Option 2: pre-rendered hours plus a Cast button (recommended next step)

- Render a long stretch (about an hour) of each station to MP3, for example with an
  `OfflineAudioContext` run of the same generators, and host the files on GitHub Pages.
- Add a Cast button to the radio page using the Google Cast Web Sender SDK with the default
  media receiver. The device then fetches and plays the file itself, so the phone or
  computer can sleep.
- Music loops each hour instead of being endlessly new.
- Size: six one-hour MP3s at 128 kbps are about 350 MB, within GitHub Pages limits (1 GB
  site, 100 MB per file). Shorter renders or a lower bitrate shrink this.

## Option 3: a live 24/7 stream

Needed only for "Hey Google, play Lanternreach Radio" or for others tuning in live.

- An always-available service runs the generators headlessly (for example Node with a Web
  Audio implementation) and encodes the output to MP3 or AAC.
- Voice requests by name also need the stream listed in a directory Assistant searches,
  such as TuneIn (free to submit).

### Running it on Cloud Run, scaled to zero

Rough estimate, assuming one instance with 1 vCPU and 1 GiB generating 128 kbps MP3, with
min instances 0 and max instances 1. Rates are from memory of Google's price list and may
be out of date; check the Cloud Run pricing page or calculator before relying on them.

| Item | Approximate rate | Per listening hour |
|---|---|---|
| CPU (1 vCPU) | $0.000024 per vCPU-second | ~$0.086 |
| Memory (1 GiB) | $0.0000025 per GiB-second | ~$0.009 |
| Egress (128 kbps ≈ 58 MB/hour per listener) | ~$0.12 per GB | ~$0.007 per listener |

The free tier covers roughly the first 50 vCPU-hours and 100 GiB-hours a month.

| Usage | Approximate monthly cost |
|---|---|
| ~2 hours a day (60 h) | $0–1, mostly free tier |
| ~8 hours a day (240 h) | ~$19 |
| 24/7 (730 h) | ~$65–70 |

0.5 vCPU is probably enough for this, which would roughly halve the CPU line. Extra
listeners on the same instance share one generator, so they only add egress.

### Things that matter more than the price

1. **60-minute request limit.** Cloud Run ends any request after an hour at most, so one
   long HTTP stream would drop hourly and Nest speakers don't reliably reconnect. Serve
   HLS instead (a playlist of short segments): Cast supports it and every segment is a
   short request.
2. **CPU between requests.** With default request-based billing, CPU is throttled outside
   requests, which would stall the generator. Use instance-based billing (CPU always
   allocated). It bills the whole time the instance is up, including about 15 idle
   minutes before it scales down. Per-second rates are a little lower; check how the free
   tier applies to it.
3. **Cold start** of a few seconds when the first listener connects. Fine for radio.

For heavy listening, a small always-on VM (e2-small, roughly $7–13 a month) is cheaper than
Cloud Run; Cloud Run wins for occasional use.

If this gets built: cap max instances at 1, set a budget alert (for example $5), and
output HLS from the start.
