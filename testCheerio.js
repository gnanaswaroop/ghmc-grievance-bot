const cheerio = require('cheerio')
const fs = require('fs');

var responseContent = fs.readFileSync('Sample.html', 'utf8');

console.log('**')
//console.log(fileContent);

const $ = cheerio.load(responseContent);

var allAttributeClasses = {
    'Grievance ID' : 'lblCID',
    'Complaint Type': 'lblCType',
    'Landmark': 'lblLandmark',
    'Mobile Number': 'lblMobilenumber',
    'Time Stamp': 'lblTimeStamp',
    'Status': 'lblStatus',
    'Posted By': 'lblPostedby',
    'Remarks': 'lblRemark',
    'Assigned to': 'lblAssignedto'
};

// console.log($('span#lblCID').text());
var response = "";
for(var eachProperty in allAttributeClasses) {
    response = response + eachProperty + ": " + $('span#' + allAttributeClasses[eachProperty]).text() + "\n";
}

console.log(response);