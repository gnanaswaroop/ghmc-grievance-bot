const config = require("./config");
const TelegramBot = require("node-telegram-bot-api");
const request = require("request");
const winston = require("winston");
const https = require("https");
var cheerio = require('cheerio');

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [
    new winston.transports.Console({ level: "info" }),
    new winston.transports.File({
      filename: "combined.log",
      level: "debug"
    })
  ]
});

// replace the value below with the Telegram token you receive from @BotFather
const token = config.botToken;

var chatId = "";

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

var log = function(message) {
  console.log(message);
  logger.info(message, { timestamp: Date.now(), pid: process.pid });
};

var debugLog = function(message) {
  console.log(message);
  logger.debug(message, { timestamp: Date.now(), pid: process.pid });
};

var errorLog = function(error) {
  console.error(e);
  logger.error(message, { timestamp: Date.now(), pid: process.pid });
};

// TODO: Make this generic by reading the labels directly from HTML (<li>) instead of duplicating the mapping. 
var allAttributeClasses = {
  'Grievance ID' : 'lblCID',
  'Time Stamp': 'lblTimeStamp',
  'Posted By': 'lblPostedby',
  'Assigned to': 'lblAssignedto',
  'Complaint Type': 'lblCType',
  'Landmark': 'lblLandmark',
  'Mobile Number': 'lblMobilenumber',
  'Status': 'lblStatus',
  'Remarks': 'lblRemark'
};

var ghmcURL = "https://igs.ghmc.gov.in/Status.aspx?mobileno=&compId=";

var prepareResponse = function(htmlBody, compiledURL) {
  const $ = cheerio.load(htmlBody);

  var results = "";
  for(var eachProperty in allAttributeClasses) {
    results = results + '<strong>' + eachProperty + '</strong>: ' + $('span#' + allAttributeClasses[eachProperty]).text() + "\n";
  }

  results += '<a href="' + compiledURL + '">Check Online</a>';
  return results;
}

var queryGHMCWebsite = function(grievanceNumber) {
  debugLog("Querying GHMC website for grievanceNumber " + grievanceNumber);
  var url = ghmcURL + grievanceNumber;
  debugLog("URL for querying is " + url);

  https
    .get(url, res => {
      // console.log("statusCode:", res.statusCode);
      // console.log("headers:", res.headers);

      var body = "";
      var isError = false;
      if (res.statusCode == 200) {
        debugLog("Success " + grievanceNumber);
        sendMessage("Grievance " + grievanceNumber + " is valid ");

      } else {
        isError = true;
        debugLog("Error " + grievanceNumber);
        sendMessage("Grievance " + grievanceNumber + " is invalid ");
      }

      res.on("data", d => {
        body += d;
      });

      res.on('end', function() {
        if(!isError) {
          var response = prepareResponse(body, url);
          sendMessage(response);
        }
        isError = false;
      });
    })
    .on("error", e => {
      debugLog("Error " + e);
      sendMessage("Grievance " + grievanceNumber + " is invalid ");
    });
};

var processMessage = function(inputText) {
  debugLog("Processing for payload " + inputText);
  // sendMessage("ACK " + inputText);

  queryGHMCWebsite(inputText);
};

var sendMessage = function(message) {
  bot.sendMessage(chatId, message, { parse_mode: "HTML" });
};

var sendHelp = function() {
  var helpMessage = "Send a message with /status <grievance number>";
  sendMessage(helpMessage);
};

bot.onText(/\/status (.+)/, (msg, match) => {
  chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  processMessage(match[1]);
});

bot.onText(/\/help/, (msg, match) => {
  chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  sendHelp();
});

bot.on("message", msg => {
  chatId = msg.chat.id;
  const message = msg.text;

  try {
    if (!message.startsWith("/status")) {
      log("Command not found, send /help message");
      sendHelp();
      return;
    }
  } catch (ex) {
    log("Error observed " + ex);
  }
});
