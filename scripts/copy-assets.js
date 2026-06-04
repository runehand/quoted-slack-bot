const fs = require("node:fs");
const path = require("node:path");

const sources = ["mock-users.json", "mock-data.json"];
const destinationDir = path.join(__dirname, "..", "dist", "data");

fs.mkdirSync(destinationDir, { recursive: true });

for (const fileName of sources) {
  const source = path.join(__dirname, "..", "src", "data", fileName);
  const destination = path.join(destinationDir, fileName);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
  }
}
