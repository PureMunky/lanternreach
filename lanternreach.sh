#!/bin/sh
# Opens Lanternreach full-screen in its own Firefox instance and profile, so it
# doesn't touch your normal browser windows. Quit with Alt+F4.
DIR="$(cd "$(dirname "$0")" && pwd)"
PROFILE="$DIR/firefox-profile"
mkdir -p "$PROFILE"
cat > "$PROFILE/user.js" <<'EOF'
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("trailhead.firstrun.didSeeAboutWelcome", true);
user_pref("browser.startup.homepage_override.mstone", "ignore");
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);
user_pref("browser.sessionstore.resume_from_crash", false);
user_pref("browser.tabs.warnOnClose", false);
user_pref("browser.translations.automaticallyPopup", false);
EOF
# lanternreach.html is the same file published as the artifact, which gets its page
# skeleton added at publish time. Wrap it in one here, with the offline fonts.
{
  printf '%s\n' '<!doctype html><html lang="en"><head><meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' \
    '<meta name="theme-color" content="#060911"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Lanternreach"><link rel="manifest" href="manifest.webmanifest">' \
    '<link rel="icon" href="icons/favicon.svg" type="image/svg+xml"><link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">' \
    '<link rel="stylesheet" href="fonts/fonts.css"><style>[hidden]{display:none!important}</style></head><body>'
  cat "$DIR/lanternreach.html"
  printf '%s\n' '</body></html>'
} > "$DIR/play.html"
# the title screen links to the radio page, so build it alongside
{
  printf '%s\n' '<!doctype html><html lang="en"><head><meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' \
    '<link rel="icon" href="icons/favicon.svg" type="image/svg+xml"><link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><style>[hidden]{display:none!important}</style></head><body>'
  cat "$DIR/lanternreach-radio.html"
  printf '%s\n' '</body></html>'
} > "$DIR/radio.html"
exec firefox --new-instance --profile "$PROFILE" --kiosk "file://$DIR/play.html"
