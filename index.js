require("dotenv").config();
const puppeteer = require("puppeteer");
const axios = require("axios");
const Excel = require("exceljs");

async function getRestaurants(uri) {
  console.log("Opening browser...");
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(uri);

  const address = await page.evaluate(() => {
    const el = document.getElementsByClassName(
      "c-restaurant-header-address-content"
    )[0];
    return el.textContent.trim().replaceAll(" ", "%20");
  });

  const locationData = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        key: process.env.APIKEY,
        address: address,
      },
    }
  );

  const coordinates = locationData.data.results[0].geometry.location;

  const restaurants = await page.evaluate(() => {
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
  console.log(`${restaurants.length} results found!`);
  if (restaurants.length)
    await writeExcel(restaurants, { restaurantName, ...coordinates });
  console.log("Closing Browser...");
  await browser.close();
}

async function writeExcel(items, { restaurantName, lng, lat }) {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet("My Sheet");

  worksheet.columns = [
    { header: "Id", key: "id", width: 10 },
    { header: "Restaurant", key: "restaurant", width: 32 },
    { header: "Longitude", key: "longitude", width: 20 },
    { header: "Latitude", key: "latitude", width: 20 },
    { header: "Name", key: "name", width: 40 },
    { header: "Price", key: "price", width: 10 },
    { header: "Description", key: "description", width: 100 },
  ];

  for (let i = 0; i < items.length; i++) {
    worksheet.addRow({
      id: i,
      longitude: lng,
      latitude: lat,
      restaurant: restaurantName,
      ...items[i],
    });
  }

  // save under export.xlsx
  await workbook.xlsx.writeFile("export.xlsx");

  console.log("File is written");
}

getRestaurants("https://www.just-eat.co.uk/restaurants-aromas-bs8/menu");
