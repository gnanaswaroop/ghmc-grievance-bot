const config = require("./config");
const winston = require("winston");
const https = require("https");
var cheerio = require('cheerio');
const Telegraf = require('telegraf')
const commandParts = require('telegraf-command-parts');

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
const bot = new Telegraf(token)

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

var queryGHMCWebsite = function(ctx, grievanceNumber) {
  debugLog("Querying GHMC website for grievanceNumber " + grievanceNumber);
  var url = ghmcURL + grievanceNumber;
  debugLog("URL for querying is " + url);

  https
    .get(url, res => {
      var body = "";
      var isError = false;
      if (res.statusCode == 200) {
        debugLog("Success " + grievanceNumber);
        // sendMessage(ctx, "Grievance " + grievanceNumber + " is valid ");
      } else {
        isError = true;
        debugLog("Error " + grievanceNumber);
        sendMessage(ctx, "Grievance " + grievanceNumber + " is invalid ");
      }

      res.on("data", d => {
        body += d;
      });

      res.on('end', function() {
        if(!isError) {
          var response = prepareResponse(body, url);
          sendMessage(ctx, response);
        }
        isError = false;
      });
    })
    .on("error", e => {
      debugLog("Error " + e);
      sendMessage(ctx, "Grievance " + grievanceNumber + " is invalid ");
    });
};

var processMessage = function(ctx, inputText) {
  var messageTextValue = ctx.state.command.args;
  debugLog("Processing for payload " + messageTextValue);
  queryGHMCWebsite(ctx, messageTextValue);
};

var sendMessage = function(ctx, message) {
  ctx.replyWithHTML(message);
};

var sendHelp = function(ctx) {
  var helpMessage = "Send a message with /status [grievance number]";
  sendMessage(ctx, helpMessage);
};

bot.use(commandParts());
bot.start((ctx) => ctx.reply('Welcome to the GHMC Grievances Bot. Please use /help for usage details!'))
bot.help((ctx) => sendHelp(ctx));
bot.command('status', (ctx) => processMessage(ctx, ctx.message));
bot.launch()