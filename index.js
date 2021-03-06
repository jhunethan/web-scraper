require("dotenv").config();
const puppeteer = require("puppeteer");
const axios = require("axios");
const Excel = require("exceljs");

async function getAddress(address) {
  return await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
    params: {
      key: process.env.APIKEY,
      address: address,
    },
  });
}

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

  const locationData = await getAddress(address);

  // {
  //   address_components: [
  //     { long_name: '152', short_name: '152', types: [Array] },
  //     { long_name: '20', short_name: '20', types: [Array] },
  //     {
  //       long_name: 'Whiteladies Road',
  //       short_name: 'Whiteladies Rd',
  //       types: [Array]
  //     },
  //     { long_name: 'Clifton', short_name: 'Clifton', types: [Array] },
  //     { long_name: 'Bristol', short_name: 'Bristol', types: [Array] },
  //     {
  //       long_name: 'Bristol City',
  //       short_name: 'Bristol City',
  //       types: [Array]
  //     },
  //     { long_name: 'England', short_name: 'England', types: [Array] },
  //     { long_name: 'United Kingdom', short_name: 'GB', types: [Array] },
  //     { long_name: 'BS8 2LG', short_name: 'BS8 2LG', types: [Array] }
  //   ],
  //   formatted_address: '152, 20 Whiteladies Rd, Clifton, Bristol BS8 2LG, UK',
  //   geometry: {
  //     bounds: { northeast: [Object], southwest: [Object] },
  //     location: { lat: 51.4603602, lng: -2.6090114 },
  //     location_type: 'ROOFTOP',
  //     viewport: { northeast: [Object], southwest: [Object] }
  //   },
  //   partial_match: true,
  //   place_id: 'EisxNTIsIDIwIFdoaXRlbGFkaWVzIFJkLCBCcmlzdG9sIEJTOCAyTEcsIFVLIh8aHQoWChQKEgk9-h5Sw41xSBEcL9kUymTNORIDMTUy',
  //   types: [ 'subpremise' ]
  // }

  const coordinates = locationData.data.results[0].geometry.location;

  const restaurants = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".c-menuItems-content")).map(
      (el) => {
        const item = {};
        item.name = el.children[0].textContent.split("\n")[2].trim();
        item.price = +el.textContent.split("??")[1].split("\n")[0].trim();
        if (el.children[2])
          item.description = el.children[1].textContent.split("\n")[1].trim();

        return item;
      }
    );
  });

  const restaurantName = uri.split("/")[3];
  console.log(`${restaurants.length} results found!`);
  if (restaurants.length)
    await writeExcelRestaurants(restaurants, {
      restaurantName,
      ...coordinates,
    });
  console.log("Closing Browser...");
  await browser.close();
}

async function writeExcelRestaurants(items, { restaurantName, lng, lat }) {
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

async function readExcel(filename, sheet) {
  const restaurantData = [];
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename).then(function () {
    const worksheet = workbook.getWorksheet(sheet);
    worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
      const restaurant = {};
      restaurant.restaurant_name = row.values[1];
      restaurant.street_address_1 = row.values[2];
      restaurant.street_address_2 = row.values[3];
      restaurant.city = row.values[4];
      restaurant.state = row.values[5];
      restaurant.postal_code = row.values[6];
      restaurantData.push(restaurant);
    });
  });
  return restaurantData;
}

async function getRestaurantData() {
  const revised = [];

  console.log("Reading File...");
  const restaurants = await readExcel("data/wscwnd.xlsx", "Sheet1");

  for (let i = 0; i < restaurants.length; i++) {
    const object = {
      ...restaurants[i],
    };

    console.log(
      `(${i}/${restaurants.length}) Processing ${restaurants[i].restaurant_name}`
    );
    try {
      const result = await getAddress(
        `${restaurants[i].restaurant_name} ${restaurants[i].street_address_1} ${restaurants[i].city} ${restaurants[i].postal_code}`
      );

      const addressData = result.data.results[0];
      if (addressData) {
        addressData["address_components"].forEach((locationData) => {
          if (locationData.types.includes("postal_code")) {
            object.postal_code = locationData.long_name;
            console.log(locationData.long_name);
          }
        });
      }
    } catch (error) {
      console.log(`Skipping ${restaurants[i].restaurant_name}`);
    }

    revised.push(object);
  }

  console.log("Writing File...");
  await writeExcel({
    items: revised,
    filename: "data/wscwnd.xlsx",
    sheet: "Sheet1",
  });
}

async function writeExcel({ items, filename, sheet }) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(filename);

  await workbook.removeWorksheet(1);

  const worksheet = workbook.addWorksheet(sheet);

  worksheet.columns = [
    { header: "restaurant_name", key: "restaurant_name", width: 32 },
    { header: "street_address_1", key: "street_address_1", width: 25 },
    { header: "street_address_2", key: "street_address_2", width: 10 },
    { header: "city", key: "city", width: 10 },
    { header: "state", key: "state", width: 10 },
    { header: "postal_code", key: "postal_code", width: 40 },
  ];

  let count = 0;

  for (let i = 0; i < items.length; i++) {
    count++;
    worksheet.addRow({
      id: i,
      ...items[i],
    });
  }

  await workbook.xlsx.writeFile(`${filename}`);

  console.log(`Written ${count} entries`);
}

getRestaurantData();

// getRestaurants("https://www.just-eat.co.uk/restaurants-aromas-bs8/menu");
