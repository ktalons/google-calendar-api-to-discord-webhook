// This Google Apps Script Will Send a POST to a Discord Webhook creating embed messages of any events starting within the next minute of execution.
// Any events that have already started will not appear. 
// This script should be triggered every minute using Google Triggers.
const CHANNEL_POST_URL = "DISCORD_WEBHOOK_LINK_GOES_HERE"; 
const CALENDAR_ID = "GOOGLE_CALENDAR_ID_GOES_HERE";
const NO_VALUE_FOUND = "N/A";
const minsInAdvance = 1; // Set the number of minutes in advance you'd like events to be posted to discord. Must be 1 or greater


// Import Luxon
eval(UrlFetchApp.fetch('https://cdn.jsdelivr.net/npm/luxon@2.0.2/build/global/luxon.min.js').getContentText());
let DateTime = luxon.DateTime;
const DTnow = DateTime.now().startOf('minute'); // Will consider 'now' as the beginning the minute to deal with second offsets issues with trigger over time.

function postEventsToChannel() {
  // .list parameters. See https://developers.google.com/calendar/api/v3/reference/events/list?hl=en
  let optionalArgs = {
    timeMin: DTnow.toISO(),
    timeMax: DTnow.plus({minutes: minsInAdvance}).toISO(), // Will only show events starting in the next x minutes
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime'
  };
  let response = Calendar.Events.list(CALENDAR_ID, optionalArgs);
  let events = response.items;
  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      let event = events[i];
      let ISOStartDate = event.start.dateTime || event.start.date;
      let ISOEndDate = event.end.dateTime || event.end.date;

      // The Calendar API's .list function will continously return events whose endDate has not been reached yet (timeMin is based on the event's end time)
      // Since this script is meant to run every minute, we have to skip these events ourselves
      if (DateTime.fromISO(ISOStartDate) < DTnow.plus({minutes: minsInAdvance - 1})) {
        Logger.log(`Event ${event.summary} [${event.id}] has already started. Skipping`);
        continue;
      }

      // Build the POST request
      let options = {
          "method": "post",
          "headers": {
              "Content-Type": "application/json",
          },
          "payload": JSON.stringify({
               content: "\u200b",    // zero-width space to suppress the plain-text line
    embeds: [
      {
        title: event.summary,
        url: event.htmlLink,
        color: 0x4285F4,
        thumbnail: {
          url: "https://cdn.discordapp.com/attachments/696400605908041794/888874282950750238/1200px-Google_Calendar_icon_28202029.png"
        },
        timestamp: DTnow.toISO(),
        fields: [
          {
            name: "🗓️ Date",
            value: `<t:${Math.floor(DateTime.fromISO(ISOStartDate).toSeconds())}:D>`,
            inline: true
          },
          {
            name: "⏰ Time",
            value: `<t:${Math.floor(DateTime.fromISO(ISOStartDate).toSeconds())}:t> – <t:${Math.floor(DateTime.fromISO(ISOEndDate).toSeconds())}:t>`,
            inline: true
          },
          {
            name: "📍 Location",
            value: event.location || NO_VALUE_FOUND,
            inline: true
          },
          {
            name: "📖 Description",
            value: event.description?.slice(0, 1024) || NO_VALUE_FOUND,
            inline: false
          }
        ],
        footer: {
          text: "Google Calendar Event",
          icon_url: "https://cdn.discordapp.com/attachments/696400605908041794/888874282950750238/1200px-Google_Calendar_icon_28202029.png"
        }
      }
    ]
  })
};
UrlFetchApp.fetch(CHANNEL_POST_URL, options);
    }
  } else {
    Logger.log(`No events starting within ${minsInAdvance} minute(s) found.`);
  }
}

/**
 * Converts an ISO string into a discord formatted timestamp
 */
function ISOToDiscordUnix(isoString) {
  return `<t:${Math.floor(DateTime.fromISO(isoString).toSeconds())}:F>`
}
