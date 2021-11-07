//npm install minimist

//node 3_CricInfoExtractor.js --url="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --excel="TeamWiseMatches.csv" --dataFolder="Scorecards"

let minimist = require("minimist");
let axios = require("axios");
let excel4node = require('excel4node');
let jsdom = require("jsdom");
let fs = require('fs');
let path = require('path');
let pdflib = require('pdf-lib');


let args = minimist(process.argv);

//console.log(args.url);

let downloadKaPromise = axios.get(args.url);
let matches = [];
let teams = [

];
let teamWiseMatches = [];
downloadKaPromise.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;



    let matchesKeDivs = document.querySelectorAll("div.match-info.match-info-FIXTURES");

    for (let i = 0; i < matchesKeDivs.length; i++) {
        let match = {
            t1: " ",
            vs: " ",
            t1s: " ",
            t2s: " ",
            result: " "
        }
        let teamsKeParas = matchesKeDivs[i].querySelectorAll("p.name");
        match.t1 = teamsKeParas[0].textContent;
        match.vs = teamsKeParas[1].textContent;

        let matchScoreSpans = matchesKeDivs[i].querySelectorAll("div.score-detail>span.score");

        if (matchScoreSpans.length == 2) {
            match.t1s = matchScoreSpans[0].textContent;
            match.t2s = matchScoreSpans[1].textContent;
        }
        else if (matchScoreSpans.length == 1) {
            match.t1s = matchScoreSpans[0].textContent;
        }

        // console.log("Match "+ i+" Team 1 Score : "+ match.t1s);
        //console.log("Match "+ i+ " Team 2 Score : " + match.t2s);

        let result = matchesKeDivs[i].querySelector("div.status-text>span");
        match.result = result.textContent;


        //console.log("Match" + i + " result " + match.result);
        matches.push(match);
        putTeamsInArray(teams, match);
        //console.log(match.t2);
    }

    putMatchesInAppropriateTeams(teams, matches);
    /*for(let q=0; q<teams.length; q++)
    {
        console.log(teams[q].name);
    }
*/
    createExcelFile(teams);
    createFolders(teams);

    //createScoreCards(teams, " ", " PdfSaveSample.pdf");




    //console.log(matchesKeDivs.length);

});


function putMatchesInAppropriateTeams(teams, matches) {
    for (let i = 0; i < matches.length; i++) {
        for (let j = 0; j < teams.length; j++) {
            if (teams[j].name == matches[i].t1) {
                match = {
                    self: matches[i].t1,
                    opponent: matches[i].vs,
                    selfScroe: matches[i].t1s,
                    opponentScore: matches[i].t2s,
                    result: matches[i].result
                }
                teams[j].matches.push(match);



            }
        }

        for (let j = 0; j < teams.length; j++) {
            if (teams[j].name == matches[i].vs) {
                match = {
                    self: matches[i].vs,
                    opponent: matches[i].t1,
                    selfScroe: matches[i].t2s,
                    opponentScore: matches[i].t1s,
                    result: matches[i].result
                }
                teams[j].matches.push(match);



            }
        }


    }
}


//findTeams(matches);

function putTeamsInArray(teams, match) {
    let te1Idx = -1;
    let te2Idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            //teams[i].matches.push(match);
            //teams.push(match.t1);
            te1Idx = 1;
            break;
        }

    }
    if (te1Idx == -1) {
        let team =
        {
            name: match.t1,
            matches: []
        }
        //let name = match.t1;
        teams.push(team);

    }

    for (let j = 0; j < teams.length; j++) {
        if (teams[j].name == match.vs) {
            //teams[j].matches.push(match);
            te2Idx = 1;
            break;
        }
    }

    if (te2Idx == -1) {
        let team =
        {
            name: match.vs,
            matches: []
        }
        //let name = match.t1;
        teams.push(team);
        //teams.push(match.t2);
    }
}

function createExcelFile(teams) {
    let wb = new excel4node.Workbook();
    //new excel4node.Workbook;
    for (let i = 0; i < teams.length; i++) {
        let ws = wb.addWorksheet(teams[i].name);
        ws.cell(1, 1).string("Opponent");
        ws.cell(1, 2).string("Self Score");
        ws.cell(1, 3).string("Opponent Score");
        ws.cell(1, 4).string("Result");
        for (let j = 0; j < teams[i].matches.length; j++) {
            //console.log(teams[i].matches.length);
            ws.cell(2 + j, 1).string(teams[i].matches[j].opponent);
            ws.cell(2 + j, 2).string(teams[i].matches[j].selfScroe);
            ws.cell(2 + j, 3).string(teams[i].matches[j].opponentScore);
            ws.cell(2 + j, 4).string(teams[i].matches[j].result);


        }


    }
    wb.write(args.excel);


}

function createFolders(teams) {
    fs.mkdirSync(args.dataFolder);

    for (let i = 0; i < teams.length; i++) {
        let folderLocation = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(folderLocation);
        let count = 1;

        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(folderLocation, teams[i].name + " vs " + teams[i].matches[j].opponent + " match " + count + ".pdf");
            createScoreCards(teams[i].name, teams[i].matches[j], matchFileName);
            count++;

        }



    }




}

function createScoreCards(teamName, match, matchFileName) {
    let t1 = match.self;
    //console.log(t1);
    let t2 = match.opponent;
    let t1s = match.selfScroe;
    let t2s = match.opponentScore;
    let result = match.result;
    //console.log(matchFileName);
    let template = fs.readFileSync("template.pdf");
    let pdfLoadKaPromise = pdflib.PDFDocument.load(template);
    pdfLoadKaPromise.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(t1,
            {
                x: 320,
                y: 701,
                size: 8
            });
        page.drawText(t2,
            {
                x: 320,
                y: 687,
                size: 8
            });
        page.drawText(t1s,
            {
                x: 320,
                y: 673,
                size: 8
            });
        page.drawText(t2s,
            {
                x: 320,
                y: 659,
                size: 8
            });
        page.drawText(result,
            {
                x: 320,
                y: 645,
                size: 8
            });
        let pdfSaveKaPromise = pdfdoc.save();
        pdfSaveKaPromise.then(function (finalPdfBytes) {
        fs.writeFileSync(matchFileName, finalPdfBytes);
        })

    });

    //console.log("readComplete");
}




