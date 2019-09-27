const https = require("https");
const cheerio = require('cheerio');
const fs = require('fs');

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

var debugLog = function(message) {
    console.log(message);
  };

var ghmcURL = "https://igs.ghmc.gov.in/Status.aspx?mobileno=&compId=";

var outputFile = 'output' + new Date().getTime() + '.csv';

var prepareCSVHeaders = function () {
    var csvHeaders = Object.keys(allAttributeClasses).join(',');
    csvHeaders += ',Link'; 
    console.log(csvHeaders);
    writeToCSV(csvHeaders);
}

var prepareResponse = function(htmlBody, compiledURL) {
    const $ = cheerio.load(htmlBody);
    
    var results = "";
    var allProperties = [];
    for(var eachProperty in allAttributeClasses) {
        allProperties.push('"' + $('span#' + allAttributeClasses[eachProperty]).text() + '"');
    }
    
    results = allProperties.join(',');
    results += "," + compiledURL;
    return results;
}

var writeToCSV = function(content) {
    fs.appendFile(outputFile, content + '\n', function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
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
            
        } else {
            isError = true;
            debugLog("Error " + grievanceNumber);
        }
        
        res.on("data", d => {
            body += d;
        });
        
        res.on('end', function() {
            if(!isError) {
                var response = prepareResponse(body, url);
                writeToCSV(response);
            }
            isError = false;
        });
    })
    .on("error", e => {
        debugLog("Error " + e);
    });
}
// Replace with GHMC grievance IDs
var grievancesArray = ['1234','4567','8901','2345'];
 
var timeCounter = 0;
var main = function() {
    console.log('Fetching results for ' + grievancesArray.length);
    prepareCSVHeaders();

    grievancesArray.forEach(function(eachGrievance) {
        timeCounter = timeCounter + 5000; // Add delay so as to not overload the GHMC server. 
        setTimeout(queryGHMCWebsite.bind(null, eachGrievance), timeCounter); // TODO: Use promises and chain up requests. 
    });
}

main();

