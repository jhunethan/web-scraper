const puppeteer = require("puppeteer");
const fs = require("fs");

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

  console.log(restuarants);
  await fs.promises.writeFile("restaurants.json", JSON.stringify({restuarants}));
  await browser.close();
}

getRestaurants();
