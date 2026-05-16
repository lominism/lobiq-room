// --- CONFIGURATION ---
const CALENDAR_IDS = {
  "Garden Suite": "facc3940813826e1cf69428fd39b15cf1a1f4e87a39596affb1fc5a1fb27632c@group.calendar.google.com",
  "Sunset Room": "c0742ef06d9202f2e3e17a4f8fb088a1351dcb7d096aa9418003393b761fc806@group.calendar.google.com",
  "Coastal Retreat": "360fbcc1fc3d8f9d08b1e32c9218eb01e0a2d0ffd03cfe599f0deece04b3e36b@group.calendar.google.com"
};

const LINE_TOKEN = "z+nusBs0AYzDDQDusEB0pJsFgnfOXcyJjq+Mnl22WBAG6vXsIxW18bVxdQGLoqZSsaoy5hsIYnpTfqoCGd3F5RfDv/qLTwkMk/SGDV3WrPunG91koFrVmuX1o2ykdk11G1YScyCF82K5ldAOlz1xKQdB04t89/1O/w1cDnyilFU=";

function doGet(e) {
  var action = e.parameter ? e.parameter.action : null;
  
  try {
    if (action === "getOccupiedDates") {
      var room = e.parameter.room;
      var year = parseInt(e.parameter.year, 10);
      var month = parseInt(e.parameter.month, 10);
      var result = getOccupiedDates(room, year, month);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: "Unknown action"})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var bookingData = JSON.parse(e.postData.contents);
    var responseObj = saveBooking(bookingData);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true, 
      details: responseObj.details, 
      debugInfo: responseObj.debugInfo
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOccupiedDates(room, year, month) {
  var occupiedDates = [];
  var calendarId = CALENDAR_IDS[room];
  if (!calendarId) return occupiedDates;

  var calendar;
  try {
    calendar = CalendarApp.getCalendarById(calendarId);
  } catch (e) {
    return occupiedDates;
  }
  if (!calendar) return occupiedDates;

  // Search a wide range to cover overlapping events (e.g., previous month into current month)
  var startDateStr = year + "-" + (month + 1).toString().padStart(2, "0") + "-01T00:00:00+07:00";
  var startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() - 15); // Look back 15 days just in case
  
  var nextMonth = month + 2;
  var nextYear = year;
  if (nextMonth > 12) {
    nextMonth -= 12;
    nextYear++;
  }
  var endDateStr = nextYear + "-" + nextMonth.toString().padStart(2, "0") + "-01T00:00:00+07:00";
  var endDate = new Date(endDateStr);

  var events = calendar.getEvents(startDate, endDate);

  events.forEach(function(event) {
    var eventStart = event.getStartTime();
    var eventEnd = event.getEndTime();
    
    // For all-day events, the end date is exclusive.
    // If a guest checks out on the 3rd (end date), the room is only occupied on the 1st and 2nd.
    // We add 12 hours to avoid timezone edge cases, then iterate.
    var s = new Date(eventStart.getTime());
    s.setHours(12, 0, 0, 0);
    var e = new Date(eventEnd.getTime());
    e.setHours(12, 0, 0, 0);

    // If it's a timed event (not all-day), we still treat it as blocking the days it spans.
    if (!event.isAllDayEvent()) {
      // Just mark the start date and any dates it spans as occupied
      // Usually, hotel systems would mark check-in to checkout. 
      // But let's just stick to the loop.
    }

    while (s < e) {
      var dStr = Utilities.formatDate(s, "GMT+7", "yyyy-MM-dd");
      if (!occupiedDates.includes(dStr)) {
        occupiedDates.push(dStr);
      }
      s.setDate(s.getDate() + 1);
    }
  });

  return occupiedDates;
}

function saveBooking(bookingData) {
  var calendarId = CALENDAR_IDS[bookingData.room];
  if (!calendarId) throw new Error("Room calendar not found.");
  
  var calendar;
  try {
      calendar = CalendarApp.getCalendarById(calendarId);
  } catch (e) {
      throw new Error("Could not access Google Calendar.");
  }
  
  if (!calendar) throw new Error("Could not access Google Calendar.");

  // bookingData.dates will be like "2024-05-20 to 2024-05-22"
  var datesArr = bookingData.dates.split(" to ");
  if (datesArr.length !== 2) {
      throw new Error("Please select a valid Check-in and Check-out date range.");
  }
  
  var checkIn = new Date(datesArr[0] + "T00:00:00+07:00");
  var checkOut = new Date(datesArr[1] + "T00:00:00+07:00");

  if (checkOut <= checkIn) {
      throw new Error("Check-out date must be after Check-in date.");
  }

  // Double check if slots are free
  var occupiedDates = getOccupiedDates(bookingData.room, checkIn.getFullYear(), checkIn.getMonth());
  // Also check the next month in case it spans
  var nextMonthOcc = getOccupiedDates(bookingData.room, checkOut.getFullYear(), checkOut.getMonth());
  var allOcc = occupiedDates.concat(nextMonthOcc);
  
  var tempDate = new Date(checkIn.getTime());
  tempDate.setHours(12,0,0,0);
  var tempOut = new Date(checkOut.getTime());
  tempOut.setHours(12,0,0,0);
  
  while (tempDate < tempOut) {
      var dStr = Utilities.formatDate(tempDate, "GMT+7", "yyyy-MM-dd");
      if (allOcc.includes(dStr)) {
          throw new Error("Some of these dates are already booked! Please select another range.");
      }
      tempDate.setDate(tempDate.getDate() + 1);
  }

  var title = bookingData.name + " - " + bookingData.guests + " Guests";
  
  var description = "Name: " + bookingData.name +
                    "\nPhone: " + bookingData.phone + 
                    "\nRoom: " + bookingData.room +
                    "\nGuests: " + bookingData.guests +
                    "\nCheck-in: " + datesArr[0] +
                    "\nCheck-out: " + datesArr[1] +
                    "\nRequests: " + (bookingData.requests || "None");
  
  // 1. Send Booking to Google Calendar (All-Day Event)
  // Google Calendar all-day events are inclusive of start, exclusive of end. So checkOut date is perfect.
  var event = calendar.createAllDayEvent(title, checkIn, checkOut, {
      description: description
  });
  
  // 2. Format exact confirmation text
  var fullMessage = "Booking Confirmed!\n" +
                    "Your stay at LobiQ Room has been successfully booked.\n\n" + 
                    description;
  
  // 3. Push Message via LINE API
  var pushDebug = "Did not attempt to push. Missing user ID.";
  if (bookingData.lineUserId) {
    var url = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      'to': bookingData.lineUserId,
      'messages': [{
        'type': 'text',
        'text': fullMessage
      }]
    };
    var options = {
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LINE_TOKEN
      },
      'method': 'post',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    try {
        var response = UrlFetchApp.fetch(url, options);
        pushDebug = "LINE API Response: " + response.getResponseCode() + " " + response.getContentText();
    } catch(e) {
        pushDebug = "Apps Script Error: " + e.message;
    }
  }

  return { details: description, debugInfo: pushDebug };
}
