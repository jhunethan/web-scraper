const puppeteer = require("puppeteer");
const fs = require("fs");
const Excel = require("exceljs");

async function getRestaurants(uri) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(uri);

  const restuarants = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".c-menuItems-content")).map(
      (el) => {
        const item = {};
        item.name = el.children[0].textContent.split("\n")[2].trim();
        item.price = +el.textContent.split("£")[1].split("\n")[0].trim();
        if (el.children[2])
          item.description = el.children[1].textContent.split("\n")[1].trim();

        return item;
      }
    );
  });

  const restaurantName = uri.split("/")[3];
  await writeExcel(restuarants, restaurantName);
  await browser.close();
}

async function writeExcel(items, restaurantName) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet("My Sheet");

  worksheet.columns = [
    { header: "Id", key: "id", width: 10 },
    { header: "Restaurant", key: "restaurant", width: 32 },
    { header: "Name", key: "name", width: 40 },
    { header: "Price", key: "price", width: 10 },
    { header: "Description", key: "description", width: 100 },
  ];

  console.log(items);

  for (let i = 0; i < items.length; i++) {
    worksheet.addRow({ id: i, restaurant: restaurantName, ...items[i] });
  }

  // save under export.xlsx
  await workbook.xlsx.writeFile("export.xlsx");

  console.log("File is written");
}

getRestaurants(
  "https://www.just-eat.co.uk/restaurants-subway-filtonbristol/menu"
);
