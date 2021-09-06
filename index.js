const rp = require("request-promise-native");
const fs = require("fs");
const cheerio = require('cheerio')

async function downloadHtml(uri, filename) {
  console.log(`Downloading HTML from ${uri}...`);
  const results = await rp({ uri: uri });
  await fs.promises.writeFile(filename, results);
}

async function readBoxscoreHtml() {
  // the input filename
  const htmlFilename = "boxscore.html";
  // read the HTML from disk
  const html = await fs.promises.readFile(htmlFilename);
  // parse the HTML with Cheerio
  const $ = cheerio.load(html);

  const $trs = $('.gamepackage-away-wrap tbody tr:not(.highlight)')

  const values = $trs.toArray().map(tr => {
    // find all children <td>
    const tds = $(tr).find('td').toArray();
    // create a player object based on the <td> values
    const player = {};
    for (td of tds) {
      // parse the <td>
      const $td = $(td);
      // map the td class attr to its value
      const key = $td.attr('class');

      let value;
      if (key === 'name') {
        value = $td.find('a span:first-child').text();
      } else {
        value = $td.text();
      }

      player[key] = isNaN(+value) ? value : +value;
    }
    return player;
  });

  await fs.promises.writeFile(
    'boxscore.json',
    JSON.stringify(values, null, 2)
  );

  console.log('Success! \nWritten to file boxscore.json')
}

async function main() {
  console.log("Starting...");
  await downloadHtml("https://www.espn.com/nba/boxscore?gameId=401160888", "boxscore.html");
  if (fs.existsSync("boxscore.html")) await readBoxscoreHtml();
  console.log("Done!");
}

main();
