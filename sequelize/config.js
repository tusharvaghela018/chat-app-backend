const dotEnv = require("dotenv");
const pg = require("pg");

dotEnv.config({ path: ".env" });
module.exports = {
  url: process.env.DATABASE_URL,
  dialectModule: pg,
  dialect: "postgres",
};
