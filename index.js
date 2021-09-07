const puppeteer = require("puppeteer");
const fs = require("fs");
const Excel = require("exceljs");

async function getRestaurants() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://www.just-eat.co.uk/area/bs1-bristol");

  const restuarants = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".c-listing-item-title")).map(
      (el) => {
        const formattedContent = el.textContent.split("\n")[1].trim();
        return formattedContent;
      }
    );
  });

  console.log(restuarants)
  await writeExcel(restuarants);
  await browser.close();
}

async function writeExcel(data) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet("My Sheet");

  worksheet.columns = [
    { header: "Id", key: "id", width: 10 },
    { header: "Name", key: "name", width: 32 },
  ];

  console.log(data);

  for (let i = 0; i < data.length; i++) {
    worksheet.addRow({ id: i, name: data[i] });
  }

  // save under export.xlsx
  await workbook.xlsx.writeFile("export.xlsx");

  console.log("File is written");
}

getRestaurants();
